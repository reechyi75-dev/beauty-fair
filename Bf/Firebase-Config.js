// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBLLTJ84ITh4-k_XHoKDhcLB6x5KwxPmdE",
    authDomain: "bf-staff-project.firebaseapp.com",
    projectId: "bf-staff-project",
    storageBucket: "bf-staff-project.firebasestorage.app",
    messagingSenderId: "683762342463",
    appId: "1:683762342463:web:b463e74c6157066642f68a"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Make Firebase services globally accessible on the window object
window.auth = firebase.auth();
window.db = firebase.firestore();
window.storage = firebase.storage();

// Enable persistent login
window.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => {
        console.log("Firebase initialized and persistence enabled");
    })
    .catch((error) => {
        console.error("Persistence error:", error);
    });

console.log("Firebase Config loaded successfully");