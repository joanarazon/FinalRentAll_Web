// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here. Other Firebase libraries
// are not available in the service worker.
// Replace 10.13.2 with latest version of the Firebase JS SDK.
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
firebase.initializeApp({
    apiKey: "AIzaSyAXTJywznBWCxMVx6j1SvilM6LO2xzDZvA",
    authDomain: "rentapplication-452fa.firebaseapp.com",
    projectId: "rentapplication-452fa",
    storageBucket: "rentapplication-452fa.firebasestorage.app",
    messagingSenderId: "1023157208948",
    appId: "1:1023157208948:web:f06a85c3787a9b1994ce21",
    measurementId: "G-11GW2P3X8H"
});

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();