
// FIREBASE AUTHENTICATION WITH ACCESS CODE SYSTEM
// ============================================

let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let selectedFiles = [];
let currentPage = 'initial';
let selectedDepartment = null;
let sessionTimeout;
let isRemembered = false;
let profilePicFile = null;
let currentUser = { 
    accessCode: '',
    name: '', 
    initials: '',
    role: '',
    department: ''
};

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    checkAutoLogin();
    updateDateTime();
    setInterval(updateDateTime, 1000);
});

function setupEventListeners() {
    // Form submission
    document.getElementById('authForm').addEventListener('submit', handleLogin);
    
    // Activity tracking for session timeout
    document.addEventListener('mousemove', resetSessionTimeout);
    document.addEventListener('keypress', resetSessionTimeout);
    document.addEventListener('click', resetSessionTimeout);
    document.addEventListener('scroll', resetSessionTimeout);
    
    // Department selection
    setupDepartmentSelection();
    
    // Profile picture upload
    document.getElementById('profilePicUpload').addEventListener('click', function() {
        document.getElementById('profilePicInput').click();
    });
    
    document.getElementById('profilePicInput').addEventListener('change', handleProfilePicSelect);
    
    // Dashboard navigation setup
    setupNavigation();
}

// Handle Login with Access Code
function handleLogin(e) {
    e.preventDefault();
    
    const accessCode = document.getElementById('accessCode').value.trim().toUpperCase();
    
    if (!accessCode) {
        showNotification('Please enter your access code', 'error');
        return;
    }
    
    showNotification('Verifying access code...', 'info');
    
    // Check access code in Firestore
    db.collection('access-codes').doc(accessCode).get()
        .then((doc) => {
                console.log("🔍 Access code found:", doc.exists);
    console.log("📄 Code data:", doc.data());
    
            if (!doc.exists) {
                showNotification('Invalid access code', 'error');
                return Promise.reject('Invalid code');
            }
            
            const codeData = doc.data();
            const userRole = codeData.role;
            
            // Check if code has been used
            if (codeData.used) {
                // Code already used, check if profile exists
                return db.collection('staff-profiles').doc(accessCode).get()
                    .then((profileDoc) => {
                        if (profileDoc.exists && profileDoc.data().profileComplete) {
                            // Profile complete, create temp Firebase account and login
                            return createTempFirebaseAccount(accessCode, profileDoc.data())
                                .then(() => {
                                    // Save to localStorage
                                    localStorage.setItem('userRole', userRole);
                                    localStorage.setItem('accessCode', accessCode);
                                    
                                    if (isRemembered) {
                                        localStorage.setItem('rememberMe', 'true');
                                    }
                                    
                                    showNotification('Login successful!', 'success');
                                    
                                    // Redirect based on role
                                    setTimeout(() => {
                                        if (userRole === 'admin') {
                           window.location.href = 'Admin.html';
                                        } else if (userRole === 'supervisor') {
                         window.location.href = 'Supervisor.html';
                                        } else {
                                            showDashboard();
                                        }
                                    }, 1000);
                                });
                        } else {
                            showNotification('Please complete your profile setup', 'error');
                            return Promise.reject('Incomplete profile');
                        }
                    });
            }
            
            // New access code, create Firebase account
            return createTempFirebaseAccount(accessCode, { role: userRole })
                .then(() => {
                    // Save to localStorage
                    localStorage.setItem('userRole', userRole);
                    localStorage.setItem('accessCode', accessCode);
                    
                    if (isRemembered) {
                        localStorage.setItem('rememberMe', 'true');
                    }
                    
                    showNotification('Access code verified!', 'success');
                    
                    // Staff goes through profile setup
                    if (userRole === 'staff') {
                        setTimeout(() => {
                            checkStaffProfile(accessCode);
                        }, 1000);
                    } else {
                        // Admin/Supervisor go straight to dashboard
                        setTimeout(() => {
                            if (userRole === 'admin') {
                                window.location.href = 'Admin.html';
                            } else if (userRole === 'supervisor') {
                                window.location.href = 'Supervisor.html';
                            }
                        }, 1000);
                    }
                });
        })
        .catch((error) => {
            if (error !== 'Invalid code' && error !== 'Incomplete profile') {
                console.error("Login error:", error);
                showNotification('Login failed. Please try again.', 'error');
            }
        });
}

// Create temporary Firebase Auth account for access code users
// Create temporary Firebase Auth account for access code users
function createTempFirebaseAccount(accessCode, userData) {
    const tempEmail = `${accessCode.toLowerCase()}@beautyfair.app`;
    const tempPassword = `BF_${accessCode}_Secure2024!@#`;
    
    // Try to sign in first (account might already exist)
    return auth.signInWithEmailAndPassword(tempEmail, tempPassword)
        .catch((error) => {
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                // Account doesn't exist, create it
                return auth.createUserWithEmailAndPassword(tempEmail, tempPassword)
                    .then((userCredential) => {
                        const user = userCredential.user;
                        
                        // Save to users collection for compatibility
                        return db.collection('users').doc(user.uid).set({
                            accessCode: accessCode,
                            email: tempEmail,
                            role: userData.role,
                            fullName: userData.fullName || null,
                            department: userData.department || null,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    });
            }
            throw error;
        });
} 
// Check if staff has completed profile
function checkStaffProfile(accessCode) {
    const user = auth.currentUser;
    if (!user) {
        showDepartmentPage();
        return;
    }
    
    // Check in 'users' collection using user.uid
    db.collection('users').doc(user.uid).get()
        .then((doc) => {
            if (doc.exists) {
                const userData = doc.data();
                // Check if onboarding is complete
                if (userData.onboardingStep === 'complete' || userData.profileComplete) {
                    showDashboard();
                } else {
                    // Resume from where they left off
                    showDepartmentPage();
                }
            } else {
                // No profile found, start onboarding
                showDepartmentPage();
            }
        })
        .catch((error) => {
            console.error("Profile check error:", error);
            showDepartmentPage();
        });
} 
// Check auto login on page load
// Check auto login on page load
function checkAutoLogin() {
    const savedRole = localStorage.getItem('userRole');
    const savedCode = localStorage.getItem('accessCode');
    const rememberMe = localStorage.getItem('rememberMe');
    
    if (savedRole && savedCode && rememberMe === 'true') {
        // Verify code is still valid
        db.collection('access-codes').doc(savedCode).get()
            .then((doc) => {
                if (doc.exists) {
                    // Re-authenticate with Firebase
                    const tempEmail = `${savedCode.toLowerCase()}@beautyfair.app`;
                    const tempPassword = `BF_${savedCode}_Secure2024!@#`;
                    
                    return auth.signInWithEmailAndPassword(tempEmail, tempPassword)
                        .then(() => {
                            // Check role and redirect appropriately
                            if (savedRole === 'admin') {
                                window.location.href = 'Admin.html';
                            } else if (savedRole === 'supervisor') {
                                window.location.href = 'Supervisor.html';
                            } else {
                                // For staff, check if profile is complete
                                return db.collection('staff-profiles').doc(savedCode).get()
                                    .then((profileDoc) => {
                                        if (profileDoc.exists && profileDoc.data().profileComplete) {
                                            // Profile complete, go to dashboard
                                            showDashboard();
                                        } else {
                                            // Profile incomplete, start setup
                                            showDepartmentPage();
                                        }
                                    });
                            }
                        });
                }
            })
            .catch((error) => {
                console.error("Auto-login error:", error);
            });
    }
} 
// Logout function
function logout() {
    auth.signOut().then(() => {
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        localStorage.removeItem('accessCode');
        localStorage.removeItem('rememberMe');
        
        showNotification('Logged out successfully', 'success');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    });
}

// Toggle remember me checkbox
function toggleCheckbox() {
    const checkbox = document.getElementById('rememberCheckbox');
    isRemembered = !isRemembered;
    
    if (isRemembered) {
        checkbox.classList.add('checked');
    } else {
        checkbox.classList.remove('checked');
    }
}

// Session timeout
function resetSessionTimeout() {
    clearTimeout(sessionTimeout);
    sessionTimeout = setTimeout(() => {
        logout();
        showNotification('Session expired. Please login again.', 'error');
    }, 30 * 60 * 1000); // 30 minutes
}


        // Handle department selection
document.querySelectorAll('.department-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        // Remove selection from all buttons
        document.querySelectorAll('.department-btn').forEach(b => b.classList.remove('selected'));
        
        // Add selection to clicked button
        this.classList.add('selected');
        selectedDepartment = this.getAttribute('data-dept');
        
        // Show submit button
        document.getElementById('submitDeptBtn').classList.remove('hidden');
    });
});

// Submit department to Firebase
function submitDepartment() {
    if (!selectedDepartment) {
        showNotification('Please select a department', 'error');
        return;
    }
    
    const user = auth.currentUser;
    
    if (!user) {
        showNotification('No user logged in!', 'error');
        return;
    }
    
    // Save department to Firebase
    db.collection('users').doc(user.uid).update({
            department: selectedDepartment,
            onboardingStep: 'personal-info' // Track progress
        })
        .then(() => {
            showNotification('Department selected!', 'success');
            showPersonalInfoPage(); // Move to next page
        })
        .catch((error) => {
            console.error("Department save error:", error);
            showNotification('Failed to save department', 'error');
        });
}
// Setup department selection event listeners
function setupDepartmentSelection() {
    document.querySelectorAll('.department-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove selection from all buttons
            document.querySelectorAll('.department-btn').forEach(b => b.classList.remove('selected'));
            
            // Add selection to clicked button
            this.classList.add('selected');
            selectedDepartment = this.getAttribute('data-dept');
            
            // Show submit button
            document.getElementById('submitDeptBtn').classList.remove('hidden');
        });
    });
}


        function submitPersonalInfo() {

    const fullName = document.getElementById('fullName').value.trim();

    const birthday = document.getElementById('birthday').value;

    const hobby = document.getElementById('hobby').value;

    

    if (!fullName || !birthday || !hobby) {

        showNotification('Please fill all fields', 'error');

        return;

    }

    

    if (fullName.length < 2) {

        showNotification('Please enter a valid name', 'error');

        return;

    }

    

    // Store the name for later use

    localStorage.setItem('userName', fullName);

    localStorage.setItem('userBirthday', birthday);

    localStorage.setItem('userHobby', hobby);

    

    // Update current user data

    currentUser.name = fullName;

    currentUser.initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase();

    

    // Update profile data

    profileData.name = fullName;

    profileData.birthday = new Date(birthday).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    profileData.hobby = hobby.charAt(0).toUpperCase() + hobby.slice(1);

    

    showNotification('Personal information saved!', 'success');

    setTimeout(() => {

        showProfilePicPage();

    }, 1000);

}



        function handleProfilePicSelect(e) {

            const file = e.target.files[0];

            if (file) {

                profilePicFile = file;

                

                const reader = new FileReader();

                reader.onload = function(e) {

                    const uploadArea = document.getElementById('profilePicUpload');

                    uploadArea.innerHTML = `<img src="${e.target.result}" alt="Profile" class="profile-pic-preview">`;

                    document.getElementById('uploadBtn').classList.remove('hidden');

                };

                reader.readAsDataURL(file);

            }

        }





        function resetSessionTimeout() {

            clearTimeout(sessionTimeout);

            //startSessionTimeout();

        }



        // Page Navigation Functions

        function showInitialPage() {

            hideAllPages();

            document.getElementById('initialPage').classList.add('visible');

            currentPage = 'initial';

        }



        function showSignupPage() {

            hideAllPages();

            document.getElementById('signupPage').classList.add('visible');

            document.getElementById('authCard').classList.add('active');

            currentPage = 'signup';

        }



        function showWelcomePage() {

            hideAllPages();

            document.getElementById('welcomePage').classList.add('visible');

            currentPage = 'welcome';

            

            // Auto redirect to dashboard after 3 seconds

            setTimeout(() => {

                showNotification('Redirecting to dashboard...', 'success');

                setTimeout(() => {

                    showDashboard();
                    loadUserData();

                }, 1000);

            }, 3000);

        }
        
async function showDashboard() {
    hideAllPages();
    document.getElementById('dashboard').style.display = 'block';
    currentPage = 'dashboard';
    
    // Load user data first
    await loadUserData();
    
    // Then update UI
    updateGreeting();
    updateDateTime();
    loadPosts();
    updateNotificationBadges();
} 
        function showOTPPage() {

            hideAllPages();

            document.getElementById('otpPage').classList.add('visible');

            currentPage = 'otp';

            

            // Focus first OTP input

            setTimeout(() => {

                document.getElementById('otp1').focus();

            }, 100);

        }



        function showDepartmentPage() {

            hideAllPages();

            document.getElementById('departmentPage').classList.add('visible');

            currentPage = 'department';

        }



        function showPersonalInfoPage() {

            hideAllPages();

            document.getElementById('personalInfoPage').classList.add('visible');

            currentPage = 'personal';

        }



        function showProfilePicPage() {

            hideAllPages();

            document.getElementById('profilePicPage').classList.add('visible');

            currentPage = 'profile';

        }



        // Update hideAllPages to include new pages

function hideAllPages() {

    const pages = [

        'initialPage', 'welcomePage', 'signupPage', 'otpPage', 

        'departmentPage', 'personalInfoPage', 'profilePicPage', 

        'dashboard', 'forgotPasswordPage', 'resetOtpPage', 

        'newPasswordPage', 'resetSuccessPage'

    ];

    

    pages.forEach(pageId => {

        const element = document.getElementById(pageId);

        if (element) {

            element.classList.remove('visible');

            element.style.display = 'none';

        }

    });

    

    // Reset auth card state

    const authCard = document.getElementById('authCard');

    if (authCard) {

        authCard.classList.remove('active');

    }

}

            // Reset auth card state

            document.getElementById('authCard').classList.remove('active');

            

            // Show the current page

            setTimeout(() => {

                const currentPageElement = document.getElementById(getCurrentPageId());

                if (currentPageElement) {

                    currentPageElement.style.display = 'block';

                }

            }, 50);

        

        function getCurrentPageId() {

            switch(currentPage) {

                case 'initial': return 'initialPage';

                case 'signup': return 'signupPage';

                case 'welcome': return 'welcomePage';

                case 'otp': return 'otpPage';

                case 'department': return 'departmentPage';

                case 'personal': return 'personalInfoPage';

                case 'profile': return 'profilePicPage';

                case 'dashboard': return 'dashboard';

                default: return 'initialPage';

            }

        }



        // Dashboard Functions
function updateGreeting() {

            const hour = new Date().getHours();

            let greeting = '';

            

            if (hour < 12) {

                greeting = `Good morning, ${currentUser.name}!`;

            } else if (hour < 18) {

                greeting = `Good afternoon, ${currentUser.name}!`;

            } else {

                greeting = `Good evening, ${currentUser.name}!`;

            }

            

            document.getElementById('greetingText').textContent = greeting;

            document.getElementById('dashboardProfilePic').textContent = currentUser.initials;

        }

  function updateDateTime() {

            const now = new Date();

            const options = { 

                weekday: 'long', 

                year: 'numeric', 

                month: 'long', 

                day: 'numeric',

                hour: '2-digit',

                minute: '2-digit'

            };

            

            document.getElementById('liveDateTime').textContent = now.toLocaleDateString('en-US', options);

        }



        // Post Interaction Functions
async function toggleLike(element) {
    const postElement = element.closest('.post');
    const postId = postElement.dataset.postId;
    const user = auth.currentUser;
    
    if (!user) return showNotification('Login required', 'error');
    
    const postRef = db.collection('posts').doc(postId);
    const postDoc = await postRef.get();
    const likes = postDoc.data().likes || [];
    
    const isLiked = likes.includes(user.uid);
    const likeText = element.querySelector('span');
    
    if (isLiked) {
        await postRef.update({ likes: firebase.firestore.FieldValue.arrayRemove(user.uid) });
        element.classList.remove('liked');
        likeText.textContent = `${likes.length - 1} Likes`;
    } else {
        await postRef.update({ likes: firebase.firestore.FieldValue.arrayUnion(user.uid) });
        element.classList.add('liked');
        likeText.textContent = `${likes.length + 1} Likes`;
    }
}


      async function toggleSave(element) {
    const postElement = element.closest('.post');
    const postId = postElement.dataset.postId;
    const user = auth.currentUser;
    
    if (!user) return showNotification('Login required', 'error');
    
    try {
        const userRef = db.collection('users').doc(user.uid);
        const userDoc = await userRef.get();
        const savedPosts = userDoc.data().savedPosts || [];
        
        const isSaved = savedPosts.includes(postId);
        
        if (isSaved) {
            await userRef.update({ savedPosts: firebase.firestore.FieldValue.arrayRemove(postId) });
            element.classList.remove('saved');
            showNotification('Post unsaved', 'success');
        } else {
            await userRef.update({ savedPosts: firebase.firestore.FieldValue.arrayUnion(postId) });
            element.classList.add('saved');
            showNotification('Post saved!', 'success');
        }
        
    } catch (error) {
        console.error('Save error:', error);
        showNotification('Failed to save', 'error');
    }
}






        // Navigation Functions

        function setupNavigation() {

            document.getElementById('homeIcon').addEventListener('click', function() {

                setActiveNavIcon(this);

                // Already on home/dashboard

            });

            

            document.getElementById('messageIcon').addEventListener('click', function() {

    setActiveNavIcon(this);

    openDirectMessages();  // CHANGE: Remove showNotification, add this

});

            

           document.getElementById('announcementIcon').addEventListener('click', function() {

    setActiveNavIcon(this);

    openAnnouncements();  // CHANGE: Remove showNotification, add this

});

            

            document.getElementById('notificationIcon').addEventListener('click', function() {

    setActiveNavIcon(this);

    openNotifications();

});

            document.getElementById('menuIcon').addEventListener('click', function() {

    setActiveNavIcon(this);

    openHamburgerMenu();

});



        }



        function setActiveNavIcon(activeIcon) {

            // Remove active class from all nav icons

            document.querySelectorAll('.nav-icon').forEach(icon => {

                icon.classList.remove('active');

            });

        }

    

        



        // Notification System

        function showNotification(message, type) {

            const notification = document.getElementById('notification');

            notification.textContent = message;

            notification.className = `notification ${type}`;

            notification.classList.add('show');

            

            setTimeout(() => {

                notification.classList.remove('show');

            }, 4000);

        }



        // Utility Functions

        function generateOTP() {

            return Math.floor(1000 + Math.random() * 9000).toString();

        }



        // Demo functions for testing

        function testLogin() {

            document.getElementById('emailPhone').value = 'admin';

            document.getElementById('password').value = 'password';

        }



        function testSignup() {

            showSignupPage();

            document.getElementById('signupEmailPhone').value = 'test@example.com';

            document.getElementById('signupPassword').value = 'TestPass123!';

            document.getElementById('confirmPassword').value = 'TestPass123!';

        }



        // Add some demo data for testing

        console.log('Beauty Fair Staff App - Dashboard Ready!');

        console.log('Demo Login: admin / password');

        console.log('Features: Authentication ✓, Dashboard ✓, Feed ✓');

        console.log('Next: Individual feature pages (Messages, Announcements, etc.)');

        // ADD THESE NEW FUNCTIONS:

function openHamburgerMenu() {

    document.getElementById('hamburgerMenu').style.display = 'block';

    setTimeout(() => {

        document.getElementById('hamburgerMenu').style.opacity = '1';

    }, 10);

}



function closeHamburgerMenu() {

    const menu = document.getElementById('hamburgerMenu');

    menu.style.opacity = '0';

    setTimeout(() => {

        menu.style.display = 'none';

    }, 300);

}





// Update the openComplaints function in hamburger menu

function openComplaints() {

    closeHamburgerMenu();

    showComplaintsPage();

}



function showComplaintsPage() {

    document.getElementById('complaintsPage').style.display = 'block';

    // Reset form

    document.getElementById('complaintText').value ='';

    selectedFiles = [];

    updateFilePreview();

    updateSendButton();

}



function closeComplaints() {

    document.getElementById('complaintsPage').style.display = 'none';

}


async function submitComplaint() {
    const complaintText = document.getElementById('complaintText').value.trim();
    
    if (!complaintText && selectedFiles.length === 0) {
        showNotification('Please write a complaint or attach a file', 'error');
        return;
    }
    
    const currentUser = auth.currentUser;
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    try {
        showNotification('Submitting complaint...', 'info');
        
        // Get user data
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        
        // Convert files to base64
        const attachments = [];
        for (const file of selectedFiles) {
            const base64 = await fileToBase64(file);
            attachments.push({
                type: file.type,
                name: file.name,
                size: file.size,
                data: base64
            });
        }
        
        // Create complaint
        const complaint = {
            userId: currentUser.uid,
            userName: userData.fullName || 'User',
            userEmail: userData.email,
            userDepartment: userData.department || 'N/A',
            complaint: complaintText,
            message: complaintText,
            attachments: attachments,
            replies: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'pending'
        };
        
        // Save to Firebase and get the ID
        const complaintDoc = await db.collection('complaints').add(complaint);
        
        // CREATE ADMIN NOTIFICATION ⬇️ NEW
        await db.collection('adminNotifications').add({
            type: 'complaint',
            title: 'New Complaint',
            message: `${userData.fullName || 'A staff member'} filed a complaint`,
            complaintId: complaintDoc.id,
            unread: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Create notification for user
        await createNotification(
            currentUser.uid,
            'system',
            'Complaint Submitted',
            'Your complaint has been submitted successfully. HR will respond soon.',
            null
        );
        
        showNotification('Complaint submitted successfully! HR will respond soon.', 'success');
        
        // Clear form
        document.getElementById('complaintText').value = '';
        selectedFiles = [];
        updateFilePreview();
        updateSendButton();
        
        // Close after delay
        setTimeout(() => {
            closeComplaints();
        }, 2000);
        
    } catch (error) {
        console.error('Submit complaint error:', error);
        showNotification('Failed to submit complaint', 'error');
    }
}

function toggleVoiceRecording() {

    if (isRecording) {

        stopRecording();

    } else {

        startRecording();

    }

}



async function startRecording() {

    try {

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        mediaRecorder = new MediaRecorder(stream);

        audioChunks = [];

        

        mediaRecorder.ondataavailable = event => {

            audioChunks.push(event.data);

        };

        

        mediaRecorder.onstop = () => {

            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });

            const audioFile = new File([audioBlob], `voice-note-${Date.now()}.wav`, { type: 'audio/wav' });

            selectedFiles.push(audioFile);

            updateFilePreview();

            updateSendButton();

        };

        

        mediaRecorder.start();

        isRecording = true;

        

        const voiceBtn = document.getElementById('voiceBtn');

        const indicator = document.getElementById('recordingIndicator');

        

        voiceBtn.classList.add('recording');

        indicator.style.display = 'flex';

        

        showNotification('Recording voice note...', 'success');

        

    } catch (error) {

        showNotification('Microphone access denied', 'error');

    }

}



function stopRecording() {

    if (mediaRecorder && isRecording) {

        mediaRecorder.stop();

        mediaRecorder.stream.getTracks().forEach(track => track.stop());

        isRecording = false;

        

        const voiceBtn = document.getElementById('voiceBtn');

        const indicator = document.getElementById('recordingIndicator');

        

        voiceBtn.classList.remove('recording');

        indicator.style.display = 'none';

        

        showNotification('Voice note recorded!', 'success');

    }

}



// File upload handling

document.getElementById('fileInput').addEventListener('change', function(e) {

    const newFiles = Array.from(e.target.files);

    selectedFiles = [...selectedFiles, ...newFiles];

    updateFilePreview();

    updateSendButton();

    

    // Reset input

    e.target.value = '';

});



function updateFilePreview() {
    const preview = document.getElementById('filePreview');
    if (!preview) return;
    
    console.log('Updating preview, files:', selectedFiles); // Keep this for testing
    
    if (selectedFiles.length === 0) {
        preview.innerHTML = '';
        return;
    }
    
    preview.innerHTML = '';
    selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.style.cssText = 'display: flex; align-items: center; padding: 10px; background: #f5f5f5; border-radius: 8px; margin-bottom: 8px;';
        
        const iconType = file.type.startsWith('image/') ? 'image' :
            file.type.startsWith('video/') ? 'video' : 'file';
        
        fileItem.innerHTML = `
            <i class="fas fa-${iconType}" style="margin-right: 10px; color: #3498db;"></i>
            <span style="flex: 1; font-size: 14px;">${file.name}</span>
            <button onclick="removeFile(${index})" style="background: none; border: none; color: #e74c3c; cursor: pointer; padding: 5px;">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        preview.appendChild(fileItem);
    });
}


function getFileIcon(fileType) {

    if (fileType.startsWith('image/')) return 'fas fa-image';

    if (fileType.startsWith('video/')) return 'fas fa-video';

    if (fileType.startsWith('audio/')) return 'fas fa-microphone';

    if (fileType.includes('pdf')) return 'fas fa-file-pdf';

    if (fileType.includes('document') || fileType.includes('word')) return 'fas fa-file-word';

    return 'fas fa-file';

}



function formatFileSize(bytes) {

    if (bytes === 0) return '0 Bytes';

    const k = 1024;

    const sizes = ['Bytes', 'KB', 'MB', 'GB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];

}

function updateSendButton() {
   const sendBtn = document.getElementById('sendComplaint');
    const textarea = document.getElementById('complaintText');
    
    if (sendBtn && textarea) {
        const hasText = textarea.value.trim().length > 0;
        const hasFiles = selectedFiles.length > 0;
        sendBtn.disabled = !hasText && !hasFiles;
    }
}
 
async function showPreviousComplaints() {
    const modal = document.getElementById('previousComplaintsModal');
    const historyContainer = document.getElementById('complaintsHistory');
    
    const currentUser = auth.currentUser;
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    try {
        historyContainer.innerHTML = '<p style="text-align:center; padding:20px;">Loading complaints...</p>';
        
        // Get user's complaints from Firebase
        const snapshot = await db.collection('complaints')
            .where('userId', '==', currentUser.uid)
            .get();
        
        historyContainer.innerHTML = '';
        
        if (snapshot.empty) {
            historyContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No previous complaints found.</p>';
        } else {
            const complaints = [];
            snapshot.forEach(doc => {
                complaints.push({ id: doc.id, ...doc.data() });
            });
            
            // Sort by date (newest first)
            complaints.sort((a, b) => {
                if (!a.createdAt && !a.submittedAt) return 1;
                if (!b.createdAt && !b.submittedAt) return -1;
                const timeA = (a.createdAt || a.submittedAt).toMillis();
                const timeB = (b.createdAt || b.submittedAt).toMillis();
                return timeB - timeA;
            });
            
            // Display each complaint
            complaints.forEach(complaint => {
                const statusClass = complaint.status === 'resolved' ? 'status-resolved' : 'status-pending';
                const statusText = complaint.status === 'resolved' ? 'Resolved' : 'Pending';
                
                const timestamp = complaint.createdAt || complaint.submittedAt;
                const date = timestamp ? 
                    timestamp.toDate().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    }) : 'Just now';
                
                const complaintText = complaint.complaint || complaint.message || complaint.text || '';
                const preview = complaintText.length > 80 ? 
                    complaintText.substring(0, 80) + '...' : 
                    complaintText;
                
                const historyItem = document.createElement('div');
                historyItem.className = 'complaint-history-item';
                historyItem.innerHTML = `
                    <div class="complaint-history-header">
                        <span class="complaint-date">${date}</span>
                        <span class="complaint-status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="complaint-preview">${preview}</div>
                    ${complaint.response ? `
                        <div class="complaint-response">
                            <strong>HR Response:</strong> ${complaint.response}
                            ${complaint.respondedAt ? `<br><small>Responded on: ${complaint.respondedAt.toDate().toLocaleDateString()}</small>` : ''}
                        </div>
                    ` : ''}
                `;
                
                historyContainer.appendChild(historyItem);
            });
        }
        
        modal.style.display = 'block';
        
    } catch (error) {
        console.error('Load complaints error:', error);
        historyContainer.innerHTML = '<p style="text-align: center; color: #e74c3c; padding: 20px;">Failed to load complaints</p>';
    }
}


function closePreviousComplaints() {
    const modal = document.getElementById('previousComplaintsModal');
    if (modal) {
        modal.style.display = 'none';
    }
} 



// Close modal when clicking outside

document.getElementById('previousComplaintsModal').addEventListener('click', function(e) {

    if (e.target === this) {

        closePreviousComplaints();

    }

});






// Update the openAnnouncements function in hamburger menu

function openAnnouncements() {

    closeHamburgerMenu();

    showAnnouncementsPage();

}



function showAnnouncementsPage() {

    document.getElementById('announcementsPage').style.display = 'block';

    loadAnnouncements();

}





async function loadAnnouncements() {
    const container = document.getElementById('announcementsList');
    if (!container) return;
    
    const currentUser = auth.currentUser;
    if (!currentUser) {
        container.innerHTML = '<div style="text-align:center; padding:20px; color:#e74c3c;">Please login first</div>';
        return;
    }
    
    try {
        container.innerHTML = '<div style="text-align:center; padding:20px;">Loading announcements...</div>';
        
        // Get announcements from Firebase (newest first)
        const snapshot = await db.collection('announcements')
            .orderBy('timestamp', 'desc')
            .get();
        
        if (snapshot.empty) {
            container.innerHTML = '<div style="text-align:center; padding:20px; color:#999;">No announcements yet</div>';
            return;
        }
        
        container.innerHTML = '';
        currentAnnouncements = [];
        
        // Display each announcement
        snapshot.forEach(doc => {
            const announcement = { id: doc.id, ...doc.data() };
            currentAnnouncements.push(announcement);
            
            const card = document.createElement('div');
            card.className = 'announcement-card';
            card.onclick = () => showAnnouncementDetail(announcement);
            
            const date = announcement.timestamp ?
                announcement.timestamp.toDate().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }) : 'Just now';
            
            const hasLiked = announcement.likes && announcement.likes.includes(currentUser.uid);
            const likeCount = announcement.likes ? announcement.likes.length : 0;
            
            // Determine announcement type/icon
            let typeIcon = '📢';
            let typeClass = 'general';
            if (announcement.type === 'urgent') {
                typeIcon = '🚨';
                typeClass = 'urgent';
            } else if (announcement.type === 'warning') {
                typeIcon = '⚠️';
                typeClass = 'warning';
            }
            
            // Determine who posted it
            let postedBy = 'Staff';
            if (announcement.authorRole === 'admin') {
                postedBy = 'Admin';
            } else if (announcement.authorRole === 'supervisor') {
                postedBy = 'Supervisor';
            } else if (announcement.authorName) {
                postedBy = announcement.authorName;
            }
            
            card.innerHTML = `
                <div class="announcement-card-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px 12px 0 0; color: white; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -20px; right: -20px; font-size: 80px; opacity: 0.2;">${typeIcon}</div>
                    <div style="position: relative; z-index: 1;">
                        <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px; line-height: 1.4;">${announcement.title}</div>
                        <div style="font-size: 13px; opacity: 0.9; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-calendar-alt"></i>
                            ${date}
                        </div>
                    </div>
                </div>
                
                <div style="padding: 20px; background: white;">
                    <div style="color: #2c3e50; font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
                        ${announcement.text.substring(0, 120)}${announcement.text.length > 120 ? '...' : ''}
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 15px; border-top: 1px solid #f0f0f0;">
                        <div style="display: flex; align-items: center; gap: 8px; color: #667eea; font-weight: 500;">
                            <i class="fas fa-user-shield"></i>
                            ${postedBy}
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px; color: #999;">
                            <div style="display: flex; align-items: center; gap: 6px; background: ${hasLiked ? '#e8f5e9' : '#f5f5f5'}; padding: 6px 12px; border-radius: 20px;">
                                <i class="fas fa-thumbs-up" style="color: ${hasLiked ? '#4CAF50' : '#999'}; font-size: 14px;"></i>
                                <span style="font-size: 14px; font-weight: 500; color: ${hasLiked ? '#4CAF50' : '#666'};">${likeCount}</span>
                            </div>
                            <i class="fas fa-chevron-right" style="color: #667eea;"></i>
                        </div>
                    </div>
                </div>
            `;
            
            container.appendChild(card);
        });
        
    } catch (error) {
        console.error('Load announcements error:', error);
        container.innerHTML = '<div style="text-align:center; padding:20px; color:#e74c3c;">Failed to load announcements</div>';
    }
}

 

function showAnnouncementDetail(announcement) {
    currentAnnouncementDetail = announcement;
    
    const modal = document.getElementById('announcementDetailModal');
    const title = document.getElementById('detailTitle');
    const date = document.getElementById('detailDate');
    const body = document.getElementById('detailBody');
    const likeBtn = document.getElementById('detailLikeBtn');
    const likeText = document.getElementById('detailLikeText');
    
    if (!modal) return;
    
    const currentUser = auth.currentUser;
    const hasLiked = announcement.likes && announcement.likes.includes(currentUser.uid);
    const likeCount = announcement.likes ? announcement.likes.length : 0;
    
    const displayDate = announcement.timestamp ? 
        announcement.timestamp.toDate().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }) : 'Just now';
    
    title.textContent = announcement.title;
    date.textContent = displayDate;
    body.textContent = announcement.text;
    
    // Update like button
    if (hasLiked) {
        likeBtn.style.background = '#4CAF50';
        likeBtn.style.color = 'white';
        likeText.textContent = `Liked (${likeCount})`;
    } else {
        likeBtn.style.background = '#f0f0f0';
        likeBtn.style.color = '#333';
        likeText.textContent = `Like to show you received this (${likeCount})`;
    }
    
    // Show media if exists
    if (announcement.mediaUrl) {
        const mediaDiv = document.createElement('div');
        mediaDiv.style.marginTop = '15px';
        
        if (announcement.mediaType && announcement.mediaType.startsWith('image/')) {
            mediaDiv.innerHTML = `<img src="${announcement.mediaUrl}" style="max-width:100%; border-radius:8px; cursor:pointer;" onclick="viewImageFullscreen('${announcement.mediaUrl}')">`;
        } else if (announcement.mediaType && announcement.mediaType.startsWith('video/')) {
            mediaDiv.innerHTML = `<video controls style="max-width:100%; border-radius:8px;"><source src="${announcement.mediaUrl}" type="${announcement.mediaType}"></video>`;
        }
        
        body.appendChild(mediaDiv);
    }
    
    modal.style.display = 'flex';
}



function closeAnnouncementDetail() {

    document.getElementById('announcementDetailModal').style.display = 'none';

    currentAnnouncementDetail = null;

}

function closeAnnouncements() {
    document.getElementById('announcementsPage').style.display = 'none';
}


async function toggleDetailLike() {
    if (!currentAnnouncementDetail) return;
    
    const currentUser = auth.currentUser;
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    try {
        const announcementRef = db.collection('announcements').doc(currentAnnouncementDetail.id);
        const doc = await announcementRef.get();
        const data = doc.data();
        
        let likes = data.likes || [];
        const hasLiked = likes.includes(currentUser.uid);
        
        if (hasLiked) {
            // Remove like
            likes = likes.filter(uid => uid !== currentUser.uid);
        } else {
            // Add like
            likes.push(currentUser.uid);
        }
        
        // Update in Firebase
        await announcementRef.update({ likes: likes });
        
        // Update current announcement
        currentAnnouncementDetail.likes = likes;
        
        // Update UI
        const likeBtn = document.getElementById('detailLikeBtn');
        const likeText = document.getElementById('detailLikeText');
        
        if (!hasLiked) {
            likeBtn.style.background = '#4CAF50';
            likeBtn.style.color = 'white';
            likeText.textContent = `Liked (${likes.length})`;
            showNotification('Thank you for acknowledging!', 'success');
        } else {
            likeBtn.style.background = '#f0f0f0';
            likeBtn.style.color = '#333';
            likeText.textContent = `Like to show you received this (${likes.length})`;
        }
        
        // Reload announcements list
        loadAnnouncements();
        
    } catch (error) {
        console.error('Toggle like error:', error);
        showNotification('Failed to update like', 'error');
    }
}




function toggleAnnouncementLike(announcementId) {

    const announcement = currentAnnouncements.find(a => a.id === announcementId);

    if (!announcement) return;

    

    announcement.liked = !announcement.liked;

    announcement.likes += announcement.liked ? 1 : -1;

    

    if (announcement.liked) {

        showNotification('Thank you for confirming you received this announcement!', 'success');

    }

    

    renderAnnouncements(currentAnnouncements);

}



async function filterAnnouncements() {
    const dateInput = document.getElementById('dateFilter');
    if (!dateInput || !dateInput.value) return;
    
    const container = document.getElementById('announcementsList');
    if (!container) return;
    
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    try {
        container.innerHTML = '<div style="text-align:center; padding:20px;">Filtering...</div>';
        
        const filterDate = new Date(dateInput.value);
        filterDate.setHours(0, 0, 0, 0);
        
        const nextDay = new Date(filterDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        // Query announcements for specific date
        const snapshot = await db.collection('announcements')
            .where('timestamp', '>=', filterDate)
            .where('timestamp', '<', nextDay)
            .orderBy('timestamp', 'desc')
            .get();
        
        if (snapshot.empty) {
            container.innerHTML = '<div style="text-align:center; padding:20px; color:#999;">No announcements found for this date</div>';
            return;
        }
        
        container.innerHTML = '';
        
        snapshot.forEach(doc => {
            const announcement = { id: doc.id, ...doc.data() };
            
            const card = document.createElement('div');
            card.className = 'announcement-card';
            card.onclick = () => showAnnouncementDetail(announcement);
            
            const date = announcement.timestamp.toDate().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            const hasLiked = announcement.likes && announcement.likes.includes(currentUser.uid);
            const likeCount = announcement.likes ? announcement.likes.length : 0;
            
            card.innerHTML = `
                <div class="announcement-card-header">
                    <div class="announcement-card-title">${announcement.title}</div>
                    <div class="announcement-card-date">${date}</div>
                </div>
                <div class="announcement-card-preview">${announcement.text.substring(0, 100)}${announcement.text.length > 100 ? '...' : ''}</div>
                <div class="announcement-card-footer">
                    <div class="announcement-author">By: ${announcement.authorName}</div>
                    <div class="announcement-likes">
                        <i class="fas fa-thumbs-up" style="color: ${hasLiked ? '#4CAF50' : '#999'}"></i>
                        ${likeCount}
                    </div>
                </div>
            `;
            
            container.appendChild(card);
        });
        
    } catch (error) {
        console.error('Filter error:', error);
        showNotification('Failed to filter announcements', 'error');
    }
}


function clearDateFilter() {

    document.getElementById('dateFilter').value = '';

    renderAnnouncements(currentAnnouncements);

}



function formatDate(dateString) {

    const date = new Date(dateString);

    const options = { 

        year: 'numeric', 

        month: 'long', 

        day: 'numeric'

    };

    return date.toLocaleDateString('en-US', options);

}



// Close modal when clicking outside

document.getElementById('announcementDetailModal').addEventListener('click', function(e) {

    if (e.target === this) {

        closeAnnouncementDetail();

    }

});

// DIRECT MESSAGES - COMPLETE JAVASCRIPT

// Replace your existing direct message JavaScript with this complete version



// Variables for Direct Messages

let currentChatUser = null;

let messageListener = null;

let chatMessages = {};

let contacts = [];
let currentAnnouncements = [];
let currentAnnouncementDetail = null;
let announcementMediaFile = null;


// Variables for Voice Notes

let isRecordingVoice = false;

let voiceMediaRecorder = null;

let voiceAudioChunks = [];

let recordingStartTime = null;

let recordingTimer = null;



// Update the openDirectMessages function in hamburger menu

function openDirectMessages() {
    function initializeDirectMessages() {
    loadContacts();
}


    closeHamburgerMenu();

    showMessagesPage();

}



function showMessagesPage() {

    document.getElementById('messagesPage').style.display = 'block';

    document.getElementById('messagesListView').style.display = 'block';

    document.getElementById('chatInterface').style.display = 'none';

    loadContacts();

}



function closeMessages() {

    document.getElementById('messagesPage').style.display = 'none';

    currentChatUser = null;

}







async function openChat(user, userId) {
    currentChatUser = user;
    currentChatUser.uid = userId; // Add the uid to the user object
    
    document.getElementById('messagesListView').style.display = 'none';
    document.getElementById('chatInterface').style.display = 'flex';
    
    // Update chat header
    const chatAvatar = document.getElementById('chatAvatar');
    const chatUserName = document.getElementById('chatUserName');
    const chatUserStatus = document.getElementById('chatUserStatus');
    
    const initials = getInitials(user.fullName || user.email);
    
    if (chatAvatar) chatAvatar.textContent = initials;
    if (chatUserName) chatUserName.textContent = user.fullName || 'User';
    if (chatUserStatus) chatUserStatus.textContent = user.department || '';
    
    // Load messages with real-time updates
    await loadChatMessagesRealtime(userId);
    
    // Mark messages as read
    markMessagesAsRead(userId);
    
    updateSendButton();
} 




function backToMessagesList() {

    document.getElementById('chatInterface').style.display = 'none';

    document.getElementById('messagesListView').style.display = 'block';

    currentChatUser = null;

}



function initializeSampleMessages() {

    // Sample messages for each contact

    chatMessages = {

        1: [

            { id: 1, text: 'Hi! How are the new security protocols working out?', sender: 'me', time: '9:15 AM', status: 'read' },

            { id: 2, text: 'They are working great! Much more organized now.', sender: 'them', time: '9:20 AM', status: 'read' },

            { id: 3, text: 'Thanks for the update on the new protocols', sender: 'them', time: '10:30 AM', status: 'delivered' }

        ],

        2: [

            { id: 1, text: 'The perfume display you organized looks fantastic!', sender: 'me', time: 'Yesterday', status: 'read' },

            { id: 2, text: 'Thank you! I worked really hard on it.', sender: 'them', time: 'Yesterday', status: 'read' },

            { id: 3, text: 'The new display looks amazing!', sender: 'them', time: 'Yesterday', status: 'sent' }

        ],

        3: [

            { id: 1, text: 'Congratulations on employee of the month!', sender: 'me', time: '2 days ago', status: 'read' },

            { id: 2, text: 'Thank you so much! I really appreciate it.', sender: 'them', time: '2 days ago', status: 'read' }

        ],

        4: [

            { id: 1, text: 'Can we schedule a meeting about the new mixing procedures?', sender: 'me', time: '3 days ago', status: 'read' },

            { id: 2, text: 'Sure! How about tomorrow at 2 PM?', sender: 'them', time: '3 days ago', status: 'read' },

            { id: 3, text: 'Meeting scheduled for tomorrow at 2 PM', sender: 'them', time: '3 days ago', status: 'delivered' }

        ],

        5: [

            { id: 1, text: 'Have the leave documents been processed?', sender: 'me', time: '1 week ago', status: 'read' },

            { id: 2, text: 'Yes, all documents have been processed and approved.', sender: 'them', time: '1 week ago', status: 'read' },

            { id: 3, text: 'Documents have been processed', sender: 'them', time: '1 week ago', status: 'sent' }

        ]

    };

}



        // Handle different message types

async function loadContacts() {
    const container = document.getElementById('contactsList');
    if (!container) return;
    
    const currentUser = auth.currentUser;
    if (!currentUser) {
        container.innerHTML = '<div style="text-align:center; padding:20px; color:#e74c3c;">Please login first</div>';
        return;
    }
    
    try {
        container.innerHTML = '<div style="text-align:center; padding:20px;">Loading users...</div>';
        
        // Get all users from Firebase
        const usersSnapshot = await db.collection('users').get();
        
        if (usersSnapshot.empty) {
            container.innerHTML = '<div style="text-align:center; padding:20px; color:#999;">No users found</div>';
            return;
        }
        
        container.innerHTML = '';
        
        // Display each user (except current user)
        for (const doc of usersSnapshot.docs) {
            const user = doc.data();
            
            // Skip current user
            if (doc.id === currentUser.uid) continue;
            
            const conversationId = getConversationId(currentUser.uid, doc.id);
            
            // Get last message from conversation
            let lastMessage = 'Start conversation';
            let lastMessageTime = '';
            let unreadCount = 0;
            
            try {
                const convDoc = await db.collection('conversations').doc(conversationId).get();
                if (convDoc.exists) {
                    const convData = convDoc.data();
                    lastMessage = convData.lastMessage || 'Start conversation';
                    if (convData.lastMessageTime) {
                        lastMessageTime = formatMessageTime(convData.lastMessageTime.toDate());
                    }
                }
                
                // Count unread messages
                const unreadSnapshot = await db.collection('conversations')
                    .doc(conversationId)
                    .collection('messages')
                    .where('receiverId', '==', currentUser.uid)
                    .where('read', '==', false)
                    .get();
                unreadCount = unreadSnapshot.size;
            } catch (e) {
                console.log('No conversation yet');
            }
            
            // Create contact element
            const contactElement = document.createElement('div');
            contactElement.className = 'contact-item';
            contactElement.onclick = () => openChat(user, doc.id);
            
            const initials = getInitials(user.fullName || user.email);
            
            contactElement.innerHTML = `
                <div class="contact-avatar">
                    ${initials}
                </div>
                <div class="contact-info">
                    <div class="contact-name">${user.fullName || 'User'}</div>
                    <div class="contact-department">${user.department || 'Department'}</div>
                    <div class="last-message">${lastMessage}</div>
                </div>
                <div class="message-status">
                    ${lastMessageTime}
                    ${unreadCount > 0 ? `<div style="background: #ff4757; color: white; border-radius: 50%; width: 20px; height: 20px; font-size: 0.8rem; display: flex; align-items: center; justify-content: center; margin-top: 5px;">${unreadCount}</div>` : ''}
                </div>
            `;
            
            container.appendChild(contactElement);
        }
        
    } catch (error) {
        console.error('Load contacts error:', error);
        container.innerHTML = '<div style="text-align:center; padding:20px; color:#e74c3c;">Failed to load users</div>';
    }
}
async function sendMessage() {
    const input = document.getElementById('messageInput');
    if (!input || !currentChatUser) return;
    
    const messageText = input.value.trim();
    if (!messageText) return;
    
    const currentUser = auth.currentUser;
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    try {
        const conversationId = getConversationId(currentUser.uid, currentChatUser.uid);
        
        // Get sender name
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        
        // Save message
        await db.collection('conversations').doc(conversationId).collection('messages').add({
            text: messageText,
            senderId: currentUser.uid,
            senderName: userData.fullName || 'User',
            receiverId: currentChatUser.uid,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            read: false,
            type: 'text'
        });
        
        // Update conversation metadata
        await db.collection('conversations').doc(conversationId).set({
            participants: [currentUser.uid, currentChatUser.uid],
            lastMessage: messageText,
            lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
            lastMessageSender: currentUser.uid
        }, { merge: true });
        
        // Send notification to recipient
        await addSupervisorNotification(
            currentChatUser.uid,
            'message',
            `New Message from ${userData.fullName}`,
            messageText,
            'showMessages'
        );
        
        // Clear input
        input.value = '';
        updateSendButton();
        
    } catch (error) {
        console.error('Send message error:', error);
        showNotification('Failed to send message', 'error');
    }
} 
function handleMessageKeyPress(event) {

    if (event.key === 'Enter' && !event.shiftKey) {

        event.preventDefault();

        sendMessage();

    }

}



function updateSendButton() {

    const input = document.getElementById('messageInput');

    const sendBtn = document.getElementById('sendMessageBtn');

    

    if (input && sendBtn) {

        sendBtn.disabled = !input.value.trim();

    }

}



function viewUserProfile() {
    if (!currentChatUser) return;
    
    let modal = document.getElementById('staffProfileModal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'staffProfileModal';
        modal.className = 'profile-options-modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="profile-options-content" style="max-width: 400px;">
            <button class="profile-option-btn cancel" onclick="closeStaffProfileModal()" style="position: absolute; top: 10px; right: 10px; width: 40px; height: 40px; padding: 0; margin: 0;">
                <i class="fas fa-times"></i>
            </button>
            
            <div style="text-align: center; margin-top: 20px;">
                <div style="width: 120px; height: 120px; border-radius: 50%; background: linear-gradient(135deg, #669bbc, #478978); border: 3px solid gold; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; color: white; font-size: 2.5rem; font-weight: bold; box-shadow: 0 10px 30px rgba(0,0,0,0.15);">
                    ${currentChatUser.initials}
                </div>
                
                <h2 style="font-size: 1.5rem; color: #003049; margin-bottom: 5px;">
                    ${currentChatUser.name}
                </h2>
                
                <p style="color: #669bbc; font-size: 1rem; margin-bottom: 20px;">
                    ${currentChatUser.department}
                </p>
                
                <div style="background: #f8f9fa; border-radius: 12px; padding: 15px; margin-top: 20px;">
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                        <span style="color: #666;">Status:</span>
                        <span style="color: ${currentChatUser.online ? '#2ed573' : '#999'}; font-weight: 600;">
                            ${currentChatUser.online ? '● Online' : '○ Offline'}
                        </span>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; padding: 10px 0;">
                        <span style="color: #666;">Position:</span>
                        <span style="color: #333; font-weight: 600;">Staff Member</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    modal.classList.add('show');
}

function closeStaffProfileModal() {
    const modal = document.getElementById('staffProfileModal');
    if (modal) {
        modal.classList.remove('show');
    }
}



// Voice Note Functions

function toggleVoiceNote() {

    if (isRecordingVoice) {

        stopVoiceRecording();

    } else {

        startVoiceRecording();

    }

}



async function startVoiceRecording() {

    try {

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        voiceMediaRecorder = new MediaRecorder(stream);

        voiceAudioChunks = [];

        

        voiceMediaRecorder.ondataavailable = event => {

            voiceAudioChunks.push(event.data);

        };

        

        voiceMediaRecorder.onstop = () => {

            const audioBlob = new Blob(voiceAudioChunks, { type: 'audio/wav' });

            sendVoiceMessage(audioBlob);

        };

        

        voiceMediaRecorder.start();

        isRecordingVoice = true;

        recordingStartTime = Date.now();

        

        // Update button appearance

        const voiceBtn = document.getElementById('voiceNoteBtn');

        const timer = document.getElementById('recordingTimer');

        

        if (voiceBtn) voiceBtn.classList.add('recording');

        if (timer) {

            timer.style.display = 'block';

            recordingTimer = setInterval(updateRecordingTimer, 1000);

        }

        

        showNotification('Recording voice note...', 'success');

        

    } catch (error) {

        showNotification('Microphone access denied', 'error');

    }

}



function stopVoiceRecording() {

    if (voiceMediaRecorder && isRecordingVoice) {

        voiceMediaRecorder.stop();

        voiceMediaRecorder.stream.getTracks().forEach(track => track.stop());

        isRecordingVoice = false;

        

        const voiceBtn = document.getElementById('voiceNoteBtn');

        const timer = document.getElementById('recordingTimer');

        

        if (voiceBtn) voiceBtn.classList.remove('recording');

        if (timer) timer.style.display = 'none';

        

        if (recordingTimer) {

            clearInterval(recordingTimer);

            recordingTimer = null;

        }

        

        showNotification('Voice note recorded!', 'success');

    }

}



function updateRecordingTimer() {

    if (!recordingStartTime) return;

    

    const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);

    const minutes = Math.floor(elapsed / 60);

    const seconds = elapsed % 60;

    

    const timer = document.getElementById('recordingTimer');

    if (timer) {

        timer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    }

    

    // Auto-stop after 5 minutes

    if (elapsed >= 300) {

        stopVoiceRecording();

    }

}



async function sendVoiceMessage(audioBlob, duration) {
    if (!currentChatUser) return;
    
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    try {
        showNotification('Sending voice message...', 'info');
        
        // Convert to base64
        const base64 = await blobToBase64(audioBlob);
        
        const conversationId = getConversationId(currentUser.uid, currentChatUser.uid);
        
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        
        // Save voice message
        await db.collection('conversations').doc(conversationId).collection('messages').add({
            text: '',
            voiceUrl: base64,
            duration: duration,
            senderId: currentUser.uid,
            senderName: userData.fullName || 'User',
            receiverId: currentChatUser.uid,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            read: false,
            type: 'voice'
        });
        
        // Update conversation
        await db.collection('conversations').doc(conversationId).set({
            participants: [currentUser.uid, currentChatUser.uid],
            lastMessage: '🎤 Voice message',
            lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
            lastMessageSender: currentUser.uid
        }, { merge: true });
        
        showNotification('Voice message sent!', 'success');
        
    } catch (error) {
        console.error('Send voice error:', error);
        showNotification('Failed to send voice message', 'error');
    }
} 


function playVoiceMessage(messageId) {

    // Find the message with voice data

    let voiceMessage = null;

    for (let contactId in chatMessages) {

        const message = chatMessages[contactId].find(m => m.id === messageId);

        if (message && message.voice) {

            voiceMessage = message;

            break;

        }

    }

    

    if (!voiceMessage || !voiceMessage.voice.blob) {

        showNotification('Voice message not found', 'error');

        return;

    }

    

    // Create audio element and play

    const audio = new Audio();

    const audioUrl = URL.createObjectURL(voiceMessage.voice.blob);

    audio.src = audioUrl;

    

    audio.play().then(() => {

        showNotification('Playing voice message...', 'success');

    }).catch(error => {

        showNotification('Could not play voice message', 'error');

    });

    

    // Clean up URL when done

    audio.addEventListener('ended', () => {

        URL.revokeObjectURL(audioUrl);

    });

}



// File Upload Functions

function getFileIcon(fileType) {

    if (fileType && fileType.startsWith('image/')) return 'fas fa-image';

    if (fileType && fileType.startsWith('video/')) return 'fas fa-video';

    if (fileType && fileType.startsWith('audio/')) return 'fas fa-microphone';

    if (fileType && fileType.includes('pdf')) return 'fas fa-file-pdf';

    if (fileType && fileType.includes('document') || fileType && fileType.includes('word')) return 'fas fa-file-word';

    return 'fas fa-file';

}



function formatFileSizeForChat(bytes) {

    if (bytes === 0) return '0 Bytes';

    const k = 1024;

    const sizes = ['Bytes', 'KB', 'MB', 'GB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];

}



// File upload handling for chat

document.addEventListener('DOMContentLoaded', function() {

    const chatFileInput = document.getElementById('chatFileInput');

    if (chatFileInput) {

        chatFileInput.addEventListener('change', function(e) {

            const files = Array.from(e.target.files);

            

            files.forEach(file => {

                const fileMessage = {

                    id: Date.now() + Math.random(),

                    text: '',

                    file: {

                        name: file.name,

                        size: formatFileSizeForChat(file.size),

                        type: file.type

                    },

                    sender: 'me',

                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),

                    status: 'sent'

                };

                

                if (currentChatUser) {

                    if (!chatMessages[currentChatUser.id]) {

                        chatMessages[currentChatUser.id] = [];

                    }

                    

                    chatMessages[currentChatUser.id].push(fileMessage);

                    

                    // Update contact's last message

                    const contact = contacts.find(c => c.id === currentChatUser.id);

                    if (contact) {

                        contact.lastMessage = `📎 ${file.name}`;

                        contact.lastMessageTime = 'now';

                        renderContacts();

                    }

                    

                    loadChatMessages(currentChatUser.id);

                    

                    // Simulate status updates

                    setTimeout(() => {

                        fileMessage.status = 'delivered';

                        loadChatMessages(currentChatUser.id);

                    }, 1000);

                    

                    setTimeout(() => {

                        fileMessage.status = 'read';

                        loadChatMessages(currentChatUser.id);

                    }, 3000);

                }

            });

            

            showNotification(`${files.length} file(s) sent!`, 'success');

            e.target.value = '';

        });

    }

    

    // Initialize send button state

    updateSendButton();

});

// Update the openProfile function in hamburger menu

function openProfile() {

    closeHamburgerMenu();

    showProfilePage();

}

let currentProfilePic = null;

let profileData = {

    name: 'Ope Adeyemi',

    birthday: 'January 15, 1995',

    hobby: 'Reading',

    department: 'Security Department',

    awards: []

};

function showProfilePage() {
    loadUserData();
    loadProfileData();
   

    console.log('Opening profile page...');

    document.getElementById('profilePage').style.display = 'block';

    

}

function closeProfile() {

    document.getElementById('profilePage').style.display = 'none';

}



function loadProfileData() {
    const user = auth.currentUser;
    if (!user) return;
    
    db.collection('users').doc(user.uid).get()
        .then((doc) => {
            if (doc.exists) {
                const data = doc.data();
                
                // Update profile page fields
                const nameField = document.querySelector('#profileName, .profile-name');
                if (nameField) nameField.textContent = data.fullName || 'N/A';
                
                const birthdayField = document.querySelector('#profileBirthday, .profile-birthday');
                if (birthdayField) birthdayField.textContent = data.birthday || 'N/A';
                
                const hobbyField = document.querySelector('#profileHobby, .profile-hobby');
                if (hobbyField) hobbyField.textContent = data.hobby || 'N/A';
                
                const deptField = document.querySelector('#profileDepartment, .profile-department');
                if (deptField) deptField.textContent = formatDepartment(data.department) || 'N/A';
                
                // Profile picture on profile page
                const profilePic = document.querySelector('#profilePagePic');
                if (profilePic && data.profilePicture) {
                    profilePic.innerHTML = `<img src="${data.profilePicture}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
                }
            }
        });
}
// Helper to format department names
function formatDepartment(dept) {
    const deptNames = {
        'perfume': 'Perfume Section',
        'cream': 'Cream Section',
        'mixing': 'Mixing Section',
        'driver': 'Logistics',
        'domestic': 'Domestic',
        'office': 'Office-Admin',
        'security': 'Security',
        'printing': 'Printing',
        'store': 'Store',
        'maintenance': 'Maintenance'
    };
    return deptNames[dept] || dept;
}

function showPictureOptions() {

    const options = document.getElementById('pictureOptions');

    const isVisible = options.classList.contains('show');

    

    // Close all other options first

    document.querySelectorAll('.picture-options').forEach(opt => opt.classList.remove('show'));

    

    if (!isVisible) {

        options.classList.add('show');

        

        // Close when clicking outside

        setTimeout(() => {

            document.addEventListener('click', closePictureOptionsOnClick);

        }, 10);

    }

}



function closePictureOptionsOnClick(e) {

    if (!e.target.closest('.profile-picture-container')) {

        document.getElementById('pictureOptions').classList.remove('show');

        document.removeEventListener('click', closePictureOptionsOnClick);

    }

}



function changeProfilePicture() {

    document.getElementById('pictureOptions').classList.remove('show');

    document.getElementById('profileUploadModal').style.display = 'block';

}



function removeProfilePicture() {

    document.getElementById('pictureOptions').classList.remove('show');

    

    if (confirm('Are you sure you want to remove your profile picture?')) {

        currentProfilePic = null;

        const profilePic = document.getElementById('profilePicture');

        profilePic.classList.remove('has-image');

        profilePic.innerHTML = profileData.name.split(' ').map(n => n[0]).join('').toUpperCase();

        

        showNotification('Profile picture removed successfully!', 'success');

    }

}



function closeUploadModal() {

    document.getElementById('profileUploadModal').style.display = 'none';

    document.getElementById('imagePreview').innerHTML = '';

    document.getElementById('uploadConfirmBtn').disabled = true;

    document.getElementById('profilePicInput').value = '';

}



// Handle file selection

document.addEventListener('DOMContentLoaded', function() {

    const profilePicInput = document.getElementById('profilePicInput');

    if (profilePicInput) {

        profilePicInput.addEventListener('change', function(e) {

            const file = e.target.files[0];

            if (file) {

                if (file.type.startsWith('image/')) {

                    const reader = new FileReader();

                    reader.onload = function(e) {

                        const preview = document.getElementById('imagePreview');

                        preview.innerHTML = `<img src="${e.target.result}" alt="Preview" class="preview-image">`;

                        document.getElementById('uploadConfirmBtn').disabled = false;

                        currentProfilePic = e.target.result;

                    };

                    reader.readAsDataURL(file);

                } else {

                    showNotification('Please select an image file', 'error');

                }

            }

        });

    }

});



function confirmProfilePicture() {

    if (currentProfilePic) {

        const profilePic = document.getElementById('profilePicture');

        profilePic.classList.add('has-image');

        profilePic.innerHTML = `<img src="${currentProfilePic}" alt="Profile Picture">`;

        

        closeUploadModal();

        showNotification('Profile picture updated successfully!', 'success');

    }

}









// Simulate receiving awards (for demo)

function awardStaff(award) {

    profileData.awards.push(award);

    loadProfileData();

    showNotification(`Congratulations! You received: ${award}`, 'success');

}



// Demo function to add sample award

function addSampleAward() {

    const awards = [

        'Staff of the Week',

        'Employee of the Month',

        'Best Team Player',

        'Excellence Award',

        'Outstanding Performance'

    ];

    

    const randomAward = awards[Math.floor(Math.random() * awards.length)];

    if (!profileData.awards.includes(randomAward)) {

        awardStaff(randomAward);

    }

}



// Profile data management functions for future backend integration

function updateProfileData(field, value) {

    profileData[field] = value;

    loadProfileData();

}



function getProfileData() {

    return {

        ...profileData,

        profilePicture: currentProfilePic

    };

}



// Close modals when clicking outside

document.getElementById('profileUploadModal').addEventListener('click', function(e) {

    if (e.target === this) {

        closeUploadModal();

    }

});



console.log('Profile page loaded successfully!');

console.log('Demo function: addSampleAward() - adds a random award');







function viewImageFile(imageSrc) {

    // Create modal for image preview

    const modal = document.createElement('div');

    modal.style.cssText = `

        position: fixed;

        top: 0;

        left: 0;

        width: 100%;

        height: 100vh;

        background: rgba(0,0,0,0.9);

        z-index: 3000;

        display: flex;

        align-items: center;

        justify-content: center;

        cursor: pointer;

    `;

    

    const img = document.createElement('img');

    img.src = imageSrc;

    img.style.cssText = `

        max-width: 90%;

        max-height: 90%;

        object-fit: contain;

    `;

    

    modal.appendChild(img);

    document.body.appendChild(modal);

    

    // Close on click

    modal.onclick = () => {

        document.body.removeChild(modal);

    };

}

async function deleteMessage(conversationId, messageId) {
    if (!confirm('Delete this message?')) return;
    
    try {
        await db.collection('conversations')
            .doc(conversationId)
            .collection('messages')
            .doc(messageId)
            .delete();
        
        showNotification('Message deleted', 'success');
    } catch (error) {
        console.error('Delete error:', error);
        showNotification('Failed to delete message', 'error');
    }
}




// Anonymous Reporting JavaScript

let selectedEvidenceFiles = [];

let isSubmittingReport = false;



// Update the openAnonymous function

function openAnonymous() {

    closeHamburgerMenu();

    showAnonymousPage();

}



function showAnonymousPage() {

    document.getElementById('anonymousPage').style.display = 'block';

    

    // Set current user name

    const usernameSpan = document.querySelector('.username-placeholder');

    if (usernameSpan && currentUser) {

        usernameSpan.textContent = currentUser.name;

    }

    

    // Reset form

    resetAnonymousForm();

    updateSubmitButton();

    

    // Setup event listeners if not already done

    setupAnonymousEventListeners();

}



function closeAnonymous() {

    document.getElementById('anonymousPage').style.display = 'none';

    resetAnonymousForm();

}



function setupAnonymousEventListeners() {

    // Evidence upload box click

    const uploadBox = document.getElementById('evidenceUploadBox');

    const fileInput = document.getElementById('evidenceFileInput');

    const textarea = document.getElementById('anonymousText');

    

    if (uploadBox && fileInput) {

        uploadBox.onclick = () => fileInput.click();

        

        fileInput.onchange = function(e) {

            handleEvidenceUpload(e);

        };

    }

    

    // Textarea character counting

    if (textarea) {

        textarea.oninput = function() {

            updateCharacterCount();

            updateSubmitButton();

        };

    }

}



function handleEvidenceUpload(event) {

    const files = Array.from(event.target.files);

    const maxFiles = 10;

    const maxFileSize = 50 * 1024 * 1024; // 50MB per file

    

    // Validate file count

    if (selectedEvidenceFiles.length + files.length > maxFiles) {

        showNotification(`Maximum ${maxFiles} files allowed`, 'error');

        return;

    }

    

    // Validate and add files

    files.forEach(file => {

        if (file.size > maxFileSize) {

            showNotification(`File "${file.name}" is too large (max 50MB)`, 'error');

            return;

        }

        

        // Check for duplicates

        const isDuplicate = selectedEvidenceFiles.some(f => 

            f.name === file.name && f.size === file.size

        );

        

        if (isDuplicate) {

            showNotification(`File "${file.name}" already added`, 'error');

            return;

        }

        

        selectedEvidenceFiles.push(file);

    });

    

    // Reset input

    event.target.value = '';

    

    // Update display

    updateEvidencePreview();

    updateSubmitButton();

    

    if (files.length > 0) {

        showNotification(`${files.length} evidence file(s) added`, 'success');

    }

}



function updateEvidencePreview() {

    const previewContainer = document.getElementById('evidencePreview');

    if (!previewContainer) return;

    

    if (selectedEvidenceFiles.length === 0) {

        previewContainer.classList.remove('has-files');

        previewContainer.innerHTML = '';

        return;

    }

    

    previewContainer.classList.add('has-files');

    previewContainer.innerHTML = '';

    

    selectedEvidenceFiles.forEach((file, index) => {

        const evidenceItem = document.createElement('div');

        evidenceItem.className = 'evidence-item';

        

        const iconClass = getEvidenceFileIcon(file.type);

        const iconCategory = getIconCategory(file.type);

        const fileSize = formatFileSize(file.size);

        

        evidenceItem.innerHTML = `

            <div class="evidence-icon ${iconCategory}">

                <i class="${iconClass}"></i>

            </div>

            <div class="evidence-info">

                <div class="evidence-name">${file.name}</div>

                <div class="evidence-size">${fileSize}</div>

            </div>

            <button class="evidence-remove" onclick="removeEvidenceFile(${index})" title="Remove file">

                ×

            </button>

        `;

        

        previewContainer.appendChild(evidenceItem);

    });

}



function getEvidenceFileIcon(fileType) {

    if (fileType.startsWith('image/')) return 'fas fa-image';

    if (fileType.startsWith('video/')) return 'fas fa-video';

    if (fileType.startsWith('audio/')) return 'fas fa-microphone';

    if (fileType.includes('pdf')) return 'fas fa-file-pdf';

    if (fileType.includes('document') || fileType.includes('word')) return 'fas fa-file-word';

    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return 'fas fa-file-excel';

    return 'fas fa-file-alt';

}



function getIconCategory(fileType) {

    if (fileType.startsWith('image/')) return 'image';

    if (fileType.startsWith('video/')) return 'video';

    if (fileType.startsWith('audio/')) return 'audio';

    return 'document';

}



function removeEvidenceFile(index) {

    if (index >= 0 && index < selectedEvidenceFiles.length) {

        const removedFile = selectedEvidenceFiles[index];

        selectedEvidenceFiles.splice(index, 1);

        

        updateEvidencePreview();

        updateSubmitButton();

        

        showNotification(`Removed "${removedFile.name}"`, 'success');

    }

}



function updateCharacterCount() {

    const textarea = document.getElementById('anonymousText');

    const charCount = document.getElementById('charCount');

    const counter = document.querySelector('.char-counter');

    

    if (!textarea || !charCount) return;

    

    const currentLength = textarea.value.length;

    const maxLength = 2000;

    

    charCount.textContent = currentLength;

    

    // Update counter color based on usage

    counter.classList.remove('warning', 'danger');

    

    if (currentLength > maxLength * 0.8) {

        counter.classList.add('warning');

    }

    

    if (currentLength > maxLength * 0.95) {

        counter.classList.add('danger');

    }

}



function updateSubmitButton() {
    const submitBtn = document.getElementById('submitEvidenceBtn');
    const textarea = document.getElementById('anonymousText');
    
    if (submitBtn && textarea) {
        const hasText = textarea.value.trim().length > 0;
        const hasFiles = selectedEvidenceFiles.length > 0;
        
        if (isSubmittingReport) {
            submitBtn.disabled = true;
        } else {
            submitBtn.disabled = !hasText && !hasFiles;
        }
    }
}




function resetAnonymousForm() {

    const textarea = document.getElementById('anonymousText');

    

    if (textarea) {

        textarea.value = '';

    }

    

    selectedEvidenceFiles = [];

    updateEvidencePreview();

    updateCharacterCount();

    updateSubmitButton();

}

async function submitAnonymousReport() {
    if (isSubmittingReport) return;
    
    const textarea = document.getElementById('anonymousText');
    const reportText = textarea ? textarea.value.trim() : '';
    
    // Validation
    if (!reportText && selectedEvidenceFiles.length === 0) {
        showNotification('Please provide text description or upload evidence', 'error');
        return;
    }
    
    if (reportText.length > 2000) {
        showNotification('Text description is too long (max 2000 characters)', 'error');
        return;
    }
    
    const currentUser = auth.currentUser;
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    try {
        // Start submission
        isSubmittingReport = true;
        const submitBtn = document.getElementById('submitEvidenceBtn');
        
        if (submitBtn) {
            submitBtn.classList.add('loading');
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        }
        
        showNotification('Submitting anonymous report...', 'info');
        
        // Convert files to base64
        const evidenceFiles = [];
        for (const file of selectedEvidenceFiles) {
            const base64 = await fileToBase64(file);
            evidenceFiles.push({
                type: file.type,
                name: file.name,
                size: file.size,
                data: base64
            });
        }
        
        // Create anonymous report
        const report = {
            text: reportText,
            evidence: evidenceFiles,
            submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'pending',
            submittedBy: currentUser.uid, // Track who submitted but keep content anonymous
            viewed: false
        };
        
        // Save to Firebase
        await db.collection('anonymous_reports').add(report);
        // Create notification for user
await createNotification(
    currentUser.uid,
    'system',
    'Anonymous Report Submitted',
    'Your anonymous report has been submitted successfully and is under review',
    null
);
        
        // Success
        isSubmittingReport = false;
        
        if (submitBtn) {
            submitBtn.classList.remove('loading');
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Evidence';
        }
        
        // Show success message
        showNotification('Anonymous report submitted successfully!', 'success');
        
        // Reset form
        if (textarea) textarea.value = '';
        selectedEvidenceFiles = [];
        
        const preview = document.getElementById('evidencePreview');
        if (preview) preview.innerHTML = '';
        
        updateSubmitButton();
        
        // Close anonymous page after 2 seconds
        setTimeout(() => {
            closeAnonymous();
        }, 2000);
        
    } catch (error) {
        console.error('Submit anonymous error:', error);
        isSubmittingReport = false;
        
        const submitBtn = document.getElementById('submitEvidenceBtn');
        if (submitBtn) {
            submitBtn.classList.remove('loading');
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Evidence';
        }
        
        showNotification('Failed to submit report', 'error');
    }
}




function processAnonymousSubmission(reportText) {

    try {

        // Create report object

        const report = {

            id: 'ANON_' + Date.now(),

            text: reportText,

            files: selectedEvidenceFiles.map(file => ({

                name: file.name,

                size: file.size,

                type: file.type

            })),

            timestamp: new Date().toISOString(),

            status: 'submitted'

        };

        

        // Store in localStorage for demo (in real app, this would be sent to server)

        const existingReports = JSON.parse(localStorage.getItem('anonymousReports') || '[]');

        existingReports.push(report);

        localStorage.setItem('anonymousReports', JSON.stringify(existingReports));

        

        // Show success

        showSuccessModal();

        

        // Reset form after short delay

        setTimeout(() => {

            resetAnonymousForm();

            resetSubmitButton();

        }, 1000);

        

    } catch (error) {

        console.error('Submission error:', error);

        showNotification('Submission failed. Please try again.', 'error');

        resetSubmitButton();

    }

}



function resetSubmitButton() {

    isSubmittingReport = false;

    const submitBtn = document.getElementById('submitEvidenceBtn');

    

    if (submitBtn) {

        submitBtn.classList.remove('loading');

        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Evidence';

    }

    

    updateSubmitButton();

}



function showSuccessModal() {

    const modal = document.getElementById('anonymousSuccessModal');

    if (modal) {

        modal.style.display = 'block';

    }

}



function closeSuccessModal() {

    const modal = document.getElementById('anonymousSuccessModal');

    if (modal) {

        modal.style.display = 'none';

    }

    

    // Close anonymous page after modal closes

    setTimeout(() => {

        closeAnonymous();

    }, 300);

}



// Close success modal when clicking outside

document.addEventListener('DOMContentLoaded', function() {

    const modal = document.getElementById('anonymousSuccessModal');

    if (modal) {

        modal.addEventListener('click', function(e) {

            if (e.target === this) {

                closeSuccessModal();

            }

        });

    }

});



// Utility function for file size formatting

function formatFileSize(bytes) {

    if (bytes === 0) return '0 Bytes';

    const k = 1024;

    const sizes = ['Bytes', 'KB', 'MB', 'GB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];

}



// Auto-save draft functionality (optional)

function saveDraft() {

    const textarea = document.getElementById('anonymousText');

    if (textarea && textarea.value.trim()) {

        localStorage.setItem('anonymousDraft', textarea.value);

    }

}



function loadDraft() {

    const draft = localStorage.getItem('anonymousDraft');

    const textarea = document.getElementById('anonymousText');

    

    if (draft && textarea) {

        textarea.value = draft;

        updateCharacterCount();

        updateSubmitButton();

    }

}



function clearDraft() {

    localStorage.removeItem('anonymousDraft');

}



// Save draft periodically

setInterval(saveDraft, 30000); // Save every 30 seconds



// QUERIES FEATURE JAVASCRIPT

// Add these variables at the top of your script.js with other global variables



let userQueries = [];

let currentQueryForReply = null;

let queryReplyFiles = [];

let isRecordingQueryVoice = false;

let queryVoiceRecorder = null;

let queryAudioChunks = [];



// Update the openQueries function (replace the existing one in hamburger menu)

function openQueries() {

    closeHamburgerMenu();

    showQueriesPage();

}



function showQueriesPage() {

    document.getElementById('queriesPage').style.display = 'block';

    loadUserQueries();

}



function closeQueryRepliesModal() {
    const modal = document.getElementById('queryRepliesModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function closeQueries() {
    const queriesPage = document.getElementById('queriesPage');
    if (queriesPage) {
        queriesPage.style.display = 'none';
    }
} 

async function loadUserQueries() {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    try {
        // Get queries issued to this user
        const snapshot = await db.collection('queries')
            .where('userId', '==', currentUser.uid)
            .get();
        
        if (snapshot.empty) {
            userQueries = [];
            renderUserQueries();
            return;
        }
        
        userQueries = [];
        snapshot.forEach(doc => {
            userQueries.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort by date (newest first)
        userQueries.sort((a, b) => {
            if (!a.issuedAt) return 1;
            if (!b.issuedAt) return -1;
            return b.issuedAt.toMillis() - a.issuedAt.toMillis();
        });
        
        renderUserQueries();
        
    } catch (error) {
        console.error('Load queries error:', error);
        showNotification('Failed to load queries', 'error');
    }
}

function renderUserQueries() {
    const container = document.getElementById('queriesDisplay');
    if (!container) return;
    
    if (userQueries.length === 0) {
        // Get current user name
        const currentUser = auth.currentUser;
        let userName = 'Staff';
        
        if (currentUser) {
            db.collection('users').doc(currentUser.uid).get().then(doc => {
                if (doc.exists) {
                    userName = doc.data().fullName || 'Staff';
                    container.querySelector('.username-highlight').textContent = userName;
                }
            });
        }
        
        container.innerHTML = `
            <div class="no-queries-message">
                <div class="no-queries-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h3 class="no-queries-title">Keep up the good behavior!</h3>
                <p class="no-queries-text">
                    Dear <span class="username-highlight">${userName}</span>, 
                    you don't have any query yet. Continue maintaining excellent work ethics and professional conduct.
                </p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    userQueries.forEach(query => {
        const queryCard = document.createElement('div');
        queryCard.className = `query-card level-${query.level}`;
        
        const levelNames = {
            1: 'Level 1 Query',
            2: 'Level 2 Query',
            3: 'Level 3 Query',
            4: 'Level 4 Query'
        };
        
        const levelIcons = {
            1: 'fa-exclamation-circle',
            2: 'fa-exclamation-triangle',
            3: 'fa-ban',
            4: 'fa-times-circle'
        };
        
        // Format date from Firebase timestamp
        const date = query.issuedAt ? 
            query.issuedAt.toDate().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }) : 'Just now';
        
        queryCard.innerHTML = `
            <div class="query-card-header">
                <div class="query-level-badge level-${query.level}">
                    <i class="fas ${levelIcons[query.level]}"></i>
                    ${levelNames[query.level]}
                </div>
                <div class="query-date">${date}</div>
            </div>
            
            <div class="query-message-box">
                <div class="query-message-label">Reason for Query</div>
                <div class="query-reason">${query.reason}</div>
            </div>
            
            <div class="query-status">
                <span class="status-badge status-${query.status}">
                    ${query.status === 'pending' ? 'Awaiting Your Response' : 'Response Submitted'}
                </span>
                ${query.status === 'pending' 
                    ? `<button class="reply-query-btn" onclick="showQueryReplySection('${query.id}')">
                        <i class="fas fa-reply"></i> Reply to Query
                    </button>`
                    : `<button class="view-reply-btn" onclick="viewQueryReplies('${query.id}')">
                        <i class="fas fa-eye"></i> View Replies (${query.replies ? query.replies.length : 0})
                    </button>`
                }
            </div>
        `;
        
        container.appendChild(queryCard);
    });
}
 


function renderQueryReplies(replies) {

    if (replies.length === 0) return '';

    

    return `

        <div class="reply-history">

            <div class="reply-history-title">Reply History</div>

            ${replies.map(reply => `

                <div class="reply-item">

                    <div class="reply-item-header">

                        <span class="reply-sender">${reply.sender}</span>

                        <span class="reply-time">${reply.time}</span>

                    </div>

                    <div class="reply-text">${reply.text}</div>

                </div>

            `).join('')}

        </div>

    `;

}



function openQueryReply(queryId) {

    const query = userQueries.find(q => q.id === queryId);

    if (!query) return;

    

    currentQueryForReply = query;

    showQueryReplySection();

    

    // Scroll to reply section

    const replySection = document.getElementById('queryReplySection');

    replySection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

}

function viewQueryReplies(queryId) {
    const query = userQueries.find(q => q.id === queryId);
    if (!query) return;
    
    const modal = document.getElementById('queryRepliesModal');
    const container = document.getElementById('queryRepliesContainer');
    
    if (!modal || !container) return;
    
    container.innerHTML = '';
    
    if (!query.replies || query.replies.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:20px; color:#999;">No replies yet</p>';
    } else {
        query.replies.forEach(reply => {
            const replyDiv = document.createElement('div');
            replyDiv.style.cssText = 'background:#f5f5f5; padding:15px; border-radius:8px; margin-bottom:10px;';
            
            const time = reply.timestamp ? 
                reply.timestamp.toDate().toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : 'Just now';
            
            replyDiv.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <strong>${reply.sender}</strong>
                    <span style="color:#666; font-size:0.9rem;">${time}</span>
                </div>
                <div style="color:#333; line-height:1.6;">${reply.text}</div>
                ${reply.attachments && reply.attachments.length > 0 ? `
                    <div style="margin-top:10px;">
                        <strong>Attachments:</strong>
                        ${reply.attachments.map(att => `<div><i class="fas fa-paperclip"></i> ${att.name}</div>`).join('')}
                    </div>
                ` : ''}
            `;
            
            container.appendChild(replyDiv);
        });
    }
    
    modal.style.display = 'flex';
} 




function showQueryReplySection(queryId) {
    const query = userQueries.find(q => q.id === queryId);
    if (!query) return;
    
    currentQueryForReply = query;
    
    const replySection = document.getElementById('queryReplySection');
    if (replySection) {
        replySection.style.display = 'block';
        
        // Scroll to reply section
        setTimeout(() => {
            replySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
}
 
function hideQueryReplySection() {
    const replySection = document.getElementById('queryReplySection');
    if (replySection) {
        replySection.style.display = 'none';
    }
    currentQueryForReply = null;
}





function updateReplyCharCount() {

    const textarea = document.getElementById('queryReplyText');

    const charCount = document.getElementById('replyCharCount');

    

    if (textarea && charCount) {

        charCount.textContent = textarea.value.length;

    }

}



function updateReplySendButton() {

    const textarea = document.getElementById('queryReplyText');

    const sendBtn = document.getElementById('querySendBtn');

    

    if (textarea && sendBtn) {

        const hasText = textarea.value.trim().length > 0;

        const hasFiles = queryReplyFiles.length > 0;

        sendBtn.disabled = !hasText && !hasFiles;

    }

}



function updateReplyFilePreview() {

    const preview = document.getElementById('replyFilePreview');

    

    if (queryReplyFiles.length === 0) {

        preview.classList.remove('has-files');

        preview.innerHTML = '';

        return;

    }

    

    preview.classList.add('has-files');

    preview.innerHTML = '';

    

    queryReplyFiles.forEach((file, index) => {

        const fileItem = document.createElement('div');

        fileItem.className = 'file-preview-item';

        

        const iconClass = getFileIcon(file.type);

        const fileSize = formatFileSize(file.size);

        

        fileItem.innerHTML = `

            <i class="${iconClass} file-preview-icon"></i>

            <div class="file-preview-info">

                <div class="file-preview-name">${file.name}</div>

                <div class="file-preview-size">${fileSize}</div>

            </div>

            <button class="remove-file" onclick="removeQueryReplyFile(${index})">×</button>

        `;

        

        preview.appendChild(fileItem);

    });

}



function removeQueryReplyFile(index) {

    queryReplyFiles.splice(index, 1);

    updateReplyFilePreview();

    updateReplySendButton();

}



// Handle file input for query replies

document.addEventListener('DOMContentLoaded', function() {

    const queryFileInput = document.getElementById('queryFileInput');

    if (queryFileInput) {

        queryFileInput.addEventListener('change', function(e) {

            const newFiles = Array.from(e.target.files);

            queryReplyFiles = [...queryReplyFiles, ...newFiles];

            updateReplyFilePreview();

            updateReplySendButton();

            e.target.value = '';

        });

    }

    

    // Character counter for reply textarea

    const replyTextarea = document.getElementById('queryReplyText');

    if (replyTextarea) {

        replyTextarea.addEventListener('input', function() {

            updateReplyCharCount();

            updateReplySendButton();

        });

    }

});


async function submitQueryReply() {
    if (!currentQueryForReply) {
        showNotification('No query selected for reply', 'error');
        return;
    }
    
    const replyText = document.getElementById('queryReplyText').value.trim();
    
    if (!replyText && queryReplyFiles.length === 0) {
        showNotification('Please write a response or attach files', 'error');
        return;
    }
    
    const currentUser = auth.currentUser;
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    try {
        showNotification('Submitting reply...', 'info');
        
        // Get user data
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        
        // Convert files to base64
        const attachments = [];
        for (const file of queryReplyFiles) {
            const base64 = await fileToBase64(file);
            attachments.push({
                type: file.type,
                name: file.name,
                size: file.size,
                data: base64
            });
        }
        
        // Create reply object
        const reply = {
            sender: userData.fullName || 'User',
            senderId: currentUser.uid,
            text: replyText,
            attachments: attachments,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Get current replies
        const queryRef = db.collection('queries').doc(currentQueryForReply.id);
        const queryDoc = await queryRef.get();
        const currentReplies = queryDoc.data().replies || [];
        
        // Add new reply
        currentReplies.push(reply);
        
        // Update query with reply
        await queryRef.update({
            replies: currentReplies,
            status: 'replied',
            lastReplyAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Create notification for user
        await createNotification(
            currentUser.uid,
            'query',
            'Query Reply Submitted',
            `Your response to Level ${currentQueryForReply.level} query has been submitted to HR`,
            null
        );
        
        showNotification('Your response has been submitted to HR successfully!', 'success');
        
        // Reset form
        document.getElementById('queryReplyText').value = '';
        queryReplyFiles = [];
        updateReplyFilePreview();
        updateReplySendButton();
        
        // Hide reply section
        hideQueryReplySection();
        
        // Reload queries
        await loadUserQueries();
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
    } catch (error) {
        console.error('Submit reply error:', error);
        showNotification('Failed to submit reply', 'error');
    }
}


// Voice Recording for Query Replies

function toggleQueryVoiceRecording() {

    if (isRecordingQueryVoice) {

        stopQueryVoiceRecording();

    } else {

        startQueryVoiceRecording();

    }

}



async function startQueryVoiceRecording() {

    try {

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        queryVoiceRecorder = new MediaRecorder(stream);

        queryAudioChunks = [];

        

        queryVoiceRecorder.ondataavailable = event => {

            queryAudioChunks.push(event.data);

        };

        

        queryVoiceRecorder.onstop = () => {

            const audioBlob = new Blob(queryAudioChunks, { type: 'audio/wav' });

            const audioFile = new File([audioBlob], `query-voice-${Date.now()}.wav`, { type: 'audio/wav' });

            queryReplyFiles.push(audioFile);

            updateReplyFilePreview();

            updateReplySendButton();

        };

        

        queryVoiceRecorder.start();

        isRecordingQueryVoice = true;

        

        const voiceBtn = document.getElementById('queryVoiceBtn');

        const indicator = document.getElementById('queryRecordingIndicator');

        

        voiceBtn.classList.add('recording');

        indicator.style.display = 'flex';

        

        showNotification('Recording voice note for query reply...', 'success');

        

    } catch (error) {

        showNotification('Microphone access denied', 'error');

    }

}



function stopQueryVoiceRecording() {

    if (queryVoiceRecorder && isRecordingQueryVoice) {

        queryVoiceRecorder.stop();

        queryVoiceRecorder.stream.getTracks().forEach(track => track.stop());

        isRecordingQueryVoice = false;

        

        const voiceBtn = document.getElementById('queryVoiceBtn');

        const indicator = document.getElementById('queryRecordingIndicator');

        

        voiceBtn.classList.remove('recording');

        indicator.style.display = 'none';

        

        showNotification('Voice note recorded and attached!', 'success');

    }

}



// Demo function to add a sample query (for testing)

function addSampleQuery(level) {

    const queryReasons = {

        1: 'Minor policy violation: Using personal phone during work hours without authorization.',

        2: 'Repeated tardiness: Late arrival to work on multiple occasions without valid reason.',

        3: 'Serious misconduct: Disrespectful behavior towards a colleague during team meeting.'

    };

    

    const newQuery = {

        id: userQueries.length + 1,

        level: level,

        reason: queryReasons[level],

        date: new Date().toISOString().split('T')[0],

        status: 'pending',

        replies: []

    };

    

    userQueries.push(newQuery);

    renderUserQueries();

    showNotification(`Level ${level} query added (Demo)`, 'success');

}



console.log('Queries feature loaded successfully!');

console.log('Demo functions: addSampleQuery(1), addSampleQuery(2), addSampleQuery(3)');



// REQUEST SYSTEM JAVASCRIPT

// Add these variables at the top of your script.js with other global variables



let currentRequestType = null;

let dayoffFiles = [];

let dayoffStartDate = null;

let dayoffDaysCount = null;

let isDayoffVoiceRecording = false;

let dayoffVoiceRecorder = null;

let dayoffAudioChunks = [];

let guarantorPicture = null;



// Update the openRequests function (replace existing one)

function openRequests() {

    closeHamburgerMenu();

    showRequestPage();

}



function showRequestPage() {

    document.getElementById('requestPage').style.display = 'block';

    showRequestTypeSelection();

}



function closeRequestPage() {

    document.getElementById('requestPage').style.display = 'none';

    resetRequestForms();

}



function showRequestTypeSelection() {

    document.getElementById('requestTypeSelection').style.display = 'block';

    document.getElementById('dayoffFormContainer').style.display = 'none';

    document.getElementById('loanFormContainer').style.display = 'none';

    currentRequestType = null;

}



function backToRequestSelection() {
    document.getElementById('dayoffFormContainer').style.display = 'none';
    document.getElementById('loanFormContainer').style.display = 'none';
    document.getElementById('requestTypeSelection').style.display = 'block';
} 



function selectRequestType(type) {

    currentRequestType = type;

    

    document.getElementById('requestTypeSelection').style.display = 'none';

    

    if (type === 'dayoff') {

        document.getElementById('dayoffFormContainer').style.display = 'block';

        setupDayoffForm();

    } else if (type === 'loan') {

        document.getElementById('loanFormContainer').style.display = 'block';

        setupLoanForm();

    }

    

    window.scrollTo({ top: 0, behavior: 'smooth' });

}



// DAY OFF FUNCTIONS

function setupDayoffForm() {

    // Reset form

    document.getElementById('dayoffStartDate').value = '';

    document.getElementById('daysOffCount').value = '';

    document.getElementById('dayoffReason').value = '';

    dayoffFiles = [];

    dayoffStartDate = null;

    dayoffDaysCount = null;

    updateDayoffCharCount();

    updateDayoffSubmitButton();

    

    // Setup event listeners

    const fileInput = document.getElementById('dayoffFileInput');

    if (fileInput) {

        fileInput.onchange = handleDayoffFileUpload;

    }

    

    const textarea = document.getElementById('dayoffReason');

    if (textarea) {

        textarea.oninput = function() {

            updateDayoffCharCount();

            updateDayoffSubmitButton();

        };

    }

}



function updateDayoffDisplay() {
    const startDateInput = document.getElementById('dayoffStartDate');
    const selectedDisplay = document.getElementById('selectedDateDisplay');
    
    if (!startDateInput.value) {
        selectedDisplay.innerHTML = '';
        dayoffStartDate = null;
        return;
    }
    
    dayoffStartDate = new Date(startDateInput.value);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = dayoffStartDate.toLocaleDateString('en-US', options);
    
    selectedDisplay.innerHTML = `
        <div style="background: #e3f2fd; padding: 10px; border-radius: 8px; margin-top: 10px;">
            <strong>Selected Start Date:</strong> ${dateString}
        </div>
    `;
    
    // Recalculate return date if days count is already selected
    calculateReturnDate();
}




function calculateReturnDate() {

    const daysSelect = document.getElementById('daysOffCount');

    const returnDisplay = document.getElementById('returnDateDisplay');

    

    if (!dayoffStartDate || !daysSelect.value) {

        returnDisplay.classList.remove('active');

        return;

    }

    

    dayoffDaysCount = parseInt(daysSelect.value);

    const returnDate = new Date(dayoffStartDate);

    returnDate.setDate(returnDate.getDate() + dayoffDaysCount);

    

    const formattedReturn = returnDate.toLocaleDateString('en-US', {

        weekday: 'long',

        year: 'numeric',

        month: 'long',

        day: 'numeric'

    });

    

    returnDisplay.textContent = `Expected Return Date: ${formattedReturn}`;

    returnDisplay.classList.add('active');

    

    updateDayoffSubmitButton();

}



function updateDayoffCharCount() {

    const textarea = document.getElementById('dayoffReason');

    const charCount = document.getElementById('dayoffCharCount');

    

    if (textarea && charCount) {

        charCount.textContent = textarea.value.length;

    }

}



function handleDayoffFileUpload(e) {

    const files = Array.from(e.target.files);

    dayoffFiles = [...dayoffFiles, ...files];

    

    updateDayoffFilePreview();

    updateDayoffSubmitButton();

    

    e.target.value = '';

    

    if (files.length > 0) {

        showNotification(`${files.length} file(s) attached`, 'success');

    }

}



function updateDayoffFilePreview() {

    const preview = document.getElementById('dayoffAttachmentPreview');

    

    if (dayoffFiles.length === 0) {

        preview.classList.remove('has-files');

        preview.innerHTML = '';

        return;

    }

    

    preview.classList.add('has-files');

    preview.innerHTML = '';

    

    dayoffFiles.forEach((file, index) => {

        const fileItem = document.createElement('div');

        fileItem.className = 'file-preview-item';

        

        const iconClass = getFileIcon(file.type);

        const fileSize = formatFileSize(file.size);

        

        fileItem.innerHTML = `

            <i class="${iconClass} file-preview-icon"></i>

            <div class="file-preview-info">

                <div class="file-preview-name">${file.name}</div>

                <div class="file-preview-size">${fileSize}</div>

            </div>

            <button class="remove-file" onclick="removeDayoffFile(${index})">×</button>

        `;

        

        preview.appendChild(fileItem);

    });

}



function removeDayoffFile(index) {

    dayoffFiles.splice(index, 1);

    updateDayoffFilePreview();

    updateDayoffSubmitButton();

}



function toggleDayoffVoice() {

    if (isDayoffVoiceRecording) {

        stopDayoffVoiceRecording();

    } else {

        startDayoffVoiceRecording();

    }

}



async function startDayoffVoiceRecording() {

    try {

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        dayoffVoiceRecorder = new MediaRecorder(stream);

        dayoffAudioChunks = [];

        

        dayoffVoiceRecorder.ondataavailable = event => {

            dayoffAudioChunks.push(event.data);

        };

        

        dayoffVoiceRecorder.onstop = () => {

            const audioBlob = new Blob(dayoffAudioChunks, { type: 'audio/wav' });

            const audioFile = new File([audioBlob], `dayoff-voice-${Date.now()}.wav`, { type: 'audio/wav' });

            dayoffFiles.push(audioFile);

            updateDayoffFilePreview();

            updateDayoffSubmitButton();

        };

        

        dayoffVoiceRecorder.start();

        isDayoffVoiceRecording = true;

        

        const voiceBtn = document.getElementById('dayoffVoiceBtn');

        const indicator = document.getElementById('dayoffVoiceIndicator');

        

        voiceBtn.classList.add('recording');

        indicator.style.display = 'flex';

        

        showNotification('Recording voice note...', 'success');

        

    } catch (error) {

        showNotification('Microphone access denied', 'error');

    }

}



function stopDayoffVoiceRecording() {

    if (dayoffVoiceRecorder && isDayoffVoiceRecording) {

        dayoffVoiceRecorder.stop();

        dayoffVoiceRecorder.stream.getTracks().forEach(track => track.stop());

        isDayoffVoiceRecording = false;

        

        const voiceBtn = document.getElementById('dayoffVoiceBtn');

        const indicator = document.getElementById('dayoffVoiceIndicator');

        

        voiceBtn.classList.remove('recording');

        indicator.style.display = 'none';

        

        showNotification('Voice note recorded!', 'success');

    }

}



function updateDayoffSubmitButton() {

    const submitBtn = document.getElementById('dayoffSubmitBtn');

    const textarea = document.getElementById('dayoffReason');

    

    if (submitBtn && textarea) {

        const hasDate = dayoffStartDate !== null;

        const hasDays = dayoffDaysCount !== null;

        const hasReason = textarea.value.trim().length > 0;

        

        submitBtn.disabled = !(hasDate && hasDays && hasReason);

    }

}


async function submitDayoffRequest() {
    const reason = document.getElementById('dayoffReason').value.trim();
    
    if (!dayoffStartDate || !dayoffDaysCount || !reason) {
        showNotification('Please fill all required fields', 'error');
        return;
    }
    
    const currentUser = auth.currentUser;
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    try {
        showNotification('Submitting request...', 'info');
        
        // Get user data
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        
        // Calculate return date
        const returnDate = new Date(dayoffStartDate);
        returnDate.setDate(returnDate.getDate() + parseInt(dayoffDaysCount));
        
        // Create request object
        const request = {
            userId: currentUser.uid,
            userName: userData.fullName || 'User',
            userEmail: userData.email,
            userDepartment: userData.department || 'N/A',
            type: 'dayoff',
            startDate: dayoffStartDate.toISOString(),
            endDate: returnDate.toISOString(),
            daysCount: parseInt(dayoffDaysCount),
            reason: reason,
            submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'pending'
        };
        
        // Save to Firebase
        await db.collection('requests').add(request);
        
        // Create notification for user
        await createNotification(
            currentUser.uid,
            'request',
            'Day Off Request Submitted',
            `Your ${dayoffDaysCount} day(s) off request has been submitted for review`,
            null
        );
        
        // Show success modal
        showRequestSuccessModal(
            'Day Off Request Submitted!', 
            'Your day off request has been submitted to admin for review. You will be notified once a decision is made.'
        );
        
        // Reset form
        resetDayoffForm();
        
    } catch (error) {
        console.error('Submit day-off error:', error);
        showNotification('Failed to submit request', 'error');
    }
}



function resetDayoffForm() {
    document.getElementById('dayoffStartDate').value = '';
    document.getElementById('daysOffCount').value = '';
    document.getElementById('dayoffReason').value = '';
    document.getElementById('selectedDateDisplay').innerHTML = '';
    document.getElementById('returnDateDisplay').innerHTML = '';
    
    dayoffStartDate = null;
    dayoffDaysCount = null;
    dayoffFiles = [];
    
    const preview = document.getElementById('dayoffAttachmentPreview');
    if (preview) preview.innerHTML = '';
}
 



let selectedRepaymentPlan

// LOAN FUNCTIONS
function setupLoanForm() {
    // Reset form
    document.getElementById('loanAmountDropdown').value = '';
    document.getElementById('customLoanAmount').value = '';
    document.getElementById('repaymentPlanDropdown').value = ''; // NEW
    document.getElementById('guarantorName').value = '';
    document.getElementById('guarantorDepartment').value = '';
    document.getElementById('guarantorPhone').value = '';
    guarantorPicture = null;
    selectedRepaymentPlan = ''; // NEW
    updateGuarantorPreview();
    updateLoanSubmitButton();
    
    // Setup guarantor picture upload
    const uploadBox = document.getElementById('guarantorUploadBox');
    const pictureInput = document.getElementById('guarantorPictureInput');
    
    if (uploadBox && pictureInput) {
        uploadBox.onclick = () => pictureInput.click();
        pictureInput.onchange = handleGuarantorPictureUpload;
    }
    
    // Setup form validation
    ['repaymentPlanDropdown', 'guarantorName', 'guarantorDepartment', 'guarantorPhone'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.oninput = updateLoanSubmitButton;
            input.onchange = updateLoanSubmitButton;
        }
    });
}




function handleLoanAmountChange() {
    const dropdown = document.getElementById('loanAmountDropdown');
    const customInput = document.getElementById('customLoanAmount');
    
    if (dropdown.value) {
        customInput.value = '';
        customInput.disabled = true;
    } else {
        customInput.disabled = false;
    }
} 



function handleGuarantorPictureUpload(e) {

    const file = e.target.files[0];

    

    if (file) {

        if (!file.type.startsWith('image/')) {

            showNotification('Please select an image file', 'error');

            return;

        }

        

        const reader = new FileReader();

        reader.onload = function(e) {

            guarantorPicture = e.target.result;

            updateGuarantorPreview();

            updateLoanSubmitButton();

            showNotification('Guarantor picture uploaded', 'success');

        };

        reader.readAsDataURL(file);

    }

    

    e.target.value = '';

}



function updateGuarantorPreview() {

    const preview = document.getElementById('guarantorPreview');

    

    if (!guarantorPicture) {

        preview.classList.remove('active');

        preview.innerHTML = '';

        return;

    }

    

    preview.classList.add('active');

    preview.innerHTML = `

        <img src="${guarantorPicture}" alt="Guarantor" class="guarantor-preview-image">

        <button class="change-guarantor-btn" onclick="changeGuarantorPicture()">

            <i class="fas fa-camera"></i> Change Picture

        </button>

    `;

}



function changeGuarantorPicture() {

    document.getElementById('guarantorPictureInput').click();

}

function updateLoanSubmitButton() {
    const submitBtn = document.getElementById('loanSubmitBtn');
    const dropdown = document.getElementById('loanAmountDropdown');
    const customInput = document.getElementById('customLoanAmount');
    const repaymentPlan = document.getElementById('repaymentPlanDropdown').value; // NEW
    const guarantorName = document.getElementById('guarantorName').value.trim();
    const guarantorDept = document.getElementById('guarantorDepartment').value;
    const guarantorPhone = document.getElementById('guarantorPhone').value.trim();
    
    const loanAmount = dropdown.value || customInput.value;
    const isValid = loanAmount && 
                    repaymentPlan && // NEW
                    guarantorName && 
                    guarantorDept && 
                    guarantorPhone && 
                    guarantorPicture;
    
    if (submitBtn) {
        submitBtn.disabled = !isValid;
    }
}

async function submitLoanRequest() {
    const dropdown = document.getElementById('loanAmountDropdown');
    const customInput = document.getElementById('customLoanAmount');
    const repaymentPlan = document.getElementById('repaymentPlanDropdown').value;
    const guarantorName = document.getElementById('guarantorName').value.trim();
    const guarantorDept = document.getElementById('guarantorDepartment').value;
    const guarantorPhone = document.getElementById('guarantorPhone').value.trim();
    
    // Validate
    if (!repaymentPlan) {
        showNotification('Please select repayment plan', 'error');
        return;
    }
    
    if (!guarantorPicture) {
        showNotification('Please upload guarantor picture', 'error');
        return;
    }
    
    if (!guarantorName || !guarantorDept || !guarantorPhone) {
        showNotification('Please fill all guarantor information', 'error');
        return;
    }
    
    const loanAmount = dropdown.value || customInput.value;
    if (!loanAmount || parseInt(loanAmount) < 1000) {
        showNotification('Please select or enter a valid loan amount', 'error');
        return;
    }
    
    const currentUser = auth.currentUser;
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    try {
        showNotification('Submitting loan application...', 'info');
        
        // Get user data
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        
        // Convert guarantor picture to base64
        let guarantorPictureBase64 = null;
        
        if (guarantorPicture instanceof File || guarantorPicture instanceof Blob) {
            guarantorPictureBase64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(guarantorPicture);
            });
        } else if (typeof guarantorPicture === 'string') {
            guarantorPictureBase64 = guarantorPicture;
        } else {
            throw new Error('Invalid guarantor picture format');
        }
        
        // Create request object
        const request = {
            userId: currentUser.uid,
            userName: userData.fullName || 'User',
            userEmail: userData.email,
            userDepartment: userData.department || 'N/A',
            type: 'loan',
            amount: parseInt(loanAmount),
            repaymentPlan: repaymentPlan, // NEW - Save repayment plan
            guarantor: {
                name: guarantorName,
                department: guarantorDept,
                phone: guarantorPhone,
                picture: guarantorPictureBase64
            },
            createdAt: firebase.firestore.FieldValue.serverTimestamp(), // CHANGED from submittedAt
            status: 'pending'
        };
        
        // Save to Firebase
        await db.collection('requests').add(request);
        
        // Create notification for user
        await createNotification(
            currentUser.uid,
            'request',
            'Loan Application Submitted',
            `Your loan application for ₦${parseInt(loanAmount).toLocaleString()} has been submitted for review`,
            null
        );
        
        // Show success modal
        showRequestSuccessModal(
            'Loan Application Submitted!', 
            'Your loan application has been submitted successfully and is now under review by the admin. You will be notified once a decision is made.'
        );
        
        // Reset form
        resetLoanForm();
        
    } catch (error) {
        console.error('Submit loan error:', error);
        showNotification('Failed to submit application: ' + error.message, 'error');
    }
} 



function resetLoanForm() {
    document.getElementById('loanAmountDropdown').value = '';
    document.getElementById('customLoanAmount').value = '';
    document.getElementById('guarantorName').value = '';
    document.getElementById('guarantorDepartment').value = '';
    document.getElementById('guarantorPhone').value = '';
    
    guarantorPicture = null;
    
    const preview = document.getElementById('guarantorPreview');
    if (preview) preview.innerHTML = '';
    
    const uploadBox = document.getElementById('guarantorUploadBox');
    if (uploadBox) {
        uploadBox.innerHTML = `
            <i class="fas fa-plus"></i>
            <span>Click to upload guarantor picture</span>
        `;
    }
} 



function resetRequestForms() {

    resetDayoffForm();

    resetLoanForm();

}



// SUCCESS MODAL

function showRequestSuccessModal(title, message) {
    const modal = document.getElementById('requestSuccessModal');
    const titleElement = document.getElementById('requestSuccessTitle');
    const messageElement = document.getElementById('requestSuccessMessage');
    
    if (titleElement) titleElement.textContent = title;
    if (messageElement) messageElement.textContent = message;
    
    if (modal) modal.style.display = 'flex';
}
 


function closeRequestSuccessModal() {
    const modal = document.getElementById('requestSuccessModal');
    if (modal) modal.style.display = 'none';
    
    // Go back to request selection
    backToRequestSelection();
}



// Close modal on outside click

document.addEventListener('DOMContentLoaded', function() {

    const modal = document.getElementById('requestSuccessModal');

    if (modal) {

        modal.addEventListener('click', function(e) {

            if (e.target === this) {

                closeRequestSuccessModal();

            }

        });

    }

});



console.log('Request System loaded successfully!');

console.log('Features: Day Off requests ✓, Loan applications ✓');



let notifications = [];

let unreadCount = 0;

let unreadMessages = 0;
let unreadAnnouncements = 0;
let unreadNotifications = 0; 

// Update the openNotifications function

function openNotifications() {

    closeHamburgerMenu();

    showNotificationsPage();

}



function showNotificationsPage() {

    document.getElementById('notificationsPage').style.display = 'block';

    loadNotifications();

}



function closeNotifications() {

    document.getElementById('notificationsPage').style.display = 'none';

}

// ==================== LOAD NOTIFICATIONS (FIXED) ====================
async function loadNotifications() {
    const container = document.getElementById('notificationsList');
    if (!container) return;
    
    const currentUser = auth.currentUser;
    if (!currentUser) {
        container.innerHTML = '<div style="text-align:center; padding:20px; color:#e74c3c;">Please login first</div>';
        return;
    }
    
    try {
        container.innerHTML = '<div style="text-align:center; padding:20px;">Loading notifications...</div>';
        
        // Get notifications for current user
        const snapshot = await db.collection('notifications')
            .where('userId', '==', currentUser.uid)
            .get();
        
        if (snapshot.empty) {
            container.innerHTML = `
                <div class="no-notifications">
                    <i class="fas fa-bell-slash"></i>
                    <h3>No notifications found</h3>
                    <p>You don't have any notifications yet.</p>
                </div>
            `;
            notifications = [];
            updateUnreadCount();
            return;
        }
        
        notifications = [];
        snapshot.forEach(doc => {
            notifications.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort by newest first - check both timestamp and createdAt
        notifications.sort((a, b) => {
            const timestampA = a.createdAt || a.timestamp;
            const timestampB = b.createdAt || b.timestamp;
            
            if (!timestampA) return 1;
            if (!timestampB) return -1;
            
            return timestampB.toMillis() - timestampA.toMillis();
        });
        
        updateUnreadCount();
        renderNotifications(notifications);
        updateNotificationBadges();
        
    } catch (error) {
        console.error('Load notifications error:', error);
        container.innerHTML = '<div style="text-align:center; padding:20px; color:#e74c3c;">Failed to load notifications</div>';
    }
}

// ==================== RENDER NOTIFICATIONS (FIXED) ====================
function renderNotifications(notificationsList) {
    const container = document.getElementById('notificationsList');
    
    if (notificationsList.length === 0) {
        container.innerHTML = `
            <div class="no-notifications">
                <i class="fas fa-bell-slash"></i>
                <h3>No notifications found</h3>
                <p>You don't have any notifications for the selected date.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    notificationsList.forEach(notification => {
        const notificationElement = document.createElement('div');
        notificationElement.className = `notification-item ${notification.unread ? 'unread' : ''}`;
        notificationElement.onclick = () => handleNotificationClick(notification);
        
        const iconClass = getNotificationIcon(notification.type);
        
        // Format time - check both fields
        const timestamp = notification.createdAt || notification.timestamp;
        const time = timestamp ?
            formatNotificationTime(timestamp.toDate()) : 'Just now';
        
        // Get message text - check multiple possible fields
        const messageText = notification.message || notification.text || 'No details available';
        
        notificationElement.innerHTML = `
            ${notification.unread ? '<div class="unread-indicator"></div>' : ''}
            <div class="notification-header">
                <div class="notification-icon icon-${notification.type}">
                    <i class="${iconClass}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${notification.title || 'Notification'}</div>
                    <div class="notification-text">${messageText}</div>
                    <div class="notification-meta">
                        <div class="notification-time">
                            <i class="fas fa-clock"></i>
                            ${time}
                        </div>
                        ${notification.unread ? '<span class="notification-badge">New</span>' : ''}
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(notificationElement);
    });
}

// ==================== HANDLE NOTIFICATION CLICK (NEW) ====================
async function handleNotificationClick(notification) {
    // Mark as read
    try {
        await db.collection('notifications').doc(notification.id).update({
            unread: false,
            read: true
        });
        
        // Update local state
        notification.unread = false;
        updateUnreadCount();
        updateNotificationBadges();
        
    } catch (error) {
        console.error('Mark as read error:', error);
    }
    
    // Handle different notification types
    switch(notification.type) {
        case 'request_approved':
        case 'request_rejected':
        case 'dayoff_approved':
        case 'dayoff_rejected':
            // Show alert with admin's response
            showNotification(`${notification.title}: ${notification.message}`, 'success');
            break;
            
        case 'complaint_reply':
            // Open complaints page to see admin's reply
            closeNotifications();
            showComplaints();
            break;
            
        case 'announcement':
        case 'system':
        case 'message':
        default:
            // Just show the notification content
            showNotification(notification.message || notification.text, 'success');
            break;
    }
}


function getNotificationIcon(type) {

    const icons = {

        announcement: 'fas fa-bullhorn',

        message: 'fas fa-envelope',

        query: 'fas fa-exclamation-triangle',

        request: 'fas fa-clipboard-list',

        award: 'fas fa-trophy',

        system: 'fas fa-cog'

    };

    

    return icons[type] || 'fas fa-bell';

}



async function handleNotificationClick(notification) {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    try {
        // Mark as read in Firebase
        if (notification.unread) {
            await db.collection('notifications')
                .doc(notification.id)
                .update({ unread: false });
            
            // Update local
            notification.unread = false;
            updateUnreadCount();
            renderNotifications(notifications);
        }
        
        // Navigate to relevant page
        if (notification.action) {
            closeNotifications();
            setTimeout(() => {
                if (typeof window[notification.action] === 'function') {
                    window[notification.action]();
                } else {
                    showNotification('Opening ' + notification.type + '...', 'success');
                }
            }, 300);
        } else {
            showNotification('Notification opened', 'success');
        }
        
    } catch (error) {
        console.error('Handle notification error:', error);
    }
} 

function filterNotifications() {
    const selectedDate = document.getElementById('notificationDateFilter').value;
    
    if (!selectedDate) {
        renderNotifications(notifications);
        return;
    }
    
    const filterDate = new Date(selectedDate);
    filterDate.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(filterDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    const filtered = notifications.filter(notification => {
        if (!notification.timestamp) return false;
        const notifDate = new Date(notification.timestamp.toDate());
        notifDate.setHours(0, 0, 0, 0);
        return notifDate.getTime() === filterDate.getTime();
    });
    
    renderNotifications(filtered);
}
 


function clearNotificationFilter() {
    document.getElementById('notificationDateFilter').value = '';
    renderNotifications(notifications);
}
 


async function markAllAsRead() {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    try {
        // Get all unread notifications
        const snapshot = await db.collection('notifications')
            .where('userId', '==', currentUser.uid)
            .where('unread', '==', true)
            .get();
        
        if (snapshot.empty) {
            showNotification('No unread notifications', 'info');
            return;
        }
        
        // Update all in batch
        const batch = db.batch();
        snapshot.forEach(doc => {
            batch.update(doc.ref, { unread: false });
        });
        
        await batch.commit();
        
        // Update local
        notifications.forEach(notification => {
            notification.unread = false;
        });
        
        updateUnreadCount();
        renderNotifications(notifications);
        showNotification('All notifications marked as read', 'success');
        
    } catch (error) {
        console.error('Mark all read error:', error);
        showNotification('Failed to mark as read', 'error');
    }
} 



function updateUnreadCount() {
    const unreadCount = notifications.filter(n => n.unread).length;
    
    // Update any unread count displays
    const countElements = document.querySelectorAll('.unread-count');
    countElements.forEach(el => {
        el.textContent = unreadCount;
    });
}
 


// Function to add new notification (for future use with backend)

function addNotification(type, title, text, action = null) {

    const newNotification = {

        id: Date.now(),

        type: type,

        title: title,

        text: text,

        time: 'Just now',

        timestamp: Date.now(),

        unread: true,

        action: action

    };

    

    notifications.unshift(newNotification);

    updateUnreadCount();

    

    // Show toast notification

    showNotification('New notification received!', 'success');

}



// Demo function to test adding notifications

function addTestNotification() {

    const types = ['announcement', 'message', 'query', 'request', 'award', 'system'];

    const randomType = types[Math.floor(Math.random() * types.length)];

    

    addNotification(

        randomType,

        'Test Notification',

        'This is a test notification to demonstrate the notification system.',

        'openNotifications'

    );

    

    if (document.getElementById('notificationsPage').style.display === 'block') {

        renderNotifications(notifications);

    }

}



console.log('Notifications page loaded successfully!');

console.log('Demo function: addTestNotification() - adds a test notification');



// Replace existing showCreatePost function

function showCreatePost() {

    document.getElementById('createPostModal').style.display = 'block';

    selectPostType('text');

}



function closeCreatePost() {

    document.getElementById('createPostModal').style.display = 'none';

    resetCreatePostForm();

}



function selectPostType(type) {

    selectedPostType = type;

    

    // Update buttons

    document.querySelectorAll('.post-type-btn').forEach(btn => {

        btn.classList.remove('active');

        if (btn.dataset.type === type) {

            btn.classList.add('active');

        }

    });

    

    // Update sections

    document.querySelectorAll('.post-section').forEach(section => {

        section.classList.remove('active');

    });

    

    document.getElementById(`${type}PostSection`).classList.add('active');

    

    // Setup event listeners for media sections

    if (type === 'photo') {

        setupPhotoUpload();

    } else if (type === 'video') {

        setupVideoUpload();

    }

}



function resetCreatePostForm() {

    document.getElementById('textPostContent').value = '';

    document.getElementById('textCharCount').textContent = '0';

    

    selectedPhotoFile = null;

    selectedVideoFile = null;

    

    document.getElementById('photoPreview').classList.remove('has-media');

    document.getElementById('photoPreview').innerHTML = '';

    document.getElementById('photoCaptionSection').style.display = 'none';

    document.getElementById('photoCaption').value = '';

    

    document.getElementById('videoPreview').classList.remove('has-media');

    document.getElementById('videoPreview').innerHTML = '';

    document.getElementById('videoCaptionSection').style.display = 'none';

    document.getElementById('videoCaption').value = '';
    document.getElementById('photoUploadArea').style.display = 'flex';
document.getElementById('videoUploadArea').style.display = 'flex';

}



// Text Post Functions

function initializeTextPostListeners() {

    const textInput = document.getElementById('textPostContent');

    if (textInput) {

        textInput.addEventListener('input', function() {

            const charCount = document.getElementById('textCharCount');

            if (charCount) {

                charCount.textContent = this.value.length;

            }

            updatePublishButton();

        });

    }

}



function updatePublishButton() {

    const btn = document.getElementById('publishTextBtn');

    const input = document.getElementById('textPostContent');

    

    if (btn && input) {

        btn.disabled = input.value.trim().length === 0;

    }

}



// TEXT POST - FIREBASE VERSION
async function publishTextPost() {
    const content = document.getElementById('textPostContent').value.trim();
    if (!content) return showNotification('Write something first', 'error');
    
    const user = auth.currentUser;
    if (!user) return showNotification('Login required', 'error');
    
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        
        await db.collection('posts').add({
            type: 'text',
            content: content,
            userId: user.uid,
            userName: userData.fullName,
            userInitials: getInitials(userData.fullName),
            userPhoto: userData.profilePicture || null,
            likes: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        closeCreatePost();
        showNotification('Posted!', 'success');
        loadPosts();
    } catch (error) {
        showNotification('Failed: ' + error.message, 'error');
    }
}

// Photo Post Functions

function setupPhotoUpload() {

    const uploadArea = document.getElementById('photoUploadArea');

    const fileInput = document.getElementById('photoInput');

    

    if (!uploadArea || !fileInput) return;

    

    uploadArea.onclick = () => fileInput.click();

    

    fileInput.onchange = function(e) {

        const file = e.target.files[0];

        if (file && file.type.startsWith('image/')) {

            handlePhotoSelection(file);

        } else {

            showNotification('Please select a valid image file', 'error');

        }

    };

}



function handlePhotoSelection(file) {

    const maxSize = 10 * 1024 * 1024; // 10MB

    

    if (file.size > maxSize) {

        showNotification('Image file is too large (max 10MB)', 'error');

        return;

    }

    

    selectedPhotoFile = file;

    

    const reader = new FileReader();

    reader.onload = function(e) {

        const preview = document.getElementById('photoPreview');

        preview.innerHTML = `<img src="${e.target.result}" alt="Photo preview">`;

        preview.classList.add('has-media');

        

document.getElementById('photoUploadArea').style.display = 'none';
document.getElementById('photoCaptionSection').style.display = 'block';
    };

    reader.readAsDataURL(file);

}



function cancelPhotoUpload() {

    selectedPhotoFile = null;

    document.getElementById('photoPreview').classList.remove('has-media');

    document.getElementById('photoPreview').innerHTML = '';

    document.getElementById('photoCaptionSection').style.display = 'none';

    document.getElementById('photoCaption').value = '';

    document.getElementById('photoInput').value = '';

}


async function publishPhotoPost() {
    if (!selectedPhotoFile) return;
    
    const caption = document.getElementById('photoCaption').value.trim();
    const user = auth.currentUser;
    if (!user) return;
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            const userData = userDoc.data();
            
            // Compress image
            const img = new Image();
            img.onload = async function() {
                const canvas = document.createElement('canvas');
                const MAX = 800;
                let w = img.width, h = img.height;
                if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; }}
                else { if (h > MAX) { w *= MAX / h; h = MAX; }}
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                const compressed = canvas.toDataURL('image/jpeg', 0.7);
                
                await db.collection('posts').add({
                    type: 'photo',
                    content: caption,
                    mediaUrl: compressed,
                    userId: user.uid,
                    userName: userData.fullName,
                    userInitials: getInitials(userData.fullName),
                    likes: [],
                    comments: [],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                closeCreatePost();
                showNotification('Photo posted!', 'success');
                loadPosts();
            };
            img.src = e.target.result;
        } catch (error) {
            showNotification('Failed: ' + error.message, 'error');
        }
    };
    reader.readAsDataURL(selectedPhotoFile);
}



// Video Post Functions

function setupVideoUpload() {

    const uploadArea = document.getElementById('videoUploadArea');

    const fileInput = document.getElementById('videoInput');

    

    if (!uploadArea || !fileInput) return;

    

    uploadArea.onclick = () => fileInput.click();

    

    fileInput.onchange = function(e) {

        const file = e.target.files[0];

        if (file && file.type.startsWith('video/')) {

            handleVideoSelection(file);

        } else {

            showNotification('Please select a valid video file', 'error');

        }

    };

}



function handleVideoSelection(file) {
    const maxSize = 50 * 1024 * 1024;
    
    if (file.size > maxSize) {
        showNotification('Video file is too large (max 50MB)', 'error');
        return;
    }
    
    selectedVideoFile = file;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('videoPreview');
        preview.innerHTML = `<video src="${e.target.result}#t=0.1" preload="metadata"></video>`;
        preview.classList.add('has-media');
        
        document.getElementById('videoUploadArea').style.display = 'none';
        document.getElementById('videoCaptionSection').style.display = 'block';
    };
    reader.readAsDataURL(file);
}


function cancelVideoUpload() {

    selectedVideoFile = null;

    document.getElementById('videoPreview').classList.remove('has-media');

    document.getElementById('videoPreview').innerHTML = '';

    document.getElementById('videoCaptionSection').style.display = 'none';

    document.getElementById('videoCaption').value = '';

    document.getElementById('videoInput').value = '';

}


async function publishVideoPost() {
    if (!selectedVideoFile) return;
    
    const caption = document.getElementById('videoCaption').value.trim();
    const user = auth.currentUser;
    if (!user) return;
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            const userData = userDoc.data();
            
            // Video as base64 (works for small videos)
            const base64Video = e.target.result;
            
            await db.collection('posts').add({
                type: 'video',
                content: caption,
                mediaUrl: base64Video,
                userId: user.uid,
                userName: userData.fullName,
                userInitials: getInitials(userData.fullName),
                likes: [],
                comments: [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            closeCreatePost();
            showNotification('Video posted!', 'success');
            loadPosts();
        } catch (error) {
            showNotification('Failed: ' + error.message, 'error');
        }
    };
    reader.readAsDataURL(selectedVideoFile);
}




    
    // Load comment count
  async function loadCommentsForPost(postId) {
    const commentsList = document.getElementById('commentsList');
    if (!commentsList) return;
    
    try {
        const snapshot = await db.collection('posts').doc(postId).collection('comments').orderBy('createdAt', 'asc').get();
        
        if (snapshot.empty) {
            commentsList.innerHTML = '<div class="no-comments"><i class="fas fa-comment-slash"></i><p>No comments yet. Be the first to comment!</p></div>';
            return;
        }
        
        commentsList.innerHTML = '';
        
        snapshot.forEach(doc => {
            const commentData = { id: doc.id, ...doc.data() };
            commentData.time = commentData.createdAt ? getTimeAgo(commentData.createdAt.toDate()) : 'Just now';
            
            const commentElement = createCommentElement(commentData);
            commentsList.appendChild(commentElement);
            
            // Load replies after comment is added to DOM
            loadRepliesForComment(postId, commentData.id);
        });
        
    } catch (error) {
        console.error('Load comments error:', error);
        commentsList.innerHTML = '<div class="no-comments"><p>Failed to load comments. Please try again.</p></div>';
    }
}

// Post Options Menu Functions

function openPostOptions(postId) {

    currentPostMenuId = postId;

    document.getElementById('postOptionsMenu').style.display = 'block';

}



function closePostOptions() {

    document.getElementById('postOptionsMenu').style.display = 'none';

    currentPostMenuId = null;

}



function copyPostText() {

    const post = allPosts.find(p => p.id === currentPostMenuId);

    if (!post || !post.content) {

        showNotification('No text to copy', 'error');

        closePostOptions();

        return;

    }

    

    // Copy to clipboard

    if (navigator.clipboard) {

        navigator.clipboard.writeText(post.content).then(() => {

            showNotification('Text copied to clipboard!', 'success');

        }).catch(() => {

            showNotification('Failed to copy text', 'error');

        });

    } else {

        // Fallback for older browsers

        const textarea = document.createElement('textarea');

        textarea.value = post.content;

        document.body.appendChild(textarea);

        textarea.select();

        document.execCommand('copy');

        document.body.removeChild(textarea);

        showNotification('Text copied to clipboard!', 'success');

    }

    

    closePostOptions();

}



function editPostFromMenu() {

    const post = allPosts.find(p => p.id === currentPostMenuId);

    if (!post) {

        closePostOptions();

        return;

    }

    

    if (post.type !== 'text') {

        showNotification('Only text posts can be edited', 'error');

        closePostOptions();

        return;

    }

    

    currentEditingPostId = post.id;

    

    const editModal = document.getElementById('editPostModal');

    const editContent = document.getElementById('editPostContent');

    const charCount = document.getElementById('editCharCount');

    

    editContent.value = post.content;

    charCount.textContent = post.content.length;

    

    editModal.style.display = 'block';

    closePostOptions();

    

    // Setup character counting for edit

    editContent.oninput = function() {

        charCount.textContent = this.value.length;

    };

}



function closeEditPost() {

    document.getElementById('editPostModal').style.display = 'none';

    currentEditingPostId = null;

}



function saveEditedPost() {

    const newContent = document.getElementById('editPostContent').value.trim();

    

    if (!newContent) {

        showNotification('Post content cannot be empty', 'error');

        return;

    }

    

    const post = allPosts.find(p => p.id === currentEditingPostId);

    if (!post) return;

    

    post.content = newContent;

    

    // Update DOM

    const postElement = document.querySelector(`[data-post-id="${currentEditingPostId}"]`);

    if (postElement) {

        const textElement = postElement.querySelector('.post-text');

        if (textElement) {

            textElement.textContent = newContent;

        }

    }

    

    closeEditPost();

    showNotification('Post updated successfully!', 'success');

}


async function deletePostFromMenu() {
    const confirmDelete = await showCustomConfirm('Delete this post? This cannot be undone.');
    
    if (!confirmDelete) {
        closePostOptions();
        return;
    }
    
    try {
        await db.collection('posts').doc(currentPostMenuId).delete();
        
        const postElement = document.querySelector(`[data-post-id="${currentPostMenuId}"]`);
        if (postElement) {
            postElement.remove();
        }
        
        closePostOptions();
        showNotification('Post deleted successfully', 'success');
        
    } catch (error) {
        console.error('Delete error:', error);
        showNotification('Failed to delete post', 'error');
    }
}

// Custom confirm function (add this too)
let confirmResolver = null;

function showCustomConfirm(message) {
    return new Promise((resolve) => {
        confirmResolver = resolve;
        document.getElementById('confirmMessage').textContent = message;
        const modal = document.getElementById('customConfirmModal');
        modal.style.display = 'flex';
    });
}

function resolveConfirm(result) {
    document.getElementById('customConfirmModal').style.display = 'none';
    if (confirmResolver) {
        confirmResolver(result);
        confirmResolver = null;
    }
}

// Initialize create post listeners when DOM is ready

document.addEventListener('DOMContentLoaded', function() {

    // Initialize text post listeners

    initializeTextPostListeners();

    

    // Close modals when clicking outside

    const createModal = document.getElementById('createPostModal');

    const editModal = document.getElementById('editPostModal');

    const optionsMenu = document.getElementById('postOptionsMenu');

    

    if (createModal) {

        createModal.addEventListener('click', function(e) {

            if (e.target === this) {

                closeCreatePost();

            }

        });

    }

    

    if (editModal) {

        editModal.addEventListener('click', function(e) {

            if (e.target === this) {

                closeEditPost();

            }

        });

    }

    

    if (optionsMenu) {

        optionsMenu.addEventListener('click', function(e) {

            if (e.target === this) {

                closePostOptions();

            }

        });

    }

});



// Add fade out animation style

(function() {

    const style = document.createElement('style');

    style.textContent = `

        @keyframes fadeOut {

            from { opacity: 1; transform: scale(1); }

            to { opacity: 0; transform: scale(0.95); }

        }

    `;

    document.head.appendChild(style);

})();

// Comments System JavaScript

let currentPostComments = null;

let currentReplyToComment = null;

let commentsData = {}; // Store comments for each post



// Replace existing showComments function

async function showComments(element) {
    const postElement = element.closest('.post');
    const postId = postElement.dataset.postId;
    
    if (!postId) return showNotification('Cannot load comments', 'error');
    
    currentPostComments = postId;
    document.getElementById('commentsModal').style.display = 'block';
    
    // Call the new updatePostPreview function
    await updatePostPreview(postId);
    
    // Load comments
    loadCommentsForPost(postId);
    setupCommentInput();
}
    


    

// Update post preview
async function updatePostPreview(postId) {
    try {
        const postDoc = await db.collection('posts').doc(postId).get();
        
        if (!postDoc.exists) return;
        
        const postData = postDoc.data();
        
        document.getElementById('previewAvatar').textContent = postData.userInitials || 'U';
        document.getElementById('previewUserName').textContent = postData.userName || 'User';
        document.getElementById('previewTime').textContent = postData.createdAt ? getTimeAgo(postData.createdAt.toDate()) : 'Just now';
        
        const contentElement = document.getElementById('previewContent');
        contentElement.innerHTML = '';
        
        if (postData.content) {
            contentElement.textContent = postData.content;
        }
        
        if (postData.type === 'photo' && postData.mediaUrl) {
            contentElement.innerHTML += `<div class="preview-media"><img src="${postData.mediaUrl}" alt="Post image"></div>`;
        }
        
        if (postData.type === 'video' && postData.mediaUrl) {
            contentElement.innerHTML += `<div class="preview-media"><video src="${postData.mediaUrl}#t=0.1" preload="metadata"></video></div>`;
        }
        
    } catch (error) {
        console.error('Update preview error:', error);
    }
}

        

if (post.type === 'video' && post.mediaUrl) {
    contentElement.innerHTML += `<div class="preview-media"><video src="${post.mediaUrl}#t=0.1" preload="metadata"></video></div>`;


        }


    

    

    // Load comments

    loadCommentsForPost(postId);

    

    // Setup comment input

    setupCommentInput();





function closeComments() {

    document.getElementById('commentsModal').style.display = 'none';

    currentPostComments = null;

    document.getElementById('commentInput').value = '';

}



function setupCommentInput() {

    const input = document.getElementById('commentInput');

    const sendBtn = document.getElementById('sendCommentBtn');

    

    if (!input || !sendBtn) return;

    

    input.oninput = function() {

        sendBtn.disabled = this.value.trim().length === 0;

        

        // Auto-resize textarea

        this.style.height = 'auto';

        this.style.height = Math.min(this.scrollHeight, 100) + 'px';

    };

    

    input.onkeypress = function(e) {

        if (e.key === 'Enter' && !e.shiftKey) {

            e.preventDefault();

            if (this.value.trim()) {

                addComment();

            }

        }

    };

}



    
    commentsList.innerHTML = '';
    snapshot.forEach(doc => {
        const comment = { id: doc.id, ...doc.data() };
        comment.time = comment.createdAt ? getTimeAgo(comment.createdAt.toDate()) : 'Just now';
        commentsList.appendChild(createCommentElement(comment));
    });


    // Update post comment count

    updatePostCommentCount(postId, comments.length);


function createCommentElement(commentData) {
    const commentDiv = document.createElement('div');
    commentDiv.className = 'comment-item';
    commentDiv.dataset.commentId = commentData.id;
    
    const user = auth.currentUser;
    const isLiked = user && commentData.likes && commentData.likes.includes(user.uid);
    
    commentDiv.innerHTML = `
        <div class="comment-header">
            <div class="comment-avatar">${commentData.userInitials || 'U'}</div>
            <div class="comment-user-info">
                <div class="comment-user-name">${commentData.userName || 'User'}</div>
                <span class="comment-time">${commentData.time}</span>
            </div>
        </div>
        <div class="comment-text">${commentData.text}</div>
        <div class="comment-actions">
            <button class="comment-action-btn ${isLiked ? 'liked' : ''}" onclick="toggleCommentLike('${commentData.id}')">
                <i class="fas fa-heart"></i>
                <span>${commentData.likes ? commentData.likes.length : 0} Like${commentData.likes && commentData.likes.length !== 1 ? 's' : ''}</span>
            </button>
            <button class="comment-action-btn" onclick="openReply('${commentData.id}')">
                <i class="fas fa-reply"></i>
                <span>Reply</span>
            </button>
        </div>
        <div class="replies-container" id="replies-${commentData.id}"></div>
    `;
    
    return commentDiv;
}
    




function createReplyElement(reply) {

    const replyDiv = document.createElement('div');

    replyDiv.className = 'reply-item';

    

    replyDiv.innerHTML = `

        <div class="comment-header">

            <div class="comment-avatar">${reply.userInitials}</div>

            <div class="comment-user-info">

                <div class="comment-user-name">${reply.userName}</div>

                <span class="comment-time">${reply.time}</span>

            </div>

        </div>

        <div class="comment-text">${reply.text}</div>

        <div class="comment-actions">

            <button class="comment-action-btn ${reply.liked ? 'liked' : ''}" onclick="toggleReplyLike(${reply.id})">

                <i class="fas fa-heart"></i>

                <span>${reply.likes || 0}</span>

            </button>

        </div>

    `;

    

    return replyDiv;

}



async function addComment() {
    const input = document.getElementById('commentInput');
    const text = input.value.trim();
    
    if (!text || !currentPostComments) return;
    
    const user = auth.currentUser;
    if (!user) return showNotification('Login required', 'error');
    
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        
        await db.collection('posts').doc(currentPostComments).collection('comments').add({
            text: text,
            userId: user.uid,
            userName: userData.fullName,
            userInitials: getInitials(userData.fullName),
            likes: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        input.value = '';
        input.style.height = 'auto';
        document.getElementById('sendCommentBtn').disabled = true;
        
        await loadCommentsForPost(currentPostComments);
        
        const commentsSnapshot = await db.collection('posts').doc(currentPostComments).collection('comments').get();
        updatePostCommentCount(currentPostComments, commentsSnapshot.size);
        
        showNotification('Comment added!', 'success');
        
    } catch (error) {
        console.error('Add comment error:', error);
        showNotification('Failed to add comment', 'error');
    }
}


function toggleCommentLike(commentId) {

    if (!currentPostComments) return;

    

    const comments = commentsData[currentPostComments];

    if (!comments) return;

    

    const comment = comments.find(c => c.id === commentId);

    if (!comment) return;

    

    comment.liked = !comment.liked;

    comment.likes = comment.liked ? (comment.likes || 0) + 1 : (comment.likes || 1) - 1;

    

    loadCommentsForPost(currentPostComments);

}



function toggleReplyLike(replyId) {

    if (!currentPostComments) return;

    

    const comments = commentsData[currentPostComments];

    if (!comments) return;

    

    let reply = null;

    let parentComment = null;

    

    for (let comment of comments) {

        if (comment.replies) {

            reply = comment.replies.find(r => r.id === replyId);

            if (reply) {

                parentComment = comment;

                break;

            }

        }

    }

    

    if (!reply) return;

    

    reply.liked = !reply.liked;

    reply.likes = reply.liked ? (reply.likes || 0) + 1 : (reply.likes || 1) - 1;

    

    loadCommentsForPost(currentPostComments);

}


async function openReply(commentId) {
    if (!currentPostComments) return;
    
    try {
        const commentDoc = await db.collection('posts').doc(currentPostComments).collection('comments').doc(commentId).get();
        
        if (!commentDoc.exists) return;
        
        const comment = { id: commentDoc.id, ...commentDoc.data() };
        comment.time = comment.createdAt ? getTimeAgo(comment.createdAt.toDate()) : 'Just now';
        
        currentReplyToComment = commentId;
        
        // Show reply modal
        document.getElementById('replyModal').style.display = 'block';
        
        // Show original comment in preview
        const preview = document.getElementById('originalCommentPreview');
        preview.innerHTML = `
            <div class="comment-header">
                <div class="comment-avatar">${comment.userInitials || 'U'}</div>
                <div class="comment-user-info">
                    <div class="comment-user-name">${comment.userName}</div>
                    <span class="comment-time">${comment.time}</span>
                </div>
            </div>
            <div class="comment-text">${comment.text}</div>
        `;
        
        // Focus reply input
        setTimeout(() => {
            document.getElementById('replyInput').focus();
        }, 300);
        
    } catch (error) {
        console.error('Open reply error:', error);
        showNotification('Failed to load comment', 'error');
    }
}




function closeReply() {

    document.getElementById('replyModal').style.display = 'none';

    currentReplyToComment = null;

    document.getElementById('replyInput').value = '';

}

async function submitReply() {
    const replyText = document.getElementById('replyInput').value.trim();
    
    if (!replyText || !currentReplyToComment || !currentPostComments) return;
    
    const user = auth.currentUser;
    if (!user) return showNotification('Login required', 'error');
    
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        
        // Add reply to the comment's subcollection
        await db.collection('posts')
            .doc(currentPostComments)
            .collection('comments')
            .doc(currentReplyToComment)
            .collection('replies')
            .add({
                text: replyText,
                userId: user.uid,
                userName: userData.fullName,
                userInitials: getInitials(userData.fullName),
                likes: [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        closeReply();
        await loadCommentsForPost(currentPostComments);
        
        showNotification('Reply added!', 'success');
        
    } catch (error) {
        console.error('Submit reply error:', error);
        showNotification('Failed to add reply', 'error');
    }
} 




function updatePostCommentCount(postId, count) {
    const postElement = document.querySelector(`[data-post-id="${postId}"]`);
    if (!postElement) return;
    
    const commentAction = postElement.querySelector('.comment-action span');
    if (commentAction) {
        commentAction.textContent = `${count} Comment${count !== 1 ? 's' : ''}`;
    }
}

    

    // Update in allPosts array if exists

    const post = allPosts.find(p => p.id == postId);

    if (post) {

        post.comments = count;

    }





// Close modals when clicking outside

document.addEventListener('DOMContentLoaded', function() {

    const replyModal = document.getElementById('replyModal');

    

    if (replyModal) {

        replyModal.addEventListener('click', function(e) {

            if (e.target === this) {

                closeReply();

            }

        });

    }

});

// Settings JavaScript

let settingsData = {

    pushNotifications: true,

    emailNotifications: true,

    commentNotifications: true,

    profileVisibility: true,

    onlineStatus: true,

    darkMode: false

};



// Update the openSettings function

function openSettings() {

    closeHamburgerMenu();

    document.getElementById('settingsPage').style.display = 'block';

    loadSettings();

}



function closeSettings() {

    document.getElementById('settingsPage').style.display = 'none';

}



function loadSettings() {

    // Load saved settings from localStorage

    const saved = localStorage.getItem('appSettings');

    if (saved) {

        settingsData = JSON.parse(saved);

    }

    

    // Apply settings to toggles

    Object.keys(settingsData).forEach(key => {

        const toggle = document.getElementById(key);

        if (toggle) {

            toggle.checked = settingsData[key];

        }

    });

}



function toggleSetting(settingName) {

    const toggle = document.getElementById(settingName);

    if (!toggle) return;

    

    settingsData[settingName] = toggle.checked;

    

    // Save to localStorage

    localStorage.setItem('appSettings', JSON.stringify(settingsData));

    

    showNotification(`${formatSettingName(settingName)} ${toggle.checked ? 'enabled' : 'disabled'}`, 'success');

}



function formatSettingName(name) {

    return name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

}



function toggleDarkMode() {

    const toggle = document.getElementById('darkMode');

    if (!toggle) return;

    

    settingsData.darkMode = toggle.checked;

    localStorage.setItem('appSettings', JSON.stringify(settingsData));

    

    if (toggle.checked) {

        document.body.classList.add('dark-mode');

        showNotification('Dark mode enabled', 'success');

    } else {

        document.body.classList.remove('dark-mode');

        showNotification('Dark mode disabled', 'success');

    }

}



// Account Functions

function editProfile() {

    closeSettings();

    openProfile();

}



function changePassword() {

    document.getElementById('changePasswordModal').style.display = 'block';

}



function closeChangePassword() {

    document.getElementById('changePasswordModal').style.display = 'none';

    document.getElementById('currentPassword').value = '';

    document.getElementById('newPassword').value = '';

    document.getElementById('confirmNewPassword').value = '';

}




function changePassword() {

    document.getElementById('changePasswordModal').style.display = 'block';

}



function closeChangePassword() {

    document.getElementById('changePasswordModal').style.display = 'none';

    document.getElementById('currentPassword').value = '';

    document.getElementById('newPassword').value = '';

    document.getElementById('confirmNewPassword').value = '';

}

function saveNewPassword() {
    const current = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmNewPassword').value;
    
    if (!current || !newPass || !confirm) {
        showNotification('Please fill all fields', 'error');
        return;
    }
    
    if (newPass !== confirm) {
        showNotification('New passwords do not match', 'error');
        return;
    }
    
    if (newPass.length < 6) {
        showNotification('Password must be at least 6 characters', 'error');
        return;
    }
    
    // Check if new password is same as current password
    if (current === newPass) {
        showNotification('New password must be different from current password', 'error');
        return;
    }
    
    const user = auth.currentUser;
    if (!user) {
        showNotification('No user logged in', 'error');
        return;
    }
    
    // Re-authenticate user with current password
    const credential = firebase.auth.EmailAuthProvider.credential(
        user.email,
        current
    );
    
    user.reauthenticateWithCredential(credential)
        .then(() => {
            return user.updatePassword(newPass);
        })
        .then(() => {
            showNotification('Password changed successfully!', 'success');
            closeChangePassword();
        })
        .catch((error) => {
            console.error("Password change error:", error);
            if (error.code === 'auth/wrong-password') {
                showNotification('Current password is incorrect', 'error');
            } else if (error.code === 'auth/user-token-expired') {
                showNotification('Session expired. Please log out and log in again', 'error');
            } else {
                showNotification('Error changing password: ' + error.message, 'error');
            }
        });
}

function selectLanguage() {

    showNotification('Language selection coming soon', 'success');

}



// About Functions

function showAboutApp() {

    showNotification('Beauty Fair Staff App v1.0.0 - Developed for staff management', 'success');

}



function showPrivacyPolicy() {

    showNotification('Privacy Policy page coming soon', 'success');

}



function showTerms() {

    showNotification('Terms of Service page coming soon', 'success');

}



// Data Functions





function downloadData() {

    showNotification('Preparing your data for download...', 'success');

    setTimeout(() => {

        showNotification('Data download feature coming soon', 'success');

    }, 2000);

}







// Close modal when clicking outside

document.addEventListener('DOMContentLoaded', function() {

    const passwordModal = document.getElementById('changePasswordModal');

    

    if (passwordModal) {

        passwordModal.addEventListener('click', function(e) {

            if (e.target === this) {

                closeChangePassword();

            }

        });

    }

});

function editProfile() {
loadEditProfileData();
    // Open edit modal with current data

    document.getElementById('editName').value = profileData.name;

    document.getElementById('editBirthday').value = formatDateForInput(profileData.birthday);

    document.getElementById('editHobby').value = profileData.hobby;

    document.getElementById('editDepartment').value = profileData.department;

    

    document.getElementById('editProfileModal').style.display = 'block';

}



function closeEditProfile() {

    // Clear any error messages

    document.querySelectorAll('.error-message').forEach(error => error.classList.remove('show'));

    document.querySelectorAll('.edit-form-input, .edit-form-select').forEach(input => 

        input.classList.remove('validation-error')

    );

    

    document.getElementById('editProfileModal').style.display = 'none';

}



function formatDateForInput(dateString) {

    // Convert "January 15, 1995" to "1995-01-15"

    const date = new Date(dateString);

    if (isNaN(date.getTime())) return '';

    

    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, '0');

    const day = String(date.getDate()).padStart(2, '0');

    

    return `${year}-${month}-${day}`;

}



function formatDateForDisplay(dateInput) {

    // Convert "1995-01-15" to "January 15, 1995"

    const date = new Date(dateInput);

    const options = { year: 'numeric', month: 'long', day: 'numeric' };

    return date.toLocaleDateString('en-US', options);

}



function validateProfileForm() {

    let isValid = true;

    

    // Clear previous errors

    document.querySelectorAll('.error-message').forEach(error => error.classList.remove('show'));

    document.querySelectorAll('.edit-form-input, .edit-form-select').forEach(input => 

        input.classList.remove('validation-error')

    );

    

    // Validate name

    const name = document.getElementById('editName').value.trim();

    if (!name || name.length < 2) {

        document.getElementById('editName').classList.add('validation-error');

        document.getElementById('nameError').classList.add('show');

        isValid = false;

    }

    

    // Validate birthday

    const birthday = document.getElementById('editBirthday').value;

    if (!birthday) {

        document.getElementById('editBirthday').classList.add('validation-error');

        document.getElementById('birthdayError').classList.add('show');

        isValid = false;

    } else {

        const birthDate = new Date(birthday);

        const today = new Date();

        const age = today.getFullYear() - birthDate.getFullYear();

        

        if (age < 18 || age > 100) {

            document.getElementById('editBirthday').classList.add('validation-error');

            document.getElementById('birthdayError').textContent = 'Must be between 18 and 100 years old';

            document.getElementById('birthdayError').classList.add('show');

            isValid = false;

        }

    }

    

    // Validate hobby

    const hobby = document.getElementById('editHobby').value;

    if (!hobby) {

        document.getElementById('editHobby').classList.add('validation-error');

        document.getElementById('hobbyError').classList.add('show');

        isValid = false;

    }

    

    // Validate department

    const department = document.getElementById('editDepartment').value;

    if (!department) {

        document.getElementById('editDepartment').classList.add('validation-error');

        document.getElementById('departmentError').classList.add('show');

        isValid = false;

    }

    

    return isValid;

}



function saveProfileChanges() {

    if (!validateProfileForm()) {

        showNotification('Please fix the errors before saving', 'error');

        return;

    }

    

    // Get form values

    const newName = document.getElementById('editName').value.trim();

    const newBirthday = document.getElementById('editBirthday').value;

    const newHobby = document.getElementById('editHobby').value;

    const newDepartment = document.getElementById('editDepartment').value;

    

    // Check if department changed (requires admin approval)

    const departmentChanged = profileData.department !== newDepartment;

    

    // Update profile data

    profileData.name = newName;

    profileData.birthday = formatDateForDisplay(newBirthday);

    profileData.hobby = newHobby;

    

    if (departmentChanged) {

        showNotification('Profile updated! Department change request sent to admin for approval.', 'success');

        // In real implementation, this would send a request to admin

        // For now, we'll update it immediately

        profileData.department = newDepartment;

    } else {

        profileData.department = newDepartment;

        showNotification('Profile updated successfully!', 'success');

    }

    

    // Update profile picture initials if name changed

    if (!currentProfilePic) {

        const profilePic = document.getElementById('profilePicture');

        profilePic.innerHTML = profileData.name.split(' ').map(n => n[0]).join('').toUpperCase();

    }

    

    // Reload profile display

    loadProfileData();

    

    // Close modal

    closeEditProfile();

}



// Close modal when clicking outside

document.addEventListener('DOMContentLoaded', function() {

    const editModal = document.getElementById('editProfileModal');

    if (editModal) {

        editModal.addEventListener('click', function(e) {

            if (e.target === this) {

                closeEditProfile();

            }

        });

    }

});



console.log('Edit Profile feature loaded successfully!');



// Forgot Password JavaScript

let resetEmail = '';

let resetOtpCode = '';



// Setup forgot password link

document.addEventListener('DOMContentLoaded', function() {

    const forgotLink = document.getElementById('forgotPasswordLink');

    if (forgotLink) {

        forgotLink.onclick = function(e) {

            e.preventDefault();

            showForgotPasswordPage();

        };

    }

    

    // Setup forgot password form

    const forgotForm = document.getElementById('forgotPasswordForm');

    if (forgotForm) {

        forgotForm.addEventListener('submit', handleForgotPassword);

    }

    

    // Setup new password form

    const newPasswordForm = document.getElementById('newPasswordForm');

    if (newPasswordForm) {

        newPasswordForm.addEventListener('submit', handleNewPassword);

    }

    

    // Setup reset OTP inputs

    setupResetOTPInputs();

    

    // Setup password strength for reset

    const resetNewPassword = document.getElementById('resetNewPassword');

    if (resetNewPassword) {

        resetNewPassword.addEventListener('input', function() {

            checkResetPasswordStrength();

        });

    }

});



function showForgotPasswordPage() {

    hideAllPages();

    document.getElementById('forgotPasswordPage').classList.add('visible');

    document.getElementById('forgotPasswordPage').style.display = 'block';

    currentPage = 'forgotPassword';

}



function backToLogin() {

    hideAllPages();

    document.getElementById('initialPage').classList.add('visible');

    document.getElementById('initialPage').style.display = 'block';

    currentPage = 'initial';

    

    // Clear forgot password form

    document.getElementById('forgotEmailPhone').value = '';

    resetEmail = '';

}



function handleForgotPassword(e) {

    e.preventDefault();

    

    const emailPhone = document.getElementById('forgotEmailPhone').value.trim();

    

    if (!emailPhone) {

        showNotification('Please enter your email or phone number', 'error');

        return;

    }

    

    // Validate email or phone format

    const isEmail = emailPhone.includes('@');

    const isPhone = /^\d{10,}$/.test(emailPhone);

    

    if (!isEmail && !isPhone) {

        showNotification('Please enter a valid email or phone number', 'error');

        return;

    }

    

    resetEmail = emailPhone;

    

    // Generate OTP

    resetOtpCode = generateOTP();

    console.log('Reset OTP Code:', resetOtpCode); // For testing

    

    // Show success and redirect

    showNotification('Reset code sent successfully!', 'success');

    

    setTimeout(() => {

        showResetOtpPage();

    }, 1500);

}



function showResetOtpPage() {

    hideAllPages();

    document.getElementById('resetOtpPage').classList.add('visible');

    document.getElementById('resetOtpPage').style.display = 'block';

    currentPage = 'resetOtp';

    

    // Update message

    const isEmail = resetEmail.includes('@');

    const message = `Please enter the 4-digit code sent to your ${isEmail ? 'email' : 'phone number'}`;

    document.getElementById('resetOtpMessage').textContent = message;

    

    // Focus first input

    setTimeout(() => {

        document.getElementById('resetOtp1').focus();

    }, 100);

}



function setupResetOTPInputs() {

    const inputs = [

        document.getElementById('resetOtp1'),

        document.getElementById('resetOtp2'),

        document.getElementById('resetOtp3'),

        document.getElementById('resetOtp4')

    ];

    

    inputs.forEach((input, index) => {

        if (!input) return;

        

        input.addEventListener('input', function() {

            if (this.value && index < inputs.length - 1) {

                inputs[index + 1].focus();

            }

        });

        

        input.addEventListener('keydown', function(e) {

            if (e.key === 'Backspace' && !this.value && index > 0) {

                inputs[index - 1].focus();

            }

        });

    });

}



function verifyResetOTP() {

    const otp1 = document.getElementById('resetOtp1').value;

    const otp2 = document.getElementById('resetOtp2').value;

    const otp3 = document.getElementById('resetOtp3').value;

    const otp4 = document.getElementById('resetOtp4').value;

    

    const enteredOTP = otp1 + otp2 + otp3 + otp4;

    

    if (enteredOTP.length !== 4) {

        showNotification('Please enter complete 4-digit code', 'error');

        return;

    }

    

    // Verify OTP (for demo, accept any 4 digits)

    if (enteredOTP.length === 4) {

        showNotification('Code verified successfully!', 'success');

        

        setTimeout(() => {

            showNewPasswordPage();

        }, 1500);

    } else {

        showNotification('Invalid code. Please try again.', 'error');

        

        // Clear inputs

        document.getElementById('resetOtp1').value = '';

        document.getElementById('resetOtp2').value = '';

        document.getElementById('resetOtp3').value = '';

        document.getElementById('resetOtp4').value = '';

        document.getElementById('resetOtp1').focus();

    }

}



function resendResetCode() {

    resetOtpCode = generateOTP();

    console.log('New Reset OTP Code:', resetOtpCode); // For testing

    

    showNotification('New reset code sent!', 'success');

    

    // Clear OTP inputs

    document.getElementById('resetOtp1').value = '';

    document.getElementById('resetOtp2').value = '';

    document.getElementById('resetOtp3').value = '';

    document.getElementById('resetOtp4').value = '';

    document.getElementById('resetOtp1').focus();

}



function showNewPasswordPage() {

    hideAllPages();

    document.getElementById('newPasswordPage').classList.add('visible');

    document.getElementById('newPasswordPage').style.display = 'block';

    currentPage = 'newPassword';

}



function checkResetPasswordStrength() {

    const input = document.getElementById('resetNewPassword');

    const bar = document.getElementById('resetPasswordBar');

    const text = document.getElementById('resetPasswordText');

    

    if (!input || !bar || !text) return;

    

    const password = input.value;

    let strength = 0;

    let strengthText = '';

    let strengthClass = '';

    

    if (password.length >= 8) strength += 25;

    if (/[A-Z]/.test(password)) strength += 25;

    if (/[0-9]/.test(password)) strength += 25;

    if (/[^A-Za-z0-9]/.test(password)) strength += 25;

    

    if (strength <= 25) {

        strengthText = 'Weak';

        strengthClass = 'strength-weak';

    } else if (strength <= 50) {

        strengthText = 'Fair';

        strengthClass = 'strength-fair';

    } else if (strength <= 75) {

        strengthText = 'Good';

        strengthClass = 'strength-good';

    } else {

        strengthText = 'Strong';

        strengthClass = 'strength-strong';

    }

    

    bar.className = `password-strength-bar ${strengthClass}`;

    text.textContent = password.length > 0 ? `Password strength: ${strengthText}` : '';

}



function handleNewPassword(e) {

    e.preventDefault();

    

    const newPassword = document.getElementById('resetNewPassword').value;

    const confirmPassword = document.getElementById('resetConfirmPassword').value;

    

    if (!newPassword || !confirmPassword) {

        showNotification('Please fill all fields', 'error');

        return;

    }

    

    if (newPassword !== confirmPassword) {

        showNotification('Passwords do not match', 'error');

        return;

    }

    

    if (newPassword.length < 6) {

        showNotification('Password must be at least 6 characters', 'error');

        return;

    }

    

    // Simulate password reset

    showNotification('Password reset successful!', 'success');

    

    setTimeout(() => {

        showResetSuccessPage();

    }, 1500);

}



function showResetSuccessPage() {

    hideAllPages();

    document.getElementById('resetSuccessPage').classList.add('visible');

    document.getElementById('resetSuccessPage').style.display = 'block';

    currentPage = 'resetSuccess';

    

    // Clear all reset forms

    document.getElementById('forgotEmailPhone').value = '';

    document.getElementById('resetOtp1').value = '';

    document.getElementById('resetOtp2').value = '';

    document.getElementById('resetOtp3').value = '';

    document.getElementById('resetOtp4').value = '';

    document.getElementById('resetNewPassword').value = '';

    document.getElementById('resetConfirmPassword').value = '';

    

    resetEmail = '';

    resetOtpCode = '';

    

    // Redirect to login after 3 seconds

    setTimeout(() => {

        backToLogin();

    }, 3000);

}

// Attach forgot password listener after DOM loads

document.addEventListener('click', function(e) {

    if (e.target && e.target.id === 'forgotPasswordLink') {

        e.preventDefault();

        showForgotPasswordPage();

    }

});

// Replace existing confirmLogout function

function confirmLogout() {

    closeHamburgerMenu();

    document.getElementById('logoutModal').style.display = 'block';

}



function closeLogoutModal() {

    document.getElementById('logoutModal').style.display = 'none';

}



function confirmLogoutAction() {

    showNotification('Logging out...', 'success');

    

    setTimeout(() => {

        closeLogoutModal();

        showInitialPage();

        clearTimeout(sessionTimeout);

    }, 1500);

}



// Replace existing clearCache function

function clearCache() {

    document.getElementById('clearCacheModal').style.display = 'block';

}



function closeClearCacheModal() {

    document.getElementById('clearCacheModal').style.display = 'none';

}



function confirmClearCache() {

    // Simulate cache clearing

    showNotification('Clearing cache...', 'success');

    

    setTimeout(() => {

        showNotification('Cache cleared successfully!', 'success');

        closeClearCacheModal();

    }, 1500);

}



// Replace existing deleteAccount function

function deleteAccount() {

    document.getElementById('deleteAccountModal').style.display = 'block';

    document.getElementById('deleteConfirmInput').value = '';

}



function closeDeleteAccountModal() {

    document.getElementById('deleteAccountModal').style.display = 'none';

    document.getElementById('deleteConfirmInput').value = '';

}

function confirmDeleteAccount() {
    const confirmText = document.getElementById('deleteConfirmInput').value;
    
    if (confirmText !== 'DELETE') {
        showNotification('Please type DELETE to confirm', 'error');
        return;
    }
    
    const user = auth.currentUser;
    if (!user) {
        showNotification('No user logged in', 'error');
        return;
    }
    
    // Delete user data from Firestore first
    db.collection('users').doc(user.uid).delete()
        .then(() => {
            // Then delete the authentication account
            return user.delete();
        })
        .then(() => {
            showNotification('Account deleted successfully', 'success');
            setTimeout(() => {
                closeDeleteAccountModal();
                closeSettings();
                // Redirect to login page
                window.location.href = 'login.html'; // Change to your login page
            }, 2000);
        })
        .catch((error) => {
            console.error("Account deletion error:", error);
            if (error.code === 'auth/requires-recent-login') {
                showNotification('Please log out and log in again before deleting your account', 'error');
            } else {
                showNotification('Error deleting account: ' + error.message, 'error');
            }
        });
} 



// Close modals when clicking outside

document.addEventListener('DOMContentLoaded', function() {

    const logoutModal = document.getElementById('logoutModal');

    const clearCacheModal = document.getElementById('clearCacheModal');

    const deleteAccountModal = document.getElementById('deleteAccountModal');

    

    if (logoutModal) {

        logoutModal.addEventListener('click', function(e) {

            if (e.target === this) {

                closeLogoutModal();

            }

        });

    }

    

    if (clearCacheModal) {

        clearCacheModal.addEventListener('click', function(e) {

            if (e.target === this) {

                closeClearCacheModal();

            }

        });

    }

    

    if (deleteAccountModal) {

        deleteAccountModal.addEventListener('click', function(e) {

            if (e.target === this) {

                closeDeleteAccountModal();

            }

        });

    }

});

// Replace existing showAboutApp function

function showAboutApp() {

    closeSettings();

    document.getElementById('aboutPage').style.display = 'block';

}



function closeAboutPage() {

    document.getElementById('aboutPage').style.display = 'none';

    openSettings();

}



// Replace existing showPrivacyPolicy function

function showPrivacyPolicy() {

    closeSettings();

    document.getElementById('privacyPolicyPage').style.display = 'block';

}



function closePrivacyPolicy() {

    document.getElementById('privacyPolicyPage').style.display = 'none';

    openSettings();

}



// Replace existing showTerms function

function showTerms() {

    closeSettings();

    document.getElementById('termsPage').style.display = 'block';

}



function closeTermsPage() {

    document.getElementById('termsPage').style.display = 'none';

    openSettings();

}



console.log('Content pages loaded: About, Privacy Policy, Terms of Service');

// Employee Guide Functions

function openEmployeeGuide() {

    closeHamburgerMenu();

    showEmployeeGuidePage();

}



function showEmployeeGuidePage() {
    document.getElementById('employeeGuidePage').style.display = 'block';
    
    // Fetch and update greeting with current user name from Firebase
    const user = auth.currentUser;
    if (user) {
        db.collection('users').doc(user.uid).get()
            .then((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    const greeting = document.getElementById('guideGreeting');
                    if (greeting) {
                        greeting.textContent = `Dear ${data.fullName || 'User'},`;
                    }
                }
            })
            .catch((error) => {
                console.error("Error fetching user data:", error);
            });
    }
}



function closeEmployeeGuide() {

    document.getElementById('employeeGuidePage').style.display = 'none';

}



// Staff Award Functions

function openStaffAward() {

    closeHamburgerMenu();

    showStaffAwardPage();

}



function showStaffAwardPage() {

    document.getElementById('staffAwardPage').style.display = 'block';

    loadMyAwards();

}



function closeStaffAward() {

    document.getElementById('staffAwardPage').style.display = 'none';

}

function loadMyAwards() {
    const awardsList = document.getElementById('myAwardsList');
    const user = auth.currentUser;
    
    if (!user) return;
    
    db.collection('users').doc(user.uid).get()
        .then((doc) => {
            if (doc.exists) {
                const data = doc.data();
                const awards = data.awards || [];
                
                if (awards.length === 0) {
                    awardsList.innerHTML = `
                        <div class="no-awards-message">
                            <i class="fas fa-trophy"></i>
                            <p>Keep up the good behavior, you don't have any awards yet.</p>
                            <p style="margin-top: 10px; font-size: 0.9rem;">Work hard and you might be the next Staff of the Week!</p>
                        </div>
                    `;
                    return;
                }
                
                awardsList.innerHTML = '';
                
                awards.forEach((award, index) => {
                    const awardItem = document.createElement('div');
                    awardItem.className = 'award-item';
                    
                    // Use award date if available, otherwise generate one
                    let awardDate;
                    if (award.date) {
                        awardDate = new Date(award.date);
                    } else {
                        awardDate = new Date();
                        awardDate.setDate(awardDate.getDate() - (index * 7));
                    }
                    
                    const awardName = typeof award === 'string' ? award : award.name;
                    
                    awardItem.innerHTML = `
                        <i class="fas fa-trophy award-icon"></i>
                        <div class="award-details">
                            <div class="award-name">${awardName}</div>
                            <div class="award-date">${awardDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                        </div>
                    `;
                    
                    awardsList.appendChild(awardItem);
                });
            }
        })
        .catch((error) => {
            console.error("Error loading awards:", error);
            awardsList.innerHTML = `<p>Error loading awards. Please try again.</p>`;
        });
}


function viewMediaFullscreen(mediaSrc, mediaType) {
    const viewer = document.createElement('div');
    viewer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100vh;
        background: rgba(0,0,0,0.95);
        z-index: 5000;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    `;
    
    if (mediaType === 'image') {
        viewer.innerHTML = `<img src="${mediaSrc}" style="max-width: 95%; max-height: 95%; object-fit: contain;">`;
    } else {
        viewer.innerHTML = `<video src="${mediaSrc}#t=0.1" controls preload="metadata" style="max-width: 95%; max-height: 95%; object-fit: contain;"></video>`;
    }
    
    viewer.onclick = (e) => {
        if (e.target === viewer) document.body.removeChild(viewer);
    };
    document.body.appendChild(viewer);
}
function resendVerificationEmail() {
    const user = auth.currentUser;
    
    if (user && !user.emailVerified) {
        user.sendEmailVerification()
            .then(() => {
                showNotification('Verification email sent again! Check your inbox.', 'success');
            })
            .catch((error) => {
                console.error("Resend error:", error);
                showNotification(error.message, 'error');
            });
    } else {
        showNotification('No user to send email to!', 'error');
    }
}
window.addEventListener('load', () => {
    auth.onAuthStateChanged((user) => {
        if (user && user.emailVerified) {
            console.log("User already logged in:", user.email);
            // Optionally auto-login users
            // showWelcomePage();
        }
    });
});
function submitPersonalInfo() {
    const fullName = document.getElementById('fullName').value.trim();
    const birthday = document.getElementById('birthday').value;
    const hobby = document.getElementById('hobby').value;
    
    if (!fullName || !birthday || !hobby) {
        showNotification('Please fill all fields', 'error');
        return;
    }
    
    if (fullName.length < 2) {
        showNotification('Please enter a valid name', 'error');
        return;
    }
    
    const user = auth.currentUser;
    if (!user) {
        showNotification('No user logged in!', 'error');
        return;
    }
    
    showNotification('Saving information...', 'success');
    
    // Save to Firebase Firestore
    db.collection('users').doc(user.uid).update({
            fullName: fullName,
            birthday: birthday,
            hobby: hobby,
            onboardingStep: 'profile-picture'
        })
        .then(() => {
            showNotification('Personal information saved!', 'success');
            setTimeout(() => {
                showProfilePicPage();
            }, 1000);
        })
        .catch((error) => {
            console.error("Personal info save error:", error);
            showNotification('Failed to save information', 'error');
        });
}
// Handle profile picture selection
document.getElementById('profilePicUpload').addEventListener('click', function() {
    document.getElementById('profilePicInput').click();
});

document.getElementById('profilePicInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    
    if (file) {
        profilePicFile = file;
        
        // Show preview
        const reader = new FileReader();
        reader.onload = function(event) {
            document.getElementById('profilePicUpload').innerHTML = `
                <img src="${event.target.result}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">
            `;
        };
        reader.readAsDataURL(file);
        
        // Show upload button
        document.getElementById('uploadBtn').classList.remove('hidden');
    }
});
async function uploadProfilePic() {
    if (!profilePicFile) {
        showNotification('Please select a profile picture first', 'error');
        return;
    }
    
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
        showNotification('No user logged in!', 'error');
        return;
    }
    
    showNotification('Uploading profile picture...', 'info');
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        const base64Image = e.target.result;
        
        try {
            await db.collection('users').doc(currentUser.uid).update({
                profilePicture: base64Image,
                onboardingStep: 'complete',
                profileComplete: true,
                completedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            showNotification('Profile complete! Welcome aboard!', 'success');
            setTimeout(() => {
                showDashboard();
            }, 1500);
            
        } catch (error) {
            console.error("Profile picture upload error:", error);
            showNotification('Failed to upload: ' + error.message, 'error');
        }
    };
    
    reader.onerror = function() {
        showNotification('Failed to read image file', 'error');
    };
    
    reader.readAsDataURL(profilePicFile);
} 
// Skip profile picture
function skipProfilePic() {
    const user = auth.currentUser;
    
    if (!user) {
        showNotification('No user logged in!', 'error');
        return;
    }
    
    // Mark onboarding as complete without profile picture
    db.collection('users').doc(user.uid).update({
        onboardingStep: 'complete',
        profilePicture: null
    })
    .then(() => {
        completeOnboarding(); // Go to dashboard
    })
    .catch((error) => {
        console.error("Skip error:", error);
        showNotification('Error skipping', 'error');
    });
}

// Complete onboarding and go to dashboard
function completeOnboarding() {
    showNotification('Welcome to Beauty Fair!', 'success');
    
    // Show dashboard based on user role
    // For now, show welcome page then dashboard
    showWelcomePage();
}
// Initialize department buttons when page loads
window.addEventListener('load', () => {
    setupDepartmentSelection();
});
// Load user data from Firebase when dashboard opens
function loadUserData() {
    const user = auth.currentUser;
    
    if (!user) return;
    
    db.collection('users').doc(user.uid).get()
        .then((doc) => {
            if (doc.exists) {
                const data = doc.data();
                
                // CHANGED THIS LINE - Added console log
                currentUser.name = data.fullName;
                console.log("Setting name to:", data.fullName);
                console.log("Full data from Firebase:", data);
                
                currentUser.initials = getInitials(data.fullName);
                
                // Update greeting text with real name
                const greetingElement = document.getElementById('greetingText');
                if (greetingElement) {
                    const hour = new Date().getHours();
                    let greeting = 'Good morning';
                    if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
                    if (hour >= 17) greeting = 'Good evening';
                    
                    greetingElement.textContent = `${greeting}, ${data.fullName}!`;
                }
                
                // Update profile picture
                const profilePicElement = document.getElementById('dashboardProfilePic');
                if (profilePicElement) {
                    if (data.profilePicture && data.profilePicture.startsWith('data:image')) {
                        profilePicElement.innerHTML = `<img src="${data.profilePicture}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                    } else {
                        profilePicElement.textContent = currentUser.initials;
                    }
                }
                
                console.log("User data loaded successfully:", data);
            }
        })
        .catch((error) => {
            console.error("Error loading user data:", error);
        });
}
// Helper function to get initials
function getInitials(name) {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
}
// Update loadProfileData to include profile picture
function loadProfileData() {
    const user = auth.currentUser;
    if (!user) return;
    
    db.collection('users').doc(user.uid).get()
        .then((doc) => {
            if (doc.exists) {
                const data = doc.data();
                
                // Update name
                const nameField = document.getElementById('profileName');
                if (nameField) nameField.textContent = data.fullName || 'N/A';
                
                // Update birthday
                const birthdayField = document.getElementById('profileBirthday');
                if (birthdayField) birthdayField.textContent = data.birthday || 'N/A';
                
                // Update hobby
                const hobbyField = document.getElementById('profileHobby');
                if (hobbyField) hobbyField.textContent = data.hobby || 'N/A';
                
                // Update department
                const deptField = document.getElementById('profileDepartment');
                if (deptField) deptField.textContent = formatDepartment(data.department) || 'N/A';
                
                // UPDATE PROFILE PICTURE on profile page
                const profilePicElement = document.getElementById('profilePicture');
                if (profilePicElement && data.profilePicture) {
                    profilePicElement.innerHTML = `<img src="${data.profilePicture}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
                }
            }
        });
}

// Load data into edit form
function loadEditProfileData() {
    const user = auth.currentUser;
    if (!user) return;
    
    db.collection('users').doc(user.uid).get()
        .then((doc) => {
            if (doc.exists) {
                const data = doc.data();
                
                // Fill edit form with real data
                document.getElementById('editName').value = data.fullName || '';
                document.getElementById('editBirthday').value = data.birthday || '';
                document.getElementById('editHobby').value = data.hobby || '';
                document.getElementById('editDepartment').value = formatDepartment(data.department) || '';
            }
        });
}

// Helper to format department names
function formatDepartment(dept) {
    const deptNames = {
        'perfume': 'Perfume Section',
        'cream': 'Cream Section',
        'mixing': 'Mixing Section',
        'driver': 'Driver',
        'domestic': 'Domestic Worker',
        'office': 'Office',
        'security': 'Security',
        'printing': 'Printing',
        'store': 'Store',
        'maintenance': 'Maintenance'
    };
    return deptNames[dept] || dept;
}
function loadPosts() {
    db.collection('posts')
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get()
        .then((snapshot) => {
            const feedContainer = document.getElementById('feedPosts');
            if (!feedContainer) return;
            
            feedContainer.innerHTML = '';
            
            snapshot.forEach((doc) => {
                const post = { id: doc.id, ...doc.data() };
                if (post.createdAt) {
                    post.time = getTimeAgo(post.createdAt.toDate());
                }
                addPostToFeed(post);
            });
        })
        .catch((error) => {
            console.error('Load posts error:', error);
        });
}

// Helper: Time ago
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + 'm ago';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + 'h ago';
    return Math.floor(hours / 24) + 'd ago';
}
function updatePostCommentCount(postId, count) {
    const postElement = document.querySelector(`[data-post-id="${postId}"]`);
    if (!postElement) return;
    
    const commentAction = postElement.querySelector('.comment-action span');
    if (commentAction) {
        commentAction.textContent = `${count} Comment${count !== 1 ? 's' : ''}`;
    }
}


async function loadCommentCountForPost(postId) {
    try {
        const snapshot = await db.collection('posts').doc(postId).collection('comments').get();
        updatePostCommentCount(postId, snapshot.size);
    } catch (error) {
        console.error('Load comment count error:', error);
    }
}
function loadPosts() {
    db.collection('posts')
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get()
        .then((snapshot) => {
            const feedContainer = document.getElementById('feedPosts');
            if (!feedContainer) {
                console.log('Feed container not found');
                return;
            }
            
            feedContainer.innerHTML = '';
            
            if (snapshot.empty) {
                feedContainer.innerHTML = '<div style="text-align:center; padding:40px; color:#999;">No posts yet. Be the first to post!</div>';
                return;
            }
            
            snapshot.forEach((doc) => {
                const postData = { id: doc.id, ...doc.data() };
                if (postData.createdAt) {
                    postData.time = getTimeAgo(postData.createdAt.toDate());
                }
                displayPost(postData);
            });
        })
        .catch((error) => {
            console.error('Load posts error:', error);
            const feedContainer = document.getElementById('feedPosts');
            if (feedContainer) {
                feedContainer.innerHTML = '<div style="text-align:center; padding:40px; color:#e74c3c;">Failed to load posts. Please refresh.</div>';
            }
        });
}
// ========== POLL FUNCTIONS FOR STAFF ==========

// Update your displayPost function to detect and show polls
function displayPost(postItem) {
    const feedContainer = document.getElementById('feedPosts');
    if (!feedContainer) return;
    
    const postElement = document.createElement('div');
    postElement.className = 'post';
    postElement.dataset.postId = postItem.id;
    
    const currentUserId = auth.currentUser ? auth.currentUser.uid : null;
    const isOwn = postItem.userId === currentUserId;
    
    // Your existing code for press handling...
    if (isOwn) {
        let pressTimer;
        
        postElement.addEventListener('mousedown', function(e) {
            if (e.target.closest('.post-action')) return;
            pressTimer = setTimeout(() => openPostOptions(postItem.id), 800);
        });
        
        postElement.addEventListener('mouseup', function() {
            clearTimeout(pressTimer);
        });
        
        postElement.addEventListener('mouseleave', function() {
            clearTimeout(pressTimer);
        });
        
        postElement.addEventListener('touchstart', function(e) {
            if (e.target.closest('.post-action')) return;
            pressTimer = setTimeout(() => openPostOptions(postItem.id), 800);
        });
        
        postElement.addEventListener('touchend', function() {
            clearTimeout(pressTimer);
        });
    }
    
    let mediaHTML = '';
    if (postItem.type === 'photo' && postItem.mediaUrl) {
        mediaHTML = `<div class="post-media"><img src="${postItem.mediaUrl}" alt="Post image" class="post-image" onclick="viewMediaFullscreen('${postItem.mediaUrl}', 'image')"></div>`;
    } else if (postItem.type === 'video' && postItem.mediaUrl) {
        mediaHTML = `<div class="post-media"><video src="${postItem.mediaUrl}#t=0.1" class="post-video" preload="metadata" onclick="viewMediaFullscreen('${postItem.mediaUrl}', 'video')"></video></div>`;
    }
    
    // CHECK IF POST IS A POLL
    let pollHTML = '';
    if (postItem.type === 'poll' && postItem.pollId) {
        pollHTML = `
            <div class="post-poll-preview">
                <div class="post-poll-title">
                    <i class="fas fa-poll"></i>
                    ${postItem.pollTitle || 'New Poll'}
                </div>
                <div class="post-poll-nominees">
                    ${postItem.nominees ? postItem.nominees.map(n => 
                        `<div class="post-poll-nominee-item">${n.name}</div>`
                    ).join('') : ''}
                </div>
                <button class="view-vote-btn" onclick="openPollFromFeed('${postItem.pollId}')">
                    <i class="fas fa-poll"></i>
                    View & Vote
                </button>
            </div>
        `;
    }
    
    const likeCount = postItem.likes ? postItem.likes.length : 0;
    const isLiked = postItem.likes && currentUserId && postItem.likes.includes(currentUserId);
    
    postElement.innerHTML = `
        <div class="post-header">
            <div class="post-user">
                <div class="post-avatar">
                    ${postItem.userPhoto 
                        ? `<img src="${postItem.userPhoto}" alt="${postItem.userName}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">` 
                        : postItem.userInitials || 'U'}
                </div>
                <div class="post-user-info">
                    <h4>${postItem.userName || 'User'}</h4>
                    <span class="post-time">${postItem.time || 'Just now'}</span>
                </div>
            </div>
            ${isOwn ? '<i class="fas fa-ellipsis-v post-menu" onclick="openPostOptions(\'' + postItem.id + '\')"></i>' : ''}
        </div>
        
        <div class="post-content">
            ${postItem.content ? '<div class="post-text">' + postItem.content + '</div>' : ''}
            ${mediaHTML}
            ${pollHTML}
        </div>
        
        <div class="post-actions">
            <div class="post-action like-action ${isLiked ? 'liked' : ''}" onclick="toggleLike(this)">
                <i class="fas fa-heart"></i>
                <span>${likeCount} Like${likeCount !== 1 ? 's' : ''}</span>
            </div>
            <div class="post-action comment-action" onclick="showComments(this)">
                <i class="fas fa-comment"></i>
                <span>0 Comments</span>
            </div>
            <div class="post-action save-action" onclick="toggleSave(this)">
                <i class="fas fa-bookmark"></i>
                <span>Save</span>
            </div>
        </div>
    `;
    
    feedContainer.appendChild(postElement);
    
    // Load comment count
    if (typeof loadCommentCount === 'function') {
        loadCommentCount(postItem.id);
    }
}
// ========== POLL TIMER VARIABLE ========== 

let pollTimerInterval = null;

// Open poll detail page from feed
function openPollFromFeed(pollId) {
    if (!pollId) {
        showNotification('Poll not found', 'error');
        return;
    }
    
    const pollPage = document.getElementById('staffPollDetailPage');
    if (pollPage) {
        pollPage.style.display = 'block';
        // Scroll to top of poll page
        setTimeout(() => {
            pollPage.scrollTop = 0;
        }, 10);
    }
    
    loadPollForStaff(pollId);
}
// Close poll detail page
function closeStaffPollDetail() {
    const pollPage = document.getElementById('staffPollDetailPage');
    if (pollPage) {
        pollPage.style.display = 'none';
    }
    
    if (pollTimerInterval) {
        clearInterval(pollTimerInterval);
        pollTimerInterval = null;
    }
    
    // Scroll back to top of feed
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
// Load poll details for staff
function loadPollForStaff(pollId) {
    const container = document.getElementById('staffPollContainer');
    
    // Real-time listener for poll
    db.collection('polls').doc(pollId).onSnapshot((doc) => {
        if (!doc.exists) {
            container.innerHTML = `
                <div class="no-poll-message">
                    <div class="no-poll-icon">
                        <i class="fas fa-poll"></i>
                    </div>
                    <div class="no-poll-text">Poll Not Found</div>
                    <p>This poll may have been closed or removed</p>
                </div>
            `;
            return;
        }
        
        const poll = { id: doc.id, ...doc.data() };
        
        // Check if poll has ended (5 hours = 18000000 milliseconds)
        const pollDuration = 5 * 60 * 60 * 1000; // 5 hours in milliseconds
        const createdTime = poll.createdAt ? poll.createdAt.toDate().getTime() : Date.now();
        const currentTime = Date.now();
        const timeElapsed = currentTime - createdTime;
        const timeRemaining = pollDuration - timeElapsed;
        
        if (timeRemaining <= 0 && poll.status === 'active') {
            // Auto-close poll after 5 hours
            closePollAutomatically(poll.id);
            return;
        }
        
        // Format date
        if (poll.createdAt) {
            poll.createdAtFormatted = poll.createdAt.toDate().toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        renderPollForStaff(poll, container, timeRemaining);
    }, (error) => {
        console.error('Load poll error:', error);
        container.innerHTML = '<div style="text-align:center; padding:40px; color:#e74c3c;">Failed to load poll</div>';
    });
}

// Render poll for staff voting
function renderPollForStaff(poll, container, timeRemaining) {
    const totalVotes = poll.nominees.reduce((sum, n) => sum + (n.votes || 0), 0);
    const currentUser = auth.currentUser;
    
    // Check if user already voted
    const userVoted = poll.nominees.some(n =>
        n.voters && currentUser && n.voters.includes(currentUser.uid)
    );
    
    // Format time remaining
    const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
    
    container.innerHTML = `
        <button class="poll-back-btn" onclick="closeStaffPollDetail()">
            <i class="fas fa-arrow-left"></i>
        </button>
        
        <div class="poll-header">
            <div class="poll-question">${poll.title}</div>
            <div class="poll-meta">
                <span>Created on ${poll.createdAtFormatted || 'Recently'}</span>
                <span class="poll-timer" id="pollTimer">
                    <i class="fas fa-clock"></i>
                    <span id="timerDisplay">${hours}h ${minutes}m ${seconds}s</span>
                </span>
            </div>
        </div>
        
        <div class="poll-options">
            ${poll.nominees.map(nominee => {
                const votes = nominee.votes || 0;
                const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                const hasVoted = nominee.voters && currentUser && nominee.voters.includes(currentUser.uid);
                
                return `
                    <div class="poll-option ${hasVoted ? 'voted' : ''}" onclick="voteForNominee('${poll.id}', '${nominee.id}')">
                        <div class="poll-option-header">
                            <div class="poll-option-name">${nominee.name}</div>
                            <div class="poll-option-percentage">${percentage}%</div>
                        </div>
                        <div class="poll-option-votes">${votes} vote${votes !== 1 ? 's' : ''}</div>
                        <div class="poll-progress-bar">
                            <div class="poll-progress-fill" style="width: ${percentage}%"></div>
                        </div>
                        ${hasVoted ? '<div class="vote-checkmark"><i class="fas fa-check"></i></div>' : ''}
                    </div>
                `;
            }).join('')}
        </div>
        
        <div class="poll-stats">
            <div class="total-votes">Total Votes: ${totalVotes}</div>
            <div class="poll-status">● Poll is Active</div>
        </div>
        
        ${userVoted ? `
            <div style="text-align: center; margin-top: 20px; padding: 15px; background: #e8f8f0; border-radius: 12px; color: #2ed573; font-weight: 600;">
                <i class="fas fa-check-circle"></i> You have voted in this poll
            </div>
        ` : ''}
    `;
    
    // Start countdown timer
    startPollTimer(timeRemaining, poll.id);
}

// Start poll countdown timer
function startPollTimer(timeRemaining, pollId) {
    if (pollTimerInterval) {
        clearInterval(pollTimerInterval);
    }
    
    pollTimerInterval = setInterval(() => {
        timeRemaining -= 1000;
        
        if (timeRemaining <= 0) {
            clearInterval(pollTimerInterval);
            closePollAutomatically(pollId);
            return;
        }
        
        const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
        
        const timerDisplay = document.getElementById('timerDisplay');
        if (timerDisplay) {
            timerDisplay.textContent = `${hours}h ${minutes}m ${seconds}s`;
        }
    }, 1000);
}

// Auto-close poll after 5 hours
async function closePollAutomatically(pollId) {
    try {
        const pollRef = db.collection('polls').doc(pollId);
        const pollDoc = await pollRef.get();
        
        if (!pollDoc.exists) return;
        
        const pollData = pollDoc.data();
        
        // Find winner
        const nominees = pollData.nominees || [];
        const winner = nominees.reduce((max, nominee) =>
            (nominee.votes || 0) > (max.votes || 0) ? nominee : max, nominees[0]);
        
        const totalVotes = nominees.reduce((sum, n) => sum + (n.votes || 0), 0);
        const winnerPercentage = totalVotes > 0 ? Math.round((winner.votes / totalVotes) * 100) : 0;
        
        // Update poll status
        await pollRef.update({
            status: 'closed',
            endedAt: firebase.firestore.FieldValue.serverTimestamp(),
            winner: {
                name: winner.name,
                votes: winner.votes,
                percentage: winnerPercentage
            }
        });
        
        // Notify supervisor
        const currentUser = auth.currentUser;
        if (currentUser) {
            await db.collection('notifications').add({
                userId: pollData.createdBy,
                type: 'poll_ended',
                title: 'Poll Ended',
                message: `"${pollData.title}" has ended. ${winner.name} won with ${winnerPercentage}% (${winner.votes} votes)`,
                read: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        showNotification('Poll has ended', 'success');
        closeStaffPollDetail();
        
    } catch (error) {
        console.error('Close poll error:', error);
    }
}

// Vote for nominee (Staff)
async function voteForNominee(pollId, nomineeId) {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    try {
        const pollRef = db.collection('polls').doc(pollId);
        const pollDoc = await pollRef.get();
        
        if (!pollDoc.exists) {
            showNotification('Poll not found', 'error');
            return;
        }
        
        const pollData = pollDoc.data();
        
        // Check if poll is still active
        if (pollData.status !== 'active') {
            showNotification('This poll has ended', 'error');
            return;
        }
        
        // Check if user already voted
        const alreadyVoted = pollData.nominees.some(n =>
            n.voters && n.voters.includes(currentUser.uid)
        );
        
        if (alreadyVoted) {
            showNotification('You have already voted in this poll', 'error');
            return;
        }
        
        // Find the nominee and update votes
        const updatedNominees = pollData.nominees.map(nominee => {
            if (nominee.id === nomineeId) {
                return {
                    ...nominee,
                    votes: (nominee.votes || 0) + 1,
                    voters: [...(nominee.voters || []), currentUser.uid]
                };
            }
            return nominee;
        });
        
        // Update poll in Firebase
        await pollRef.update({
            nominees: updatedNominees,
            totalVotes: firebase.firestore.FieldValue.increment(1)
        });
        
        const votedNominee = updatedNominees.find(n => n.id === nomineeId);
        showNotification(`Voted for ${votedNominee.name}! Thank you!`, 'success');
        
    } catch (error) {
        console.error('Vote error:', error);
        showNotification('Failed to vote: ' + error.message, 'error');
    }
}

console.log('Staff poll feature with timer loaded successfully!');


function loadCommentCount(postId) {
    db.collection('posts').doc(postId).collection('comments').get()
        .then((snapshot) => {
            const count = snapshot.size;
            const postElement = document.querySelector(`[data-post-id="${postId}"]`);
            if (postElement) {
                const commentSpan = postElement.querySelector('.comment-action span');
                if (commentSpan) {
                    commentSpan.textContent = `${count} Comment${count !== 1 ? 's' : ''}`;
                }
            }
        })
        .catch((error) => {
            console.error('Load comment count error:', error);
        });
}
function displayMessage(message, currentUserId, container, conversationId) {
    const isSentByMe = message.senderId === currentUserId;
    
    const messageGroup = document.createElement('div');
    messageGroup.className = `message-group ${isSentByMe ? 'sent' : 'received'}`;
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isSentByMe ? 'sent' : 'received'}`;
    
    // Delete button for sent messages
    if (isSentByMe) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'message-delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.style.cssText = 'position:absolute; top:-5px; right:-5px; background:#ff4757; color:white; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer; font-size:14px; display:none;';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteMessage(conversationId, message.id);
        };
        messageElement.style.position = 'relative';
        messageElement.onmouseenter = () => deleteBtn.style.display = 'block';
        messageElement.onmouseleave = () => deleteBtn.style.display = 'none';
        messageElement.appendChild(deleteBtn);
    }
    
    // Handle message types
    if (message.type === 'image' && message.imageUrl) {
        const img = document.createElement('img');
        img.src = message.imageUrl;
        img.style.cssText = 'max-width: 200px; border-radius: 8px; cursor: pointer;';
        img.onclick = () => viewImageFullscreen(message.imageUrl);
        messageElement.appendChild(img);
    } else if (message.type === 'voice' && message.voiceUrl) {
        const voiceDiv = document.createElement('div');
        voiceDiv.className = 'voice-message';
        voiceDiv.style.cssText = 'display:flex; align-items:center; gap:10px; padding:10px;';
        voiceDiv.innerHTML = `
            <button onclick="playVoiceFromUrl('${message.voiceUrl}')" style="background:#4CAF50; color:white; border:none; border-radius:50%; width:35px; height:35px; cursor:pointer;">
                <i class="fas fa-play"></i>
            </button>
            <span>${message.duration || '0:00'}</span>
        `;
        messageElement.appendChild(voiceDiv);
    } else if (message.type === 'text' && message.text) {
        const textDiv = document.createElement('div');
        textDiv.textContent = message.text;
        textDiv.style.padding = '10px';
        messageElement.appendChild(textDiv);
    }
    
    // Time
    const time = message.timestamp ? formatMessageTime(message.timestamp.toDate()) : 'Just now';
    const timeElement = document.createElement('div');
    timeElement.className = 'message-time';
    timeElement.style.cssText = 'font-size:0.75rem; color:#999; margin-top:5px;';
    timeElement.textContent = time;
    
    messageGroup.appendChild(messageElement);
    messageGroup.appendChild(timeElement);
    
    // Read status for sent messages
    if (isSentByMe) {
        const statusElement = document.createElement('div');
        statusElement.style.cssText = 'font-size:0.7rem; color:#999; margin-top:2px;';
        statusElement.textContent = message.read ? '✓✓ Read' : '✓✓ Delivered';
        messageGroup.appendChild(statusElement);
    }
    
    container.appendChild(messageGroup);
}
 
async function loadChatMessagesRealtime(contactUserId) {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;
    
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    const conversationId = getConversationId(currentUser.uid, contactUserId);
    
    // Remove previous listener
    if (messageListener) {
        messageListener();
    }
    
    messagesContainer.innerHTML = '<div style="text-align:center; padding:20px;">Loading messages...</div>';
    
    try {
        // Listen for real-time updates
        messageListener = db.collection('conversations')
            .doc(conversationId)
            .collection('messages')
            .orderBy('timestamp', 'asc')
            .onSnapshot(snapshot => {
                messagesContainer.innerHTML = '';
                
                if (snapshot.empty) {
                    messagesContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#999;">No messages yet. Start the conversation!</div>';
                    return;
                }
                
                // Display all messages
                snapshot.forEach(doc => {
                    const message = { id: doc.id, ...doc.data() };
                    displayMessage(message, currentUser.uid, messagesContainer, conversationId);
                });
                
                // Scroll to bottom
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, error => {
                console.error('Message listener error:', error);
                messagesContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#e74c3c;">Failed to load messages</div>';
            });
        
    } catch (error) {
        console.error('Load messages error:', error);
        messagesContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#e74c3c;">Failed to load messages</div>';
    }
}
async function sendImageMessage(imageFile) {
    if (!currentChatUser) return;
    
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    try {
        showNotification('Uploading image...', 'info');
        
        // Convert to base64
        const base64 = await fileToBase64(imageFile);
        
        const conversationId = getConversationId(currentUser.uid, currentChatUser.uid);
        
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        
        // Save message with base64 image
        await db.collection('conversations').doc(conversationId).collection('messages').add({
            text: '',
            imageUrl: base64,
            senderId: currentUser.uid,
            senderName: userData.fullName || 'User',
            receiverId: currentChatUser.uid,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            read: false,
            type: 'image'
        });
        
        // Update conversation
        await db.collection('conversations').doc(conversationId).set({
            participants: [currentUser.uid, currentChatUser.uid],
            lastMessage: '📷 Image',
            lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
            lastMessageSender: currentUser.uid
        }, { merge: true });
        
        showNotification('Image sent!', 'success');
        
    } catch (error) {
        console.error('Send image error:', error);
        showNotification('Failed to send image', 'error');
    }
}
async function markMessagesAsRead(contactUserId) {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    const conversationId = getConversationId(currentUser.uid, contactUserId);
    
    try {
        const snapshot = await db.collection('conversations')
            .doc(conversationId)
            .collection('messages')
            .where('receiverId', '==', currentUser.uid)
            .where('read', '==', false)
            .get();
        
        const batch = db.batch();
        snapshot.forEach(doc => {
            batch.update(doc.ref, { read: true });
        });
        
        await batch.commit();
    } catch (error) {
        console.error('Mark read error:', error);
    }
}
function getConversationId(userId1, userId2) {
    return [userId1, userId2].sort().join('_');
}

function getInitials(name) {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

function formatMessageTime(date) {
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
        return 'Yesterday';
    } else if (days < 7) {
        return `${days} days ago`;
    } else {
        return date.toLocaleDateString();
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function playVoiceFromUrl(base64Url) {
    const audio = new Audio(base64Url);
    audio.play().catch(error => {
        console.error('Play error:', error);
        showNotification('Could not play audio', 'error');
    });
}

function viewImageFullscreen(imageUrl) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); display:flex; align-items:center; justify-content:center; z-index:9999;';
    modal.onclick = () => modal.remove();
    
    const img = document.createElement('img');
    img.src = imageUrl;
    img.style.cssText = 'max-width:90%; max-height:90%; border-radius:8px;';
    
    modal.appendChild(img);
    document.body.appendChild(modal);
}

function backToMessagesList() {
    // Stop listening to messages
    if (messageListener) {
        messageListener();
        messageListener = null;
    }
    
    document.getElementById('chatInterface').style.display = 'none';
    document.getElementById('messagesListView').style.display = 'block';
    currentChatUser = null;
    
    // Reload contacts to update unread counts
    loadContacts();
}

function handleMessageKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

function updateSendButton() {
    const input = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendMessageBtn');
    if (input && sendBtn) {
        sendBtn.disabled = !input.value.trim();
    }
}
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('chatFileInput');
    if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
            const files = e.target.files;
            if (files.length > 0) {
                const file = files[0];
                if (file.type.startsWith('image/')) {
                    await sendImageMessage(file);
                }
                fileInput.value = ''; // Reset input
            }
        });
    }
});

// ========================================
// HELPER FUNCTIONS
// ========================================
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });9
}

function viewImageFullscreen(imageUrl) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); display:flex; align-items:center; justify-content:center; z-index:9999;';
    modal.onclick = () => modal.remove();
    
    const img = document.createElement('img');
    img.src = imageUrl;
    img.style.cssText = 'max-width:90%; max-height:90%; border-radius:8px;';
    
    modal.appendChild(img);
    document.body.appendChild(modal);
}
async function createNotification(userId, type, title, text, action = null) {
    try {
        await db.collection('notifications').add({
            userId: userId,
            type: type,
            title: title,
            text: text,
            action: action,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            unread: true
        });
    } catch (error) {
        console.error('Create notification error:', error);
    }
}
function getNotificationIcon(type) {
    const icons = {
        announcement: 'fas fa-bullhorn',
        message: 'fas fa-envelope',
        query: 'fas fa-exclamation-triangle',
        request: 'fas fa-clipboard-list',
        award: 'fas fa-trophy',
        system: 'fas fa-cog',
        comment: 'fas fa-comment',
        like: 'fas fa-heart'
    };
    
    return icons[type] || 'fas fa-bell';
}

function formatNotificationTime(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (days < 30) {
        const weeks = Math.floor(days / 7);
        return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    }
    return date.toLocaleDateString();
}

function closeNotifications() {
    document.getElementById('notificationsPage').style.display = 'none';
}
function initializeNotifications() {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    // Real-time listener for new notifications
    db.collection('notifications')
        .where('userId', '==', currentUser.uid)
        .where('unread', '==', true)
        .onSnapshot(snapshot => {
            if (!snapshot.empty) {
                loadNotifications();
                updateNotificationBadges();
            }
        });
}
 
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
// ========================================
// GUARANTOR PICTURE UPLOAD HANDLER
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    const guarantorUploadBox = document.getElementById('guarantorUploadBox');
    const guarantorInput = document.getElementById('guarantorPictureInput');
    const guarantorPreview = document.getElementById('guarantorPreview');
    
    if (guarantorUploadBox && guarantorInput) {
        guarantorUploadBox.onclick = () => guarantorInput.click();
        
        guarantorInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                guarantorPicture = file;
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    guarantorPreview.innerHTML = `
                        <div style="position: relative; display: inline-block;">
                            <img src="${e.target.result}" style="max-width: 200px; border-radius: 8px;">
                            <button onclick="removeGuarantorPicture()" style="position: absolute; top: -10px; right: -10px; background: #ff4757; color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer;">×</button>
                        </div>
                    `;
                };
                reader.readAsDataURL(file);
            }
        });
    }
});

function removeGuarantorPicture() {
    guarantorPicture = null;
    document.getElementById('guarantorPreview').innerHTML = '';
    document.getElementById('guarantorPictureInput').value = '';
}
console.log('Requests Firebase integration loaded successfully!');

// ========================================
// HELPER FUNCTIONS
// ========================================
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function closeComplaints() {
    const complaintsPage = document.getElementById('complaintsPage');
    if (complaintsPage) {
        complaintsPage.style.display = 'none';
    }
}
console.log('Complaints Firebase integration loaded successfully!');
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('complaintFileInput');
    const attachBtn = document.getElementById('attachFileBtn');
    
    if (attachBtn && fileInput) {
        attachBtn.onclick = () => fileInput.click();
        
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            selectedFiles = [...selectedFiles, ...files];
            updateFilePreview();
            updateSendButton();
            e.target.value = ''; // Reset input
        });
    }
});
function updateReplyFilePreview() {
    const preview = document.getElementById('queryReplyFilePreview');
    if (!preview) return;
    
    preview.innerHTML = '';
    
    queryReplyFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:8px; background:#f5f5f5; border-radius:6px; margin-bottom:5px;';
        
        fileItem.innerHTML = `
            <span><i class="fas fa-file"></i> ${file.name}</span>
            <button onclick="removeQueryReplyFile(${index})" style="background:#ff4757; color:white; border:none; border-radius:50%; width:24px; height:24px; cursor:pointer;">×</button>
        `;
        
        preview.appendChild(fileItem);
    });
}

function removeQueryReplyFile(index) {
    queryReplyFiles.splice(index, 1);
    updateReplyFilePreview();
    updateReplySendButton();
}

function updateReplySendButton() {
    const sendBtn = document.getElementById('queryReplySendBtn');
    const textarea = document.getElementById('queryReplyText');
    
    if (sendBtn && textarea) {
        const hasText = textarea.value.trim().length > 0;
        const hasFiles = queryReplyFiles.length > 0;
        sendBtn.disabled = !hasText && !hasFiles;
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
console.log('Queries Firebase integration loaded successfully!');
function updateNotificationBadges() {
    const unreadCount = notifications.filter(n => n.unread).length;
    
    // Update badge in navigation
    const badgeElements = document.querySelectorAll('.notification-badge-count');
    badgeElements.forEach(badge => {
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    });
} 
async function loadRepliesForComment(postId, commentId) {
    try {
        const snapshot = await db.collection('posts')
            .doc(postId)
            .collection('comments')
            .doc(commentId)
            .collection('replies')
            .orderBy('createdAt', 'asc')
            .get();
        
        const repliesContainer = document.getElementById(`replies-${commentId}`);
        if (!repliesContainer) return;
        
        if (snapshot.empty) {
            repliesContainer.innerHTML = '';
            return;
        }
        
        repliesContainer.innerHTML = '';
        
        snapshot.forEach(doc => {
            const replyData = { id: doc.id, ...doc.data() };
            replyData.time = replyData.createdAt ? getTimeAgo(replyData.createdAt.toDate()) : 'Just now';
            
            const replyElement = createReplyElement(replyData, postId, commentId);
            repliesContainer.appendChild(replyElement);
        });
        
    } catch (error) {
        console.error('Load replies error:', error);
    }
}
function createReplyElement(replyData, postId, commentId) {
    const replyDiv = document.createElement('div');
    replyDiv.className = 'reply-item';
    replyDiv.dataset.replyId = replyData.id;
    
    const user = auth.currentUser;
    const isLiked = user && replyData.likes && replyData.likes.includes(user.uid);
    
    replyDiv.innerHTML = `
        <div class="reply-header">
            <div class="reply-avatar">${replyData.userInitials || 'U'}</div>
            <div class="reply-user-info">
                <div class="reply-user-name">${replyData.userName || 'User'}</div>
                <span class="reply-time">${replyData.time}</span>
            </div>
        </div>
        <div class="reply-text">${replyData.text}</div>
        <div class="reply-actions">
            <button class="reply-action-btn ${isLiked ? 'liked' : ''}" onclick="toggleReplyLike('${postId}', '${commentId}', '${replyData.id}')">
                <i class="fas fa-heart"></i>
                <span>${replyData.likes ? replyData.likes.length : 0} Like${replyData.likes && replyData.likes.length !== 1 ? 's' : ''}</span>
            </button>
        </div>
    `;
    
    return replyDiv;
}
async function toggleReplyLike(postId, commentId, replyId) {
    const user = auth.currentUser;
    if (!user) return showNotification('Login required', 'error');
    
    try {
        const replyRef = db.collection('posts')
            .doc(postId)
            .collection('comments')
            .doc(commentId)
            .collection('replies')
            .doc(replyId);
        
        const replyDoc = await replyRef.get();
        if (!replyDoc.exists) return;
        
        const replyData = replyDoc.data();
        const likes = replyData.likes || [];
        const userIndex = likes.indexOf(user.uid);
        
        if (userIndex > -1) {
            likes.splice(userIndex, 1);
        } else {
            likes.push(user.uid);
        }
        
        await replyRef.update({ likes: likes });
        
        // Refresh the replies
        await loadRepliesForComment(postId, commentId);
        
    } catch (error) {
        console.error('Toggle reply like error:', error);
        showNotification('Failed to like reply', 'error');
    }
}

// Call this when user logs in or app loads
document.addEventListener('DOMContentLoaded', function() {
    auth.onAuthStateChanged(user => {
        if (user) {
            initializeNotifications();
        }
    });
});