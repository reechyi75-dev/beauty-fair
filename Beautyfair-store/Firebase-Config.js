// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDx9rgfPO-_mTIBLau0fclXILcaghzWow4",
    authDomain: "beauty-fair-store.firebaseapp.com",
    projectId: "beauty-fair-store",
    storageBucket: "beauty-fair-store.firebasestorage.app",
    messagingSenderId: "527909034598",
    appId: "1:527909034598:web:ad5cce4a7f2e2e5bf02ba7",
    measurementId: "G-B4173WRXCC"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Make Firebase services globally accessible
window.auth = firebase.auth();
window.db = firebase.firestore();
window.storage = firebase.storage();

// Enable persistent login (stay logged in even after closing browser)
window.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => {
        console.log("✅ Firebase initialized successfully");
        console.log("✅ Authentication enabled");
        console.log("✅ Firestore database connected");
        console.log("✅ Storage enabled");
        console.log("✅ Persistent login enabled");
    })
    .catch((error) => {
        console.error("❌ Firebase persistence error:", error);
    });
    
// Test Firebase Connection
window.addEventListener('load', function() {
    // Test Firestore connection
    window.db.collection('_test').doc('connection').set({
        status: 'connected',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        console.log("✅ Firestore connection test: SUCCESS");
        // Delete test document
        window.db.collection('_test').doc('connection').delete();
    })
    .catch((error) => {
        console.error("❌ Firestore connection test: FAILED", error);
    });
});

console.log("🔥 Firebase Config loaded successfully");
console.log("📦 Project: beauty-fair-store");
console.log("🎯 Ready for BeautyFair E-Commerce!");