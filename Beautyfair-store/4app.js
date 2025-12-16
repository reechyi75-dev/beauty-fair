// ============================================
// AUTH STATE MANAGEMENT
// ============================================
const loginScreen = document.getElementById('loginScreen');
const dashboardScreen = document.getElementById('dashboardScreen');

// Check authentication state and show appropriate screen
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        console.log('✅ Logged in as:', user.email);
        // Show dashboard, hide login
        loginScreen.style.display = 'none';
        dashboardScreen.style.display = 'flex';
        // Update user info in sidebar
        document.querySelector('.user-email').textContent = user.email;
        document.querySelector('.user-name').textContent = user.email.split('@')[0];
        document.querySelector('.user-avatar').textContent = user.email[0].toUpperCase();
            // Load all dashboard data immediately
        updateProductCount();
        checkLowStock();
        updateOrderCount();
        updateRevenue();
        updateCharts();
        updateCustomerCount();
    } else {
        console.log('❌ Not logged in - showing login screen');
        // Show login, hide dashboard
        loginScreen.style.display = 'flex';
        dashboardScreen.style.display = 'none';
    }
});

// ============================================
// LOGIN FUNCTIONALITY
// ============================================
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const btnText = document.getElementById('btnText');
const btnLoader = document.getElementById('btnLoader');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const successMessage = document.getElementById('successMessage');
const togglePassword = document.getElementById('togglePassword');
const eyeOpen = document.getElementById('eyeOpen');
const eyeClosed = document.getElementById('eyeClosed');

// Toggle Password Visibility
togglePassword.addEventListener('click', function() {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    
    if (type === 'text') {
        eyeOpen.style.display = 'none';
        eyeClosed.style.display = 'block';
    } else {
        eyeOpen.style.display = 'block';
        eyeClosed.style.display = 'none';
    }
});

// Hide messages on input
emailInput.addEventListener('input', hideMessages);
passwordInput.addEventListener('input', hideMessages);

function hideMessages() {
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
}

function showError(message) {
    errorText.textContent = message;
    errorMessage.style.display = 'flex';
    successMessage.style.display = 'none';
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}

function showSuccess() {
    successMessage.style.display = 'flex';
    errorMessage.style.display = 'none';
}

function setLoading(loading) {
    if (loading) {
        loginBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'block';
    } else {
        loginBtn.disabled = false;
        btnText.style.display = 'block';
        btnLoader.style.display = 'none';
    }
}

// Create admin account on first run
async function createAdminIfNotExists() {
    const adminEmail = 'reechyi75@gmail.com';
    const adminPassword = 'Israel2022';
    
    console.log('🔍 Checking if admin account exists...');
    
    try {
        await firebase.auth().signInWithEmailAndPassword(adminEmail, adminPassword);
        console.log('✅ Admin account already exists');
        await firebase.auth().signOut();
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            console.log('📝 Creating admin account...');
            try {
                const userCredential = await firebase.auth().createUserWithEmailAndPassword(adminEmail, adminPassword);
                console.log('✅ Admin account created successfully:', userCredential.user.email);
                
                await firebase.firestore().collection('admins').doc(userCredential.user.uid).set({
                    email: adminEmail,
                    role: 'admin',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                await firebase.auth().signOut();
                console.log('✅ Admin account setup complete');
                alert('✅ Admin account created! You can now login.');
            } catch (createError) {
                console.error('❌ Error creating admin account:', createError.message);
            }
        } else {
            console.error('❌ Error checking admin:', error.message);
        }
    }
}

window.addEventListener('load', createAdminIfNotExists);

// Handle login form submission
loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    console.log('🔐 Attempting login...');
    
    if (!email || !password) {
        showError('Please fill in all fields');
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showError('Please enter a valid email address');
        return;
    }
    
    setLoading(true);
    
    try {
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        console.log('✅ Login successful:', userCredential.user.email);
        showSuccess();
        // Auth state listener will handle showing dashboard
        
    } catch (error) {
        console.error('❌ Login error:', error.code, error.message);
        
        switch (error.code) {
            case 'auth/invalid-email':
                showError('Invalid email address format');
                break;
            case 'auth/user-not-found':
                showError('No account found with this email');
                break;
            case 'auth/wrong-password':
                showError('Incorrect password');
                break;
            case 'auth/too-many-requests':
                showError('Too many failed attempts. Please try again later');
                break;
            case 'auth/network-request-failed':
                showError('Network error. Please check your internet connection');
                break;
            case 'auth/invalid-credential':
                showError('Invalid email or password');
                break;
            case 'auth/internal-error':
                showError('Authentication not properly set up. Please enable Email/Password in Firebase Console.');
                break;
            default:
                showError('Login failed: ' + error.message);
        }
        
        setLoading(false);
    }
});

// Keyboard shortcuts
emailInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        passwordInput.focus();
    }
});

passwordInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        loginForm.dispatchEvent(new Event('submit'));
    }
});

// ============================================
// LOGOUT FUNCTIONALITY
// ============================================

// Create logout modal
function createLogoutModal() {
    const modalHTML = `
        <div id="logoutModal" class="logout-modal">
            <div class="logout-overlay"></div>
            <div class="logout-content">
                <div class="logout-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                </div>
                <h3>Sign Out?</h3>
                <p>Are you sure you want to logout from your account? You'll need to sign in again to access the dashboard.</p>
                <div class="logout-actions">
                    <button class="logout-cancel" onclick="closeLogoutModal()">Cancel</button>
                    <button class="logout-confirm" onclick="confirmLogout()">Sign Out</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Open logout modal
function openLogoutModal() {
    let modal = document.getElementById('logoutModal');
    if (!modal) {
        createLogoutModal();
        modal = document.getElementById('logoutModal');
    }
    modal.style.display = 'flex';
}

// Close logout modal
function closeLogoutModal() {
    document.getElementById('logoutModal').style.display = 'none';
}

// Confirm logout
async function confirmLogout() {
    try {
        await firebase.auth().signOut();
        console.log('✅ Logged out successfully');
        closeLogoutModal();
    } catch (error) {
        console.error('❌ Logout error:', error);
        alert('Error logging out: ' + error.message);
    }
}

// Make functions global
window.openLogoutModal = openLogoutModal;
window.closeLogoutModal = closeLogoutModal;
window.confirmLogout = confirmLogout;

// Attach logout button
document.querySelector('.logout-btn').addEventListener('click', openLogoutModal);

// Close modal when clicking overlay
document.addEventListener('click', function(e) {
    const modal = document.getElementById('logoutModal');
    if (modal && e.target.classList.contains('logout-overlay')) {
        closeLogoutModal();
    }
});

// ============================================
// TAB NAVIGATION
// ============================================
const navButtons = document.querySelectorAll('.nav-btn');
const tabContents = document.querySelectorAll('.tab-content');

navButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tabName = button.getAttribute('data-tab');
        
        // Remove active class from all buttons and tabs
        navButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(tab => tab.classList.remove('active'));
        
        // Add active class to clicked button and corresponding tab
        button.classList.add('active');
        document.getElementById(tabName).classList.add('active');
        
        console.log('📍 Navigated to:', tabName);
    });
});

// ============================================
// ADD PRODUCT FUNCTIONALITY
// ============================================
const addProductBtn = document.querySelector('.primary-btn');
const productsTable = document.querySelector('#products .data-table tbody');

// Add Product Modal HTML (will be inserted dynamically)
function createAddProductModal() {
    const modalHTML = `
        <div id="addProductModal" class="modal" style="display: none;">
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add New Product</h3>
                    <button class="modal-close" onclick="closeAddProductModal()">×</button>
                </div>
                <form id="addProductForm" class="modal-form">
                    <div class="form-group">
                        <label for="productName">Product Name *</label>
                        <input type="text" id="productName" required placeholder="e.g., Lavender Dream Perfume">
                    </div>
                    
                    <div class="form-group">
                        <label for="productCategory">Category *</label>
                        <select id="productCategory" required>
                            <option value="">Select Category</option>
                            <option value="Perfume">Perfume</option>
                            <option value="Cream">Cream</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="productPrice">Price (₦) *</label>
                        <input type="number" id="productPrice" required placeholder="e.g., 44995" min="0" step="1">
                    </div>
                    
                    <div class="form-group">
                        <label for="productStock">Stock Quantity *</label>
                        <input type="number" id="productStock" required placeholder="e.g., 45" min="0">
                    </div>
                    
                    <div class="form-group">
                        <label for="productImage">Product Image</label>
                        <input type="file" id="productImage" accept="image/*">
                        <small style="color: #94a3b8; font-size: 13px;">Upload product image (optional)</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="productDescription">Description</label>
                        <textarea id="productDescription" rows="3" placeholder="Brief product description..."></textarea>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="button" class="btn-secondary" onclick="closeAddProductModal()">Cancel</button>
                        <button type="submit" class="btn-primary">
                            <span id="addProductBtnText">Add Product</span>
                            <span id="addProductLoader" style="display: none;">Adding...</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    const modalStyles = `
        <style>
            .modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 1000;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(4px);
            }
            
            .modal-content {
                position: relative;
                background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                border: 1px solid #334155;
                border-radius: 16px;
                max-width: 500px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            }
            
            .modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 24px;
                border-bottom: 1px solid #334155;
            }
            
            .modal-header h3 {
                font-size: 24px;
                font-weight: bold;
                color: white;
                margin: 0;
            }
            
            .modal-close {
                background: none;
                border: none;
                font-size: 32px;
                color: #94a3b8;
                cursor: pointer;
                line-height: 1;
                padding: 0;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 8px;
                transition: all 0.3s ease;
            }
            
            .modal-close:hover {
                background: rgba(71, 85, 105, 0.5);
                color: white;
            }
            
            .modal-form {
                padding: 24px;
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            
            .modal-form .form-group {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .modal-form label {
                font-size: 14px;
                font-weight: 600;
                color: #cbd5e1;
            }
            
            .modal-form input,
            .modal-form select,
            .modal-form textarea {
                width: 100%;
                padding: 12px 16px;
                background: rgba(15, 23, 42, 0.5);
                border: 1px solid #475569;
                border-radius: 8px;
                font-size: 15px;
                color: white;
                outline: none;
                transition: all 0.3s ease;
                font-family: inherit;
            }
            
            .modal-form input::placeholder,
            .modal-form textarea::placeholder {
                color: #64748b;
            }
            
            .modal-form input:focus,
            .modal-form select:focus,
            .modal-form textarea:focus {
                border-color: #a855f7;
                background: rgba(15, 23, 42, 0.7);
            }
            
            .modal-form select {
                cursor: pointer;
            }
            
            .modal-form textarea {
                resize: vertical;
                min-height: 80px;
            }
            
            .modal-actions {
                display: flex;
                gap: 12px;
                margin-top: 8px;
            }
            
            .btn-secondary,
            .btn-primary {
                flex: 1;
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                font-size: 15px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .btn-secondary {
                background: rgba(71, 85, 105, 0.5);
                color: white;
            }
            
            .btn-secondary:hover {
                background: rgba(71, 85, 105, 0.7);
            }
            
            .btn-primary {
                background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
                color: white;
            }
            
            .btn-primary:hover {
                box-shadow: 0 8px 16px rgba(147, 51, 234, 0.4);
                transform: translateY(-2px);
            }
            
            .btn-primary:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
            }
        </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', modalStyles);
}

// Open Add Product Modal
function openAddProductModal() {
    const modal = document.getElementById('addProductModal');
    if (!modal) {
        createAddProductModal();
        setupAddProductForm();
    }
    document.getElementById('addProductModal').style.display = 'flex';
    document.getElementById('productName').focus();
}

// Close Add Product Modal
function closeAddProductModal() {
    document.getElementById('addProductModal').style.display = 'none';
    document.getElementById('addProductForm').reset();
}

// Make functions global
window.openAddProductModal = openAddProductModal;
window.closeAddProductModal = closeAddProductModal;

// Setup Add Product Form Handler
function setupAddProductForm() {
    const form = document.getElementById('addProductForm');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btnText = document.getElementById('addProductBtnText');
        const btnLoader = document.getElementById('addProductLoader');
        const submitBtn = form.querySelector('.btn-primary');
        
        // Get image file and convert to Base64
        const imageFile = document.getElementById('productImage').files[0];
        let imageBase64 = null;
        
        if (imageFile) {
            imageBase64 = await convertToBase64(imageFile);
        }
        
        // Get form values
        const productData = {
            name: document.getElementById('productName').value.trim(),
            category: document.getElementById('productCategory').value,
            price: parseFloat(document.getElementById('productPrice').value),
            stock: parseInt(document.getElementById('productStock').value),
            description: document.getElementById('productDescription').value.trim() || '',
            imageUrl: imageBase64,
            sales: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: firebase.auth().currentUser.email
        };
        
        // Show loading state
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline';
        
        try {
            const docRef = await firebase.firestore().collection('products').add(productData);
            console.log('✅ Product added with ID:', docRef.id);
            
            addProductToTable({
                id: docRef.id,
                ...productData,
                createdAt: new Date()
            });
            
            alert('✅ Product added successfully!');
            closeAddProductModal();
            updateProductCount();
            checkLowStock();
            
        } catch (error) {
            console.error('❌ Error adding product:', error);
            alert('Error adding product: ' + error.message);
            
            submitBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
        }
    });
} 
// Add product to table dynamically
function addProductToTable(product) {
    const row = document.createElement('tr');
    const stockClass = product.stock < 15 ? 'low-stock' : '';
    
    row.innerHTML = `
        <td class="product-name">${product.name}</td>
        <td>${product.category}</td>
        <td class="price">₦${product.price.toLocaleString()}</td>
        <td class="${stockClass}">${product.stock}</td>
        <td>${product.sales}</td>
        <td class="actions">
            <button class="action-btn edit-btn" onclick="editProduct('${product.id}')">Edit</button>
            <button class="action-btn delete-btn" onclick="deleteProduct('${product.id}')">Delete</button>
        </td>
    `;
    
    productsTable.insertBefore(row, productsTable.firstChild);
}

// Delete product function
window.deleteProduct = async function(productId) {
    // Create delete modal if doesn't exist
    if (!document.getElementById('deleteProductModal')) {
        createDeleteProductModal();
    }
    
    // Store product ID for deletion
    window.productToDelete = productId;
    
    // Show modal
    document.getElementById('deleteProductModal').style.display = 'flex';
};

// Create delete confirmation modal
function createDeleteProductModal() {
    const modalHTML = `
        <div id="deleteProductModal" class="logout-modal">
            <div class="logout-overlay"></div>
            <div class="logout-content">
                <div class="logout-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </div>
                <h3>Delete Product?</h3>
                <p>Are you sure you want to delete this product? This action cannot be undone.</p>
                <div class="logout-actions">
                    <button class="logout-cancel" onclick="closeDeleteProductModal()">Cancel</button>
                    <button class="logout-confirm" onclick="confirmDeleteProduct()">Delete</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Close delete modal
function closeDeleteProductModal() {
    document.getElementById('deleteProductModal').style.display = 'none';
    window.productToDelete = null;
}

// Confirm delete
async function confirmDeleteProduct() {
    const productId = window.productToDelete;
    
    try {
        await firebase.firestore().collection('products').doc(productId).delete();
        console.log('✅ Product deleted:', productId);
        alert('✅ Product deleted successfully!');
        closeDeleteProductModal();
        loadProductsWithData(); 
        updateProductCount();
    } catch (error) {
        console.error('❌ Error deleting product:', error);
        alert('Error deleting product: ' + error.message);
    }
}

// Make functions global
window.closeDeleteProductModal = closeDeleteProductModal;
window.confirmDeleteProduct = confirmDeleteProduct;

// Edit product function
window.editProduct = async function(productId) {
    try {
        // Fetch product data
        const doc = await firebase.firestore().collection('products').doc(productId).get();
        
        if (!doc.exists) {
            alert('Product not found!');
            return;
        }
        
        const product = doc.data();
        
        // Create edit modal if it doesn't exist
        if (!document.getElementById('editProductModal')) {
            createEditProductModal();
        }
        
        // Fill form with current data
        document.getElementById('editProductId').value = productId;
        document.getElementById('editProductName').value = product.name;
        document.getElementById('editProductCategory').value = product.category;
        document.getElementById('editProductPrice').value = product.price;
        document.getElementById('editProductStock').value = product.stock;
        document.getElementById('editProductDescription').value = product.description || '';
        
        // Show modal
        document.getElementById('editProductModal').style.display = 'flex';
        document.getElementById('editProductName').focus();
        
    } catch (error) {
        console.error('❌ Error fetching product:', error);
        alert('Error loading product: ' + error.message);
    }
};

// Create edit product modal
function createEditProductModal() {
    const modalHTML = `
        <div id="editProductModal" class="modal" style="display: none;">
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit Product</h3>
                    <button class="modal-close" onclick="closeEditProductModal()">×</button>
                </div>
                <form id="editProductForm" class="modal-form">
                    <input type="hidden" id="editProductId">
                    
                    <div class="form-group">
                        <label for="editProductName">Product Name *</label>
                        <input type="text" id="editProductName" required placeholder="e.g., Lavender Dream Perfume">
                    </div>
                    
                    <div class="form-group">
                        <label for="editProductCategory">Category *</label>
                        <select id="editProductCategory" required>
                            <option value="">Select Category</option>
                            <option value="Perfume">Perfume</option>
                            <option value="Cream">Cream</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="editProductPrice">Price (₦) *</label>
                        <input type="number" id="editProductPrice" required placeholder="e.g., 44995" min="0" step="1">
                    </div>
                    
                    <div class="form-group">
                        <label for="editProductStock">Stock Quantity *</label>
                        <input type="number" id="editProductStock" required placeholder="e.g., 45" min="0">
                    </div>
                    
                    <div class="form-group">
                        <label for="editProductDescription">Description</label>
                        <textarea id="editProductDescription" rows="3" placeholder="Brief product description..."></textarea>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="button" class="btn-secondary" onclick="closeEditProductModal()">Cancel</button>
                        <button type="submit" class="btn-primary">
                            <span id="editProductBtnText">Update Product</span>
                            <span id="editProductLoader" style="display: none;">Updating...</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    setupEditProductForm();
}

// Close edit product modal
function closeEditProductModal() {
    document.getElementById('editProductModal').style.display = 'none';
    document.getElementById('editProductForm').reset();
}

// Make functions global
window.closeEditProductModal = closeEditProductModal;

// Setup edit product form handler
function setupEditProductForm() {
    const form = document.getElementById('editProductForm');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btnText = document.getElementById('editProductBtnText');
        const btnLoader = document.getElementById('editProductLoader');
        const submitBtn = form.querySelector('.btn-primary');
        
        const productId = document.getElementById('editProductId').value;
        
        // Get form values
        const productData = {
            name: document.getElementById('editProductName').value.trim(),
            category: document.getElementById('editProductCategory').value,
            price: parseFloat(document.getElementById('editProductPrice').value),
            stock: parseInt(document.getElementById('editProductStock').value),
            description: document.getElementById('editProductDescription').value.trim() || '',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: firebase.auth().currentUser.email
        };
        
        // Show loading state
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline';
        
        try {
            // Update in Firestore
            await firebase.firestore().collection('products').doc(productId).update(productData);
            console.log('✅ Product updated:', productId);
            
            // Show success message
            alert('✅ Product updated successfully!');
            
            // Close modal and reload products
            closeEditProductModal();
            loadProductsWithData();
            updateProductCount();
            checkLowStock();
        } catch (error) {
            console.error('❌ Error updating product:', error);
            alert('Error updating product: ' + error.message);
            
            // Reset button state
            submitBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
        }
    });
}


// Load products from Firestore
async function loadProducts() {
    try {
        const snapshot = await firebase.firestore().collection('products').orderBy('createdAt', 'desc').get();
        
        productsTable.innerHTML = '';
        
        snapshot.forEach(doc => {
            const product = { id: doc.id, ...doc.data() };
            addProductToTable(product);
        });
        
        console.log(`✅ Loaded ${snapshot.size} products`);
    } catch (error) {
        console.error('❌ Error loading products:', error);
    }
}

// Attach event to Add Product button
addProductBtn.addEventListener('click', openAddProductModal);

// Load products when products tab is active
document.querySelector('[data-tab="products"]').addEventListener('click', () => {
    loadProducts();
    updateProductCount();
});

// Update count when Dashboard tab is clicked
document.querySelector('[data-tab="dashboard"]').addEventListener('click', () => {
    updateProductCount();
    checkLowStock();
    updateOrderCount();
    updateRevenue();
    updateCharts();
    updateCustomerCount();
});

// ============================================
// CHARTS WITH REAL FIREBASE DATA
// ============================================
let lineChart = null;
let barChart = null;

async function updateCharts() {
    try {
        // Get all delivered orders
        const snapshot = await firebase.firestore().collection('orders')
            .where('status', '==', 'Delivered')
            .orderBy('createdAt', 'asc')
            .get();
        
        // Group orders by month
        const monthlyData = {};
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        snapshot.forEach(doc => {
            const order = doc.data();
            if (order.createdAt && order.amount) {
                const date = order.createdAt.toDate();
                const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
                
                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = 0;
                }
                monthlyData[monthKey] += order.amount;
            }
        });
        
        // Get last 6 months of data
        const labels = [];
        const data = [];
        const now = new Date();
        
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
            labels.push(monthNames[date.getMonth()]);
            data.push(monthlyData[monthKey] || 0);
        }
        
        const chartData = {
            labels: labels,
            datasets: [{
                label: 'Sales (₦)',
                data: data,
                borderColor: '#a855f7',
                backgroundColor: 'rgba(168, 85, 247, 0.1)',
                tension: 0.4,
                borderWidth: 3,
                fill: true
            }]
        };
        
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return '₦' + context.parsed.y.toLocaleString();
                        }
                    }
                }
            },
            scales: {
                x: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
                y: { 
                    grid: { color: '#334155' }, 
                    ticks: { 
                        color: '#94a3b8',
                        callback: function(value) {
                            return '₦' + value.toLocaleString();
                        }
                    }
                }
            }
        };
        
        // Destroy old charts if they exist
        if (lineChart) lineChart.destroy();
        if (barChart) barChart.destroy();
        
        // Create new charts
        const lineChartCtx = document.getElementById('lineChart');
        if (lineChartCtx) {
            lineChart = new Chart(lineChartCtx, {
                type: 'line',
                data: chartData,
                options: chartOptions
            });
        }
        
        const barChartCtx = document.getElementById('barChart');
        if (barChartCtx) {
            barChart = new Chart(barChartCtx, {
                type: 'bar',
                data: chartData,
                options: chartOptions
            });
        }
        
        console.log('✅ Charts updated with real data');
    } catch (error) {
        console.error('❌ Error updating charts:', error);
    }
}


// ============================================
// INITIALIZATION
// ============================================
console.log('✅ BeautyFair Admin Dashboard loaded');
console.log('🔐 Login page integrated');
console.log('📧 Admin Email: reechyi75@gmail.com');
console.log('🔑 Admin Password: Israel2022');
// ============================================
// MOBILE SIDEBAR TOGGLE
// ============================================
const menuToggle = document.getElementById('menuToggle');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const sidebar = document.querySelector('.sidebar');

// Toggle sidebar
menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    sidebarOverlay.classList.toggle('active');
});

// Close sidebar when clicking overlay
sidebarOverlay.addEventListener('click', () => {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
});

// Close sidebar when clicking any nav button
navButtons.forEach(button => {
    button.addEventListener('click', () => {
        if (window.innerWidth <= 968) {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        }
    });
});
// Show/hide hamburger based on screen
firebase.auth().onAuthStateChanged((user) => {
    const menuToggle = document.getElementById('menuToggle');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    if (user) {
        // Logged in - show hamburger
        if (menuToggle) menuToggle.style.display = 'flex';
        if (sidebarOverlay) sidebarOverlay.style.display = 'none';
    } else {
        // Not logged in - hide hamburger
        if (menuToggle) menuToggle.style.display = 'none';
        if (sidebarOverlay) sidebarOverlay.style.display = 'none';
    }
});
// ============================================
// REAL-TIME PRODUCT COUNT
// ============================================
async function updateProductCount() {
    try {
        const snapshot = await firebase.firestore().collection('products').get();
        const count = snapshot.size;
        
        // Find the Total Products card and update the number
        const productCountElement = document.querySelector('.stat-products .stat-value');
        if (productCountElement) {
            productCountElement.textContent = count;
        }
        
        console.log(`✅ Product count updated: ${count}`);
    } catch (error) {
        console.error('❌ Error counting products:', error);
    }
}

// ============================================
// REAL-TIME STOCK ALERTS
// ============================================
async function checkLowStock() {
    try {
        const snapshot = await firebase.firestore().collection('products')
            .where('stock', '<', 15)
            .get();
        
        const alertBox = document.querySelector('.alert-box');
        const alertTitle = document.querySelector('.alert-title');
        const alertText = document.querySelector('.alert-text');
        
        if (snapshot.empty) {
            // No low stock products - hide alert
            alertBox.style.display = 'none';
        } else {
            // Show low stock products
            const lowStockProducts = [];
            snapshot.forEach(doc => {
                const product = doc.data();
                lowStockProducts.push(`${product.name} (${product.stock} units)`);
            });
            
            alertBox.style.display = 'flex';
            alertTitle.textContent = `Low Stock Alert (${snapshot.size} ${snapshot.size === 1 ? 'product' : 'products'})`;
            alertText.textContent = `These products are running low on stock: ${lowStockProducts.join(', ')}. Review inventory to avoid stockouts.`;
        }
        
        console.log(`✅ Stock alert checked: ${snapshot.size} low stock items`);
    } catch (error) {
        console.error('❌ Error checking stock:', error);
    }
}
// ============================================
// SEARCH PRODUCTS (Using existing search bar)
// ============================================
let allProducts = []; // Store all products

// Load products and store them
async function loadProductsWithData() {
    try {
        const snapshot = await firebase.firestore().collection('products').orderBy('createdAt', 'desc').get();
        
        allProducts = [];
        productsTable.innerHTML = '';
        
        snapshot.forEach(doc => {
            const product = { id: doc.id, ...doc.data() };
            allProducts.push(product);
            addProductToTable(product);
        });
        
        console.log(`✅ Loaded ${snapshot.size} products`);
    } catch (error) {
        console.error('❌ Error loading products:', error);
    }
}

// Search function
function searchProducts(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    
    productsTable.innerHTML = '';
    
    if (term === '') {
        allProducts.forEach(product => addProductToTable(product));
    } else {
        const filtered = allProducts.filter(product => 
            product.name.toLowerCase().includes(term)
        );
        
        if (filtered.length === 0) {
            productsTable.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #94a3b8;">No products found</td></tr>';
        } else {
            filtered.forEach(product => addProductToTable(product));
        }
        
        console.log(`🔍 Found ${filtered.length} products`);
    }
}

// Hook into existing search bar
const mainSearchInput = document.querySelector('.search-input');
if (mainSearchInput) {
    mainSearchInput.addEventListener('input', (e) => {
        // Only search if we're on Products tab
        const productsTab = document.getElementById('products');
        if (productsTab && productsTab.classList.contains('active')) {
            searchProducts(e.target.value);
        }
    });
}

// Replace loadProducts with loadProductsWithData
document.querySelector('[data-tab="products"]').addEventListener('click', () => {
    loadProductsWithData();
    updateProductCount();
});

// ============================================
//  LOAD REAL ORDERS FROM FIREBASE
// ============================================
const ordersTable = document.querySelector('#orders .data-table tbody');

async function loadOrders() {
    try {
        const snapshot = await firebase.firestore().collection('orders').orderBy('createdAt', 'desc').get();
        
        ordersTable.innerHTML = '';
        
        if (snapshot.empty) {
            ordersTable.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #94a3b8;">No orders yet</td></tr>';
        } else {
            snapshot.forEach(doc => {
                const order = doc.data();
                addOrderToTable(order);
            });
            
            console.log(`✅ Loaded ${snapshot.size} orders`);
        }
    } catch (error) {
        console.error('❌ Error loading orders:', error);
    }
}

// Add order to table
function addOrderToTable(order) {
    const row = document.createElement('tr');
    
    // Determine status badge class
    let statusClass = 'status-pending';
    if (order.status === 'Shipped') statusClass = 'status-shipped';
    if (order.status === 'Delivered') statusClass = 'status-delivered';
    if (order.status === 'Processing') statusClass = 'status-processing';
    
    row.innerHTML = `
        <td class="order-id">#${order.orderId}</td>
        <td>${order.customer}</td>
        <td>${order.product}</td>
        <td class="amount">₦${order.amount.toLocaleString()}</td>
        <td><span class="status-badge ${statusClass}" onclick="showStatusDropdown(event, '${order.orderId}', '${order.status}')">${order.status}</span></td>
        <td><button class="action-btn view-btn" onclick='viewOrderDetails(${JSON.stringify(order)})'>View Details</button></td>
    `;
    
    ordersTable.appendChild(row);
}

// Load orders when Orders tab is clicked
document.querySelector('[data-tab="orders"]').addEventListener('click', () => {
    loadOrders();
});

// Open order details modal
function viewOrderDetails(order) {
    currentOrder = order;
    
    // Fill modal with order data
    document.getElementById('orderModalTitle').textContent = `Order #${order.orderId}`;
    document.getElementById('orderCustomer').textContent = order.customer;
    document.getElementById('orderIdDisplay').textContent = `#${order.orderId}`;
    document.getElementById('orderProduct').textContent = order.product;
    document.getElementById('orderAmount').textContent = `₦${order.amount.toLocaleString()}`;
    document.getElementById('orderStatus').textContent = order.status;
    
    // Payment status
    const paymentStatus = order.paymentStatus || 'Pending';
    document.getElementById('orderPaymentStatus').textContent = paymentStatus;
    
    // Show approval section if payment is pending
    const approvalSection = document.getElementById('paymentApprovalSection');
    if (paymentStatus === 'Pending' && order.status === 'Pending') {
        approvalSection.style.display = 'block';
    } else {
        approvalSection.style.display = 'none';
    }
    
    // Show modal
    document.getElementById('orderDetailsModal').style.display = 'flex';
    
    console.log('📋 Viewing order:', order.orderId);
}

// Close order details modal
function closeOrderDetails() {
    document.getElementById('orderDetailsModal').style.display = 'none';
    currentOrder = null;
}

// Print order
function printOrder() {
    if (!currentOrder) return;
    
    const printContent = `
        <html>
        <head>
            <title>Order #${currentOrder.orderId}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #a855f7; }
                .section { margin: 20px 0; }
                .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ddd; }
                .label { font-weight: bold; }
            </style>
        </head>
        <body>
            <h1>BeautyFair Store</h1>
            <h2>Order #${currentOrder.orderId}</h2>
            
            <div class="section">
                <h3>Customer Information</h3>
                <div class="row">
                    <span class="label">Customer Name:</span>
                    <span>${currentOrder.customer}</span>
                </div>
                <div class="row">
                    <span class="label">Order ID:</span>
                    <span>#${currentOrder.orderId}</span>
                </div>
            </div>
            
            <div class="section">
                <h3>Product Details</h3>
                <div class="row">
                    <span class="label">Product:</span>
                    <span>${currentOrder.product}</span>
                </div>
            </div>
            
            <div class="section">
                <h3>Payment Information</h3>
                <div class="row">
                    <span class="label">Amount:</span>
                    <span>₦${currentOrder.amount.toLocaleString()}</span>
                </div>
                <div class="row">
                    <span class="label">Status:</span>
                    <span>${currentOrder.status}</span>
                </div>
            </div>
        </body>
        </html>
    `;
    
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
    
    console.log('🖨️ Printing order:', currentOrder.orderId);
}

// Make functions global
window.viewOrderDetails = viewOrderDetails;
window.closeOrderDetails = closeOrderDetails;
window.printOrder = printOrder;

let currentOrderId = null;
let activeDropdown = null;

// Show status dropdown
function showStatusDropdown(event, orderId, currentStatus) {
    event.stopPropagation();
    
    // Close any existing dropdown
    if (activeDropdown) {
        activeDropdown.remove();
    }
    
    currentOrderId = orderId;
    const badge = event.target;
    
    // Create dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'status-dropdown active';
    dropdown.innerHTML = `
        <div class="status-option ${currentStatus === 'Pending' ? 'selected' : ''}" onclick="updateOrderStatus('Pending')">Pending</div>
        <div class="status-option ${currentStatus === 'Processing' ? 'selected' : ''}" onclick="updateOrderStatus('Processing')">Processing</div>
        <div class="status-option ${currentStatus === 'Shipped' ? 'selected' : ''}" onclick="updateOrderStatus('Shipped')">Shipped</div>
        <div class="status-option ${currentStatus === 'Delivered' ? 'selected' : ''}" onclick="updateOrderStatus('Delivered')">Delivered</div>
    `;
    
    // Position dropdown
    badge.style.position = 'relative';
    badge.appendChild(dropdown);
    activeDropdown = dropdown;
    
    console.log('📋 Status dropdown opened for order:', orderId);
}

// Update order status in Firebase
async function updateOrderStatus(newStatus) {
    if (!currentOrderId) return;
    
    try {
        // Find the order document by orderId field
        const snapshot = await firebase.firestore().collection('orders')
            .where('orderId', '==', currentOrderId)
            .get();
        
        if (snapshot.empty) {
            alert('Order not found!');
            return;
        }
        
        // Update the first matching document
        const docId = snapshot.docs[0].id;
        await firebase.firestore().collection('orders').doc(docId).update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ Order ${currentOrderId} status updated to: ${newStatus}`);
        
        // Close dropdown
        if (activeDropdown) {
            activeDropdown.remove();
            activeDropdown = null;
        }
        
        // Reload orders to show updated status
        loadOrders();
        updateOrderCount();
            updateRevenue();
            updateCharts();
    } catch (error) {
        console.error('❌ Error updating order status:', error);
        alert('Error updating status: ' + error.message);
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', () => {
    if (activeDropdown) {
        activeDropdown.remove();
        activeDropdown = null;
    }
});

// Make functions global
window.showStatusDropdown = showStatusDropdown;
window.updateOrderStatus = updateOrderStatus;

async function updateOrderCount() {
    try {
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        
        // Get all orders
        const allOrders = await firebase.firestore().collection('orders').get();
        const totalCount = allOrders.size;
        
        // Get last month's orders
        const lastMonthOrders = await firebase.firestore().collection('orders')
            .where('createdAt', '>=', lastMonth)
            .where('createdAt', '<', new Date(now.getFullYear(), now.getMonth(), 1))
            .get();
        const lastMonthCount = lastMonthOrders.size;
        
        // Calculate percentage change
        let percentageChange = 0;
        if (lastMonthCount > 0) {
            percentageChange = ((totalCount - lastMonthCount) / lastMonthCount * 100).toFixed(1);
        }
        
        // Update count
        const orderCountElement = document.querySelector('.stat-orders .stat-value');
        if (orderCountElement) {
            orderCountElement.textContent = totalCount.toLocaleString();
        }
        
        // Update percentage
        const orderGrowthElement = document.querySelector('.stat-orders .stat-growth');
        if (orderGrowthElement && percentageChange !== 0) {
            const growthText = percentageChange > 0 ? `↑ ${percentageChange}%` : `↓ ${Math.abs(percentageChange)}%`;
            orderGrowthElement.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                    <polyline points="17 6 23 6 23 12"></polyline>
                </svg>
                ${growthText} from last month
            `;
        }
        
        console.log(`✅ Order count updated: ${totalCount} (${percentageChange}% change)`);
    } catch (error) {
        console.error('❌ Error counting orders:', error);
    }
}
// ============================================
// REAL-TIME REVENUE CALCULATION
// ============================================
async function updateRevenue() {
    try {
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // Get all delivered orders
        const allDelivered = await firebase.firestore().collection('orders')
            .where('status', '==', 'Delivered')
            .get();
        
        let totalRevenue = 0;
        allDelivered.forEach(doc => {
            totalRevenue += doc.data().amount || 0;
        });
        
        // Get last month's delivered orders
        let lastMonthRevenue = 0;
        try {
            const lastMonthDelivered = await firebase.firestore().collection('orders')
                .where('status', '==', 'Delivered')
                .where('createdAt', '>=', lastMonth)
                .where('createdAt', '<', thisMonthStart)
                .get();
            
            lastMonthDelivered.forEach(doc => {
                lastMonthRevenue += doc.data().amount || 0;
            });
        } catch (error) {
            console.log('No last month data');
        }
        
        // Calculate percentage change
        let percentageChange = 0;
        if (lastMonthRevenue > 0) {
            percentageChange = ((totalRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1);
        }
        
        // Update revenue
        const revenueElement = document.querySelector('.stat-revenue .stat-value');
        if (revenueElement) {
            revenueElement.textContent = `₦${totalRevenue.toLocaleString()}`;
        }
        
        // Update percentage
        const revenueGrowthElement = document.querySelector('.stat-revenue .stat-growth');
        if (revenueGrowthElement && percentageChange !== 0) {
            const growthText = percentageChange > 0 ? `↑ ${percentageChange}%` : `↓ ${Math.abs(percentageChange)}%`;
            revenueGrowthElement.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                    <polyline points="17 6 23 6 23 12"></polyline>
                </svg>
                ${growthText} from last month
            `;
        }
        
        console.log(`✅ Revenue updated: ₦${totalRevenue.toLocaleString()} (${percentageChange}% change)`);
    } catch (error) {
        console.error('❌ Error calculating revenue:', error);
        // Don't crash - just show ₦0
        const revenueElement = document.querySelector('.stat-revenue .stat-value');
        if (revenueElement) {
            revenueElement.textContent = '₦0';
        }
    }
}
// ============================================
// VIEW ALL CUSTOMERS
// ============================================
const customersTableBody = document.getElementById('customersTableBody');

async function loadCustomers() {
    try {
        const ordersSnapshot = await firebase.firestore().collection('orders').get();
        
        // Group orders by customer
        const customersMap = {};
        
        ordersSnapshot.forEach(doc => {
            const order = doc.data();
            const customerName = order.customer || 'Unknown';
            
            if (!customersMap[customerName]) {
                customersMap[customerName] = {
                    name: customerName,
                    email: order.email || 'N/A',
                    totalOrders: 0,
                    totalSpent: 0
                };
            }
            
            customersMap[customerName].totalOrders += 1;
            if (order.status === 'Delivered') {
                customersMap[customerName].totalSpent += order.amount || 0;
            }
        });
        
        // Convert to array and sort by total spent
        const customers = Object.values(customersMap).sort((a, b) => b.totalSpent - a.totalSpent);
        
        customersTableBody.innerHTML = '';
        
        if (customers.length === 0) {
            customersTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #94a3b8;">No customers yet</td></tr>';
        } else {
            customers.forEach(customer => {
                addCustomerToTable(customer);
            });
            
            console.log(`✅ Loaded ${customers.length} customers`);
        }
    } catch (error) {
        console.error('❌ Error loading customers:', error);
    }
}

// Add customer to table
function addCustomerToTable(customer) {
    const row = document.createElement('tr');
    
    row.innerHTML = `
        <td class="product-name">${customer.name}</td>
        <td>${customer.email}</td>
        <td>${customer.totalOrders}</td>
        <td class="amount">₦${customer.totalSpent.toLocaleString()}</td>
        <td><button class="action-btn view-btn" onclick="viewCustomerDetails('${customer.name}')">View Orders</button></td>
    `;
    
    customersTableBody.appendChild(row);
}

// Load customers when Customers tab is clicked
document.querySelector('[data-tab="customers"]').addEventListener('click', () => {
    loadCustomers();
});

// ============================================
// CUSTOMER ORDER HISTORY
// ============================================
let currentCustomer = null;

// View customer order history
async function viewCustomerDetails(customerName) {
    try {
        currentCustomer = customerName;
        
        // Get all orders for this customer
        const ordersSnapshot = await firebase.firestore().collection('orders')
            .where('customer', '==', customerName)
            .orderBy('createdAt', 'desc')
            .get();
        
        let totalOrders = 0;
        let totalSpent = 0;
        const orders = [];
        
        ordersSnapshot.forEach(doc => {
            const order = doc.data();
            orders.push(order);
            totalOrders++;
            if (order.status === 'Delivered') {
                totalSpent += order.amount || 0;
            }
        });
        
        // Update modal
        document.getElementById('customerModalTitle').textContent = customerName;
        document.getElementById('customerTotalOrders').textContent = totalOrders;
        document.getElementById('customerTotalSpent').textContent = `₦${totalSpent.toLocaleString()}`;
        
        // Display orders
        const ordersList = document.getElementById('customerOrdersList');
        ordersList.innerHTML = '';
        
        if (orders.length === 0) {
            ordersList.innerHTML = '<p style="text-align: center; color: #94a3b8; padding: 20px;">No orders found</p>';
        } else {
            orders.forEach(order => {
                const orderItem = document.createElement('div');
                orderItem.className = 'customer-order-item';
                
                let statusClass = 'status-pending';
                if (order.status === 'Shipped') statusClass = 'status-shipped';
                if (order.status === 'Delivered') statusClass = 'status-delivered';
                if (order.status === 'Processing') statusClass = 'status-processing';
                
                orderItem.innerHTML = `
                    <div class="customer-order-header">
                        <span class="customer-order-id">#${order.orderId}</span>
                        <span class="status-badge ${statusClass}">${order.status}</span>
                    </div>
                    <div class="customer-order-product">${order.product}</div>
                    <div class="customer-order-footer">
                        <span class="customer-order-amount">₦${order.amount.toLocaleString()}</span>
                    </div>
                `;
                
                ordersList.appendChild(orderItem);
            });
        }
        
        // Show modal
        document.getElementById('customerDetailsModal').style.display = 'flex';
        
        console.log(`📋 Viewing customer: ${customerName} (${totalOrders} orders)`);
    } catch (error) {
        console.error('❌ Error loading customer details:', error);
        alert('Error loading customer details: ' + error.message);
    }
}

// Close customer details modal
function closeCustomerDetails() {
    document.getElementById('customerDetailsModal').style.display = 'none';
    currentCustomer = null;
}

// Make functions global
window.viewCustomerDetails = viewCustomerDetails;
window.closeCustomerDetails = closeCustomerDetails;

// Update the existing updateCustomerCount function
async function updateCustomerCount() {
    try {
        const ordersSnapshot = await firebase.firestore().collection('orders').get();
        
        // Get unique customers
        const uniqueCustomers = new Set();
        ordersSnapshot.forEach(doc => {
            const order = doc.data();
            if (order.customer) {
                uniqueCustomers.add(order.customer);
            }
        });
        
        const count = uniqueCustomers.size;
        
        // Update customer count in dashboard
        const customerCountElement = document.querySelector('.stat-customers .stat-value');
        if (customerCountElement) {
            customerCountElement.textContent = count;
        }
        
        // Update growth text
        const customerGrowthElement = document.querySelector('.stat-customers .stat-growth');
        if (customerGrowthElement) {
            customerGrowthElement.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                    <polyline points="17 6 23 6 23 12"></polyline>
                </svg>
                ${count} unique customers
            `;
        }
        
        console.log(`✅ Customer count updated: ${count}`);
    } catch (error) {
        console.error('❌ Error counting customers:', error);
    }
}

// Enhanced loadCustomers function with better data
async function loadCustomersEnhanced() {
    try {
        const ordersSnapshot = await firebase.firestore().collection('orders')
            .orderBy('createdAt', 'desc')
            .get();
        
        // Group orders by customer
        const customersMap = {};
        
        ordersSnapshot.forEach(doc => {
            const order = doc.data();
            const customerName = order.customer || 'Unknown Customer';
            const customerEmail = order.email || `${customerName.toLowerCase().replace(/\s+/g, '')}@email.com`;
            
            if (!customersMap[customerName]) {
                customersMap[customerName] = {
                    name: customerName,
                    email: customerEmail,
                    totalOrders: 0,
                    totalSpent: 0,
                    orders: []
                };
            }
            
            customersMap[customerName].totalOrders += 1;
            customersMap[customerName].orders.push(order);
            
            // Only count delivered orders for total spent
            if (order.status === 'Delivered') {
                customersMap[customerName].totalSpent += order.amount || 0;
            }
        });
        
        // Convert to array and sort by total spent (highest first)
        const customers = Object.values(customersMap).sort((a, b) => b.totalSpent - a.totalSpent);
        
        const customersTableBody = document.getElementById('customersTableBody');
        customersTableBody.innerHTML = '';
        
        if (customers.length === 0) {
            customersTableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: #94a3b8;">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 16px; opacity: 0.5;">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        <p>No customers yet. Orders will appear here once customers make purchases.</p>
                    </td>
                </tr>
            `;
        } else {
            customers.forEach(customer => {
                const row = document.createElement('tr');
                
                row.innerHTML = `
                    <td class="product-name">${customer.name}</td>
                    <td>${customer.email}</td>
                    <td>${customer.totalOrders}</td>
                    <td class="amount">₦${customer.totalSpent.toLocaleString()}</td>
                    <td>
                        <button class="action-btn view-btn" onclick="viewCustomerOrderHistory('${customer.name.replace(/'/g, "\\'")}')">
                            View Orders
                        </button>
                    </td>
                `;
                
                customersTableBody.appendChild(row);
            });
            
            console.log(`✅ Loaded ${customers.length} customers`);
        }
    } catch (error) {
        console.error('❌ Error loading customers:', error);
        const customersTableBody = document.getElementById('customersTableBody');
        customersTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: #f87171;">
                    Error loading customers. Please refresh the page.
                </td>
            </tr>
        `;
    }
}

// View customer order history in modal
async function viewCustomerOrderHistory(customerName) {
    try {
        console.log(`📋 Loading order history for: ${customerName}`);
        
        // Get all orders for this customer
        const ordersSnapshot = await firebase.firestore().collection('orders')
            .where('customer', '==', customerName)
            .orderBy('createdAt', 'desc')
            .get();
        
        let totalOrders = 0;
        let totalSpent = 0;
        const orders = [];
        
        ordersSnapshot.forEach(doc => {
            const order = doc.data();
            orders.push(order);
            totalOrders++;
            
            // Only count delivered orders for total spent
            if (order.status === 'Delivered') {
                totalSpent += order.amount || 0;
            }
        });
        
        // Update modal header
        document.getElementById('customerModalTitle').textContent = customerName;
        document.getElementById('customerTotalOrders').textContent = totalOrders;
        document.getElementById('customerTotalSpent').textContent = `₦${totalSpent.toLocaleString()}`;
        
        // Display orders list
        const ordersList = document.getElementById('customerOrdersList');
        ordersList.innerHTML = '';
        
        if (orders.length === 0) {
            ordersList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #94a3b8;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 16px; opacity: 0.5;">
                        <circle cx="9" cy="21" r="1"></circle>
                        <circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                    <p>No orders found for this customer</p>
                </div>
            `;
        } else {
            orders.forEach(order => {
                const orderItem = document.createElement('div');
                orderItem.className = 'customer-order-item';
                
                // Determine status class
                let statusClass = 'status-pending';
                if (order.status === 'Shipped') statusClass = 'status-shipped';
                if (order.status === 'Delivered') statusClass = 'status-delivered';
                if (order.status === 'Processing') statusClass = 'status-processing';
                
                // Format date if available
                let orderDate = 'Date N/A';
                if (order.createdAt && order.createdAt.toDate) {
                    const date = order.createdAt.toDate();
                    orderDate = date.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                    });
                }
                
                orderItem.innerHTML = `
                    <div class="customer-order-header">
                        <span class="customer-order-id">#${order.orderId}</span>
                        <span class="status-badge ${statusClass}">${order.status}</span>
                    </div>
                    <div class="customer-order-product">${order.product}</div>
                    <div class="customer-order-footer">
                        <span style="font-size: 12px; color: #94a3b8;">${orderDate}</span>
                        <span class="customer-order-amount">₦${order.amount.toLocaleString()}</span>
                    </div>
                `;
                
                ordersList.appendChild(orderItem);
            });
        }
        
        // Show modal
        document.getElementById('customerDetailsModal').style.display = 'flex';
        
        console.log(`✅ Displayed ${orders.length} orders for ${customerName}`);
        console.log(`💰 Total spent: ₦${totalSpent.toLocaleString()}`);
    } catch (error) {
        console.error('❌ Error loading customer order history:', error);
        alert('Error loading customer details: ' + error.message);
    }
}

// Close customer details modal
function closeCustomerDetailsModal() {
    const modal = document.getElementById('customerDetailsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Update the customers tab click handler
document.querySelector('[data-tab="customers"]').addEventListener('click', () => {
    loadCustomersEnhanced();
    updateCustomerCount();
});

// Close modal when clicking overlay
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('customer-modal-overlay')) {
        closeCustomerDetailsModal();
    }
});

// Make functions globally accessible
window.viewCustomerOrderHistory = viewCustomerOrderHistory;
window.closeCustomerDetails = closeCustomerDetailsModal;
window.updateCustomerCount = updateCustomerCount;

// Call updateCustomerCount on dashboard load
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        setTimeout(() => {
            updateCustomerCount();
        }, 1000);
    }
});

console.log('✅ Customer Order History feature loaded');
console.log('📋 Features available:');
console.log('   - View all customers with order counts');
console.log('   - See total spent per customer');
console.log('   - Click customer to view full order history');
console.log('   - See order dates and status');
console.log('   - Real-time customer count on dashboard');

// ============================================
// STORE SETTINGS
// ============================================
const settingsForm = document.getElementById('settingsForm');

// Load settings from Firebase
async function loadSettings() {
    try {
        const doc = await firebase.firestore().collection('settings').doc('store').get();
        
        if (doc.exists) {
            const settings = doc.data();
            
            document.getElementById('storeName').value = settings.storeName || '';
            document.getElementById('storeEmail').value = settings.storeEmail || '';
            document.getElementById('storePhone').value = settings.storePhone || '';
            document.getElementById('storeAddress').value = settings.storeAddress || '';
            document.getElementById('storeDescription').value = settings.storeDescription || '';
            
            console.log('✅ Settings loaded');
        } else {
            console.log('ℹ️ No settings found - using defaults');
        }
    } catch (error) {
        console.error('❌ Error loading settings:', error);
    }
}

// Save settings to Firebase
async function saveSettings(e) {
    e.preventDefault();
    
    const btnText = document.getElementById('saveSettingsBtnText');
    const btnLoader = document.getElementById('saveSettingsLoader');
    const submitBtn = settingsForm.querySelector('.primary-btn');
    
    const settingsData = {
        storeName: document.getElementById('storeName').value.trim(),
        storeEmail: document.getElementById('storeEmail').value.trim(),
        storePhone: document.getElementById('storePhone').value.trim(),
        storeAddress: document.getElementById('storeAddress').value.trim(),
        storeDescription: document.getElementById('storeDescription').value.trim(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: firebase.auth().currentUser.email
    };
    
    // Show loading
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline';
    
    try {
        await firebase.firestore().collection('settings').doc('store').set(settingsData, { merge: true });
        
        console.log('✅ Settings saved');
        alert('✅ Settings saved successfully!');
        
    } catch (error) {
        console.error('❌ Error saving settings:', error);
        alert('Error saving settings: ' + error.message);
    } finally {
        // Reset button
        submitBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
    }
}

// Attach event listeners
if (settingsForm) {
    settingsForm.addEventListener('submit', saveSettings);
}

// Load settings when Settings tab is clicked
document.querySelector('[data-tab="settings"]').addEventListener('click', () => {
    loadSettings();
});

// ============================================
// DELIVERY SETTINGS
// ============================================
const deliverySettingsForm = document.getElementById('deliverySettingsForm');

// Load delivery settings from Firebase
async function loadDeliverySettings() {
    try {
        const doc = await firebase.firestore().collection('settings').doc('delivery').get();
        
        if (doc.exists) {
            const settings = doc.data();
            
            document.getElementById('deliveryLagos').value = settings.lagos || '';
            document.getElementById('deliveryAbuja').value = settings.abuja || '';
            document.getElementById('deliveryPortHarcourt').value = settings.portHarcourt || '';
            document.getElementById('deliveryIbadan').value = settings.ibadan || '';
            document.getElementById('deliveryKano').value = settings.kano || '';
            document.getElementById('deliveryOthers').value = settings.others || '';
            document.getElementById('freeDeliveryThreshold').value = settings.freeDeliveryThreshold || '';
            
            console.log('✅ Delivery settings loaded');
        } else {
            console.log('ℹ️ No delivery settings found - using defaults');
        }
    } catch (error) {
        console.error('❌ Error loading delivery settings:', error);
    }
}

// Save delivery settings to Firebase
async function saveDeliverySettings(e) {
    e.preventDefault();
    
    const btnText = document.getElementById('saveDeliveryBtnText');
    const btnLoader = document.getElementById('saveDeliveryLoader');
    const submitBtn = deliverySettingsForm.querySelector('.primary-btn');
    
    const deliveryData = {
        lagos: parseInt(document.getElementById('deliveryLagos').value),
        abuja: parseInt(document.getElementById('deliveryAbuja').value),
        portHarcourt: parseInt(document.getElementById('deliveryPortHarcourt').value),
        ibadan: parseInt(document.getElementById('deliveryIbadan').value),
        kano: parseInt(document.getElementById('deliveryKano').value),
        others: parseInt(document.getElementById('deliveryOthers').value),
        freeDeliveryThreshold: document.getElementById('freeDeliveryThreshold').value ? 
            parseInt(document.getElementById('freeDeliveryThreshold').value) : 0,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: firebase.auth().currentUser.email
    };
    
    // Show loading
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline';
    
    try {
        await firebase.firestore().collection('settings').doc('delivery').set(deliveryData, { merge: true });
        
        console.log('✅ Delivery settings saved');
        alert('✅ Delivery settings saved successfully!');
        
    } catch (error) {
        console.error('❌ Error saving delivery settings:', error);
        alert('Error saving delivery settings: ' + error.message);
    } finally {
        // Reset button
        submitBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
    }
}

// Attach event listeners
if (deliverySettingsForm) {
    deliverySettingsForm.addEventListener('submit', saveDeliverySettings);
}

// Update loadSettings to also load delivery settings
const originalLoadSettings = loadSettings;
loadSettings = async function() {
    await originalLoadSettings();
    await loadDeliverySettings();
};

// ============================================
// ADMIN PROFILE MANAGEMENT
// ============================================
const adminProfileForm = document.getElementById('adminProfileForm');
const changePasswordForm = document.getElementById('changePasswordForm');

// Load admin profile
async function loadAdminProfile() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) return;
        
        document.getElementById('adminEmail').value = user.email;
        document.getElementById('adminName').value = user.displayName || '';
        
        console.log('✅ Admin profile loaded');
    } catch (error) {
        console.error('❌ Error loading admin profile:', error);
    }
}

// Update admin profile
async function updateAdminProfile(e) {
    e.preventDefault();
    
    const btnText = document.getElementById('saveProfileBtnText');
    const btnLoader = document.getElementById('saveProfileLoader');
    const submitBtn = adminProfileForm.querySelector('.primary-btn');
    
    const newName = document.getElementById('adminName').value.trim();
    
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline';
    
    try {
        const user = firebase.auth().currentUser;
        
        await user.updateProfile({
            displayName: newName
        });
        
        // Update in sidebar
        document.querySelector('.user-name').textContent = newName || user.email.split('@')[0];
        
        console.log('✅ Admin profile updated');
        alert('✅ Profile updated successfully!');
        
    } catch (error) {
        console.error('❌ Error updating profile:', error);
        alert('Error updating profile: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
    }
}

// Change password
async function changePassword(e) {
    e.preventDefault();
    
    const btnText = document.getElementById('changePasswordBtnText');
    const btnLoader = document.getElementById('changePasswordLoader');
    const submitBtn = changePasswordForm.querySelector('.primary-btn');
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validate passwords match
    if (newPassword !== confirmPassword) {
        alert('New passwords do not match!');
        return;
    }
    
    // Validate password length
    if (newPassword.length < 6) {
        alert('Password must be at least 6 characters!');
        return;
    }
    
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline';
    
    try {
        const user = firebase.auth().currentUser;
        const email = user.email;
        
        // Re-authenticate user with current password
        const credential = firebase.auth.EmailAuthProvider.credential(email, currentPassword);
        await user.reauthenticateWithCredential(credential);
        
        // Update password
        await user.updatePassword(newPassword);
        
        console.log('✅ Password changed successfully');
        alert('✅ Password changed successfully!');
        
        // Clear form
        changePasswordForm.reset();
        
    } catch (error) {
        console.error('❌ Error changing password:', error);
        
        if (error.code === 'auth/wrong-password') {
            alert('Current password is incorrect!');
        } else {
            alert('Error changing password: ' + error.message);
        }
    } finally {
        submitBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
    }
}

// Attach event listeners
if (adminProfileForm) {
    adminProfileForm.addEventListener('submit', updateAdminProfile);
}

if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', changePassword);
}

// Update loadSettings to also load admin profile
const originalLoadSettingsFunc = loadSettings;
loadSettings = async function() {
    await originalLoadSettingsFunc();
    await loadAdminProfile();
};


// ============================================
// PAYMENT APPROVAL/REJECTION
// ============================================

// Approve payment
async function approvePayment() {
    if (!currentOrder) return;
    
    if (!confirm('Approve this payment and move order to Processing?')) {
        return;
    }
    
    try {
        // Find order document
        const snapshot = await firebase.firestore().collection('orders')
            .where('orderId', '==', currentOrder.orderId)
            .get();
        
        if (snapshot.empty) {
            alert('Order not found!');
            return;
        }
        
        const docId = snapshot.docs[0].id;
        
        // Update order
        await firebase.firestore().collection('orders').doc(docId).update({
            paymentStatus: 'Approved',
            status: 'Processing',
            approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
            approvedBy: firebase.auth().currentUser.email
        });
        
        console.log(`✅ Payment approved for order ${currentOrder.orderId}`);
        alert('✅ Payment approved! Order moved to Processing.');
        
        // Close modal and reload orders
        closeOrderDetails();
        loadOrders();
        updateOrderCount();
        updateRevenue();
        
    } catch (error) {
        console.error('❌ Error approving payment:', error);
        alert('Error approving payment: ' + error.message);
    }
}

// Reject payment
async function rejectPayment() {
    if (!currentOrder) return;
    
    const reason = prompt('Enter reason for rejection (optional):');
    if (reason === null) return; // User cancelled
    
    if (!confirm('Reject this payment and cancel the order?')) {
        return;
    }
    
    try {
        // Find order document
        const snapshot = await firebase.firestore().collection('orders')
            .where('orderId', '==', currentOrder.orderId)
            .get();
        
        if (snapshot.empty) {
            alert('Order not found!');
            return;
        }
        
        const docId = snapshot.docs[0].id;
        
        // Update order
        await firebase.firestore().collection('orders').doc(docId).update({
            paymentStatus: 'Rejected',
            status: 'Cancelled',
            rejectionReason: reason || 'No reason provided',
            rejectedAt: firebase.firestore.FieldValue.serverTimestamp(),
            rejectedBy: firebase.auth().currentUser.email
        });
        
        console.log(`❌ Payment rejected for order ${currentOrder.orderId}`);
        alert('❌ Payment rejected. Order cancelled.');
        
        // Close modal and reload orders
        closeOrderDetails();
        loadOrders();
        updateOrderCount();
        
    } catch (error) {
        console.error('❌ Error rejecting payment:', error);
        alert('Error rejecting payment: ' + error.message);
    }
}

// Make functions global
window.approvePayment = approvePayment;
window.rejectPayment = rejectPayment;

// Helper function to convert image to Base64
function convertToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// ============================================
// HERO SLIDER IMAGES UPLOAD
// ============================================
const sliderImagesForm = document.getElementById('sliderImagesForm');

async function saveSliderImages(e) {
    e.preventDefault();
    
    const btnText = document.getElementById('saveSliderBtnText');
    const btnLoader = document.getElementById('saveSliderLoader');
    const submitBtn = sliderImagesForm.querySelector('.primary-btn');
    
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline';
    
    try {
        const image1 = await convertToBase64(document.getElementById('sliderImage1').files[0]);
        const image2 = await convertToBase64(document.getElementById('sliderImage2').files[0]);
        const image3 = await convertToBase64(document.getElementById('sliderImage3').files[0]);
        
        const sliderData = {
            slide1: image1,
            slide2: image2,
            slide3: image3,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: firebase.auth().currentUser.email
        };
        
        await firebase.firestore().collection('settings').doc('slider').set(sliderData, { merge: true });
        
        console.log('✅ Slider images saved');
        alert('✅ Slider images saved successfully!');
        
    } catch (error) {
        console.error('❌ Error saving slider images:', error);
        alert('Error saving slider images: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
    }
}

if (sliderImagesForm) {
    sliderImagesForm.addEventListener('submit', saveSliderImages);
}

// ============================================
// MS BEAUTY AI TRAINING
// ============================================
const msBeautyTrainingForm = document.getElementById('msBeautyTrainingForm');

// Load training data
async function loadTrainingData() {
    try {
        const snapshot = await firebase.firestore().collection('msbeauty_training').orderBy('createdAt', 'desc').get();
        
        const listContainer = document.getElementById('trainingDataList');
        
        if (snapshot.empty) {
            listContainer.innerHTML = '<p style="color: #94a3b8;">No training data yet. Add your first Q&A above!</p>';
            return;
        }
        
        listContainer.innerHTML = '';
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const item = document.createElement('div');
            item.className = 'training-item';
            item.innerHTML = `
                <div class="training-content">
                    <div class="training-question">Q: ${data.question}</div>
                    <div class="training-answer">A: ${data.answer}</div>
                </div>
                <button class="delete-training-btn" onclick="deleteTraining('${doc.id}')">Delete</button>
            `;
            listContainer.appendChild(item);
        });
        
        console.log(`✅ Loaded ${snapshot.size} training items`);
    } catch (error) {
        console.error('❌ Error loading training data:', error);
    }
}

// Add training data
async function addTrainingData(e) {
    e.preventDefault();
    
    const btnText = document.getElementById('addTrainingBtnText');
    const btnLoader = document.getElementById('addTrainingLoader');
    const submitBtn = msBeautyTrainingForm.querySelector('.primary-btn');
    
    const question = document.getElementById('trainingQuestion').value.trim().toLowerCase();
    const answer = document.getElementById('trainingAnswer').value.trim();
    
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline';
    
    try {
        await firebase.firestore().collection('msbeauty_training').add({
            question: question,
            answer: answer,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: firebase.auth().currentUser.email
        });
        
        console.log('✅ Training added');
        alert('✅ Training added successfully!');
        
        msBeautyTrainingForm.reset();
        loadTrainingData();
        
    } catch (error) {
        console.error('❌ Error adding training:', error);
        alert('Error adding training: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
    }
}

// Delete training data
window.deleteTraining = async function(trainingId) {
    if (!confirm('Delete this training data?')) return;
    
    try {
        await firebase.firestore().collection('msbeauty_training').doc(trainingId).delete();
        console.log('✅ Training deleted');
        alert('✅ Training deleted!');
        loadTrainingData();
    } catch (error) {
        console.error('❌ Error deleting training:', error);
        alert('Error deleting training: ' + error.message);
    }
};

// Attach event listeners
if (msBeautyTrainingForm) {
    msBeautyTrainingForm.addEventListener('submit', addTrainingData);
}

// Load training data when Settings tab is clicked
const originalLoadSettingsFunc2 = loadSettings;
loadSettings = async function() {
    await originalLoadSettingsFunc2();
    await loadTrainingData();
};
