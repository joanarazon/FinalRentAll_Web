import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";

const firebaseConfig = {
    apiKey: "AIzaSyAXTJywznBWCxMVx6j1SvilM6LO2xzDZvA",
    authDomain: "rentapplication-452fa.firebaseapp.com",
    projectId: "rentapplication-452fa",
    storageBucket: "rentapplication-452fa.firebasestorage.app",
    messagingSenderId: "1023157208948",
    appId: "1:1023157208948:web:f06a85c3787a9b1994ce21",
    measurementId: "G-11GW2P3X8H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export const generateToken = async (registration) => {
    try {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            const token = await getToken(messaging, {
                vapidKey: "BFaMVsRLpp_Z5-Z6e3rjH9A6U9wBfSPCFSHpd5xqO_Zk8wbMkbx5C35QdJE8BoF_D9kO99c0AAuIcE3RFTuyLqs",
                serviceWorkerRegistration: registration
            });
            console.log("FCM token:", token);
            return token;
        }
    } catch (err) {
        console.error("Token generation failed:", err);
    }
};

