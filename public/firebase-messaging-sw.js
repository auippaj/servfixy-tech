/* Firebase Cloud Messaging Service Worker */
importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyB38VitK3yZoC4X6msEOe27m5mLj9EVDwU",
  authDomain: "servfixy-27a50.firebaseapp.com",
  projectId: "servfixy-27a50",
  storageBucket: "servfixy-27a50.firebasestorage.app",
  messagingSenderId: "154271437515",
  appId: "1:154271437515:web:10386d1486b66c2d8b814e"
});

const messaging = firebase.messaging();

// Handle background push messages
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-sw] background message:", payload);
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || "Servfixy", {
    body: body || "",
    icon: "/logo192.png",
    badge: "/logo192.png",
    data: payload.data || {}
  });
});
