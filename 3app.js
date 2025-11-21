// Admin Interface - JavaScript

// Initialize on page load


document.addEventListener('DOMContentLoaded', function() {
    updateGreeting();
    updateDateTime();
    setInterval(updateDateTime, 1000);
    postsRef = window.db.collection('posts');
    postsRef = window.db.collection('posts');
requestsRef = window.db.collection('requests');
complaintsRef = window.db.collection('complaints');

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
// Load Staff Feed from Firebase
function loadStaffFeed() {
    const feedContainer = document.getElementById('feedPosts');
    if (!feedContainer) {
        console.error('Feed container not found');
        return;
    }
    
    // Show loading state
    feedContainer.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin"></i> Loading posts...</div>';
    
    // Real-time listener for posts
    postsRef.orderBy('createdAt', 'desc').limit(50).onSnapshot((snapshot) => {
        if (snapshot.empty) {
            feedContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">No posts yet</div>';
            return;
        }
        
        const posts = [];
        snapshot.forEach((doc) => {
            const postData = { id: doc.id, ...doc.data() };
            
            // Map fields to match what renderPosts expects
            if (postData.createdAt) {
                postData.time = getTimeAgo(postData.createdAt.toDate());
            }
            postData.author = postData.userName || postData.author;
            postData.initials = postData.userInitials || postData.initials || 'U';
            postData.likes = postData.likes ? postData.likes.length : 0;
            postData.comments = postData.comments ? postData.comments.length : 0;
            postData.text = postData.content || postData.text || '';
            postData.type = postData.type || 'text';
            
            posts.push(postData);
        });
        
        renderPosts(posts, feedContainer);
    }, (error) => {
        console.error("Error loading posts:", error);
        feedContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: #f44336;">Error loading posts</div>';
    });
}

// Helper function for time ago
function getTimeAgo(date) {
    if (!date) return 'Just now';
    
    const now = new Date();
    const postDate = date instanceof Date ? date : new Date(date);
    const seconds = Math.floor((now - postDate) / 1000);
    
    if (seconds < 60) return 'Just now';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    
    return postDate.toLocaleDateString();
} 
// Render posts in feed
function renderPosts(posts, container) {
    container.innerHTML = '';
    
    posts.forEach(post => {
        const postElement = document.createElement('div');
        postElement.className = 'post';
        postElement.dataset.postId = post.id;
        
        postElement.innerHTML = `
            <div class="post-header">
                <div class="post-user">
                    <div class="post-avatar">${post.initials || 'U'}</div>
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
                <button class="post-action like-action ${isLikedByCurrentUser(post) ? 'liked' : ''}" onclick="toggleLike('${post.id}')">
                    <i class="fas fa-heart"></i>
                    <span>${post.likes || 0} Likes</span>
                </button>
                <button class="post-action comment-action" onclick="showComments('${post.id}')">
                    <i class="fas fa-comment"></i>
                    <span>${post.commentsCount || 0} Comments</span>
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
// Show Admin Post Menu
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
            <button class="profile-option-btn remove" onclick="confirmDeletePost('${postId}', '${author}')">
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
// Auto-enable/disable send button
document.addEventListener('DOMContentLoaded', function() {
    const commentInput = document.getElementById('commentInput');
    const sendBtn = document.getElementById('sendCommentBtn');
    
    if (commentInput && sendBtn) {
        commentInput.addEventListener('input', function() {
            sendBtn.disabled = !this.value.trim();
        });
    }

    
    // Load feed when page loads
    if (document.getElementById('feedPosts')) {
        loadStaffFeed();
    }
});

// Delete Post
function confirmDeletePost(postId, author) {
    closeDeletePostModal();
    
    db.collection('posts').doc(postId).delete()
        .then(() => {
            const postElement = document.querySelector(`[data-post-id="${postId}"]`);
            if (postElement) {
                postElement.style.opacity = '0';
                postElement.style.transform = 'scale(0.8)';
                
                setTimeout(() => {
                    postElement.remove();
                    showNotification(`Post by ${author} deleted successfully.`, 'success');
                }, 300);
            }
        })
        .catch((error) => {
            console.error("Error deleting post:", error);
            showNotification('Failed to delete post', 'error');
        });
}
 
// Toggle Like on Post
async function toggleLike(postId) {
    const user = auth.currentUser;
    if (!user) {
        showNotification('Please login to like posts', 'error');
        return;
    }
    
    const postRef = postsRef.doc(postId);
    const likeBtn = document.querySelector(`[data-post-id="${postId}"] .like-action`);
    
    try {
        const postDoc = await postRef.get();
        const postData = postDoc.data();
        const likedBy = postData.likedBy || [];
        
        if (likedBy.includes(user.uid)) {
            // Unlike
            await postRef.update({
                likes: firebase.firestore.FieldValue.increment(-1),
                likedBy: firebase.firestore.FieldValue.arrayRemove(user.uid)
            });
        } else {
            // Like
            await postRef.update({
                likes: firebase.firestore.FieldValue.increment(1),
                likedBy: firebase.firestore.FieldValue.arrayUnion(user.uid)
            });
        }
    } catch (error) {
        console.error("Error toggling like:", error);
        showNotification('Error updating like', 'error');
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
    
    const searchLower = query.toLowerCase();
    
    // Search Firebase for staff users
    db.collection('users')
        .where('role', '==', 'staff')
        .get()
        .then((snapshot) => {
            const filtered = [];
            
            snapshot.forEach((doc) => {
                const staff = { uid: doc.id, ...doc.data() };
                const name = staff.fullName || '';
                const department = staff.department || '';
                
                if (name.toLowerCase().includes(searchLower) ||
                    department.toLowerCase().includes(searchLower)) {
                    filtered.push({
                        uid: staff.uid,
                        name: staff.fullName,
                        initials: getInitials(staff.fullName),
                        department: staff.department || 'Staff'
                    });
                }
            });
            
            if (filtered.length === 0) {
                resultsContainer.innerHTML = '<div style="padding: 15px; text-align: center; color: #666;">No staff found</div>';
                resultsContainer.classList.add('show');
                return;
            }
            
            resultsContainer.innerHTML = filtered.map(staff => `
                <div class="staff-result-item" onclick="selectStaff('${staff.uid}', '${staff.name}', '${staff.initials}')">
                    <div class="staff-result-avatar">${staff.initials}</div>
                    <div class="staff-result-info">
                        <div class="staff-result-name">${staff.name}</div>
                        <div class="staff-result-role">${staff.department}</div>
                    </div>
                </div>
            `).join('');
            
            resultsContainer.classList.add('show');
        })
        .catch((error) => {
            console.error('Search error:', error);
            resultsContainer.innerHTML = '<div style="padding: 15px; text-align: center; color: #e74c3c;">Search failed</div>';
            resultsContainer.classList.add('show');
        });
}

function selectStaff(uid, name, initials) {
    document.getElementById('staffSearch').value = name;
    document.getElementById('selectedStaffId').value = uid;
    document.getElementById('staffSearchResults').classList.remove('show');
}

async function submitQuery(event) {
    event.preventDefault();
    
    const staffId = document.getElementById('selectedStaffId').value;
    const staffName = document.getElementById('staffSearch').value;
    const reason = document.getElementById('queryReason').value.trim();
    
    if (!staffId) {
        showNotification('Please select a staff member', 'error');
        return;
    }
    
    if (!reason) {
        showNotification('Please provide a reason for the query', 'error');
        return;
    }
    
    const currentUser = auth.currentUser;
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        
        // Check if user is admin
        if (userData.role !== 'admin') {
            showNotification('Only admins can issue queries', 'error');
            return;
        }
        
        // Determine penalty based on level
        let penalty = '';
        if (currentQueryLevel === 1) {
            penalty = 'Serious Warning';
        } else if (currentQueryLevel === 2) {
            penalty = '₦2,000 salary deduction';
        } else if (currentQueryLevel === 3) {
            penalty = '30% salary deduction';
        }
        
        // Save query to Firebase
        await db.collection('queries').add({
            staffId: staffId,
            staffName: staffName,
            level: currentQueryLevel,
            reason: reason,
            penalty: penalty,
            issuedBy: currentUser.uid,
            issuedByName: userData.fullName,
            issuedAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'active'
        });
        
        // Send notification to staff
        await db.collection('notifications').add({
            userId: staffId,
            type: 'query',
            title: `Level ${currentQueryLevel} Query Issued`,
            message: `You have been issued a Level ${currentQueryLevel} query: ${penalty}. Reason: ${reason}`,
            queryLevel: currentQueryLevel,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            read: false
        });
        
        closeQueryForm();
        showNotification(`Level ${currentQueryLevel} query issued to ${staffName}. Staff has been notified.`, 'success');
        
    } catch (error) {
        console.error('Submit query error:', error);
        showNotification('Failed to issue query: ' + error.messageror.message, 'error');
    }
} 

console.log('Queries feature loaded successfully!');
function getInitials(name) {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
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
let complaintsRef;
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
    
    complaintsListContainer.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin"></i> Loading complaints...</div>';
    
    // Real-time listener for complaints
    complaintsRef.orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
        complaintsData = [];
        
        snapshot.forEach((doc) => {
            complaintsData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        renderComplaintsList();
    }, (error) => {
        console.error("Error loading complaints:", error);
        complaintsListContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: #f44336;">Error loading complaints</div>';
    });
}

function renderComplaintsList() {
    const complaintsListContainer = document.getElementById('complaintsList');
    
    if (complaintsData.length === 0) {
        complaintsListContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;"></i>
                <p style="font-size: 1.1rem;">No complaints at this time</p>
            </div>
        `;
        return;
    }
    
    complaintsListContainer.innerHTML = '';
    
    complaintsData.forEach(complaint => {
        const complaintBox = document.createElement('div');
        complaintBox.className = 'complaint-box';
        complaintBox.onclick = () => openComplaintReview(complaint.id);
        
        const timeAgo = complaint.createdAt ? getTimeAgo(complaint.createdAt.toDate()) : 'Just now';
        const initials = getInitials(complaint.userName || complaint.author || 'User');
        const complaintText = complaint.complaint || complaint.message || 'No message';
        
        complaintBox.innerHTML = `
            <div class="complaint-box-header">
                <div class="complaint-box-avatar">${initials}</div>
                <div class="complaint-box-info">
                    <h3>${complaint.userName || complaint.author || 'Anonymous'}</h3>
                    <p>${timeAgo}</p>
                </div>
            </div>
            <div class="complaint-box-preview">
                ${complaintText.substring(0, 100)}${complaintText.length > 100 ? '...' : ''}
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
    
    const initials = getInitials(complaint.userName || complaint.author || 'User');
    const timeAgo = complaint.createdAt ? getTimeAgo(complaint.createdAt.toDate()) : 'Just now';
    
    if (reviewAvatar) reviewAvatar.textContent = initials;
    if (reviewUsername) reviewUsername.textContent = complaint.userName || complaint.author || 'Anonymous';
    if (reviewTime) reviewTime.textContent = timeAgo;
    
    // Load conversation from Firebase
    loadConversation(complaint);
    
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
 
function loadConversation(complaint) {
    const conversationContainer = document.getElementById('complaintConversation');
    if (!conversationContainer) return;
    
    conversationContainer.innerHTML = '';
    
    // Add original complaint
    const originalMsg = document.createElement('div');
    originalMsg.className = 'message-item staff';
    originalMsg.innerHTML = `
        <div class="message-bubble">${complaint.complaint || complaint.message}</div>
        <div class="message-time">${complaint.createdAt ? getTimeAgo(complaint.createdAt.toDate()) : 'Just now'}</div>
    `;
    conversationContainer.appendChild(originalMsg);
    
    // Add replies if they exist
    const replies = complaint.replies || [];
    replies.forEach(reply => {
        const messageItem = document.createElement('div');
        messageItem.className = `message-item ${reply.sender}`;
        
        let messageContent = reply.message;
        
        // If there's media
        if (reply.mediaUrl) {
            if (reply.mediaType && reply.mediaType.startsWith('image/')) {
                messageContent += `<br><img src="${reply.mediaUrl}" alt="Image" style="max-width: 100%; border-radius: 10px; margin-top: 8px;">`;
            } else if (reply.mediaType && reply.mediaType.startsWith('video/')) {
                messageContent += `<br><video src="${reply.mediaUrl}" controls style="max-width: 100%; border-radius: 10px; margin-top: 8px;"></video>`;
            }
        }
        
        const replyTime = reply.timestamp ? getTimeAgo(reply.timestamp.toDate()) : 'Just now';
        
        messageItem.innerHTML = `
            <div class="message-bubble">${messageContent}</div>
            <div class="message-time">${replyTime}</div>
        `;
        
        conversationContainer.appendChild(messageItem);
    });
    
    conversationContainer.scrollTop = conversationContainer.scrollHeight;
}

async function sendComplaintReply() {
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
    
    try {
        const newReply = {
    sender: 'admin',
    message: replyText,
    timestamp: new Date() // ✅ Use regular Date
};
        
        // Add reply to complaint
        await complaintsRef.doc(currentComplaintId).update({
            replies: firebase.firestore.FieldValue.arrayUnion(newReply),
            lastReplyAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Send notification to staff
        await db.collection('notifications').add({
            userId: complaint.userId,
            type: 'complaint_reply',
            title: 'Admin Replied to Your Complaint',
            message: replyText,
            complaintId: currentComplaintId,
            read: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        replyInput.value = '';
        showNotification('Reply sent successfully', 'success');
        
        // Reload conversation
        const updatedComplaint = complaintsData.find(c => c.id === currentComplaintId);
        if (updatedComplaint) {
            loadConversation(updatedComplaint);
        }
        
    } catch (error) {
        console.error('Error sending reply:', error);
        showNotification('Failed to send reply', 'error');
    }
}

function handleComplaintMedia() {
    const mediaInput = document.getElementById('complaintMediaInput');
    if (mediaInput) {
        mediaInput.click();
    }
}

// Media upload event listener
document.addEventListener('DOMContentLoaded', function() {
    const mediaInput = document.getElementById('complaintMediaInput');
    if (mediaInput) {
        mediaInput.addEventListener('change', async function(e) {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                const fileType = file.type;
                const fileName = file.name;
                const fileSize = (file.size / 1024 / 1024).toFixed(2);
                
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
                
                if (!currentComplaintId) return;
                
                const complaint = complaintsData.find(c => c.id === currentComplaintId);
                if (!complaint) return;
                
                try {
                    showNotification('Uploading media...', 'info');
                    
                    // Convert to base64
                    const reader = new FileReader();
                    reader.onload = async function(event) {
                        const mediaBase64 = event.target.result;
                        
                        const newReply = {
                            sender: 'admin',
                            message: `📎 ${fileName} (${fileSize}MB)`,
                            mediaUrl: mediaBase64,
                            mediaType: fileType,
                            timestamp: new Date()
                        };
                        
                        // Add reply with media to complaint
                        await complaintsRef.doc(currentComplaintId).update({
                            replies: firebase.firestore.FieldValue.arrayUnion(newReply),
                            lastReplyAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        
                        // Send notification to staff
                        await db.collection('notifications').add({
                            userId: complaint.userId,
                            type: 'complaint_reply',
                            title: 'Admin Sent You a Media File',
                            message: `📎 ${fileName}`,
                            complaintId: currentComplaintId,
                            read: false,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        
                        showNotification(`${fileType.startsWith('image/') ? 'Image' : 'Video'} uploaded successfully!`, 'success');
                        
                        // Reload conversation
                        const updatedComplaint = complaintsData.find(c => c.id === currentComplaintId);
                        if (updatedComplaint) {
                            loadConversation(updatedComplaint);
                        }
                    };
                    
                    reader.readAsDataURL(file);
                    
                } catch (error) {
                    console.error('Upload error:', error);
                    showNotification('Failed to upload media', 'error');
                }
                
                // Reset input
                e.target.value = '';
            }
        });
    }
});

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
let requestsRef;
 
 function getInitials(name) {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getTimeAgo(date) {
    if (!date) return 'Just now';
    
    const now = new Date();
    const postDate = date instanceof Date ? date : new Date(date);
    const seconds = Math.floor((now - postDate) / 1000);
    
    if (seconds < 60) return 'Just now';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    
    return postDate.toLocaleDateString();
}

function showRequests() {
    document.getElementById('requestsPage').style.display = 'block';
    loadRequests();
}

function closeRequests() {
    document.getElementById('requestsPage').style.display = 'none';
}
function loadRequests() {
    const container = document.getElementById('requestsList');
    
    if (container) {
        container.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin"></i> Loading requests...</div>';
    }
    
    requestsRef
        .where('status', '==', 'pending')
        .onSnapshot((snapshot) => {
            allRequests = [];
            
            snapshot.forEach((doc) => {
                allRequests.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Sort manually - newest first (no index needed)
            allRequests.sort((a, b) => {
                if (!a.createdAt || !b.createdAt) return 0;
                const timeA = a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
                const timeB = b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
                return timeB - timeA; // Newest first
            });
            
            renderRequests();
        }, (error) => {
            console.error("Error loading requests:", error);
            if (container) {
                container.innerHTML = '<div style="text-align: center; padding: 40px; color: #f44336;">Error loading requests</div>';
            }
        });
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
        
        // Calculate time properly - checks both createdAt and submittedAt
        let timeAgo = 'Just now';
        if (request.createdAt || request.submittedAt) {
            const timestamp = request.createdAt || request.submittedAt;
            const createdDate = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            timeAgo = getTimeAgo(createdDate);
        }
        
        const displayType = request.type === 'dayoff' ? 'Day Off' :
            request.type === 'loan' ? 'Loan' : request.type;
        
        requestEl.innerHTML = `
            <div class="request-item-header">
                <div class="request-avatar">${getInitials(request.userName)}</div>
                <div class="request-user-info">
                    <div class="request-user-name">${request.userName}</div>
                    <div class="request-type">${displayType}</div>
                </div>
                <div>
                    <div class="request-badge">Pending</div>
                    <div class="request-time">${timeAgo}</div>
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
    const displayType = request.type === 'dayoff' ? 'Day Off Request' :
        request.type === 'loan' ? 'Loan Request' : request.type;
    
    subtitle.innerHTML = `
        <div class="request-subtitle-avatar">${getInitials(request.userName)}</div>
        <div>
            <strong>${request.userName}</strong> sent a <strong>${displayType}</strong>
        </div>
    `;
    
    // Set application details
    const appCard = document.getElementById('requestApplicationCard');
    
    if (request.type === 'dayoff') {
        const startDate = new Date(request.startDate);
        const endDate = new Date(request.endDate);
        
        appCard.innerHTML = `
            <div class="application-field">
                <span class="application-label">Start Date</span>
                <div class="application-value">${startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
            </div>
            <div class="application-field">
                <span class="application-label">End Date</span>
                <div class="application-value">${endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
            </div>
            <div class="application-field">
                <span class="application-label">Duration</span>
                <div class="application-value">${request.daysCount} day${request.daysCount > 1 ? 's' : ''}</div>
            </div>
            <div class="application-field">
                <span class="application-label">Department</span>
                <div class="application-value">${request.userDepartment || 'N/A'}</div>
            </div>
            <div class="application-field">
                <span class="application-label">Reason</span>
                <div class="application-value">${request.reason}</div>
            </div>
        `;
    } else if (request.type === 'loan') {
        appCard.innerHTML = `
            <div class="application-field">
                <span class="application-label">Amount Requested</span>
                <div class="application-value">₦${parseInt(request.amount).toLocaleString()}</div>
            </div>
            <div class="application-field">
                <span class="application-label">Repayment Plan</span>
                <div class="application-value">${request.repaymentPlan || 'Not specified'}</div>
            </div>
            <div class="application-field">
                <span class="application-label">Department</span>
                <div class="application-value">${request.userDepartment || 'N/A'}</div>
            </div>
            <div class="application-field">
                <span class="application-label">Guarantor Name</span>
                <div class="application-value">${request.guarantor?.name || 'N/A'}</div>
            </div>
            <div class="application-field">
                <span class="application-label">Guarantor Department</span>
                <div class="application-value">${request.guarantor?.department || 'N/A'}</div>
            </div>
            <div class="application-field">
                <span class="application-label">Guarantor Phone</span>
                <div class="application-value">${request.guarantor?.phone || 'N/A'}</div>
            </div>
            ${request.guarantor?.picture ? `
                <div class="application-field">
                    <span class="application-label">Guarantor Picture</span>
                    <div class="application-value">
                        <img src="${request.guarantor.picture}" alt="Guarantor" style="max-width: 200px; border-radius: 8px; margin-top: 10px;">
                    </div>
                </div>
            ` : ''}
        `;
    }
    
    // Clear response input
    document.getElementById('requestResponseInput').value = '';
}

function getInitials(name) {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}


function closeRequestDetail() {
    document.getElementById('requestDetailPage').style.display = 'none';
    document.getElementById('requestsPage').style.display = 'block';
}
async function approveRequest() {
    if (!currentRequest) return;
    
    const response = document.getElementById('requestResponseInput').value.trim();
    
    if (!response) {
        showNotification('Please add a comment about your decision', 'error');
        return;
    }
    
    try {
        // Update request status
        await requestsRef.doc(currentRequest.id).update({
            status: 'approved',
            adminResponse: response,
            respondedAt: firebase.firestore.FieldValue.serverTimestamp(),
            respondedBy: auth.currentUser ? auth.currentUser.uid : 'admin'
        });
        
        // Create notification for staff
        await db.collection('notifications').add({
            userId: currentRequest.userId,
            type: 'request_approved',
            title: `${currentRequest.type} Approved`,
            message: response,
            requestId: currentRequest.id,
            requestType: currentRequest.type,
            read: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showNotification(`${currentRequest.type} approved! ${currentRequest.userName} has been notified.`, 'success');
        
        setTimeout(() => {
            closeRequestDetail();
        }, 1500);
        
    } catch (error) {
        console.error("Error approving request:", error);
        showNotification('Error approving request', 'error');
    }
}
async function rejectRequest() {
    if (!currentRequest) return;
    
    const response = document.getElementById('requestResponseInput').value.trim();
    
    if (!response) {
        showNotification('Please add a comment explaining why you rejected', 'error');
        return;
    }
    
    try {
        // Update request status
        await requestsRef.doc(currentRequest.id).update({
            status: 'rejected',
            adminResponse: response,
            respondedAt: firebase.firestore.FieldValue.serverTimestamp(),
            respondedBy: auth.currentUser ? auth.currentUser.uid : 'admin'
        });
        
        // Create notification for staff
        await db.collection('notifications').add({
            userId: currentRequest.userId,
            type: 'request_rejected',
            title: `${currentRequest.type} Rejected`,
            message: response,
            requestId: currentRequest.id,
            requestType: currentRequest.type,
            read: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showNotification(`${currentRequest.type} rejected. ${currentRequest.userName} has been notified.`, 'success');
        
        setTimeout(() => {
            closeRequestDetail();
        }, 1500);
        
    } catch (error) {
        console.error("Error rejecting request:", error);
        showNotification('Error rejecting request', 'error');
    }
}
async function sendResponse() {
    const response = document.getElementById('requestResponseInput').value.trim();
    
    if (!response) {
        showNotification('Please write something', 'error');
        return;
    }
    
    if (!currentRequest) return;
    
    try {
        // Create a comment/message on the request
        await db.collection('notifications').add({
            userId: currentRequest.userId,
            type: 'request_message',
            title: 'Message from Admin',
            message: response,
            requestId: currentRequest.id,
            requestType: currentRequest.type,
            read: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showNotification('Response sent to staff member', 'success');
        document.getElementById('requestResponseInput').value = '';
        
    } catch (error) {
        console.error("Error sending response:", error);
        showNotification('Error sending response', 'error');
    }
}

// ==================== HELPER FUNCTION ====================
function getTimeAgo(date) {
    if (!date) return 'Just now';
    
    const now = new Date();
    const postDate = date instanceof Date ? date : new Date(date);
    const seconds = Math.floor((now - postDate) / 1000);
    
    if (seconds < 60) return 'Just now';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    
    return postDate.toLocaleDateString();
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
        const announcementDoc = await db.collection('announcements').add({
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
        
        // Get all staff users to notify them
        const staffSnapshot = await db.collection('users')
            .where('role', '==', 'staff')
            .get();
        
        // Create notifications for all staff
        const notificationPromises = [];
        staffSnapshot.forEach(doc => {
            notificationPromises.push(
                db.collection('notifications').add({
                    userId: doc.id,
                    type: 'announcement',
                    title: 'New Announcement from Admin',
                    message: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
                    announcementId: announcementDoc.id,
                    read: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                })
            );
        });
        
        await Promise.all(notificationPromises);
        
        showNotification('Announcement posted! All staff members have been notified.', 'success');
        
        // Clear form
        document.getElementById('announcementText').value = '';
        announcementMediaFile = null;
        
        // Reset media preview if exists
        const mediaPreview = document.getElementById('announcementMediaPreview');
        if (mediaPreview) mediaPreview.innerHTML = '';
        
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
async function loadPreviousAnnouncements() {
    const container = document.getElementById('previousAnnouncementsList');
    if (!container) return;
    
    try {
        container.innerHTML = '<div style="text-align:center; padding:40px;">Loading announcements...</div>';
        
        // Get announcements from Firebase
        const snapshot = await db.collection('announcements')
            .orderBy('createdAt', 'desc')
            .get();
        
        previousAnnouncements = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            previousAnnouncements.push({
                id: doc.id,
                ...data,
                date: data.createdAt ? data.createdAt.toDate().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }) : 'Just now'
            });
        });
        
        renderAnnouncements(previousAnnouncements);
        
    } catch (error) {
        console.error('Load announcements error:', error);
        container.innerHTML = '<div style="text-align:center; padding:40px; color:#e74c3c;">Failed to load announcements</div>';
    }
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

// ==================== SHOW ANNOUNCEMENT DETAIL (OPTIONAL) ====================
function showAnnouncementDetail(announcement) {
    // Create a modal or detail view to show full announcement
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;';
    
    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 15px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0;">${announcement.title}</h2>
                <button onclick="this.closest('div').parentElement.parentElement.remove()" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
            </div>
            <div style="color: #666; margin-bottom: 15px;">${announcement.date}</div>
            <div style="line-height: 1.6;">${announcement.text}</div>
            ${announcement.mediaUrl ? `
                <div style="margin-top: 20px;">
                    ${announcement.mediaType?.startsWith('image/') ? 
                        `<img src="${announcement.mediaUrl}" style="max-width: 100%; border-radius: 10px;">` :
                        announcement.mediaType?.startsWith('video/') ?
                        `<video src="${announcement.mediaUrl}" controls style="max-width: 100%; border-radius: 10px;"></video>` :
                        ''
                    }
                </div>
            ` : ''}
        </div>
    `;
    
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
    
    document.body.appendChild(modal);
}

// ==================== HELPER FUNCTION ====================
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
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
async function loadProfileData() {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        
        if (!userDoc.exists) {
            showNotification('Profile not found', 'error');
            return;
        }
        
        const userData = userDoc.data();
        
        document.getElementById('profileName').textContent = userData.fullName || 'User';
        document.getElementById('profileRole').textContent = userData.role || 'Admin';
        document.getElementById('displayName').textContent = userData.fullName || 'User';
        document.getElementById('displayEmail').textContent = currentUser.email || 'No email';
        document.getElementById('displayPhone').textContent = userData.phoneNumber || 'No phone';
        document.getElementById('displayRoleInfo').textContent = userData.role || 'Admin';
        
        // Load profile photo if exists
        const profilePicLarge = document.getElementById('profilePicLarge');
        if (userData.profilePicture) {
            profilePicLarge.innerHTML = `<img src="${userData.profilePicture}" alt="Profile" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
        } else {
            profilePicLarge.innerHTML = getInitials(userData.fullName || 'U');
        }
        
        // Update dashboard profile pic
        const dashboardProfilePic = document.querySelector('.profile-pic');
        if (dashboardProfilePic && userData.profilePicture) {
            dashboardProfilePic.innerHTML = `<img src="${userData.profilePicture}" alt="Profile" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
        }
        
    } catch (error) {
        console.error('Load profile error:', error);
        showNotification('Failed to load profile', 'error');
    }
} 
// Change Profile Photo
function changeProfilePhoto() {
    document.getElementById('profilePhotoInput').click();
}

// Update the photo input event listener
document.addEventListener('DOMContentLoaded', function() {
    const photoInput = document.getElementById('profilePhotoInput');
    if (photoInput) {
        photoInput.addEventListener('change', async function(e) {
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
                
                const currentUser = auth.currentUser;
                if (!currentUser) {
                    showNotification('Please login first', 'error');
                    return;
                }
                
                try {
                    showNotification('Uploading photo...', 'info');
                    
                    // Compress and convert to base64
                    const reader = new FileReader();
                    reader.onload = async function(event) {
                        const img = new Image();
                        img.onload = async function() {
                            const canvas = document.createElement('canvas');
                            const MAX = 400;
                            let w = img.width, h = img.height;
                            if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; }}
                            else { if (h > MAX) { w *= MAX / h; h = MAX; }}
                            canvas.width = w;
                            canvas.height = h;
                            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                            const compressed = canvas.toDataURL('image/jpeg', 0.8);
                            
                            // Update in Firebase
                            await db.collection('users').doc(currentUser.uid).update({
                                profilePicture: compressed
                            });
                            
                            // Update UI
                            document.getElementById('profilePicLarge').innerHTML = `<img src="${compressed}" alt="Profile" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
                            
                            const dashboardProfilePic = document.querySelector('.profile-pic');
                            if (dashboardProfilePic) {
                                dashboardProfilePic.innerHTML = `<img src="${compressed}" alt="Profile" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
                            }
                            
                            showNotification('Profile photo updated!', 'success');
                        };
                        img.src = event.target.result;
                    };
                    reader.readAsDataURL(file);
                    
                } catch (error) {
                    console.error('Upload photo error:', error);
                    showNotification('Failed to upload photo', 'error');
                }
            }
        });
    }
});
// Edit Profile
async function openEditProfile() {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        
        document.getElementById('editName').value = userData.fullName || '';
        document.getElementById('editEmail').value = currentUser.email || '';
        document.getElementById('editPhone').value = userData.phoneNumber || '';
        document.getElementById('editRole').value = userData.role || '';
        
        document.getElementById('editProfileModal').classList.add('show');
        
    } catch (error) {
        console.error('Load edit profile error:', error);
        showNotification('Failed to load profile data', 'error');
    }
}
function closeEditProfile() {
    document.getElementById('editProfileModal').classList.remove('show');
}

async function saveProfileChanges() {
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
    
    const currentUser = auth.currentUser;
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    try {
        // Update Firestore
        await db.collection('users').doc(currentUser.uid).update({
            fullName: newName,
            phoneNumber: newPhone,
            role: newRole
        });
        
        // Update email in Firebase Auth (if changed)
        if (newEmail !== currentUser.email) {
            await currentUser.updateEmail(newEmail);
        }
        
        loadProfileData();
        closeEditProfile();
        showNotification('Profile updated successfully!', 'success');
        
    } catch (error) {
        console.error('Save profile error:', error);
        
        if (error.code === 'auth/requires-recent-login') {
            showNotification('Please log out and log in again to change email', 'error');
        } else {
            showNotification('Failed to update profile: ' + error.message, 'error');
        }
    }
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

// ==================== LOAD ADMIN NOTIFICATIONS ====================
async function loadAdminNotifications() {
    const container = document.getElementById('notificationsList');
    if (!container) return;
    
    const currentUser = auth.currentUser;
    if (!currentUser) {
        container.innerHTML = '<div style="text-align:center; padding:20px; color:#e74c3c;">Please login first</div>';
        return;
    }
    
    try {
        container.innerHTML = '<div style="text-align:center; padding:20px;">Loading notifications...</div>';
        
        // Get notifications where staff submitted something (complaints, requests, etc)
        // Or system notifications for admin actions
        const snapshot = await db.collection('adminNotifications')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
        
        adminNotifications = [];
        
        if (!snapshot.empty) {
            snapshot.forEach(doc => {
                adminNotifications.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
        }
        
        updateUnreadCount();
        renderNotifications(adminNotifications);
        
    } catch (error) {
        console.error('Load admin notifications error:', error);
        container.innerHTML = '<div style="text-align:center; padding:20px; color:#e74c3c;">Failed to load notifications</div>';
    }
}

// ==================== RENDER NOTIFICATIONS ====================
function renderNotifications(notificationsList) {
    const container = document.getElementById('notificationsList');
    
    if (notificationsList.length === 0) {
        container.innerHTML = `
            <div class="no-notifications">
                <i class="fas fa-bell-slash"></i>
                <h3>No notifications found</h3>
                <p>You don't have any notifications yet.</p>
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
        
        // Format time
        const timestamp = notification.createdAt || notification.timestamp;
        const time = timestamp ? 
            (timestamp.toDate ? getTimeAgo(timestamp.toDate()) : notification.time) : 
            'Just now';
        
        const notificationText = notification.message || notification.text || 'No details';
        
        notificationElement.innerHTML = `
            ${notification.unread ? '<div class="unread-indicator"></div>' : ''}
            <div class="notification-header">
                <div class="notification-icon icon-${notification.type}">
                    <i class="${iconClass}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-text">${notificationText}</div>
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

// ==================== HANDLE NOTIFICATION CLICK ====================
async function handleNotificationClick(notification) {
    // Mark as read
    try {
        await db.collection('adminNotifications').doc(notification.id).update({
            unread: false,
            read: true
        });
        
        notification.unread = false;
        updateUnreadCount();
        
    } catch (error) {
        console.error('Mark as read error:', error);
    }
    
    // Close notifications page
    closeAdminNotifications();
    
    // Navigate based on notification type
    if (notification.type === 'complaint' || notification.action === 'showComplaints') {
        // Go to complaints page
        if (typeof showComplaints === 'function') {
            showComplaints();
        }
        
        // If there's a specific complaint ID, open it
        if (notification.complaintId) {
            setTimeout(() => {
                const complaint = complaintsData.find(c => c.id === notification.complaintId);
                if (complaint) {
                    openComplaintReview(notification.complaintId);
                }
            }, 500);
        }
        
    } else if (notification.type === 'request' || notification.action === 'showRequests') {
        // Go to requests page
        if (typeof showRequests === 'function') {
            showRequests();
        }
        
        // If there's a specific request ID, open it
        if (notification.requestId) {
            setTimeout(() => {
                const request = allRequests.find(r => r.id === notification.requestId);
                if (request) {
                    openRequestDetail(request);
                }
            }, 500);
        }
        
    } else if (notification.type === 'announcement' || notification.action === 'showPreviousAnnouncements') {
        // Go to announcements
        if (typeof showPreviousAnnouncements === 'function') {
            showPreviousAnnouncements();
        }
        
    } else if (notification.action && typeof window[notification.action] === 'function') {
        // Call any other action function
        window[notification.action]();
    }
}
 function closeAdminNotifications() {
    const notificationsPage = document.getElementById('notificationsPage');
    if (notificationsPage) {
        notificationsPage.style.display = 'none';
    }
}


function getNotificationIcon(type) {
    const icons = {
        request: 'fas fa-clipboard-list',
        complaint: 'fas fa-exclamation-circle',
        announcement: 'fas fa-bullhorn',
        system: 'fas fa-cog',
        message: 'fas fa-envelope'
    };
    return icons[type] || 'fas fa-bell';
}

function getTimeAgo(date) {
    if (!date) return 'Just now';
    
    const now = new Date();
    const postDate = date instanceof Date ? date : new Date(date);
    const seconds = Math.floor((now - postDate) / 1000);
    
    if (seconds < 60) return 'Just now';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    
    return postDate.toLocaleDateString();
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
    const unreadCount = adminNotifications.filter(n => n.unread).length;
    
    // Update badge
    const badgeElements = document.querySelectorAll('.notification-badge-count, .notification-badge');
    badgeElements.forEach(badge => {
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    });
}


let currentPostId = null
 
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

// Load Comments from Firebase
function loadComments(postId) {
    const container = document.getElementById('commentsList');
    container.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i></div>';
    
    // Real-time listener for comments
    postsRef.doc(postId).collection('comments').orderBy('timestamp', 'asc').onSnapshot((snapshot) => {
        const comments = [];
        snapshot.forEach((doc) => {
            comments.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        renderComments(comments, container);
    }, (error) => {
        console.error("Error loading comments:", error);
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: #f44336;">Error loading comments</div>';
    });
}

function renderComments(comments, container) {
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
            <div class="comment-avatar">${comment.initials || 'U'}</div>
            <div class="comment-content">
                <div class="comment-header">
                    <span class="comment-author">${comment.author}</span>
                    <span class="comment-time">${formatTime(comment.timestamp)}</span>
                </div>
                <div class="comment-text">${comment.text}</div>
                <div class="comment-actions">
                    <button class="comment-action-btn ${isCommentLikedByCurrentUser(comment) ? 'liked' : ''}" onclick="toggleCommentLike('${currentPostId}', '${comment.id}')">
                        <i class="fas fa-heart"></i>
                        <span>${comment.likes || 0}</span>
                    </button>
                    <button class="comment-action-btn" onclick="replyToComment('${comment.id}')">
                        <i class="fas fa-reply"></i>
                        Reply
                    </button>
                </div>
            </div>
        `;
        
        container.appendChild(commentEl);
    });
} 
// Send Comment
async function sendComment() {
    const input = document.getElementById('commentInput');
    const text = input.value.trim();
    
    if (!text || !currentPostId) return;
    
    const user = auth.currentUser;
    if (!user) {
        showNotification('Please login to comment', 'error');
        return;
    }
    
    try {
        const newComment = {
            author: user.displayName || 'HR Admin',
            initials: getInitials(user.displayName || 'HR Admin'),
            text: text,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            likes: 0,
            likedBy: []
        };
        
        // Add comment to subcollection
        await postsRef.doc(currentPostId).collection('comments').add(newComment);
        
        // Update comment count on post
        await postsRef.doc(currentPostId).update({
            commentsCount: firebase.firestore.FieldValue.increment(1)
        });
        
        input.value = '';
        showNotification('Comment posted!', 'success');
    } catch (error) {
        console.error("Error posting comment:", error);
        showNotification('Error posting comment', 'error');
    }
}

async function toggleCommentLike(postId, commentId) {
    const user = auth.currentUser;
    if (!user) {
        showNotification('Please login to like comments', 'error');
        return;
    }
    
    const commentRef = postsRef.doc(postId).collection('comments').doc(commentId);
    
    try {
        const commentDoc = await commentRef.get();
        const commentData = commentDoc.data();
        const likedBy = commentData.likedBy || [];
        
        if (likedBy.includes(user.uid)) {
            // Unlike
            await commentRef.update({
                likes: firebase.firestore.FieldValue.increment(-1),
                likedBy: firebase.firestore.FieldValue.arrayRemove(user.uid)
            });
        } else {
            // Like
            await commentRef.update({
                likes: firebase.firestore.FieldValue.increment(1),
                likedBy: firebase.firestore.FieldValue.arrayUnion(user.uid)
            });
        }
    } catch (error) {
        console.error("Error toggling comment like:", error);
        showNotification('Error updating like', 'error');
    }
}


function replyToComment(commentId) {
    const input = document.getElementById('commentInput');
    input.focus();
    showNotification('Reply feature coming soon!', 'success');
}

// ==================== HELPER FUNCTIONS ====================
function isLikedByCurrentUser(post) {
    const user = auth.currentUser;
    if (!user || !post.likedBy) return false;
    return post.likedBy.includes(user.uid);
}

function isCommentLikedByCurrentUser(comment) {
    const user = auth.currentUser;
    if (!user || !comment.likedBy) return false;
    return comment.likedBy.includes(user.uid);
}

function formatTime(timestamp) {
    if (!timestamp) return 'Just now';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
}

function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
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

// Helper Functions
function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
}

function formatTime(timestamp) {
    if (!timestamp) return 'Just now';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
}

async function deleteStaffPost(postId, author) {
    const postElement = document.querySelector(`[data-post-id="${postId}"]`);
    
    try {
        // Delete all comments in subcollection first
        const commentsSnapshot = await postsRef.doc(postId).collection('comments').get();
        const deletePromises = commentsSnapshot.docs.map(doc => doc.ref.delete());
        await Promise.all(deletePromises);
        
        // Delete the post
        await postsRef.doc(postId).delete();
        
        if (postElement) {
            postElement.style.opacity = '0';
            postElement.style.transform = 'scale(0.8)';
            
            setTimeout(() => {
                postElement.remove();
                showNotification(`Post by ${author} deleted. User has been notified.`, 'success');
            }, 300);
        }
    } catch (error) {
        console.error("Error deleting post:", error);
        showNotification('Error deleting post', 'error');
    }
}
function initializeAdminNotifications() {
    // Real-time listener for new notifications
    db.collection('adminNotifications')
        .where('unread', '==', true)
        .onSnapshot(snapshot => {
            if (!snapshot.empty) {
                loadAdminNotifications();
            }
        });
}

// Call on page load
document.addEventListener('DOMContentLoaded', function() {
    auth.onAuthStateChanged(user => {
        if (user) {
            initializeAdminNotifications();
        }
    });
});