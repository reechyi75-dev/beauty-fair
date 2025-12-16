let allProducts = [];
let cart = JSON.parse(localStorage.getItem('beautyfair_cart')) || [];



// Load products from Firebase
async function loadProducts() {
    try {
        // Add timeout promise
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 8000)
        );
        
        const firestorePromise = firebase.firestore()
            .collection('products')
            .get();
        
        // Race between Firestore and timeout
        const snapshot = await Promise.race([firestorePromise, timeoutPromise]);
        
        allProducts = [];
        snapshot.forEach(doc => {
            allProducts.push({ id: doc.id, ...doc.data() });
        });
        
        displayProducts(allProducts);
        console.log(`✅ Loaded ${allProducts.length} products`);
        
    } catch (error) {
        console.error('❌ Error loading products:', error);
        
        // Show user-friendly message
        document.getElementById('productsGrid').innerHTML = `
            <div class="loading" style="color: #ef4444;">
                <p>⚠️ Connection issue. Please check your internet and refresh.</p>
                <button onclick="location.reload()" style="
                    margin-top: 15px;
                    padding: 10px 20px;
                    background: linear-gradient(90deg, #FFD700, #FF69B4);
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: bold;
                ">Retry</button>
            </div>
        `;
    }
}

// Display products

function displayProducts(products) {
    const grid = document.getElementById('productsGrid');
    
    if (products.length === 0) {
        grid.innerHTML = '<div class="loading">No products available</div>';
        return;
    }
    
    grid.innerHTML = products.map(product => {
        const isInWishlist = wishlist.includes(product.id);
        const rating = product.rating || 4.5;
        const fullStars = Math.floor(rating);
        const halfStar = rating % 1 >= 0.5;
        let stars = '★'.repeat(fullStars);
        if (halfStar) stars += '☆';
        
        return `
        <div class="product-card">
            <button class="wishlist-heart ${isInWishlist ? 'active' : ''}" onclick="toggleWishlist('${product.id}', event)">
                <svg viewBox="0 0 24 24">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
            </button>
            
            <div class="product-image">
                ${product.imageUrl ? 
                    `<img src="${product.imageUrl}" alt="${product.name}">` 
                    : '🌸'}
            </div>
            
            <div class="product-details">
                <div class="product-category">${product.category}</div>
                <div class="product-name">${product.name}</div>
                
                <div class="product-rating">
                    <span class="stars">${stars}</span>
                    <span class="rating-number">(${rating})</span>
                </div>
                
                <div class="product-price">₦${product.price.toLocaleString()}</div>
                
                <div class="stock-status ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}">
                    ${product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                </div>
            </div>
            
            <button class="add-cart-btn" onclick="addToCart('${product.id}')" ${product.stock === 0 ? 'disabled' : ''}>
                ${product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
        </div>
        `;
    }).join('');
}


// Toggle wishlist from product card
function toggleWishlist(productId, event) {
    event.stopPropagation(); // Prevent card click
    
    if (wishlist.includes(productId)) {
        // Remove from wishlist
        wishlist = wishlist.filter(id => id !== productId);
        showNotification('💔 Removed from wishlist');
    } else {
        // Add to wishlist
        wishlist.push(productId);
        showNotification('💝 Added to wishlist!');
    }
    
    saveWishlist();
    updateWishlistBadge();
    
    // Re-render products to update heart icon
    const currentCategory = document.querySelector('.filter-btn.active');
    if (currentCategory) {
        const category = currentCategory.getAttribute('data-category');
        const filtered = allProducts.filter(p => p.category === category);
        displayProducts(filtered);
    } else {
        displayProducts(allProducts);
    }
}

// Make toggleWishlist global
window.toggleWishlist = toggleWishlist; 
// Filter products
document.querySelectorAll('.menu-link[data-category]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        
        const category = link.getAttribute('data-category');
        
        if (category === 'all') {
            displayProducts(allProducts);
        } else {
            const filtered = allProducts.filter(p => p.category === category);
            displayProducts(filtered);
        }
        
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        const filterBtn = document.querySelector(`.filter-btn[data-category="${category}"]`);
        if (filterBtn) filterBtn.classList.add('active');
        
        // Close menu
        document.getElementById('mobileMenu').classList.remove('active');
    });
});


// Filter products
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const category = btn.getAttribute('data-category');
        
        if (category === 'all') {
            displayProducts(allProducts);
        } else {
            const filtered = allProducts.filter(p => p.category === category);
            displayProducts(filtered);
        }
    });
});


// Image slider
let currentSlide = 0;
const slides = document.querySelectorAll('.slide');

function showSlide(index) {
    slides.forEach(slide => slide.classList.remove('active'));
    slides[index].classList.add('active');
}

setInterval(() => {
    currentSlide = (currentSlide + 1) % slides.length;
    showSlide(currentSlide);
}, 2000);


// ============================================
// MS BEAUTY AI CHATBOT - SMART VERSION
// ============================================
const chatIcon = document.getElementById('chatIcon');
const chatPage = document.getElementById('chatPage');
const closeChat = document.getElementById('closeChat');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendMessage = document.getElementById('sendMessage');

let trainingData = [];
let hasGreeted = false; // Track if already greeted in this session
let lastMentionedProduct = null; // Remember last product discussed

// Load training data from Firebase
async function loadChatTraining() {
    try {
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Chat training timeout')), 5000)
        );
        
        const firestorePromise = firebase.firestore()
            .collection('msbeauty_training')
            .get();
        
        const snapshot = await Promise.race([firestorePromise, timeoutPromise]);
        
        trainingData = [];
        snapshot.forEach(doc => {
            trainingData.push(doc.data());
        });
        
        console.log(`✅ Ms Beauty loaded ${trainingData.length} training items`);
        
    } catch (error) {
        console.warn('⚠️ Chat training not loaded (chatbot will use basic responses):', error.message);
        // Chatbot will still work with basic responses
    }
}
 

// Open chat
chatIcon.addEventListener('click', () => {
    chatPage.classList.add('active');
    // Reset conversation state when opening chat
    hasGreeted = false;
    lastMentionedProduct = null;
});

// Close chat
closeChat.addEventListener('click', () => {
    chatPage.classList.remove('active');
    // Reset state when closing
    hasGreeted = false;
    lastMentionedProduct = null;
});

// Process message and generate response
async function generateResponse(userMessage) {
    const message = userMessage.toLowerCase().trim();
    let responses = [];
    
    // 1. Check for greeting (only greet once per conversation)
    const isGreeting = message.includes('hi') || message.includes('hello') || message.includes('hey');
    
    if (isGreeting && !hasGreeted) {
        responses.push("Hello! I'm Ms Beauty, BeautyFair's AI assistant! 😊");
        hasGreeted = true;
    }
    
    // 2. Check if asking about a product (by name or "it" referring to last product)
    let productMatch = await checkProductMention(message);
    
    // If they said "it" and we have a last mentioned product, use that
    if (!productMatch && (message.includes('it') || message.includes('that')) && lastMentionedProduct) {
        productMatch = lastMentionedProduct;
    }
    
    if (productMatch) {
        // Remember this product for future "it" references
        lastMentionedProduct = productMatch;
        
        // Check what they're asking about the product
        const askingPrice = message.includes('how much') || message.includes('price') || message.includes('cost');
        const askingAvailability = message.includes('do you have') || message.includes('available') || message.includes('in stock');
        
        if (askingAvailability) {
            if (productMatch.stock > 0) {
                responses.push(`Yes, we have ${productMatch.name}! We currently have ${productMatch.stock} units in stock.`);
            } else {
                responses.push(`Sorry, ${productMatch.name} is currently out of stock. Would you like to know when it's available?`);
            }
        }
        
        if (askingPrice) {
            responses.push(`As of today, ${productMatch.name} is ₦${productMatch.price.toLocaleString()}.`);
        }
        
        // If just mentioned product without specific question
        if (!askingPrice && !askingAvailability && !isGreeting) {
            responses.push(`${productMatch.name} is available for ₦${productMatch.price.toLocaleString()}. We have ${productMatch.stock} in stock!`);
        }
    }
    
    // 3. Check training data for other questions (only if not about products)
    if (!productMatch) {
        const trainedResponse = findTrainedResponse(message);
        if (trainedResponse) {
            responses.push(trainedResponse);
        }
    }
    
    // 4. Default response if nothing matched
    if (responses.length === 0) {
        responses.push("I'm not sure about that. Can you ask about our products, prices, delivery, or payment methods?");
    }
    
    return responses.join(' ');
}

// Check if message mentions a product
async function checkProductMention(message) {
    for (let product of allProducts) {
        const productName = product.name.toLowerCase();
        // Check if product name is in the message
        if (message.includes(productName)) {
            return product;
        }
    }
    return null;
}

// Find trained response
function findTrainedResponse(message) {
    for (let training of trainingData) {
        if (message.includes(training.question)) {
            return training.answer;
        }
    }
    return null;
}

// Send message
sendMessage.addEventListener('click', async () => {
    const message = chatInput.value.trim();
    if (!message) return;
    
    // Add user message
    const userMsg = document.createElement('div');
    userMsg.className = 'user-message';
    userMsg.innerHTML = `<p>${message}</p>`;
    chatMessages.appendChild(userMsg);
    
    chatInput.value = '';
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Show typing indicator
    const typingMsg = document.createElement('div');
    typingMsg.className = 'bot-message';
    typingMsg.innerHTML = '<p>Ms Beauty is typing...</p>';
    chatMessages.appendChild(typingMsg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Generate response
    const response = await generateResponse(message);
    
    // Remove typing indicator
    typingMsg.remove();
    
    // Add bot response
    const botMsg = document.createElement('div');
    botMsg.className = 'bot-message';
    botMsg.innerHTML = `<p>${response}</p>`;
    chatMessages.appendChild(botMsg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Enter key to send
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage.click();
});

// Load training data on page load
loadChatTraining();



// Mobile menu
const hamburgerMenu = document.getElementById('hamburgerMenu');
const mobileMenu = document.getElementById('mobileMenu');
const closeMenu = document.getElementById('closeMenu');

hamburgerMenu.addEventListener('click', () => {
    mobileMenu.classList.add('active');
});

closeMenu.addEventListener('click', () => {
    mobileMenu.classList.remove('active');
});

// Initialize
loadProducts();

console.log('✅ Beauty Fair Store loaded');

// Ms Beauty link in menu
document.getElementById('msBeautyLink').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('mobileMenu').classList.remove('active');
    document.getElementById('chatPage').classList.add('active');
});
// ============================================
// CART FUNCTIONALITY - COMPLETE
// Add this to your 5app.js file
// ============================================
function addToCart(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product || product.stock === 0) return;
    
    // Check if product already in cart
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1
        });
    }
    
    saveCart();
    updateCartBadges(); // THIS IS IMPORTANT
    
    // Show success notification
    showNotification(`✅ ${product.name} added to cart!`);
    
    console.log('Current cart:', cart); // Debug log
}



// Save cart to localStorage
function saveCart() {
    localStorage.setItem('beautyfair_cart', JSON.stringify(cart));
}

// Update cart badges

function updateCartBadges() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    // Update all cart badges
    const badges = [
        document.getElementById('cartBadge'),
        document.getElementById('cartIconBadge'),
        document.getElementById('navCartBadge')
    ];
    
    badges.forEach(badge => {
        if (badge) {
            badge.textContent = totalItems;
            badge.style.display = totalItems > 0 ? 'block' : 'block'; // Always show
        }
    });
    
    console.log('Cart updated:', totalItems, 'items');
}


// Display cart items
function displayCart() {
    const cartItems = document.getElementById('cartItems');
    const emptyCart = document.getElementById('emptyCart');
    const cartFooter = document.getElementById('cartFooter');
    
    if (cart.length === 0) {
        emptyCart.style.display = 'flex';
        cartItems.style.display = 'none';
        cartFooter.style.display = 'none';
        return;
    }
    
    emptyCart.style.display = 'none';
    cartItems.style.display = 'flex';
    cartFooter.style.display = 'block';
    
    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-icon">🌸</div>
            <div class="cart-item-details">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">₦${item.price.toLocaleString()}</div>
            </div>
            <div class="cart-item-controls">
                <div class="quantity-controls">
                    <button class="qty-btn" onclick="decreaseQuantity('${item.id}')" ${item.quantity === 1 ? 'disabled' : ''}>-</button>
                    <span class="qty-display">${item.quantity}</span>
                    <button class="qty-btn" onclick="increaseQuantity('${item.id}')">+</button>
                </div>
                <button class="remove-btn" onclick="removeFromCart('${item.id}')">Remove</button>
            </div>
        </div>
    `).join('');
    
    updateCartTotals();
}

// Increase quantity
function increaseQuantity(productId) {
    const item = cart.find(i => i.id === productId);
    if (item) {
        item.quantity += 1;
        saveCart();
        displayCart();
        updateCartBadges();
    }
}

// Decrease quantity
function decreaseQuantity(productId) {
    const item = cart.find(i => i.id === productId);
    if (item && item.quantity > 1) {
        item.quantity -= 1;
        saveCart();
        displayCart();
        updateCartBadges();
    }
}

// Remove from cart
function removeFromCart(productId) {
    const item = cart.find(i => i.id === productId);
    const itemName = item ? item.name : 'Item';
    
    cart = cart.filter(i => i.id !== productId);
    saveCart();
    displayCart();
    updateCartBadges();
    
    showNotification(`❌ ${itemName} removed from cart`);
}

// Update cart totals
function updateCartTotals() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('cartSubtotal').textContent = `₦${subtotal.toLocaleString()}`;
    document.getElementById('cartTotal').textContent = `₦${subtotal.toLocaleString()}`;
}

// Open cart
function openCart() {
    displayCart();
    document.getElementById('cartPage').classList.add('active');
}

// Close cart
function closeCart() {
    document.getElementById('cartPage').classList.remove('active');
}

// Show notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: linear-gradient(135deg, #001f3f, #003366);
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        border: 1px solid #FFD700;
        z-index: 1000;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Event Listeners
document.getElementById('cartIcon').addEventListener('click', openCart);
document.getElementById('backFromCart').addEventListener('click', closeCart);


// Initialize cart on page load
updateCartBadges();

console.log('✅ Cart functionality loaded');

// Make functions global
window.addToCart = addToCart;
window.increaseQuantity = increaseQuantity;
window.decreaseQuantity = decreaseQuantity;
window.removeFromCart = removeFromCart;
window.closeCart = closeCart;

// ============================================
// CHECKOUT PAGE FUNCTIONALITY
// Add this to your 5app.js file
// ============================================

let deliveryFee = 0;
let lastOrderDetails = null;

// UPDATE the existing checkout button click handler in cart
document.getElementById('checkoutBtn').addEventListener('click', () => {
    if (cart.length === 0) return;
    openCheckout();
});

// Open checkout page
function openCheckout() {
    displayCheckoutSummary();
    updateCheckoutTotals();
    document.getElementById('checkoutPage').classList.add('active');
    document.getElementById('cartPage').classList.remove('active');
}

// Close checkout page
function closeCheckout() {
    document.getElementById('checkoutPage').classList.remove('active');
}

// Display order summary in checkout
function displayCheckoutSummary() {
    const summaryContainer = document.getElementById('checkoutOrderSummary');
    
    if (cart.length === 0) {
        summaryContainer.innerHTML = '<p style="text-align: center; color: #999;">No items in cart</p>';
        return;
    }
    
    summaryContainer.innerHTML = cart.map(item => `
        <div class="summary-item">
            <div class="summary-item-name">${item.name}</div>
            <div class="summary-item-details">
                <span class="summary-item-qty">Qty: ${item.quantity}</span>
                <span class="summary-item-price">₦${(item.price * item.quantity).toLocaleString()}</span>
            </div>
        </div>
    `).join('');
}

// Update checkout totals
function updateCheckoutTotals() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal + deliveryFee;
    
    document.getElementById('checkoutSubtotal').textContent = `₦${subtotal.toLocaleString()}`;
    document.getElementById('checkoutDeliveryFee').textContent = `₦${deliveryFee.toLocaleString()}`;
    document.getElementById('checkoutTotal').textContent = `₦${total.toLocaleString()}`;
}

// Handle delivery location change
document.getElementById('deliveryLocation').addEventListener('change', function() {
    const selectedOption = this.options[this.selectedIndex];
    deliveryFee = parseInt(selectedOption.getAttribute('data-fee')) || 0;
    updateCheckoutTotals();
});

// Handle form submission
document.getElementById('checkoutForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Get form values
    const customerName = document.getElementById('customerName').value.trim();
    const customerPhone = document.getElementById('customerPhone').value.trim();
    const customerEmail = document.getElementById('customerEmail').value.trim();
    const deliveryLocation = document.getElementById('deliveryLocation');
    const locationText = deliveryLocation.options[deliveryLocation.selectedIndex].text;
    const deliveryAddress = document.getElementById('deliveryAddress').value.trim();
    const orderNotes = document.getElementById('orderNotes').value.trim();
    
    // Validate
    if (!customerName || !customerPhone || !deliveryLocation.value || !deliveryAddress) {
        alert('❌ Please fill in all required fields');
        return;
    }
    
    // Phone validation (basic)
    if (customerPhone.length < 11) {
        alert('❌ Please enter a valid phone number');
        return;
    }
    
    // Show loading
    const submitBtn = document.getElementById('placeOrderBtn');
    const btnText = document.getElementById('placeOrderText');
    const btnLoader = document.getElementById('placeOrderLoader');
    
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline';
    
    try {
        // Calculate totals
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const total = subtotal + deliveryFee;
        
        // Generate order ID
        const orderId = 'ORD-' + Date.now();
        
        // Create order data
        const orderData = {
            orderId: orderId,
            customer: customerName,
            phone: customerPhone,
            email: customerEmail || 'N/A',
            location: locationText,
            address: deliveryAddress,
            notes: orderNotes || 'None',
            items: cart,
            subtotal: subtotal,
            deliveryFee: deliveryFee,
            amount: total,
            status: 'Pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Save to Firebase
        await firebase.firestore().collection('orders').add(orderData);
        
        console.log('✅ Order placed successfully:', orderId);
        
// Store order details for confirmation page
lastOrderDetails = {
    orderId: orderId,
    customer: customerName,
    phone: customerPhone,
    email: customerEmail || 'N/A',
    location: locationText,
    address: deliveryAddress,
    items: [...cart],
    subtotal: subtotal,
    deliveryFee: deliveryFee,
    total: total
};

// Clear cart
cart = [];
saveCart();
updateCartBadges();

// Reset form
document.getElementById('checkoutForm').reset();
deliveryFee = 0;

// Close checkout
closeCheckout();

// Show confirmation page
showOrderConfirmation();
        
    } catch (error) {
        console.error('❌ Error placing order:', error);
        alert('Error placing order: ' + error.message);
    } finally {
        // Reset button
        submitBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
    }
});

// Back button from checkout
document.getElementById('backFromCheckout').addEventListener('click', () => {
    closeCheckout();
    openCart();
});

// Make functions global
window.openCheckout = openCheckout;
window.closeCheckout = closeCheckout;

console.log('✅ Checkout functionality loaded');


// Display order confirmation page
function showOrderConfirmation() {
    if (!lastOrderDetails) return;
    
    // Fill in order details
    document.getElementById('confirmOrderId').textContent = '#' + lastOrderDetails.orderId;
    document.getElementById('confirmCustomerName').textContent = lastOrderDetails.customer;
    document.getElementById('confirmCustomerPhone').textContent = lastOrderDetails.phone;
    document.getElementById('confirmCustomerEmail').textContent = lastOrderDetails.email;
    document.getElementById('confirmLocation').textContent = lastOrderDetails.location;
    document.getElementById('confirmAddress').textContent = lastOrderDetails.address;
    
    // Display order items
    const itemsContainer = document.getElementById('confirmationItems');
    itemsContainer.innerHTML = lastOrderDetails.items.map(item => `
        <div class="confirmation-item">
            <div class="confirmation-item-name">${item.name}</div>
            <div class="confirmation-item-details">
                <span class="confirmation-item-qty">x${item.quantity}</span>
                <span class="confirmation-item-price">₦${(item.price * item.quantity).toLocaleString()}</span>
            </div>
        </div>
    `).join('');
    
    // Display totals
    document.getElementById('confirmSubtotal').textContent = `₦${lastOrderDetails.subtotal.toLocaleString()}`;
    document.getElementById('confirmDeliveryFee').textContent = `₦${lastOrderDetails.deliveryFee.toLocaleString()}`;
    document.getElementById('confirmTotal').textContent = `₦${lastOrderDetails.total.toLocaleString()}`;
    
    // Show confirmation page
    document.getElementById('orderConfirmationPage').classList.add('active');
    
    console.log('✅ Order confirmation displayed');
}

// Close confirmation page
function closeConfirmation() {
    document.getElementById('orderConfirmationPage').classList.remove('active');
    lastOrderDetails = null;
}

// Track order (placeholder - can be enhanced later)
function trackOrder() {
    if (!lastOrderDetails) return;
    alert(`📦 Track Order\n\nOrder ID: ${lastOrderDetails.orderId}\n\nStatus: Pending\n\nYou'll receive SMS/WhatsApp updates about your order.`);
}

// Make functions global
window.showOrderConfirmation = showOrderConfirmation;
window.closeConfirmation = closeConfirmation;
window.trackOrder = trackOrder;

console.log('✅ Order confirmation functionality loaded');

// ============================================
// ORDER TRACKING FUNCTIONALITY
// Add this to your 5app.js file
// ============================================

let currentTrackingOrders = [];
let selectedOrderForDetails = null;

// UPDATE the trackOrder function in order confirmation
// REPLACE the existing trackOrder function with this:
function trackOrder() {
    if (lastOrderDetails) {
        // Pre-fill with last order details
        document.getElementById('trackOrderId').value = lastOrderDetails.orderId;
        document.getElementById('trackPhone').value = lastOrderDetails.phone;
    }
    
    // Close confirmation page
    document.getElementById('orderConfirmationPage').classList.remove('active');
    
    // Open tracking page
    openOrderTracking();
}

// Open order tracking page
function openOrderTracking() {
    document.getElementById('orderTrackingPage').classList.add('active');
    
    // If we have pre-filled data, auto-search
    const orderId = document.getElementById('trackOrderId').value;
    const phone = document.getElementById('trackPhone').value;
    
    if (orderId || phone) {
        setTimeout(() => {
            document.getElementById('trackingSearchForm').dispatchEvent(new Event('submit'));
        }, 300);
    }
}

// Close order tracking page
function closeOrderTracking() {
    document.getElementById('orderTrackingPage').classList.remove('active');
    document.getElementById('trackingResults').style.display = 'none';
    document.getElementById('noResults').style.display = 'none';
}

// Handle tracking search form
document.getElementById('trackingSearchForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const orderId = document.getElementById('trackOrderId').value.trim();
    const phone = document.getElementById('trackPhone').value.trim();
    
    if (!orderId && !phone) {
        alert('❌ Please enter Order ID or Phone Number');
        return;
    }
    
    // Show loading
    showNotification('🔍 Searching for your orders...');
    
    try {
        let query = firebase.firestore().collection('orders');
        
        // Build query
        if (orderId && phone) {
            // Search by both
            query = query.where('orderId', '==', orderId).where('phone', '==', phone);
        } else if (orderId) {
            // Search by Order ID only
            query = query.where('orderId', '==', orderId);
        } else {
            // Search by Phone only
            query = query.where('phone', '==', phone);
        }
        
        const snapshot = await query.orderBy('createdAt', 'desc').get();
        
        if (snapshot.empty) {
            // No results
            document.getElementById('trackingResults').style.display = 'none';
            document.getElementById('noResults').style.display = 'block';
            currentTrackingOrders = [];
        } else {
            // Display results
            currentTrackingOrders = [];
            snapshot.forEach(doc => {
                currentTrackingOrders.push({ id: doc.id, ...doc.data() });
            });
            
            displayTrackingResults(currentTrackingOrders);
        }
        
    } catch (error) {
        console.error('❌ Error tracking order:', error);
        alert('Error searching orders: ' + error.message);
    }
});

// Display tracking results
function displayTrackingResults(orders) {
    const ordersList = document.getElementById('ordersList');
    const resultsCount = document.getElementById('resultsCount');
    
    resultsCount.textContent = `${orders.length} order${orders.length !== 1 ? 's' : ''} found`;
    
    ordersList.innerHTML = orders.map(order => {
        const statusClass = getStatusClass(order.status);
        const date = order.createdAt ? order.createdAt.toDate().toLocaleDateString() : 'N/A';
        
        return `
            <div class="order-item" onclick="showOrderDetailsModal('${order.id}')">
                <div class="order-item-header">
                    <span class="order-item-id">#${order.orderId}</span>
                    <span class="status-badge-small ${statusClass}">${order.status}</span>
                </div>
                <div class="order-item-details">
                    <span>${date}</span>
                    <span class="order-item-total">₦${order.amount.toLocaleString()}</span>
                </div>
            </div>
        `;
    }).join('');
    
    document.getElementById('trackingResults').style.display = 'block';
    document.getElementById('noResults').style.display = 'none';
}

// Get status class for badge
function getStatusClass(status) {
    const statusMap = {
        'Pending': 'status-pending',
        'Processing': 'status-processing',
        'Shipped': 'status-shipped',
        'Delivered': 'status-delivered'
    };
    return statusMap[status] || 'status-pending';
}

// Show order details modal
async function showOrderDetailsModal(orderId) {
    const order = currentTrackingOrders.find(o => o.id === orderId);
    if (!order) return;
    
    selectedOrderForDetails = order;
    
    // Fill modal data
    document.getElementById('modalOrderId').textContent = '#' + order.orderId;
    document.getElementById('modalOrderStatus').textContent = order.status;
    document.getElementById('modalOrderStatus').className = 'status-badge-large ' + getStatusClass(order.status);
    
    // Update timeline
    updateOrderTimeline(order.status);
    
    // Display items
    const itemsContainer = document.getElementById('modalOrderItems');
    itemsContainer.innerHTML = order.items.map(item => `
        <div class="confirmation-item">
            <div class="confirmation-item-name">${item.name}</div>
            <div class="confirmation-item-details">
                <span class="confirmation-item-qty">x${item.quantity}</span>
                <span class="confirmation-item-price">₦${(item.price * item.quantity).toLocaleString()}</span>
            </div>
        </div>
    `).join('');
    
    // Customer info
    document.getElementById('modalCustomerName').textContent = order.customer;
    document.getElementById('modalCustomerPhone').textContent = order.phone;
    document.getElementById('modalLocation').textContent = order.location;
    document.getElementById('modalAddress').textContent = order.address;
    
    // Prices
    document.getElementById('modalSubtotal').textContent = `₦${order.subtotal.toLocaleString()}`;
    document.getElementById('modalDeliveryFee').textContent = `₦${order.deliveryFee.toLocaleString()}`;
    document.getElementById('modalTotal').textContent = `₦${order.amount.toLocaleString()}`;
    
    // Show modal
    document.getElementById('orderDetailsModal').classList.add('active');
}

// Update timeline based on status
function updateOrderTimeline(status) {
    const timeline = document.getElementById('orderTimeline');
    const items = timeline.querySelectorAll('.timeline-item');
    
    // Reset all
    items.forEach(item => item.classList.remove('active'));
    
    // Activate based on status
    const statusIndex = {
        'Pending': 0,
        'Processing': 1,
        'Shipped': 2,
        'Delivered': 3
    };
    
    const activeIndex = statusIndex[status] || 0;
    
    for (let i = 0; i <= activeIndex; i++) {
        items[i].classList.add('active');
    }
}

// Close order details modal
function closeOrderDetails() {
    document.getElementById('orderDetailsModal').classList.remove('active');
    selectedOrderForDetails = null;
}

// Back button from tracking
document.getElementById('backFromTracking').addEventListener('click', closeOrderTracking);

// Make functions global
window.trackOrder = trackOrder;
window.openOrderTracking = openOrderTracking;
window.closeOrderTracking = closeOrderTracking;
window.showOrderDetailsModal = showOrderDetailsModal;
window.closeOrderDetails = closeOrderDetails;

console.log('✅ Order tracking functionality loaded');

// Load slider images from Firebase
async function loadSliderImages() {
    try {
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Slider timeout')), 5000)
        );
        
        const firestorePromise = firebase.firestore()
            .collection('settings')
            .doc('slider')
            .get();
        
        const doc = await Promise.race([firestorePromise, timeoutPromise]);
        
        if (doc.exists) {
            const data = doc.data();
            const slides = document.querySelectorAll('.slide');
            
            if (data.slide1) slides[0].src = data.slide1;
            if (data.slide2) slides[1].src = data.slide2;
            if (data.slide3) slides[2].src = data.slide3;
            
            console.log('✅ Slider images loaded');
        }
    } catch (error) {
        console.warn('⚠️ Slider images not loaded (using defaults):', error.message);
        // Don't show error to user - just use placeholder images
    }
} 
// Call on page load
loadSliderImages();

// ========================================
// INITIALIZE ON PAGE LOAD
// 
// ========================================

// Initialize cart on page load
document.addEventListener('DOMContentLoaded', function() {
    updateCartBadges();
    console.log('Page loaded, cart items:', cart.length);
});

// ========================================
// CUSTOM NOTIFICATION FUNCTIONS
// ADD THIS TO YOUR 5app.js
// ========================================

// Show custom notification
function showCustomNotification(message, icon = '💝', title = 'BeautyFair Store') {
    const overlay = document.getElementById('customNotificationOverlay');
    const iconEl = document.getElementById('notificationIcon');
    const titleEl = document.getElementById('notificationTitle');
    const messageEl = document.getElementById('notificationMessage');
    
    if (overlay && iconEl && titleEl && messageEl) {
        iconEl.textContent = icon;
        titleEl.textContent = title;
        messageEl.textContent = message;
        overlay.classList.add('active');
    }
}

// Close custom notification
function closeCustomNotification() {
    const overlay = document.getElementById('customNotificationOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

// Make function global
window.showCustomNotification = showCustomNotification;
window.closeCustomNotification = closeCustomNotification;

// ========================================
// REPLACE ALL alert() CALLS WITH THIS
// ========================================

// Example usage - Replace your existing alerts:

// OLD: alert('💝 Your wishlist is empty! Add products to your wishlist.');
// NEW: showCustomNotification('Add your favorite products to save them for later!', '💝', 'Wishlist is Empty');

// OLD: alert('✅ Added to cart!');
// NEW: showCustomNotification('Product added successfully!', '✅', 'Added to Cart');

// OLD: alert('Error message');
// NEW: showCustomNotification('Something went wrong. Please try again.', '❌', 'Error');

// ========================================
// UPDATE openWishlist FUNCTION
// Find and replace your openWishlist function
// ========================================

function openWishlist() {
    if (wishlist.length === 0) {
        showCustomNotification(
            'Add your favorite products to save them for later!', 
            '💝', 
            'Wishlist is Empty'
        );
        return;
    }
    
    displayWishlist();
    document.getElementById('wishlistPage').classList.add('active');
}

// ========================================
// COMMON NOTIFICATION TEMPLATES
// Use these throughout your app
// ========================================

// Success notifications
function notifySuccess(message) {
    showCustomNotification(message, '✅', 'Success');
}

// Error notifications
function notifyError(message) {
    showCustomNotification(message, '❌', 'Error');
}

// Info notifications
function notifyInfo(message) {
    showCustomNotification(message, 'ℹ️', 'Info');
}

// Wishlist notifications
function notifyWishlist(message) {
    showCustomNotification(message, '💝', 'Wishlist');
}

// Cart notifications
function notifyCart(message) {
    showCustomNotification(message, '🛒', 'Shopping Cart');
}

// Make functions global
window.notifySuccess = notifySuccess;
window.notifyError = notifyError;
window.notifyInfo = notifyInfo;
window.notifyWishlist = notifyWishlist;
window.notifyCart = notifyCart;

console.log('✅ Custom notifications loaded');

async function initializeApp() {
    console.log('🚀 Initializing Beauty Fair Store...');
    
    // 1. Load products first (most important)
    await loadProducts();
    
    // 2. Load other data in background (non-blocking)
    setTimeout(() => {
        loadSliderImages();
        loadChatTraining();
    }, 1000);
    
    // 3. Initialize UI
    updateCartBadges();
    updateWishlistBadge();
    
    console.log('✅ App initialized');
}

// Call on page load
document.addEventListener('DOMContentLoaded', initializeApp);

function checkConnection() {
    if (!navigator.onLine) {
        showCustomNotification(
            'Please check your internet connection and try again.', 
            '📡', 
            'No Internet Connection'
        );
        return false;
    }
    return true;
}

// Add connection check before Firebase operations
window.addEventListener('offline', () => {
    console.warn('⚠️ Device went offline');
    showCustomNotification('You are offline. Some features may not work.', '📡', 'Offline');
});

window.addEventListener('online', () => {
    console.log('✅ Device back online');
    location.reload(); // Refresh page when back online
});