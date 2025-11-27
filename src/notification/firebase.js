import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";

const firebaseConfig = {
    apiKey: "AIzaSyAXTJywznBWCxMVx6j1SvilM6LO2xzDZvA",
    authDomain: "rentapplication-452fa.firebaseapp.com",
    projectId: "rentapplication-452fa",
    storageBucket: "rentapplication-452fa.firebasestorage.app",
    messagingSenderId: "1023157208948",
    appId: "1:1023157208948:web:f06a85c3787a9b1994ce21",
    measurementId: "G-11GW2P3X8H",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Passive token fetch: only runs when permission is already granted.
// Avoids auto-prompting on load, which Chrome/Brave may auto-block after repeated dismissals.
export const generateToken = async (registration) => {
    try {
        if (typeof window === "undefined" || !("Notification" in window)) {
            return null;
        }
        const current = Notification.permission; // 'default' | 'granted' | 'denied'
        if (current === "denied") {
            console.warn(
                "Notifications permission previously denied. Not prompting again automatically."
            );
            return null;
        }
        if (current !== "granted") {
            // Don't auto-request here; call requestNotificationsAndToken() from a user gesture instead
            return null;
        }
        const token = await getToken(messaging, {
            vapidKey:
                "BFaMVsRLpp_Z5-Z6e3rjH9A6U9wBfSPCFSHpd5xqO_Zk8wbMkbx5C35QdJE8BoF_D9kO99c0AAuIcE3RFTuyLqs",
            serviceWorkerRegistration: registration,
        });
        if (token) console.log("FCM token:", token);
        return token || null;
    } catch (err) {
        console.error("Token generation failed:", err);
        return null;
    }
};

// Explicit request: call this from a user-initiated event (e.g., button click)
export const requestNotificationsAndToken = async (registration) => {
    try {
        if (typeof window === "undefined" || !("Notification" in window)) {
            return null;
        }
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return null;
        const token = await getToken(messaging, {
            vapidKey:
                "BFaMVsRLpp_Z5-Z6e3rjH9A6U9wBfSPCFSHpd5xqO_Zk8wbMkbx5C35QdJE8BoF_D9kO99c0AAuIcE3RFTuyLqs",
            serviceWorkerRegistration: registration,
        });
        if (token) console.log("FCM token:", token);
        return token || null;
    } catch (err) {
        console.error("Permission/token request failed:", err);
        return null;
    }
};
