// Admin Interface - JavaScript

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    updateGreeting();
    updateDateTime();
    setInterval(updateDateTime, 1000);
    loadStaffFeed();
});


// Greeting and DateTime Functions
function updateGreeting() {
    const hour = new Date().getHours();
    let greeting = '';
    
    if (hour < 12) {
        greeting = 'Good morning, HR!';
    } else if (hour < 18) {
        greeting = 'Good afternoon, HR!';
    } else {
        greeting = 'Good evening, HR!';
    }
    
    document.getElementById('greetingText').textContent = greeting;
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
    
    const dateTimeElement = document.getElementById('liveDateTime');
    if (dateTimeElement) {
        dateTimeElement.textContent = now.toLocaleDateString('en-US', options);
    }
}

// Navigation Functions
function setActiveNav(element, functionName) {
    document.querySelectorAll('.nav-icon').forEach(icon => {
        icon.classList.remove('active');
    });
    
    element.classList.add('active');
    
    if (typeof window[functionName] === 'function') {
        window[functionName]();
    }
}

function showDashboard() {
    window.scrollTo(0, 0);
}














// Hamburger Menu Functions
function openHamburgerMenu() {
    document.getElementById('hamburgerMenu').style.display = 'block';
}

function closeHamburgerMenu() {
    document.getElementById('hamburgerMenu').style.display = 'none';
}

// Load Staff Feed
function loadStaffFeed() {
    const feedContainer = document.getElementById('feedPosts');
    
    const posts = [
        {
            id: 1,
            author: 'Adeyemi Michael',
            initials: 'AM',
            time: '2 hours ago',
            text: 'Great team meeting today! Looking forward to implementing the new customer service strategies we discussed. 💪',
            type: 'text',
            likes: 24,
            comments: 5,
            liked: false
        },
        {
            id: 2,
            author: 'Folake Kehinde',
            initials: 'FK',
            time: '4 hours ago',
            text: 'Just finished organizing the new perfume display! The customers are going to love the new arrangement. ✨',
            type: 'photo',
            mediaUrl: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=500&h=300&fit=crop',
            likes: 18,
            comments: 3,
            liked: false
        },
        {
            id: 3,
            author: 'Tunde Bakare',
            initials: 'TB',
            time: '6 hours ago',
            text: 'Safety first! Remember to always wear your protective gear when working with chemicals in the mixing section. @everyone',
            type: 'text',
            likes: 32,
            comments: 8,
            liked: false
        }
    ];
    
    renderPosts(posts, feedContainer);
}

function renderPosts(posts, container) {
    container.innerHTML = '';
    
    posts.forEach(post => {
        const postElement = document.createElement('div');
        postElement.className = 'post';
        postElement.dataset.postId = post.id;
        
        postElement.innerHTML = `
            <div class="post-header">
                <div class="post-user">
                    <div class="post-avatar">${post.initials}</div>
                    <div class="post-user-info">
                        <h4>${post.author}</h4>
                        <span class="post-time">${post.time}</span>
                    </div>
                </div>
                <i class="fas fa-ellipsis-v post-menu"></i>
            </div>
            
            <div class="post-content">
                <div class="post-text">${post.text}</div>
                ${post.type === 'photo' && post.mediaUrl ? `
                    <div class="post-media">
                        <img src="${post.mediaUrl}" alt="Post image" class="post-image">
                    </div>
                ` : ''}
                ${post.type === 'video' && post.mediaUrl ? `
                    <div class="post-media">
                        <video src="${post.mediaUrl}" class="post-video" controls preload="metadata"></video>
                    </div>
                ` : ''}
            </div>
            
            <div class="post-actions">
                <button class="post-action like-action ${post.liked ? 'liked' : ''}" onclick="toggleLike(${post.id})">
                    <i class="fas fa-heart"></i>
                    <span>${post.likes} Likes</span>
                </button>
                <button class="post-action comment-action" onclick="showComments(${post.id})">
                    <i class="fas fa-comment"></i>
                    <span>${post.comments} Comments</span>
                </button>
            </div>
        `;
        
        // Long press functionality for HR delete
        let pressTimer;
        postElement.addEventListener('mousedown', function(e) {
            if (e.target.closest('.post-menu')) return;
            pressTimer = setTimeout(() => showAdminPostMenu(post.id, post.author), 800);
        });
        
        postElement.addEventListener('mouseup', function() {
            clearTimeout(pressTimer);
        });
        
        postElement.addEventListener('touchstart', function(e) {
            if (e.target.closest('.post-menu')) return;
            pressTimer = setTimeout(() => showAdminPostMenu(post.id, post.author), 800);
        });
        
        postElement.addEventListener('touchend', function() {
            clearTimeout(pressTimer);
        });
        
        container.appendChild(postElement);
    });
}

// Post Menu for Admin Delete
function showAdminPostMenu(postId, author) {
    let modal = document.getElementById('deletePostModal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'deletePostModal';
        modal.className = 'profile-options-modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="profile-options-content">
            <h3 class="profile-options-title">Delete post by ${author}?</h3>
            <p style="text-align: center; color: #666; margin-bottom: 20px;">
                ${author} will be notified that their post was removed for violating community guidelines.
            </p>
            <button class="profile-option-btn remove" onclick="confirmDeletePost(${postId}, '${author}')">
                <i class="fas fa-trash"></i>
                Delete Post
            </button>
            <button class="profile-option-btn cancel" onclick="closeDeletePostModal()">
                <i class="fas fa-times"></i>
                Cancel
            </button>
        </div>
    `;
    
    modal.classList.add('show');
}

function closeDeletePostModal() {
    const modal = document.getElementById('deletePostModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

function confirmDeletePost(postId, author) {
    closeDeletePostModal();
    deleteStaffPost(postId, author);
}

function deleteStaffPost(postId, author) {
    const postElement = document.querySelector(`[data-post-id="${postId}"]`);
    if (postElement) {
        postElement.style.opacity = '0';
        postElement.style.transform = 'scale(0.8)';
        
        setTimeout(() => {
            postElement.remove();
            showNotification(`Post by ${author} deleted. User has been notified.`, 'success');
        }, 300);
    }
}

// Like and Comment Functions
function toggleLike(postId) {
    const likeBtn = document.querySelector(`[data-post-id="${postId}"] .like-action`);
    const likesSpan = likeBtn.querySelector('span');
    const currentLikes = parseInt(likesSpan.textContent);
    
    if (likeBtn.classList.contains('liked')) {
        likeBtn.classList.remove('liked');
        likesSpan.textContent = `${currentLikes - 1} Likes`;
    } else {
        likeBtn.classList.add('liked');
        likesSpan.textContent = `${currentLikes + 1} Likes`;
    }
}


// Notification System
function showNotification(message, type) {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    
    if (type === 'error') {
        toast.style.background = 'linear-gradient(135deg, #ff4757, #ff3742)';
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}
function confirmLogout() {
    closeHamburgerMenu();
    document.getElementById('logoutPage').style.display = 'block';
}

function cancelLogout() {
    document.getElementById('logoutPage').style.display = 'none';
}

function performLogout() {
    showNotification('Logging out...', 'success');
    
    document.getElementById('logoutPage').style.display = 'none';
    
    // Clear any stored data
    localStorage.clear();
    
    setTimeout(() => {
        showNotification('Logged out successfully!', 'success');
        setTimeout(() => {
            location.reload();
        }, 1500);
    }, 1500);
}
// Profile Options Modal Styles (for delete confirmation)
const modalStyles = document.createElement('style');
modalStyles.textContent = `
    .profile-options-modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100vh;
        background: rgba(0,0,0,0.5);
        z-index: 2500;
        align-items: center;
        justify-content: center;
    }
    
    .profile-options-modal.show {
        display: flex;
    }
    
    .profile-options-content {
        background: white;
        border-radius: 20px;
        padding: 30px;
        max-width: 350px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
 animation: slideUp 0.3s ease;
    }
    
    @keyframes slideUp {
        from {
            transform: translateY(50px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
    
    .profile-options-title {
        font-size: 1.3rem;
        font-weight: 600;
        color: #003049;
        margin-bottom: 20px;
        text-align: center;
    }
    
    .profile-option-btn {
        width: 100%;
        background: linear-gradient(135deg, #669bbc, #478978);
        border: none;
        color: white;
        padding: 15px;
        border-radius: 12px;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s ease;
        margin-bottom: 15px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
    }
    
    .profile-option-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(102,155,188,0.3);
    }
    
    .profile-option-btn.remove {
        background: linear-gradient(135deg, #ff4757, #ff3742);
    }
    
    .profile-option-btn.remove:hover {
        box-shadow: 0 8px 20px rgba(255,71,87,0.3);
    }
    
    .profile-option-btn.cancel {
        background: #e0e0e0;
        color: #333;
    }
    
    .profile-option-btn.cancel:hover {
        background: #d0d0d0;
        box-shadow: none;
    }
`;
document.head.appendChild(modalStyles);

console.log('Admin interface loaded successfully!');
console.log('Features: Dashboard ✓, Staff Feed ✓, Long-press to delete posts ✓');


    // ========== QUERIES FEATURE FUNCTIONS ==========

let currentQueryLevel = 1;

// Mock staff data
const staffMembers = [
    { id: 1, name: 'Adeyemi Michael', role: 'Sales Representative', initials: 'AM' },
    { id: 2, name: 'Folake Kehinde', role: 'Store Manager', initials: 'FK' },
    { id: 3, name: 'Tunde Bakare', role: 'Security Officer', initials: 'TB' },
    { id: 4, name: 'Ngozi Okafor', role: 'Cashier', initials: 'NO' },
    { id: 5, name: 'Ibrahim Yusuf', role: 'Supervisor', initials: 'IY' },
    { id: 6, name: 'Blessing Okon', role: 'Sales Representative', initials: 'BO' },
    { id: 7, name: 'Chioma Eze', role: 'Customer Service', initials: 'CE' },
    { id: 8, name: 'Mohammed Hassan', role: 'Store Keeper', initials: 'MH' }
];

// UPDATE YOUR EXISTING showQueries() FUNCTION WITH THIS:
function showQueries() {
    document.getElementById('queriesPage').style.display = 'block';
}

function closeQueriesPage() {
    document.getElementById('queriesPage').style.display = 'none';
}

function openQueryForm(level) {
    currentQueryLevel = level;
    const modal = document.getElementById('queryFormModal');
    const title = document.getElementById('queryFormTitle');
    const subtitle = document.getElementById('queryFormSubtitle');
    
    title.textContent = `Issue Level ${level} Query`;
    
    let subtitleText = '';
    if (level === 1) {
        subtitleText = 'A serious warning will be issued';
    } else if (level === 2) {
        subtitleText = '₦2,000 will be deducted from salary';
    } else if (level === 3) {
        subtitleText = '30% will be deducted from salary';
    }
    
    subtitle.textContent = subtitleText;
    
    // Reset form
    document.getElementById('queryForm').reset();
    document.getElementById('selectedStaffId').value = '';
    document.getElementById('staffSearchResults').classList.remove('show');
    
    modal.classList.add('show');
}
function closeQueryForm() {
    const modal = document.getElementById('queryFormModal');
    modal.classList.remove('show');
}

function searchStaff(query) {
    const resultsContainer = document.getElementById('staffSearchResults');
    
    if (!query.trim()) {
        resultsContainer.classList.remove('show');
        return;
    }
    
    const filtered = staffMembers.filter(staff => 
        staff.name.toLowerCase().includes(query.toLowerCase()) ||
        staff.role.toLowerCase().includes(query.toLowerCase())
    );
    
    if (filtered.length === 0) {
        resultsContainer.innerHTML = '<div style="padding: 15px; text-align: center; color: #666;">No staff found</div>';
        resultsContainer.classList.add('show');
        return;
    }
    
    resultsContainer.innerHTML = filtered.map(staff => `
        <div class="staff-result-item" onclick="selectStaff(${staff.id}, '${staff.name}', '${staff.initials}')">
            <div class="staff-result-avatar">${staff.initials}</div>
            <div class="staff-result-info">
                <div class="staff-result-name">${staff.name}</div>
                <div class="staff-result-role">${staff.role}</div>
            </div>
        </div>
    `).join('');
    
    resultsContainer.classList.add('show');
}

function selectStaff(id, name, initials) {
    document.getElementById('staffSearch').value = name;
    document.getElementById('selectedStaffId').value = id;
    document.getElementById('staffSearchResults').classList.remove('show');
}

function submitQuery(event) {
    event.preventDefault();
    
    const staffId = document.getElementById('selectedStaffId').value;
    const staffName = document.getElementById('staffSearch').value;
    const reason = document.getElementById('queryReason').value;
    
    if (!staffId) {
        showNotification('Please select a staff member', 'error');
        return;
    }
    
    // Process query submission
    closeQueryForm();
    showNotification(`Level ${currentQueryLevel} query issued to ${staffName}. Staff has been notified.`, 'success');
    
    console.log('Query submitted:', {
        level: currentQueryLevel,
        staffId: staffId,
        staffName: staffName,
        reason: reason,
        timestamp: new Date().toISOString()
    });
}

// Close search results when clicking outside
document.addEventListener('click', function(event) {
    const searchContainer = document.querySelector('.staff-search-container');
    const resultsContainer = document.getElementById('staffSearchResults');
    
    if (searchContainer && resultsContainer && !searchContainer.contains(event.target)) {
        resultsContainer.classList.remove('show');
    }
});

console.log('Queries feature loaded successfully!');
// ============================================
// COMPLAINTS FEATURE JAVASCRIPT
// ============================================

// Complaints Data
let complaintsData = [
    {
        id: 1,
        author: 'Adeyemi Michael',
        initials: 'AM',
        time: '1 hour ago',
        complaint: 'The air conditioning in the sales section has not been working for three days now. It is very uncomfortable for both staff and customers. We need urgent attention to this matter.',
        conversation: [
            {
                sender: 'staff',
                message: 'The air conditioning in the sales section has not been working for three days now. It is very uncomfortable for both staff and customers. We need urgent attention to this matter.',
                time: '1 hour ago'
            }
        ]
    },
    {
        id: 2,
        author: 'Folake Kehinde',
        initials: 'FK',
        time: '3 hours ago',
        complaint: 'I would like to request a review of the work schedule for next month. The current rotation does not take into consideration my ongoing training program on weekends.',
        conversation: [
            {
                sender: 'staff',
                message: 'I would like to request a review of the work schedule for next month. The current rotation does not take into consideration my ongoing training program on weekends.',
                time: '3 hours ago'
            }
        ]
    },
    {
        id: 3,
        author: 'Tunde Bakare',
        initials: 'TB',
        time: '5 hours ago',
        complaint: 'Some customers have been complaining about the parking space being too small. During peak hours, there is hardly any space for customers to park their vehicles. This might affect our business.',
        conversation: [
            {
                sender: 'staff',
                message: 'Some customers have been complaining about the parking space being too small. During peak hours, there is hardly any space for customers to park their vehicles. This might affect our business.',
                time: '5 hours ago'
            }
        ]
    },
    {
        id: 4,
        author: 'Blessing Okafor',
        initials: 'BO',
        time: '1 day ago',
        complaint: 'The security lights at the back entrance are not functioning. This creates a safety concern for staff who close late. Please address this urgently.',
        conversation: [
            {
                sender: 'staff',
                message: 'The security lights at the back entrance are not functioning. This creates a safety concern for staff who close late. Please address this urgently.',
                time: '1 day ago'
            }
        ]
    }
];

let currentComplaintId = null;

// Main Complaints Functions
function showComplaints() {
    openComplaintsPage();
}

function openComplaintsPage() {
    const complaintsPage = document.getElementById('complaintsPage');
    if (!complaintsPage) {
        console.error('Complaints page element not found! Make sure you added the HTML code.');
        showNotification('Error: Complaints page not found. Check HTML setup.', 'error');
        return;
    }
    complaintsPage.style.display = 'block';
    loadComplaintsList();
}

function closeComplaintsPage() {
    const complaintsPage = document.getElementById('complaintsPage');
    if (complaintsPage) {
        complaintsPage.style.display = 'none';
    }
}

function loadComplaintsList() {
    const complaintsListContainer = document.getElementById('complaintsList');
    if (!complaintsListContainer) {
        console.error('Complaints list container not found!');
        return;
    }
    
    complaintsListContainer.innerHTML = '';
    
    if (complaintsData.length === 0) {
        complaintsListContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;"></i>
                <p style="font-size: 1.1rem;">No complaints at this time</p>
            </div>
        `;
        return;
    }
    
    complaintsData.forEach(complaint => {
        const complaintBox = document.createElement('div');
        complaintBox.className = 'complaint-box';
        complaintBox.onclick = () => openComplaintReview(complaint.id);
        
        complaintBox.innerHTML = `
            <div class="complaint-box-header">
                <div class="complaint-box-avatar">${complaint.initials}</div>
                <div class="complaint-box-info">
                    <h3>${complaint.author}</h3>
                    <p>${complaint.time}</p>
                </div>
            </div>
            <div class="complaint-box-preview">
                ${complaint.complaint}
            </div>
        `;
        
        complaintsListContainer.appendChild(complaintBox);
    });
}

function openComplaintReview(complaintId) {
    currentComplaintId = complaintId;
    const complaint = complaintsData.find(c => c.id === complaintId);
    
    if (!complaint) return;
    
    const reviewAvatar = document.getElementById('reviewAvatar');
    const reviewUsername = document.getElementById('reviewUsername');
    const reviewTime = document.getElementById('reviewTime');
    
    if (reviewAvatar) reviewAvatar.textContent = complaint.initials;
    if (reviewUsername) reviewUsername.textContent = complaint.author;
    if (reviewTime) reviewTime.textContent = complaint.time;
    
    loadConversation(complaint.conversation);
    
    const complaintReviewPage = document.getElementById('complaintReviewPage');
    if (complaintReviewPage) {
        complaintReviewPage.style.display = 'block';
    }
}

function closeComplaintReview() {
    const complaintReviewPage = document.getElementById('complaintReviewPage');
    if (complaintReviewPage) {
        complaintReviewPage.style.display = 'none';
    }
    currentComplaintId = null;
    const replyInput = document.getElementById('complaintReplyInput');
    if (replyInput) {
        replyInput.value = '';
    }
}

function loadConversation(conversation) {
    const conversationContainer = document.getElementById('complaintConversation');
    if (!conversationContainer) return;
    
    conversationContainer.innerHTML = '';
    
    conversation.forEach(msg => {
        const messageItem = document.createElement('div');
        messageItem.className = `message-item ${msg.sender}`;
        
        messageItem.innerHTML = `
            <div class="message-bubble">${msg.message}</div>
            <div class="message-time">${msg.time}</div>
        `;
        
        conversationContainer.appendChild(messageItem);
    });
    
    conversationContainer.scrollTop = conversationContainer.scrollHeight;
}

function sendComplaintReply() {
    const replyInput = document.getElementById('complaintReplyInput');
    if (!replyInput) return;
    
    const replyText = replyInput.value.trim();
    
    if (!replyText) {
        showNotification('Please type a message', 'error');
        return;
    }
    
    if (!currentComplaintId) return;
    
    const complaint = complaintsData.find(c => c.id === currentComplaintId);
    if (!complaint) return;
    
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    const newMessage = {
        sender: 'admin',
        message: replyText,
        time: timeString
    };
    
    complaint.conversation.push(newMessage);
    
    loadConversation(complaint.conversation);
    
    replyInput.value = '';
    
    showNotification('Reply sent successfully', 'success');
}

function handleComplaintMedia() {
    const mediaInput = document.getElementById('complaintMediaInput');
    if (mediaInput) {
        mediaInput.click();
    }
}

function handleVoiceNote() {
    // Check if browser supports audio recording
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showNotification('Voice recording not supported on this device', 'error');
        return;
    }
    
    showNotification('Recording voice note... (Feature in development)', 'success');
    
    // Basic voice recording implementation
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            showNotification('Microphone access granted. Voice note recording started!', 'success');
            
            // You can add actual recording logic here
            setTimeout(() => {
                stream.getTracks().forEach(track => track.stop());
                showNotification('Voice note recorded (demo only)', 'success');
            }, 3000);
        })
        .catch(error => {
            showNotification('Microphone access denied', 'error');
            console.error('Microphone error:', error);
        });
}

// Media upload event listener - Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    const mediaInput = document.getElementById('complaintMediaInput');
    if (mediaInput) {
        mediaInput.addEventListener('change', function(e) {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                const fileType = file.type;
                const fileName = file.name;
                const fileSize = (file.size / 1024 / 1024).toFixed(2); // Convert to MB
                
                // Check file type
                if (!fileType.startsWith('image/') && !fileType.startsWith('video/')) {
                    showNotification('Please upload only images or videos', 'error');
                    return;
                }
                
                // Check file size (max 10MB)
                if (file.size > 10 * 1024 * 1024) {
                    showNotification('File too large. Maximum size is 10MB', 'error');
                    return;
                }
                
                // Show preview and send
                const reader = new FileReader();
                reader.onload = function(event) {
                    if (!currentComplaintId) return;
                    
                    const complaint = complaintsData.find(c => c.id === currentComplaintId);
                    if (!complaint) return;
                    
                    const now = new Date();
                    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                    
                    let mediaHTML = '';
                    if (fileType.startsWith('image/')) {
                        mediaHTML = `<img src="${event.target.result}" alt="Uploaded image" style="max-width: 100%; border-radius: 10px; margin-top: 8px;">`;
                    } else if (fileType.startsWith('video/')) {
                        mediaHTML = `<video src="${event.target.result}#t=0.1" controls preload "metadata" style="max-width: 100%; border-radius: 10px; margin-top: 8px;"></video>`;
                    }
                    
                    const newMessage = {
                        sender: 'admin',
                        message: `📎 ${fileName} (${fileSize}MB)${mediaHTML}`,
                        time: timeString
                    };
                    
                    complaint.conversation.push(newMessage);
                    loadConversation(complaint.conversation);
                    
                    showNotification(`${fileType.startsWith('image/') ? 'Image' : 'Video'} uploaded successfully!`, 'success');
                };
                
                reader.readAsDataURL(file);
                
                // Reset input
                e.target.value = '';
            }
        });
    }
});
let currentRequest = null;
let allRequests = [];

function showRequests() {
    document.getElementById('requestsPage').style.display = 'block';
    loadRequests();
}

function closeRequests() {
    document.getElementById('requestsPage').style.display = 'none';
}

function loadRequests() {
    allRequests = [
        {
            id: 1,
            userName: 'Adeyemi Michael',
            initials: 'AM',
            type: 'Day Off Request',
            requestType: 'dayoff',
            time: '2 hours ago',
            status: 'pending',
            details: {
                startDate: 'October 15, 2025',
                endDate: 'October 17, 2025',
                days: '3 days',
                reason: 'Family emergency. Need to travel to my hometown to attend to urgent family matters.'
            }
        },
        {
            id: 2,
            userName: 'Folake Kehinde',
            initials: 'FK',
            type: 'Loan Request',
            requestType: 'loan',
            time: '5 hours ago',
            status: 'pending',
            details: {
                amount: '₦50,000',
                purpose: 'Medical expenses',
                repaymentPlan: '5 months',
                reason: 'Need funds for my mother\'s medical treatment. Will repay in 5 monthly installments.'
            }
        },
        {
            id: 3,
            userName: 'Tunde Bakare',
            initials: 'TB',
            type: 'Day Off Request',
            requestType: 'dayoff',
            time: '1 day ago',
            status: 'pending',
            details: {
                startDate: 'October 20, 2025',
                endDate: 'October 20, 2025',
                days: '1 day',
                reason: 'Attending professional training workshop on safety protocols.'
            }
        }
    ];
    
    renderRequests();
}

function renderRequests() {
    const container = document.getElementById('requestsList');
    
    if (allRequests.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #666;">
                <i class="fas fa-inbox" style="font-size: 4rem; color: #ddd; margin-bottom: 20px; display: block;"></i>
                <h3 style="font-size: 1.5rem; margin-bottom: 10px; color: #999;">No Requests</h3>
                <p>There are no pending requests at the moment.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    allRequests.forEach(request => {
        const requestEl = document.createElement('div');
        requestEl.className = 'request-item';
        requestEl.onclick = () => openRequestDetail(request);
        
        requestEl.innerHTML = `
            <div class="request-item-header">
                <div class="request-avatar">${request.initials}</div>
                <div class="request-user-info">
                    <div class="request-user-name">${request.userName}</div>
                    <div class="request-type">${request.type}</div>
                </div>
                <div>
                    <div class="request-badge">Pending</div>
                    <div class="request-time">${request.time}</div>
                </div>
            </div>
        `;
        
        container.appendChild(requestEl);
    });
}

function openRequestDetail(request) {
    currentRequest = request;
    
    document.getElementById('requestsPage').style.display = 'none';
    document.getElementById('requestDetailPage').style.display = 'block';
    
    // Set subtitle
    const subtitle = document.getElementById('requestSubtitle');
    subtitle.innerHTML = `
        <div class="request-subtitle-avatar">${request.initials}</div>
        <div>
            <strong>${request.userName}</strong> sent a <strong>${request.type}</strong>
        </div>
    `;
    
    // Set application details
    const appCard = document.getElementById('requestApplicationCard');
    
    if (request.requestType === 'dayoff') {
        appCard.innerHTML = `
            <div class="application-field">
                <span class="application-label">Start Date</span>
                <div class="application-value">${request.details.startDate}</div>
            </div>
            <div class="application-field">
                <span class="application-label">End Date</span>
                <div class="application-value">${request.details.endDate}</div>
            </div>
            <div class="application-field">
                <span class="application-label">Duration</span>
                <div class="application-value">${request.details.days}</div>
            </div>
            <div class="application-field">
                <span class="application-label">Reason</span>
                <div class="application-value">${request.details.reason}</div>
            </div>
        `;
    } else if (request.requestType === 'loan') {
        appCard.innerHTML = `
            <div class="application-field">
                <span class="application-label">Amount Requested</span>
                <div class="application-value">${request.details.amount}</div>
            </div>
            <div class="application-field">
                <span class="application-label">Purpose</span>
                <div class="application-value">${request.details.purpose}</div>
            </div>
            <div class="application-field">
                <span class="application-label">Repayment Plan</span>
                <div class="application-value">${request.details.repaymentPlan}</div>
            </div>
            <div class="application-field">
                <span class="application-label">Reason</span>
                <div class="application-value">${request.details.reason}</div>
            </div>
        `;
    }
    
    // Clear response input
    document.getElementById('requestResponseInput').value = '';
}

function closeRequestDetail() {
    document.getElementById('requestDetailPage').style.display = 'none';
    document.getElementById('requestsPage').style.display = 'block';
}

function approveRequest() {
    if (!currentRequest) return;
    
    const response = document.getElementById('requestResponseInput').value.trim();
    
    if (!response) {
        showNotification('Please add a comment about your decision', 'error');
        return;
    }
    
    // Remove from list
    allRequests = allRequests.filter(r => r.id !== currentRequest.id);
    
    showNotification(`${currentRequest.type} approved! ${currentRequest.userName} has been notified.`, 'success');
    
    setTimeout(() => {
        closeRequestDetail();
        renderRequests();
    }, 1500);
}

function rejectRequest() {
    if (!currentRequest) return;
    
    const response = document.getElementById('requestResponseInput').value.trim();
    
    if (!response) {
        showNotification('Please add a comment explaining why you rejected', 'error');
        return;
    }
    
    // Remove from list
    allRequests = allRequests.filter(r => r.id !== currentRequest.id);
    
    showNotification(`${currentRequest.type} rejected. ${currentRequest.userName} has been notified.`, 'success');
    
    setTimeout(() => {
        closeRequestDetail();
        renderRequests();
    }, 1500);
}

function sendResponse() {
    const response = document.getElementById('requestResponseInput').value.trim();
    
    if (!response) {
        showNotification('Please write something', 'error');
        return;
    }
    
    showNotification('Response sent to staff member', 'success');
    document.getElementById('requestResponseInput').value = '';
}
// Voice Note for Request Response
let isRecordingRequest = false;
let mediaRecorderRequest = null;
let audioChunksRequest = [];

document.addEventListener('DOMContentLoaded', function() {
    const voiceBtn = document.getElementById('requestVoiceNoteBtn');
    if (voiceBtn) {
        voiceBtn.addEventListener('click', toggleRequestVoiceNote);
    }
});

function toggleRequestVoiceNote() {
    if (!isRecordingRequest) {
        startRequestRecording();
    } else {
        stopRequestRecording();
    }
}

async function startRequestRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRequest = new MediaRecorder(stream);
        audioChunksRequest = [];
        
        mediaRecorderRequest.ondataavailable = (event) => {
            audioChunksRequest.push(event.data);
        };
        
        mediaRecorderRequest.onstop = () => {
            const audioBlob = new Blob(audioChunksRequest, { type: 'audio/wav' });
            showNotification('Voice note recorded! Sending...', 'success');
            stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorderRequest.start();
        isRecordingRequest = true;
        
        const btn = document.getElementById('requestVoiceNoteBtn');
        btn.style.animation = 'recordPulse 1s infinite';
        btn.innerHTML = '<i class="fas fa-stop"></i>';
        
        showNotification('Recording voice note...', 'success');
    } catch (error) {
        showNotification('Microphone access denied', 'error');
    }
}

function stopRequestRecording() {
    if (mediaRecorderRequest && isRecordingRequest) {
        mediaRecorderRequest.stop();
        isRecordingRequest = false;
        
        const btn = document.getElementById('requestVoiceNoteBtn');
        btn.style.animation = 'none';
        btn.innerHTML = '<i class="fas fa-microphone"></i>';
    }
}
let announcementMediaFile = null;
let previousAnnouncements = [];
let isRecordingAnnouncement = false;
let mediaRecorderAnnouncement = null;
let audioChunksAnnouncement = [];

function showCreateAnnouncement() {
    document.getElementById('createAnnouncementPage').style.display = 'block';
    updatePostButton();
}

function closeCreateAnnouncement() {
    document.getElementById('createAnnouncementPage').style.display = 'none';
    document.getElementById('announcementText').value = '';
    announcementMediaFile = null;
    document.getElementById('announcementMediaPreview').style.display = 'none';
    document.getElementById('announcementMediaPreview').innerHTML = '';
}

// Handle media file selection
document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('announcementFile');
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                announcementMediaFile = file;
                previewAnnouncementMedia(file);
            }
        });
    }
    
    const textarea = document.getElementById('announcementText');
    if (textarea) {
        textarea.addEventListener('input', updatePostButton);
    }
});

function previewAnnouncementMedia(file) {
    const preview = document.getElementById('announcementMediaPreview');
    const reader = new FileReader();
    
    reader.onload = function(e) {
        if (file.type.startsWith('image/')) {
            preview.innerHTML = `
                <img src="${e.target.result}" class="preview-image" alt="Preview">
                <button class="remove-media" onclick="removeAnnouncementMedia()">
                    <i class="fas fa-times"></i> Remove
                </button>
            `;
        } else if (file.type.startsWith('video/')) {
            preview.innerHTML = `
                <video src="${e.target.result}" class="preview-video" controls preload="metadata"></video>
                <button class="remove-media" onclick="removeAnnouncementMedia()">
                    <i class="fas fa-times"></i> Remove
                </button>
            `;
        }
        preview.classList.add('show');
    };
    
    reader.readAsDataURL(file);
}

function removeAnnouncementMedia() {
    announcementMediaFile = null;
    const preview = document.getElementById('announcementMediaPreview');
    preview.classList.remove('show');
    preview.innerHTML = '';
    document.getElementById('announcementFile').value = '';
    updatePostButton();
}

function updatePostButton() {
    const textarea = document.getElementById('announcementText');
    const postBtn = document.getElementById('postAnnouncementBtn');
    
    if (postBtn && textarea) {
        const hasContent = textarea.value.trim().length > 0 || announcementMediaFile;
        postBtn.disabled = !hasContent;
    }
}

async function postAnnouncement() {
    const text = document.getElementById('announcementText').value.trim();
    
    if (!text && !announcementMediaFile) {
        showNotification('Please write something or add media', 'error');
        return;
    }
    
    const currentUser = auth.currentUser;
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    try {
        // Get user role
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        
        // Check if user is admin or supervisor
        if (userData.role !== 'admin' && userData.role !== 'supervisor') {
            showNotification('Only admin and supervisors can post announcements', 'error');
            return;
        }
        
        showNotification('Posting announcement...', 'info');
        
        let mediaUrl = null;
        let mediaType = null;
        
        // Convert media to base64 if exists
        if (announcementMediaFile) {
            mediaUrl = await fileToBase64(announcementMediaFile);
            mediaType = announcementMediaFile.type;
        }
        
        // Create announcement in Firebase
        await db.collection('announcements').add({
            title: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
            text: text,
            mediaUrl: mediaUrl,
            mediaType: mediaType,
            authorId: currentUser.uid,
            authorName: userData.fullName || 'Admin',
            authorRole: userData.role,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            likes: [],
            type: 'general'
        });
        
        showNotification('Announcement posted! All staff members have been notified.', 'success');
        
        // Clear form
        document.getElementById('announcementText').value = '';
        announcementMediaFile = null;
        
        setTimeout(() => {
            closeCreateAnnouncement();
        }, 1500);
        
    } catch (error) {
        console.error('Post announcement error:', error);
        showNotification('Failed to post announcement', 'error');
    }
}


// Voice Note for Announcement
function toggleAnnouncementVoiceNote() {
    if (!isRecordingAnnouncement) {
        startAnnouncementRecording();
    } else {
        stopAnnouncementRecording();
    }
}

async function startAnnouncementRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderAnnouncement = new MediaRecorder(stream);
        audioChunksAnnouncement = [];
        
        mediaRecorderAnnouncement.ondataavailable = (event) => {
            audioChunksAnnouncement.push(event.data);
        };
        
        mediaRecorderAnnouncement.onstop = () => {
            const audioBlob = new Blob(audioChunksAnnouncement, { type: 'audio/wav' });
            showNotification('Voice note recorded!', 'success');
            stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorderAnnouncement.start();
        isRecordingAnnouncement = true;
        
        const btn = document.getElementById('voiceNoteAnnouncementBtn');
        btn.style.animation = 'recordPulse 1s infinite';
        btn.innerHTML = '<i class="fas fa-stop"></i>';
        
        showNotification('Recording voice note...', 'success');
    } catch (error) {
        showNotification('Microphone access denied', 'error');
    }
}

function stopAnnouncementRecording() {
    if (mediaRecorderAnnouncement && isRecordingAnnouncement) {
        mediaRecorderAnnouncement.stop();
        isRecordingAnnouncement = false;
        
        const btn = document.getElementById('voiceNoteAnnouncementBtn');
        btn.style.animation = 'none';
        btn.innerHTML = '<i class="fas fa-microphone"></i>';
    }
}

// Previous Announcements
function showPreviousAnnouncements() {
    document.getElementById('previousAnnouncementsPage').style.display = 'block';
    loadPreviousAnnouncements();
}

function closePreviousAnnouncements() {
    document.getElementById('previousAnnouncementsPage').style.display = 'none';
}

function loadPreviousAnnouncements() {
    if (previousAnnouncements.length === 0) {
        previousAnnouncements = [
            {
                id: 1,
                title: 'Company Meeting - December 20th',
                text: 'All staff are required to attend the quarterly meeting on December 20th at 10:00 AM. We will be discussing Q4 performance and upcoming projects.',
                date: 'December 15, 2024',
                timestamp: Date.now() - 86400000
            },
            {
                id: 2,
                title: 'Holiday Schedule Announcement',
                text: 'The office will be closed from December 24th to January 2nd for the holiday season. Normal operations resume January 3rd.',
                date: 'December 10, 2024',
                timestamp: Date.now() - 172800000
            }
        ];
    }
    
    renderAnnouncements(previousAnnouncements);
}

function renderAnnouncements(announcementsList) {
    const container = document.getElementById('previousAnnouncementsList');
    
    if (announcementsList.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #666;">
                <i class="fas fa-bullhorn" style="font-size: 4rem; color: #ddd; margin-bottom: 20px; display: block;"></i>
                <h3 style="font-size: 1.5rem; margin-bottom: 10px; color: #999;">No Previous Announcements</h3>
                <p>There are no previous announcements yet.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    announcementsList.forEach(announcement => {
        const card = document.createElement('div');
        card.className = 'announcement-card';
        card.onclick = () => showAnnouncementDetail(announcement);
        
        card.innerHTML = `
            <div class="announcement-card-header">
                <div class="announcement-card-title">${announcement.title}</div>
                <div class="announcement-card-date">${announcement.date}</div>
            </div>
        `;
        
        container.appendChild(card);
    });
}

function filterAnnouncements() {
    const selectedDate = document.getElementById('announcementDateFilter').value;
    
    if (!selectedDate) {
        renderAnnouncements(previousAnnouncements);
        return;
    }
    
    const filterDate = new Date(selectedDate);
    filterDate.setHours(0, 0, 0, 0);
    
    const filtered = previousAnnouncements.filter(announcement => {
        const announcementDate = new Date(announcement.timestamp);
        announcementDate.setHours(0, 0, 0, 0);
        return announcementDate.getTime() === filterDate.getTime();
    });
    
    renderAnnouncements(filtered);
}

function clearAnnouncementFilter() {
    document.getElementById('announcementDateFilter').value = '';
    renderAnnouncements(previousAnnouncements);
}

// Announcement Detail
function showAnnouncementDetail(announcement) {
    document.getElementById('announcementDetailPage').style.display = 'block';
    document.getElementById('detailAnnouncementTitle').textContent = announcement.title;
    document.getElementById('detailAnnouncementDate').textContent = announcement.date;
    document.getElementById('detailAnnouncementBody').textContent = announcement.text;
}

function closeAnnouncementDetail() {
    document.getElementById('announcementDetailPage').style.display = 'none';
}
function showAssignRole() {
    document.getElementById('assignRolePage').style.display = 'block';
}

function closeAssignRole() {
    document.getElementById('assignRolePage').style.display = 'none';
    clearAssignRoleForm();
}

function clearAssignRoleForm() {
    document.getElementById('emailOrPhone').value = '';
    document.getElementById('fullName').value = '';
    document.getElementById('password').value = '';
    document.getElementById('confirmPassword').value = '';
    document.getElementById('roleSelect').value = '';
}
function createAccount() {
    const emailOrPhone = document.getElementById('emailOrPhone').value.trim();
    const fullName = document.getElementById('fullName').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const role = document.getElementById('roleSelect').value;
    
    // Validation
    if (!emailOrPhone) {
        showNotification('Please enter email or phone number', 'error');
        return;
    }
    
    if (!fullName) {
        showNotification('Please enter full name', 'error');
        return;
    }
    
    if (!password) {
        showNotification('Please enter password', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('Password must be at least 6 characters', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showNotification('Passwords do not match', 'error');
        return;
    }
    
    if (!role) {
        showNotification('Please select a role', 'error');
        return;
    }
    
    // Show loading
    showNotification('Creating account...', 'info');
    
    // IMPORTANT: Save current admin user
    const currentAdmin = auth.currentUser;
    
    // Create account in Firebase
    auth.createUserWithEmailAndPassword(emailOrPhone, password)
        .then((userCredential) => {
            const newUser = userCredential.user;
            
            // Save user data to Firestore FIRST
            return db.collection('users').doc(newUser.uid).set({
                email: emailOrPhone,
                fullName: fullName,
                role: role,
                profilePicture: '',
                dateOfBirth: '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: currentAdmin.uid
            }).then(() => {
                // Sign out the new user and sign back in as admin
                return auth.signOut();
            }).then(() => {
                // Sign admin back in (IMPORTANT!)
                return auth.signInWithEmailAndPassword(currentAdmin.email, 'ADMIN_PASSWORD'); // Replace with actual admin password
            });
        })
        .then(() => {
            const roleNames = {
                'supervisor': 'Supervisor',
                'security': 'Security',
                'chairman-office': 'Chairman Office'
            };
            
            showNotification(`Account created successfully! ${fullName} assigned as ${roleNames[role]}`, 'success');
            
            setTimeout(() => {
                closeAssignRole();
            }, 2000);
        })
        .catch((error) => {
            console.error('Error creating account:', error);
            
            let errorMessage = 'Failed to create account';
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'This email is already registered';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'Password is too weak';
            } else {
                errorMessage = error.message;
            }
            
            showNotification(errorMessage, 'error');
        });
}

// Open Profile Page
function showProfile() {
    openProfilePage();
}

function openProfilePage() {
    const profilePage = document.getElementById('profilePage');
    if (!profilePage) {
        console.error('Profile page not found!');
        return;
    }
    
    loadProfileData();
    profilePage.style.display = 'block';
}

function closeProfilePage() {
    const profilePage = document.getElementById('profilePage');
    if (profilePage) {
        profilePage.style.display = 'none';
    }
}

// Load Profile Data
function loadProfileData() {
    document.getElementById('profileName').textContent = profileData.name;
    document.getElementById('profileRole').textContent = profileData.role;
    document.getElementById('displayName').textContent = profileData.name;
    document.getElementById('displayEmail').textContent = profileData.email;
    document.getElementById('displayPhone').textContent = profileData.phone;
    document.getElementById('displayRoleInfo').textContent = profileData.role;
    
    // Load profile photo if exists
    if (profileData.photo) {
        const profilePicLarge = document.getElementById('profilePicLarge');
        profilePicLarge.innerHTML = `<img src="${profileData.photo}" alt="Profile">`;
    }
}

// Change Profile Photo
function changeProfilePhoto() {
    document.getElementById('profilePhotoInput').click();
}

document.addEventListener('DOMContentLoaded', function() {
    const photoInput = document.getElementById('profilePhotoInput');
    if (photoInput) {
        photoInput.addEventListener('change', function(e) {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                
                if (!file.type.startsWith('image/')) {
                    showNotification('Please upload an image file', 'error');
                    return;
                }
                
                if (file.size > 5 * 1024 * 1024) {
                    showNotification('Image too large. Maximum size is 5MB', 'error');
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = function(event) {
                    profileData.photo = event.target.result;
                    
                    // Update profile page
                    document.getElementById('profilePicLarge').innerHTML = `<img src="${event.target.result}" alt="Profile">`;
                    
                    // Update dashboard profile pic
                    const dashboardProfilePic = document.querySelector('.profile-pic');
                    if (dashboardProfilePic) {
                        dashboardProfilePic.innerHTML = `<img src="${event.target.result}" alt="Profile">`;
                    }
                    
                    showNotification('Profile photo updated successfully!', 'success');
                };
                reader.readAsDataURL(file);
            }
        });
    }
});

// Edit Profile
function openEditProfile() {
    document.getElementById('editName').value = profileData.name;
    document.getElementById('editEmail').value = profileData.email;
    document.getElementById('editPhone').value = profileData.phone;
    document.getElementById('editRole').value = profileData.role;
    
    document.getElementById('editProfileModal').classList.add('show');
}

function closeEditProfile() {
    document.getElementById('editProfileModal').classList.remove('show');
}

function saveProfileChanges() {
    const newName = document.getElementById('editName').value.trim();
    const newEmail = document.getElementById('editEmail').value.trim();
    const newPhone = document.getElementById('editPhone').value.trim();
    const newRole = document.getElementById('editRole').value.trim();
    
    if (!newName || !newEmail || !newPhone || !newRole) {
        showNotification('Please fill all fields', 'error');
        return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }
    
    profileData.name = newName;
    profileData.email = newEmail;
    profileData.phone = newPhone;
    profileData.role = newRole;
    
    loadProfileData();
    closeEditProfile();
    showNotification('Profile updated successfully!', 'success');
}






    


// Close modals when clicking outside
document.addEventListener('click', function(e) {
    const editModal = document.getElementById('editProfileModal');
    const passwordModal = document.getElementById('changePasswordModal');
    
    if (e.target === editModal) {
        closeEditProfile();
    }
    if (e.target === passwordModal) {
        closeChangePassword();
    }
});
function showSettings() {
    document.getElementById('settingsPage').style.display = 'block';
}

function closeSettings() {
    document.getElementById('settingsPage').style.display = 'none';
}
let adminNotifications = [];
let unreadCount = 0;

function showNotifications() {
    document.getElementById('notificationsPage').style.display = 'block';
    loadAdminNotifications();
}

function closeNotificationsPage() {
    document.getElementById('notificationsPage').style.display = 'none';
}

function loadAdminNotifications() {
    adminNotifications = [
        {
            id: 1,
            type: 'request',
            title: 'New Request',
            text: 'Folake Kehinde submitted a loan request for ₦50,000',
            time: '30 minutes ago',
            timestamp: Date.now() - 1800000,
            unread: true,
            action: 'showRequests'
        },
        {
            id: 2,
            type: 'complaint',
            title: 'New Complaint',
            text: 'Tunde Bakare filed a complaint about workplace conditions',
            time: '2 hours ago',
            timestamp: Date.now() - 7200000,
            unread: true,
            action: 'showComplaints'
        },
        {
            id: 3,
            type: 'announcement',
            title: 'Announcement Posted',
            text: 'Your announcement "Company Meeting" has been posted successfully',
            time: '5 hours ago',
            timestamp: Date.now() - 18000000,
            unread: true,
            action: 'showPreviousAnnouncements'
        },
        {
            id: 4,
            type: 'request',
            title: 'Request Approved',
            text: 'You approved Adeyemi Michael\'s day off request',
            time: '1 day ago',
            timestamp: Date.now() - 86400000,
            unread: false,
            action: null
        },
        {
            id: 5,
            type: 'system',
            title: 'New Account Created',
            text: 'Successfully created supervisor account for Sarah Johnson',
            time: '2 days ago',
            timestamp: Date.now() - 172800000,
            unread: false,
            action: null
        }
    ];
    
    updateUnreadCount();
    renderNotifications(adminNotifications);
}

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
        
        notificationElement.innerHTML = `
            ${notification.unread ? '<div class="unread-indicator"></div>' : ''}
            <div class="notification-header">
                <div class="notification-icon icon-${notification.type}">
                    <i class="${iconClass}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-text">${notification.text}</div>
                    <div class="notification-meta">
                        <div class="notification-time">
                            <i class="fas fa-clock"></i>
                            ${notification.time}
                        </div>
                        ${notification.unread ? '<span class="notification-badge">New</span>' : ''}
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(notificationElement);
    });
}

function getNotificationIcon(type) {
    const icons = {
        announcement: 'fas fa-bullhorn',
        request: 'fas fa-inbox',
        complaint: 'fas fa-exclamation-circle',
        query: 'fas fa-file-alt',
        system: 'fas fa-cog'
    };
    
    return icons[type] || 'fas fa-bell';
}

function handleNotificationClick(notification) {
    notification.unread = false;
    updateUnreadCount();
    renderNotifications(adminNotifications);
    
    if (notification.action) {
        closeNotificationsPage();
        setTimeout(() => {
            if (typeof window[notification.action] === 'function') {
                window[notification.action]();
            }
        }, 300);
    } else {
        showNotification('Notification opened', 'success');
    }
}

function filterNotifications() {
    const selectedDate = document.getElementById('notificationDateFilter').value;
    
    if (!selectedDate) {
        renderNotifications(adminNotifications);
        return;
    }
    
    const filterDate = new Date(selectedDate);
    filterDate.setHours(0, 0, 0, 0);
    
    const filtered = adminNotifications.filter(notification => {
        const notifDate = new Date(notification.timestamp);
        notifDate.setHours(0, 0, 0, 0);
        return notifDate.getTime() === filterDate.getTime();
    });
    
    renderNotifications(filtered);
}

function clearNotificationFilter() {
    document.getElementById('notificationDateFilter').value = '';
    renderNotifications(adminNotifications);
}

function markAllAsRead() {
    adminNotifications.forEach(notification => {
        notification.unread = false;
    });
    
    updateUnreadCount();
    renderNotifications(adminNotifications);
    showNotification('All notifications marked as read', 'success');
}

function updateUnreadCount() {
    unreadCount = adminNotifications.filter(n => n.unread).length;
    
    const notificationBadge = document.querySelector('#notificationIcon .notification-badge');
    if (notificationBadge) {
        if (unreadCount > 0) {
            notificationBadge.textContent = unreadCount;
            notificationBadge.style.display = 'flex';
        } else {
            notificationBadge.style.display = 'none';
        }
    }
}
let currentPostId = null;
let postComments = {};

function showComments(postId) {
    currentPostId = postId;
    document.getElementById('commentsModal').classList.add('show');
    loadComments(postId);
}

function closeComments() {
    document.getElementById('commentsModal').classList.remove('show');
    currentPostId = null;
    document.getElementById('commentInput').value = '';
}

function loadComments(postId) {
    // Initialize comments if not exist
    if (!postComments[postId]) {
        postComments[postId] = [
            {
                id: 1,
                author: 'Sarah Johnson',
                initials: 'SJ',
                text: 'Great work! Keep it up! 👍',
                time: '5 minutes ago',
                likes: 3,
                liked: false
            },
            {
                id: 2,
                author: 'David Williams',
                initials: 'DW',
                text: 'This is exactly what we needed. Thanks for sharing!',
                time: '10 minutes ago',
                likes: 5,
                liked: false
            }
        ];
    }
    
    renderComments(postId);
}

function renderComments(postId) {
    const container = document.getElementById('commentsList');
    const comments = postComments[postId] || [];
    
    if (comments.length === 0) {
        container.innerHTML = `
            <div class="no-comments">
                <i class="fas fa-comment"></i>
                <p>No comments yet. Be the first to comment!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    comments.forEach(comment => {
        const commentEl = document.createElement('div');
        commentEl.className = 'comment-item';
        
        commentEl.innerHTML = `
            <div class="comment-avatar">${comment.initials}</div>
            <div class="comment-content">
                <div class="comment-header">
                    <span class="comment-author">${comment.author}</span>
                    <span class="comment-time">${comment.time}</span>
                </div>
                <div class="comment-text">${comment.text}</div>
                <div class="comment-actions">
                    <button class="comment-action-btn ${comment.liked ? 'liked' : ''}" onclick="toggleCommentLike(${postId}, ${comment.id})">
                        <i class="fas fa-heart"></i>
                        <span>${comment.likes}</span>
                    </button>
                    <button class="comment-action-btn" onclick="replyToComment(${comment.id})">
                        <i class="fas fa-reply"></i>
                        Reply
                    </button>
                </div>
            </div>
        `;
        
        container.appendChild(commentEl);
    });
}

function sendComment() {
    const input = document.getElementById('commentInput');
    const text = input.value.trim();
    
    if (!text || !currentPostId) return;
    
    const newComment = {
        id: Date.now(),
        author: 'HR Admin',
        initials: 'HR',
        text: text,
        time: 'Just now',
        likes: 0,
        liked: false
    };
    
    if (!postComments[currentPostId]) {
        postComments[currentPostId] = [];
    }
    
    postComments[currentPostId].push(newComment);
    
    // Update comment count on post
    const commentBtn = document.querySelector(`[data-post-id="${currentPostId}"] .comment-action span`);
    if (commentBtn) {
        const currentCount = parseInt(commentBtn.textContent);
        commentBtn.textContent = `${currentCount + 1} Comments`;
    }
    
    input.value = '';
    renderComments(currentPostId);
    showNotification('Comment posted!', 'success');
}

function toggleCommentLike(postId, commentId) {
    const comment = postComments[postId].find(c => c.id === commentId);
    if (comment) {
        if (comment.liked) {
            comment.likes--;
            comment.liked = false;
        } else {
            comment.likes++;
            comment.liked = true;
        }
        renderComments(postId);
    }
}

function replyToComment(commentId) {
    const input = document.getElementById('commentInput');
    input.focus();
    showNotification('Reply feature coming soon!', 'success');
}

// Auto-enable/disable send button
document.addEventListener('DOMContentLoaded', function() {
    const commentInput = document.getElementById('commentInput');
    const sendBtn = document.getElementById('sendCommentBtn');
    
    if (commentInput && sendBtn) {
        commentInput.addEventListener('input', function() {
            sendBtn.disabled = !this.value.trim();
        });
    }
});


// Privacy
function showPrivacy() {
    document.getElementById('privacyPage').style.display = 'block';
}

function closePrivacy() {
    document.getElementById('privacyPage').style.display = 'none';
}

function togglePrivacy(setting, enabled) {
    const status = enabled ? 'enabled' : 'disabled';
    showNotification(`${setting} ${status}`, 'success');
}
let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let recordingTimer;
let recordingSeconds = 0;
let recordedAudioBlob = null;

async function toggleVoiceRecording() {
    if (!isRecording) {
        await startVoiceRecording();
    } else {
        stopVoiceRecording();
    }
}

async function startVoiceRecording() {
    try {
        // Request microphone permission
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        recordingSeconds = 0;
        
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            recordedAudioBlob = audioBlob;
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // Show audio player
            const audioPlayback = document.getElementById('audioPlayback');
            const voiceNotePlayer = document.getElementById('voiceNotePlayer');
            
            audioPlayback.src = audioUrl;
            voiceNotePlayer.style.display = 'flex';
            
            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());
            
            showNotification('Voice note recorded successfully!', 'success');
        };
        
        mediaRecorder.start();
        isRecording = true;
        
        // Update UI
        const voiceBtn = document.getElementById('voiceNoteBtn');
        const voiceIcon = document.getElementById('voiceIcon');
        voiceBtn.classList.add('recording');
        voiceIcon.className = 'fas fa-stop';
        
        // Show recording timer
        showRecordingTimer();
        
        // Start timer
        recordingTimer = setInterval(() => {
            recordingSeconds++;
            updateRecordingTimer(recordingSeconds);
        }, 1000);
        
        showNotification('Recording started...', 'success');
        
    } catch (error) {
        console.error('Error accessing microphone:', error);
        showNotification('Could not access microphone. Please allow microphone permission.', 'error');
    }
}

function stopVoiceRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        
        // Clear timer
        clearInterval(recordingTimer);
        hideRecordingTimer();
        
        // Update UI
        const voiceBtn = document.getElementById('voiceNoteBtn');
        const voiceIcon = document.getElementById('voiceIcon');
        voiceBtn.classList.remove('recording');
        voiceIcon.className = 'fas fa-microphone';
    }
}

function deleteVoiceNote() {
    const voiceNotePlayer = document.getElementById('voiceNotePlayer');
    const audioPlayback = document.getElementById('audioPlayback');
    
    voiceNotePlayer.style.display = 'none';
    audioPlayback.src = '';
    recordedAudioBlob = null;
    
    showNotification('Voice note deleted', 'success');
}

function showRecordingTimer() {
    let timerElement = document.getElementById('recordingTimerOverlay');
    
    if (!timerElement) {
        timerElement = document.createElement('div');
        timerElement.id = 'recordingTimerOverlay';
        timerElement.className = 'recording-timer';
        timerElement.innerHTML = `
            <div class="recording-text">
                <span class="recording-dot"></span>
                Recording
            </div>
            <div id="timerDisplay">00:00</div>
        `;
        document.body.appendChild(timerElement);
    }
    
    timerElement.classList.add('show');
}

function hideRecordingTimer() {
    const timerElement = document.getElementById('recordingTimerOverlay');
    if (timerElement) {
        timerElement.classList.remove('show');
    }
}

function updateRecordingTimer(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const display = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    
    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) {
        timerDisplay.textContent = display;
    }
}

// Function to send voice note (call this when user clicks send)
function sendVoiceNote() {
    if (recordedAudioBlob) {
        // Here you would upload the audio blob to your server
        console.log('Sending voice note:', recordedAudioBlob);
        
        // Create FormData for upload
        const formData = new FormData();
        formData.append('voiceNote', recordedAudioBlob, 'voice-note.wav');
        formData.append('timestamp', new Date().toISOString());
        
        // Example: Send to server
        // fetch('/api/upload-voice-note', {
        //     method: 'POST',
        //     body: formData
        // }).then(response => response.json())
        //   .then(data => console.log('Uploaded:', data));
        
        showNotification('Voice note sent!', 'success');
        deleteVoiceNote();
        
        return true;
    }
    return false;
}

console.log('Voice recording feature loaded successfully!');
function clearAppCache() {
    // Create custom modal
    let modal = document.getElementById('clearCacheModal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'clearCacheModal';
        modal.className = 'profile-options-modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="profile-options-content">
            <h3 class="profile-options-title">Clear Cache?</h3>
            <p style="text-align: center; color: #666; margin-bottom: 20px;">
                This will remove all stored data. Are you sure?
            </p>
            <button class="profile-option-btn remove" onclick="confirmClearCache()">
                <i class="fas fa-trash"></i>
                Clear Cache
            </button>
            <button class="profile-option-btn cancel" onclick="closeClearCacheModal()">
                <i class="fas fa-times"></i>
                Cancel
            </button>
        </div>
    `;
    
    modal.classList.add('show');
}

function closeClearCacheModal() {
    const modal = document.getElementById('clearCacheModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

function confirmClearCache() {
    closeClearCacheModal();
    
    // Clear localStorage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key !== 'userSession') {
            keysToRemove.push(key);
        }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    showNotification('Cache cleared successfully! App will reload...', 'success');
    
    setTimeout(() => {
        location.reload();
    }, 2000);
}
