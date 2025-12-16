// Supervisor Interface - Complete JavaScript

// 🔒 AUTH CHECK - Wait for Firebase to load first
function checkAuth() {
    if (typeof window.auth !== 'undefined') {
        window.auth.onAuthStateChanged((user) => {
            if (!user) {
                window.location.href = 'index.html';
            }
        });
    } else {
        // Firebase not loaded yet, wait a bit
        setTimeout(checkAuth, 100);
    }
}

// Start auth check
checkAuth();

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
        greeting = 'Good morning, Supervisor!';
    } else if (hour < 18) {
        greeting = 'Good afternoon, Supervisor!';
    } else {
        greeting = 'Good evening, Supervisor!';
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
    // Remove active from all
    document.querySelectorAll('.nav-icon').forEach(icon => {
        icon.classList.remove('active');
    });
    
    // Add active to clicked
    element.classList.add('active');
    
    // Execute function if exists
    if (typeof window[functionName] === 'function') {
        window[functionName]();
    }
}

function showDashboard() {
    // Dashboard is always visible, just scroll to top
    window.scrollTo(0, 0);
}







function showProfile() {
    showNotification('Profile coming soon!', 'success');
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
    if (!feedContainer) {
        console.error('Feed container not found');
        return;
    }
    
    // Real-time listener
    db.collection('posts')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .onSnapshot((snapshot) => {
            feedContainer.innerHTML = '';
            
            if (snapshot.empty) {
                feedContainer.innerHTML = '<div style="text-align:center; padding:40px; color:#999;">No staff posts yet</div>';
                return;
            }
            
            const posts = [];
            snapshot.forEach((doc) => {
                const postData = { id: doc.id, ...doc.data() };
                if (postData.createdAt) {
                    postData.time = getTimeAgo(postData.createdAt.toDate());
                    postData.author = postData.userName;
                    postData.initials = postData.userInitials;
                    postData.likes = postData.likes ? postData.likes.length : 0;
                    postData.comments = postData.comments ? postData.comments.length : 0;
                    postData.text = postData.content || '';
                    // Keep original fields for media
                    postData.type = postData.type || 'text';
                }
                posts.push(postData);
            });
            
            renderPostsForSupervisor(posts, feedContainer);
        }, (error) => {
            console.error('Load feed error:', error);
            feedContainer.innerHTML = '<div style="text-align:center; padding:40px; color:#e74c3c;">Failed to load feed. Please refresh.</div>';
        });
}
// Render posts with supervisor delete ability
function renderPostsForSupervisor(posts, container) {
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
            </div>
            
            <div class="post-content">
                ${post.text ? `<div class="post-text">${post.text}</div>` : ''}
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
                ${post.type === 'poll' && post.pollTitle ? `
                    <div class="post-poll-preview" style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 10px;">
                        <div style="font-weight: 600; margin-bottom: 10px; color: #2c3e50;">📊 ${post.pollTitle}</div>
                        <div style="color: #666; font-size: 14px; margin-bottom: 12px;">
                            ${post.nominees ? post.nominees.map(n => `<div style="padding: 4px 0;">• ${n.name}</div>`).join('') : ''}
                        </div>
                        <button onclick="openPollFromFeed('${post.pollId}')" style="background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; width: 100%;">
                            <i class="fas fa-poll"></i> View & Vote
                        </button>
                    </div>
                ` : ''}
            </div>
            
            <div class="post-actions">
                <button class="post-action">
                    <i class="fas fa-heart"></i>
                    <span>${post.likes} Likes</span>
                </button>
                <button class="post-action">
                    <i class="fas fa-comment"></i>
                    <span>${post.comments} Comments</span>
                </button>
            </div>
        `;
        
        // Long press to delete (Supervisor only)
        let pressTimer;
        
        const startPress = (e) => {
            pressTimer = setTimeout(() => {
                showSupervisorPostMenu(post.id, post.author, post.userId);
            }, 800);
        };
        
        const cancelPress = () => {
            clearTimeout(pressTimer);
        };
        
        // Mouse events
        postElement.addEventListener('mousedown', startPress);
        postElement.addEventListener('mouseup', cancelPress);
        postElement.addEventListener('mouseleave', cancelPress);
        
        // Touch events
        postElement.addEventListener('touchstart', startPress);
        postElement.addEventListener('touchend', cancelPress);
        postElement.addEventListener('touchcancel', cancelPress);
        
        container.appendChild(postElement);
    });
}

// Delete staff post (Supervisor only)
async function deleteStaffPost(postId, authorName, authorId) {
    const user = auth.currentUser;
    if (!user) {
        showNotification('Authentication required', 'error');
        return;
    }
    
    // Check if authorId exists
    if (!authorId) {
        console.error('Author ID is missing');
        showNotification('Cannot send notification: Staff ID missing', 'error');
    }
    
    try {
        // Get supervisor info
        const supervisorDoc = await db.collection('users').doc(user.uid).get();
        const supervisorData = supervisorDoc.data();
        
        // Delete the post
        await db.collection('posts').doc(postId).delete();
        
        // Send notification to staff member (only if authorId exists)
        if (authorId && authorId !== 'undefined') {
            await db.collection('notifications').add({
                userId: authorId,
                type: 'post_deleted',
                title: 'Post Removed',
                message: `Your post was removed by supervisor ${supervisorData.fullName}`,
                deletedBy: user.uid,
                deletedByName: supervisorData.fullName,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                read: false
            });
        }
        
        showNotification(`Post by ${authorName} deleted`, 'success');
        
    } catch (error) {
        console.error('Delete post error:', error);
        showNotification('Failed to delete post: ' + error.message, 'error');
    }
}

function confirmDeletePost(postId, author, authorId) {
    closeDeletePostModal();
    deleteStaffPost(postId, author, authorId);
}

// Keep your existing helper functions
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + 'm ago';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + 'h ago';
    return Math.floor(hours / 24) + 'd ago';
}

// Post Menu Functions
function showPostMenu(postId, author) {
    const options = ['Copy Text', 'Report'];
    const action = prompt(`Post by ${author}\nOptions: ${options.join(', ')}\n\nEnter your choice:`);
    
    if (action && action.toLowerCase().includes('copy')) {
        showNotification('Text copied to clipboard', 'success');
    } else if (action && action.toLowerCase().includes('report')) {
        showNotification('Post reported to admin', 'success');
    }
}
function showSupervisorPostMenu(postId, author, authorId) {
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
                This action cannot be undone. The staff member will be notified.
            </p>
            <button class="profile-option-btn remove" data-post-id="${postId}" data-author="${author}" data-author-id="${authorId}">
                <i class="fas fa-trash"></i>
                Delete
            </button>
            <button class="profile-option-btn cancel">
                <i class="fas fa-times"></i>
                Cancel
            </button>
        </div>
    `;
    
    modal.classList.add('show');
    
    // Add event listeners
    modal.querySelector('.remove').addEventListener('click', function() {
        const pid = this.dataset.postId;
        const auth = this.dataset.author;
        const authId = this.dataset.authorId;
        confirmDeletePost(pid, auth, authId);
    });
    
    modal.querySelector('.cancel').addEventListener('click', closeDeletePostModal);
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

function showComments(postId) {
    showNotification('Comments feature coming soon!', 'success');
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

// Logout Function


console.log('Supervisor interface loaded successfully!');
console.log('Features: Dashboard ✓, Feed ✓, Navigation ✓');
console.log('Long press posts to delete as supervisor');
let announcementMediaFile = null;
let previousAnnouncements = [];

// Update showCreateAnnouncement function
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
            authorName: userData.fullName || 'Supervisor',
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
                    title: 'New Announcement from Supervisor',
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
        
        setTimeout(() => {
            closeCreateAnnouncement();
        }, 1500);
        
    } catch (error) {
        console.error('Post announcement error:', error);
        showNotification('Failed to post announcement', 'error');
    }
} 


// Previous Announcements Functions
function showPreviousAnnouncements() {
    document.getElementById('previousAnnouncementsPage').style.display = 'block';
    loadPreviousAnnouncements();
}

function closePreviousAnnouncements() {
    document.getElementById('previousAnnouncementsPage').style.display = 'none';
}
function loadPreviousAnnouncements() {
    const container = document.getElementById('previousAnnouncementsList');
    
    if (!container) return;
    
    container.innerHTML = '<div style="text-align:center; padding:40px; color:#999;">Loading announcements...</div>';
    
    // Load from Firebase in real-time
    db.collection('announcements')
        .orderBy('timestamp', 'desc')
        .limit(50)
        .onSnapshot((snapshot) => {
            container.innerHTML = '';
            
            if (snapshot.empty) {
                container.innerHTML = '<div style="text-align:center; padding:40px; color:#999;">No announcements yet</div>';
                return;
            }
            
            snapshot.forEach((doc) => {
                const announcement = { id: doc.id, ...doc.data() };
                
                const card = document.createElement('div');
                card.className = 'announcement-card';
                card.onclick = () => showAnnouncementDetail(announcement);
                
                const date = announcement.timestamp ?
                    announcement.timestamp.toDate().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    }) : 'Recent';
                
                const preview = announcement.text.length > 100 ?
                    announcement.text.substring(0, 100) + '...' :
                    announcement.text;
                
                card.innerHTML = `
                    <div class="announcement-card-header">
                        <div class="announcement-card-title">${announcement.title}</div>
                        <div class="announcement-card-date">${date}</div>
                    </div>
                    <div class="announcement-card-preview">${preview}</div>
                `;
                
                container.appendChild(card);
            });
        }, (error) => {
            console.error('Load announcements error:', error);
            container.innerHTML = '<div style="text-align:center; padding:40px; color:#e74c3c;">Failed to load announcements</div>';
        });
}

// Announcement Detail Functions
function showAnnouncementDetail(announcement) {
    document.getElementById('announcementDetailPage').style.display = 'block';
    
    const date = announcement.timestamp ? 
        announcement.timestamp.toDate().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }) : 'Recent';
    
    document.getElementById('detailAnnouncementTitle').textContent = announcement.title;
    document.getElementById('detailAnnouncementDate').textContent = date;
    
    const bodyContainer = document.getElementById('detailAnnouncementBody');
    bodyContainer.innerHTML = '';
    
    // Show text
    const textDiv = document.createElement('div');
    textDiv.textContent = announcement.text;
    textDiv.style.cssText = 'margin-bottom: 20px; line-height: 1.6; color: #2c3e50;';
    bodyContainer.appendChild(textDiv);
    
    // Show media if exists
    if (announcement.mediaUrl) {
        const mediaDiv = document.createElement('div');
        mediaDiv.style.cssText = 'margin-top: 20px;';
        
        if (announcement.mediaType && announcement.mediaType.startsWith('image/')) {
            mediaDiv.innerHTML = `<img src="${announcement.mediaUrl}" style="max-width: 100%; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" alt="Announcement media">`;
        } else if (announcement.mediaType && announcement.mediaType.startsWith('video/')) {
            mediaDiv.innerHTML = `<video src="${announcement.mediaUrl}" controls style="max-width: 100%; border-radius: 12px;" preload="metadata"></video>`;
        }
        
        bodyContainer.appendChild(mediaDiv);
    }
    
    // Show author info
    const authorDiv = document.createElement('div');
    authorDiv.style.cssText = 'margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #999; font-size: 14px;';
    authorDiv.innerHTML = `Posted by <strong>${announcement.authorName}</strong> (${announcement.authorRole})`;
    bodyContainer.appendChild(authorDiv);
} 

function closeAnnouncementDetail() {
    document.getElementById('announcementDetailPage').style.display = 'none';
}

console.log('Create Announcement feature loaded successfully!');
// Direct Messages JavaScript
let currentChatUserSv = null;
let chatMessagesSv = {};
let supervisorContacts = [];

// Update showMessages function
function showMessages() {
    document.getElementById('directMessagesPage').style.display = 'block';
    loadSupervisorContacts();
}

function closeDirectMessages() {
    document.getElementById('directMessagesPage').style.display = 'none';
}

function loadSupervisorContacts() {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    db.collection('users')
        .where('role', '==', 'staff')
        .onSnapshot((snapshot) => {
            supervisorContacts = [];
            
            snapshot.forEach((doc) => {
                const userData = doc.data();
                supervisorContacts.push({
                    uid: doc.id,
                    name: userData.fullName,
                    department: userData.department || 'Staff',
                    initials: getInitials(userData.fullName),
                    online: userData.online || false,
                    profilePicture: userData.profilePicture || null
                });
            });
            
            renderSupervisorContacts();
        }, (error) => {
            console.error('Load contacts error:', error);
            showNotification('Failed to load contacts', 'error');
        });
}

function renderSupervisorContacts() {
    const container = document.getElementById('supervisorContactsList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (supervisorContacts.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:40px; color:#999;">No staff members found</div>';
        return;
    }
    
    supervisorContacts.forEach(contact => {
        const contactEl = document.createElement('div');
        contactEl.className = 'contact-item-sv';
        contactEl.onclick = () => openChatSv(contact);
        
        contactEl.innerHTML = `
            <div class="contact-avatar-sv">${contact.initials}</div>
            <div class="contact-info-sv">
                <div class="contact-name-sv">${contact.name}</div>
                <div class="contact-department-sv">${contact.department}</div>
            </div>
        `;
        
        container.appendChild(contactEl);
    });
} 

function initializeSampleMessagesSv() {
    chatMessagesSv = {
        1: [
            { id: 1, text: 'Hi! How are the new protocols working?', sender: 'me', time: '9:15 AM' },
            { id: 2, text: 'Working great, Supervisor!', sender: 'them', time: '9:20 AM' }
        ],
        2: [
            { id: 1, text: 'Great work on the display!', sender: 'me', time: '10:30 AM' }
        ]
    };
}
function openChatSv(contact) {
    currentChatUserSv = contact;
    
    document.getElementById('directMessagesPage').style.display = 'none';
    document.getElementById('supervisorChatPage').style.display = 'block';
    
    document.getElementById('chatAvatarSv').textContent = contact.initials;
    document.getElementById('chatUserNameSv').textContent = contact.name;
    document.getElementById('chatUserStatusSv').textContent = contact.online ? 'Online' : 'Last seen recently';
    
    loadChatMessagesSv(contact.uid);
    updateSendButtonSv();
}

function backToMessagesList() {
    document.getElementById('supervisorChatPage').style.display = 'none';
    document.getElementById('directMessagesPage').style.display = 'block';
    currentChatUserSv = null;
}

function loadChatMessagesSv(contactUid) {
    const container = document.getElementById('chatMessagesSv');
    if (!container) return;
    
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    const conversationId = getConversationId(currentUser.uid, contactUid);
    
    // Real-time listener
    db.collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot((snapshot) => {
            container.innerHTML = '';
            
            snapshot.forEach((doc) => {
                const msg = doc.data();
                const isSent = msg.senderId === currentUser.uid;
                
                const msgEl = document.createElement('div');
                msgEl.className = `message-sv ${isSent ? 'sent' : 'received'}`;
                
                // Handle different message types
                let messageContent = '';
                if (msg.type === 'text') {
                    messageContent = msg.text;
                } else if (msg.type === 'photo') {
                    messageContent = `<img src="${msg.photoURL}" alt="Photo" style="max-width: 200px; border-radius: 8px;">`;
                } else if (msg.type === 'voice') {
                    messageContent = `<audio controls src="${msg.audioURL}" style="max-width: 200px;"></audio>`;
                }
                
                msgEl.innerHTML = `
                    ${messageContent}
                    <div class="message-time-sv">${msg.timestamp ? formatMessageTime(msg.timestamp.toDate()) : 'Sending...'}</div>
                `;
                container.appendChild(msgEl);
            });
            
            container.scrollTop = container.scrollHeight;
            
            // Mark messages as read
            markMessagesAsRead(conversationId, currentUser.uid);
        }, (error) => {
            console.error('Load messages error:', error);
        });
}

// Helper: Format message time
function formatMessageTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Helper: Get conversation ID (same as staff uses)
function getConversationId(uid1, uid2) {
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
}

// Mark messages as read
async function markMessagesAsRead(conversationId, currentUserId) {
    try {
        const unreadMessages = await db.collection('conversations')
            .doc(conversationId)
            .collection('messages')
            .where('receiverId', '==', currentUserId)
            .where('read', '==', false)
            .get();
        
        const batch = db.batch();
        unreadMessages.forEach((doc) => {
            batch.update(doc.ref, { read: true });
        });
        
        await batch.commit();
    } catch (error) {
        console.error('Mark read error:', error);
    }
} 

async function sendMessageSv() {
    const input = document.getElementById('messageInputSv');
    if (!input || !currentChatUserSv) return;
    
    const messageText = input.value.trim();
    if (!messageText) return;
    
    const currentUser = auth.currentUser;
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    try {
        const conversationId = getConversationId(currentUser.uid, currentChatUserSv.uid);
        
        // Get sender name
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        
        // Save message
        await db.collection('conversations').doc(conversationId).collection('messages').add({
            text: messageText,
            senderId: currentUser.uid,
            senderName: userData.fullName || 'Supervisor',
            receiverId: currentChatUserSv.uid,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            read: false,
            type: 'text'
        });
        
        // Update conversation metadata
        await db.collection('conversations').doc(conversationId).set({
            participants: [currentUser.uid, currentChatUserSv.uid],
            lastMessage: messageText,
            lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
            lastMessageSender: currentUser.uid
        }, { merge: true });
        
        // Clear input
        input.value = '';
        updateSendButtonSv();
        
    } catch (error) {
        console.error('Send message error:', error);
        showNotification('Failed to send message', 'error');
    }
}

function handleMessageKeyPressSv(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessageSv();
    }
}

function updateSendButtonSv() {
    const input = document.getElementById('messageInputSv');
    const btn = document.getElementById('sendMessageBtnSv');
    
    if (input && btn) {
        btn.disabled = !input.value.trim();
    }
}

function viewStaffProfile() {
    if (!currentChatUserSv) return;
    
    // Create staff profile modal
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
                    ${currentChatUserSv.initials}
                </div>
                
                <h2 style="font-size: 1.5rem; color: #003049; margin-bottom: 5px;">
                    ${currentChatUserSv.name}
                </h2>
                
                <p style="color: #669bbc; font-size: 1rem; margin-bottom: 20px;">
                    ${currentChatUserSv.department}
                </p>
                
                <div style="background: #f8f9fa; border-radius: 12px; padding: 15px; margin-top: 20px;">
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                        <span style="color: #666;">Status:</span>
                        <span style="color: ${currentChatUserSv.online ? '#2ed573' : '#999'}; font-weight: 600;">
                            ${currentChatUserSv.online ? '● Online' : '○ Offline'}
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

// File upload
document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('chatFileInputSv');
    if (fileInput) {
        fileInput.onchange = function(e) {
            const files = Array.from(e.target.files);
            files.forEach(file => {
                showNotification(`File ${file.name} ready to send`, 'success');
            });
            e.target.value = '';
        };
    }
});

console.log('Supervisor Direct Messages loaded!');
// POLL FEATURE JAVASCRIPT
let activePoll = null;
let nomineeCount = 2;
let maxNominees = 10;

// Update showCreatePoll function
function showCreatePoll() {
    document.getElementById('createPollPage').style.display = 'block';
    resetPollForm();
    updatePublishButton();
}

function closeCreatePoll() {
    document.getElementById('createPollPage').style.display = 'none';
}

function resetPollForm() {
    // Reset nominee inputs
    const inputs = document.querySelectorAll('.nominee-input');
    inputs.forEach(input => input.value = '');
    
    // Reset to 2 nominees
    nomineeCount = 2;
    const container = document.getElementById('nomineeInputs');
    const groups = container.querySelectorAll('.nominee-input-group');
    
    // Keep only first 2
    groups.forEach((group, index) => {
        if (index >= 2) {
            group.remove();
        }
    });
    
    updatePublishButton();
    updateAddNomineeButton();
}

function addNomineeField() {
    if (nomineeCount >= maxNominees) {
        showNotification(`Maximum ${maxNominees} nominees allowed`, 'error');
        return;
    }
    
    nomineeCount++;
    const container = document.getElementById('nomineeInputs');
    
    const inputGroup = document.createElement('div');
    inputGroup.className = 'nominee-input-group';
    inputGroup.innerHTML = `
        <input 
            type="text" 
            class="nominee-input" 
            placeholder="Name of Nominee ${nomineeCount}"
            data-nominee="${nomineeCount}"
            oninput="updatePublishButton()"
        >
        <button class="remove-nominee-btn" onclick="removeNominee(${nomineeCount})">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(inputGroup);
    
    // Show remove buttons for all except first two
    document.querySelectorAll('.remove-nominee-btn').forEach((btn, index) => {
        if (index >= 2) {
            btn.style.display = 'flex';
        }
    });
    
    updateAddNomineeButton();
    updatePublishButton();
}

function removeNominee(nomineeId) {
    const inputGroup = document.querySelector(`[data-nominee="${nomineeId}"]`).parentElement;
    inputGroup.remove();
    nomineeCount--;
    
    // Renumber remaining nominees
    const inputs = document.querySelectorAll('.nominee-input');
    inputs.forEach((input, index) => {
        input.placeholder = `Name of Nominee ${index + 1}`;
        input.dataset.nominee = index + 1;
    });
    
    updateAddNomineeButton();
    updatePublishButton();
}

function updateAddNomineeButton() {
    const btn = document.getElementById('addNomineeBtn');
    btn.disabled = nomineeCount >= maxNominees;
}

function updatePublishButton() {
    const inputs = document.querySelectorAll('.nominee-input');
    let filledCount = 0;
    
    inputs.forEach(input => {
        if (input.value.trim().length > 0) {
            filledCount++;
        }
    });
    
    const publishBtn = document.getElementById('publishPollBtn');
    publishBtn.disabled = filledCount < 2;
}

// Setup input listeners
document.addEventListener('DOMContentLoaded', function() {
    const inputs = document.querySelectorAll('.nominee-input');
    inputs.forEach(input => {
        input.addEventListener('input', updatePublishButton);
    });
});

async function publishPoll() {
    const inputs = document.querySelectorAll('.nominee-input');
    const nominees = [];
    
    inputs.forEach(input => {
        const name = input.value.trim();
        if (name) {
            nominees.push({
                id: `nominee_${Date.now()}_${Math.random()}`,
                name: name,
                votes: 0,
                voters: []
            });
        }
    });
    
    if (nominees.length < 2) {
        showNotification('Please add at least 2 nominees', 'error');
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
        
        const pollTitle = document.getElementById('pollTitle').value || 'Staff of the Week';
        
        // Check if there's already an active poll
        const existingPoll = await db.collection('polls')
            .where('status', '==', 'active')
            .limit(1)
            .get();
        
        if (!existingPoll.empty) {
            showNotification('There is already an active poll. Close it first.', 'error');
            return;
        }
        
        // Create poll in Firebase
        const pollRef = await db.collection('polls').add({
            title: pollTitle,
            nominees: nominees,
            totalVotes: 0,
            createdBy: currentUser.uid,
            createdByName: userData.fullName,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'active'
        });
        
        // Create a post on staff feed about the poll
        await db.collection('posts').add({
            type: 'poll',
            content: `📊 New Poll: ${pollTitle}`,
            pollId: pollRef.id,
            pollTitle: pollTitle,
            nominees: nominees,
            userId: currentUser.uid,
            userName: userData.fullName,
            userInitials: getInitials(userData.fullName),
            likes: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showNotification('Poll created! All staff have been notified.', 'success');
        
        setTimeout(() => {
            closeCreatePoll();
            showActivePoll();
        }, 2000);
        
    } catch (error) {
        console.error('Publish poll error:', error);
        showNotification('Failed to publish poll: ' + error.message, 'error');
    }
}

function showActivePoll() {
    document.getElementById('activePollsPage').style.display = 'block';
    loadActivePoll();
}

function closeActivePoll() {
    document.getElementById('activePollsPage').style.display = 'none';
}

function loadActivePoll() {
    const container = document.getElementById('activePollContainer');
    
    // Real-time listener for active poll
    db.collection('polls')
        .where('status', '==', 'active')
        .limit(1)
        .onSnapshot((snapshot) => {
            if (snapshot.empty) {
                container.innerHTML = `
                    <div class="no-poll-message">
                        <div class="no-poll-icon">
                            <i class="fas fa-poll"></i>
                        </div>
                        <div class="no-poll-text">No Active Poll</div>
                        <p>Create a poll to start voting for Staff of the Week</p>
                    </div>
                `;
                return;
            }
            
            const pollDoc = snapshot.docs[0];
            const poll = { id: pollDoc.id, ...pollDoc.data() };
            
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
            
            renderPollForSupervisor(poll, container);
        }, (error) => {
            console.error('Load poll error:', error);
            container.innerHTML = '<div style="text-align:center; padding:40px; color:#e74c3c;">Failed to load poll</div>';
        });
} 

function renderPollForSupervisor(poll, container) {
    const totalVotes = poll.nominees.reduce((sum, n) => sum + (n.votes || 0), 0);
    const currentUser = auth.currentUser;
    
    container.innerHTML = `
        <div class="poll-header">
            <div class="poll-question">${poll.title}</div>
            <div class="poll-meta">Created on ${poll.createdAtFormatted || 'Recently'}</div>
        </div>
        
        <div class="poll-options">
            ${poll.nominees.map(nominee => {
                const votes = nominee.votes || 0;
                const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                const hasVoted = nominee.voters && currentUser && nominee.voters.includes(currentUser.uid);
                
                return `
                    <div class="poll-option ${hasVoted ? 'voted' : ''}" onclick="voteForNomineeSv('${poll.id}', '${nominee.id}')">
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
        
        <div style="margin-top: 20px; text-align: center;">
            <button onclick="closePollConfirm('${poll.id}')" style="background: linear-gradient(135deg, #e74c3c, #c0392b); color: white; border: none; padding: 12px 24px; border-radius: 25px; cursor: pointer; font-weight: 600; box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3); transition: all 0.3s ease; display: inline-flex; align-items: center; gap: 8px; font-size: 15px;">
                <i class="fas fa-stop-circle"></i> Close Poll
            </button>
        </div>
    `;
    
    container.classList.add('poll-published');
}

async function voteForNomineeSv(pollId, nomineeId) {
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
        showNotification(`Voted for ${votedNominee.name}!`, 'success');
        
    } catch (error) {
        console.error('Vote error:', error);
        showNotification('Failed to vote: ' + error.message, 'error');
    }
} 

// Demo function to simulate staff votes
function simulateStaffVote(nomineeIndex) {
    if (!activePoll || !activePoll.nominees[nomineeIndex]) return;
    
    const nominee = activePoll.nominees[nomineeIndex];
    nominee.votes++;
    
    if (!nominee.voters) nominee.voters = [];
    nominee.voters.push(`staff_${Date.now()}`);
    
    localStorage.setItem('activePoll', JSON.stringify(activePoll));
    loadActivePoll();
}

console.log('Poll feature loaded successfully!');
console.log('Demo function: simulateStaffVote(0) - adds vote to first nominee');
let supervisorNotifications = [];
let unreadCount = 0;

// Update showNotifications function
function showNotifications() {
    document.getElementById('notificationsPage').style.display = 'block';
    loadSupervisorNotifications();
}

function closeNotificationsPage() {
    document.getElementById('notificationsPage').style.display = 'none';
}
function loadSupervisorNotifications() {
    const notificationsContainer = document.getElementById('notifications-container');
    const unreadBadge = document.getElementById('unread-badge');
    
    if (!notificationsContainer) return;
    
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    
    // CHANGED: Remove .orderBy to avoid index requirement
    db.collection('notifications')
        .where('recipientId', '==', userId)
        .onSnapshot(snapshot => {
            const notifications = [];
            snapshot.forEach(doc => {
                notifications.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // ADDED: Sort manually in JavaScript
            notifications.sort((a, b) => {
                const timeA = a.timestamp?.toMillis() || 0;
                const timeB = b.timestamp?.toMillis() || 0;
                return timeB - timeA;
            });
            
            // Rest of your existing code stays the same
            const unreadCount = notifications.filter(n => !n.read).length;
            
            if (unreadBadge) {
                if (unreadCount > 0) {
                    unreadBadge.textContent = unreadCount > 9 ? '9+' : unreadCount;
                    unreadBadge.style.display = 'flex';
                } else {
                    unreadBadge.style.display = 'none';
                }
            }
            
            // Your existing display code here - don't change it
            // Just keep whatever you had before
        });
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
        message: 'fas fa-envelope',
        'post-deleted': 'fas fa-trash',
        poll: 'fas fa-poll',
        system: 'fas fa-cog'
    };
    
    return icons[type] || 'fas fa-bell';
}

async function handleNotificationClick(notification) {
    // Mark as read in Firebase
    try {
        await db.collection('notifications').doc(notification.id).update({
            unread: false
        });
        
        // Navigate to relevant page
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
        
    } catch (error) {
        console.error('Mark notification as read error:', error);
    }
}

function filterNotifications() {
    const selectedDate = document.getElementById('notificationDateFilter').value;
    
    if (!selectedDate) {
        renderNotifications(supervisorNotifications);
        return;
    }
    
    const filterDate = new Date(selectedDate);
    filterDate.setHours(0, 0, 0, 0);
    
    const filtered = supervisorNotifications.filter(notification => {
        const notifDate = new Date(notification.timestamp);
        notifDate.setHours(0, 0, 0, 0);
        return notifDate.getTime() === filterDate.getTime();
    });
    
    // Show "no notifications for selected date" ONLY when filtering
    if (filtered.length === 0) {
        document.getElementById('notificationsList').innerHTML = `
            <div class="no-notifications">
                <i class="fas fa-bell-slash"></i>
                <h3>No notifications found</h3>
                <p>You don't have any notifications for the selected date.</p>
            </div>
        `;
    } else {
        renderNotifications(filtered);
    }
} 
function clearNotificationFilter() {
    document.getElementById('notificationDateFilter').value = '';
    renderNotifications(supervisorNotifications);
}

async function markAllAsRead() {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
        const batch = db.batch();
        
        const unreadNotifs = await db.collection('notifications')
            .where('recipientId', '==', user.uid)
            .where('unread', '==', true)
            .get();
        
        unreadNotifs.forEach(doc => {
            batch.update(doc.ref, { unread: false });
        });
        
        await batch.commit();
        
        showNotification('All notifications marked as read', 'success');
        
    } catch (error) {
        console.error('Mark all as read error:', error);
        showNotification('Failed to mark notifications as read', 'error');
    }
}

function updateUnreadCount() {
    unreadCount = supervisorNotifications.filter(n => n.unread).length;
    
    // Update badge in navigation
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

// Function to add new notification (for future use)
async function addSupervisorNotification(recipientId, type, title, text, action = null) {
    try {
        await db.collection('notifications').add({
            recipientId: recipientId,
            type: type,
            title: title,
            text: text,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            unread: true,
            action: action
        });
        
        console.log('Notification sent successfully');
        
    } catch (error) {
        console.error('Add notification error:', error);
    }
}
// PROFILE FEATURE JAVASCRIPT
let currentProfilePicture = null;

function showProfile() {
    document.getElementById('profilePage').style.display = 'block';
    loadProfileData();
}

function closeProfile() {
    document.getElementById('profilePage').style.display = 'none';
}
function loadProfileData() {
    const user = auth.currentUser;
    
    if (!user) return;
    
    // Load from Firebase
    db.collection('users').doc(user.uid).get()
        .then((doc) => {
            if (doc.exists) {
                const data = doc.data();
                const savedPicture = data.profilePicture;
                
                if (savedPicture) {
                    const profilePic = document.getElementById('profilePicture');
                    profilePic.innerHTML = `<img src="${savedPicture}" alt="Profile Picture">`;
                    currentProfilePicture = savedPicture;
                    
                    // Also save to localStorage for quick access
                    localStorage.setItem('supervisorProfilePicture', savedPicture);
                }
            }
        })
        .catch((error) => {
            console.error('Error loading profile:', error);
        });
} 

function showProfilePictureOptions() {
    let modal = document.getElementById('profileOptionsModal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'profileOptionsModal';
        modal.className = 'profile-options-modal';
        modal.innerHTML = `
            <div class="profile-options-content">
                <h3 class="profile-options-title">Profile Picture</h3>
                <button class="profile-option-btn" onclick="changeProfilePicture()">
                    <i class="fas fa-camera"></i>
                    Change Profile Picture
                </button>
                <button class="profile-option-btn remove" onclick="removeProfilePicture()">
                    <i class="fas fa-trash"></i>
                    Remove Profile Picture
                </button>
                <button class="profile-option-btn cancel" onclick="closeProfileOptions()">
                    <i class="fas fa-times"></i>
                    Cancel
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    modal.classList.add('show');
}

function closeProfileOptions() {
    const modal = document.getElementById('profileOptionsModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

function changeProfilePicture() {
    closeProfileOptions();
    document.getElementById('profilePictureInput').click();
}

document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('profilePictureInput');
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                if (!file.type.startsWith('image/')) {
                    showNotification('Please select an image file', 'error');
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = function(event) {
                    showProfilePicturePreview(event.target.result);
                };
                reader.readAsDataURL(file);
            }
        });
    }
});

function showProfilePicturePreview(imageData) {
    let previewModal = document.getElementById('profilePreviewModal');
    
    if (!previewModal) {
        previewModal = document.createElement('div');
        previewModal.id = 'profilePreviewModal';
        previewModal.className = 'profile-options-modal';
        document.body.appendChild(previewModal);
    }
    
    previewModal.innerHTML = `
        <div class="profile-options-content">
            <h3 class="profile-options-title">Upload Profile Picture</h3>
            <div style="text-align: center; margin: 20px 0;">
                <div style="width: 150px; height: 150px; border-radius: 50%; overflow: hidden; margin: 0 auto; border: 3px solid gold; box-shadow: 0 10px 30px rgba(0,0,0,0.15);">
                    <img src="${imageData}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
            </div>
            <button class="profile-option-btn" onclick="confirmUploadPicture('${imageData}')">
                <i class="fas fa-check"></i>
                Upload Picture
            </button>
            <button class="profile-option-btn cancel" onclick="cancelUploadPicture()">
                <i class="fas fa-times"></i>
                Cancel
            </button>
        </div>
    `;
    
    previewModal.classList.add('show');
}
function confirmUploadPicture(imageData) {
    const user = auth.currentUser;
    
    if (!user) {
        showNotification('Please login first', 'error');
        return;
    }
    
    showNotification('Uploading picture...', 'info');
    
    db.collection('users').doc(user.uid).update({
        profilePicture: imageData
    })
    .then(() => {
        localStorage.setItem('supervisorProfilePicture', imageData);
        currentProfilePicture = imageData;
        
        // Update profile page picture
        const profilePic = document.getElementById('profilePicture');
        profilePic.innerHTML = `<img src="${imageData}" alt="Profile Picture">`;
        
        // Update dashboard/welcome card picture
        const dashboardPic = document.querySelector('.dashboard .profile-pic');
        if (dashboardPic) {
            dashboardPic.innerHTML = `<img src="${imageData}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        }
        
        // Update welcome card picture (ADD THIS)
        const welcomePic = document.querySelector('.welcome-card .profile-pic');
        if (welcomePic) {
            welcomePic.innerHTML = `<img src="${imageData}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        }
        
        cancelUploadPicture();
        showNotification('Profile picture updated successfully', 'success');
    })
    .catch((error) => {
        console.error('Error uploading picture:', error);
        showNotification('Failed to upload picture', 'error');
    });
} 

function removeProfilePicture() {
    closeProfileOptions();
    
    if (!currentProfilePicture) {
        showNotification('No profile picture to remove', 'error');
        return;
    }
    
    if (confirm('Are you sure you want to remove your profile picture?')) {
        const user = auth.currentUser;
        
        if (!user) {
            showNotification('Please login first', 'error');
            return;
        }
        
        // Remove from Firebase
        db.collection('users').doc(user.uid).update({
                profilePicture: ''
            })
            .then(() => {
                // Remove from localStorage
                localStorage.removeItem('supervisorProfilePicture');
                currentProfilePicture = null;
                
                // Update UI
                const profilePic = document.getElementById('profilePicture');
                profilePic.innerHTML = 'SV';
                
                const dashboardPic = document.querySelector('.dashboard .profile-pic');
                if (dashboardPic) {
                    dashboardPic.innerHTML = 'SV';
                }
                
                showNotification('Profile picture removed successfully', 'success');
            })
            .catch((error) => {
                console.error('Error removing picture:', error);
                showNotification('Failed to remove picture', 'error');
            });
    }
}

function cancelUploadPicture() {
    const previewModal = document.getElementById('profilePreviewModal');
    if (previewModal) {
        previewModal.classList.remove('show');
    }
    document.getElementById('profilePictureInput').value = '';
}


let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];

function toggleVoiceNote() {
    if (!isRecording) {
        startRecording();
    } else {
        stopRecording();
    }
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            sendVoiceNote(audioBlob);
            stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        isRecording = true;
        
        const btn = document.getElementById('voiceNoteBtnSv');
        btn.classList.add('recording');
        btn.innerHTML = '<i class="fas fa-stop"></i>';
        
        showNotification('Recording voice note...', 'success');
    } catch (error) {
        showNotification('Microphone access denied', 'error');
    }
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        
        const btn = document.getElementById('voiceNoteBtnSv');
        btn.classList.remove('recording');
        btn.innerHTML = '<i class="fas fa-microphone"></i>';
    }
}

async function sendVoiceNote(audioBlob) {
    if (!audioBlob || !currentChatUserSv) return;
    
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    try {
        showNotification('Uploading voice note...', 'info');
        
        // Convert blob to base64
        const reader = new FileReader();
        reader.onload = async function(e) {
            const audioBase64 = e.target.result;
            
            const conversationId = getConversationId(currentUser.uid, currentChatUserSv.uid);
            const userDoc = await db.collection('users').doc(currentUser.uid).get();
            const userData = userDoc.data();
            
            // Save message with voice note
            await db.collection('conversations').doc(conversationId).collection('messages').add({
                text: '🎤 Voice message',
                audioURL: audioBase64,
                senderId: currentUser.uid,
                senderName: userData.fullName || 'Supervisor',
                receiverId: currentChatUserSv.uid,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                read: false,
                type: 'voice'
            });
            
            // Update conversation metadata
            await db.collection('conversations').doc(conversationId).set({
                participants: [currentUser.uid, currentChatUserSv.uid],
                lastMessage: '🎤 Voice message',
                lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                lastMessageSender: currentUser.uid
            }, { merge: true });
            
            showNotification('Voice note sent!', 'success');
        };
        reader.readAsDataURL(audioBlob);
        
    } catch (error) {
        console.error('Send voice note error:', error);
        showNotification('Failed to send voice note', 'error');
    }
}
async function sendPhotoMessageSv(photoFile) {
    if (!photoFile || !currentChatUserSv) return;
    
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    try {
        showNotification('Uploading photo...', 'info');
        
        // Compress and convert to base64
        const reader = new FileReader();
        reader.onload = async function(e) {
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
                
                const conversationId = getConversationId(currentUser.uid, currentChatUserSv.uid);
                const userDoc = await db.collection('users').doc(currentUser.uid).get();
                const userData = userDoc.data();
                
                // Save message with photo
                await db.collection('conversations').doc(conversationId).collection('messages').add({
                    text: '📷 Photo',
                    photoURL: compressed,
                    senderId: currentUser.uid,
                    senderName: userData.fullName || 'Supervisor',
                    receiverId: currentChatUserSv.uid,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    read: false,
                    type: 'photo'
                });
                
                // Update conversation metadata
                await db.collection('conversations').doc(conversationId).set({
                    participants: [currentUser.uid, currentChatUserSv.uid],
                    lastMessage: '📷 Photo',
                    lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                    lastMessageSender: currentUser.uid
                }, { merge: true });
                
                showNotification('Photo sent!', 'success');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(photoFile);
        
    } catch (error) {
        console.error('Send photo error:', error);
        showNotification('Failed to send photo', 'error');
    }
}
function getInitials(name) {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
function closePollConfirm(pollId) {
    // Create custom modal
    let modal = document.getElementById('closePollModal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'closePollModal';
        modal.className = 'profile-options-modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="profile-options-content">
            <div style="text-align: center; margin-bottom: 20px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #e74c3c;"></i>
            </div>
            <h3 class="profile-options-title">Close this poll?</h3>
            <p style="text-align: center; color: #666; margin-bottom: 20px;">
                Staff will no longer be able to vote. This action cannot be undone.
            </p>
            <button class="profile-option-btn remove" onclick="closePollNow('${pollId}'); closeClosePollModal();">
                <i class="fas fa-check"></i>
                Yes, Close Poll
            </button>
            <button class="profile-option-btn cancel" onclick="closeClosePollModal()">
                <i class="fas fa-times"></i>
                Cancel
            </button>
        </div>
    `;
    
    modal.classList.add('show');
} 
async function closePollNow(pollId) {
    try {
        // Close the poll
        await db.collection('polls').doc(pollId).update({
            status: 'closed',
            closedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Delete the poll post from staff feed
        const pollPosts = await db.collection('posts')
            .where('pollId', '==', pollId)
            .where('type', '==', 'poll')
            .get();
        
        const batch = db.batch();
        pollPosts.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        
        showNotification('Poll closed successfully', 'success');
        
        setTimeout(() => {
            closeActivePoll();
        }, 1500);
        
    } catch (error) {
        console.error('Close poll error:', error);
        showNotification('Failed to close poll: ' + error.message, 'error');
    }
} 
function openPollFromFeed(pollId) {
    // Open poll page and load this specific poll
    showActivePoll();
}
function closeClosePollModal() {
    const modal = document.getElementById('closePollModal');
    if (modal) {
        modal.classList.remove('show');
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
function loadWelcomeCardPicture() {
    const user = auth.currentUser;
    if (!user) return;
    
    db.collection('users').doc(user.uid).get()
        .then((doc) => {
            if (doc.exists) {
                const data = doc.data();
                
                // Update welcome card picture
                const welcomePic = document.querySelector('.welcome-card .profile-pic');
                if (welcomePic && data.profilePicture) {
                    welcomePic.innerHTML = `<img src="${data.profilePicture}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                }
                
                // Update dashboard picture
                const dashboardPic = document.querySelector('.dashboard .profile-pic');
                if (dashboardPic && data.profilePicture) {
                    dashboardPic.innerHTML = `<img src="${data.profilePicture}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                }
            }
        })
        .catch((error) => {
            console.error('Load welcome picture error:', error);
        });
}
// Load profile picture on page load
setTimeout(() => {
    loadWelcomeCardPicture();
}, 1000);
function confirmLogout() {
    closeHamburgerMenu();
    
    // Create custom logout modal
    let logoutModal = document.getElementById('logoutModal');
    
    if (!logoutModal) {
        logoutModal = document.createElement('div');
        logoutModal.id = 'logoutModal';
        logoutModal.className = 'logout-modal';
        logoutModal.innerHTML = `
            <div class="logout-modal-content">
                <div class="logout-icon">
                    <i class="fas fa-sign-out-alt"></i>
                </div>
                <h3 class="logout-title">Log Out</h3>
                <p class="logout-message">Are you sure you want to log out?</p>
                <div class="logout-buttons">
                    <button class="logout-btn cancel" onclick="closeLogoutModal()">
                        Cancel
                    </button>
                    <button class="logout-btn confirm" onclick="performLogout()">
                        Log Out
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(logoutModal);
    }
    
    logoutModal.style.display = 'flex';
}

function closeLogoutModal() {
    const logoutModal = document.getElementById('logoutModal');
    if (logoutModal) {
        logoutModal.style.display = 'none';
    }
}

function performLogout() {
    closeLogoutModal();
    showNotification('Logging out...', 'success');
    
    setTimeout(() => {
        // Clear any stored data
        sessionStorage.clear();
        localStorage.clear();
        
        // Redirect to login page or reload
        window.location.href = 'login.html'; // Change to your login page
        // OR use: location.reload();
    }, 1500);
}