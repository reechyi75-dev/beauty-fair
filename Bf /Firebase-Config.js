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

// Make Firebase services available FIRST
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// THEN enable persistent login
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => {
        console.log("Firebase persistence enabled");
    })
    .catch((error) => {
        console.error("Persistence error:", error);
    });