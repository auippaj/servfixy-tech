import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyB38VitK3yZoC4X6msEOe27m5mLj9EVDwU",
  authDomain: "servfixy-27a50.firebaseapp.com",
  projectId: "servfixy-27a50",
  storageBucket: "servfixy-27a50.firebasestorage.app",
  messagingSenderId: "154271437515",
  appId: "1:154271437515:web:10386d1486b66c2d8b814e"
};

const VAPID_KEY = "BIxPaCbXHqbMB-qcc4uGgMM0dFaLN21EO94NZb-w0vwwHUbZcOSovXjMtCULs65EMaoHI0P7z5U9kuA8KHitLZA";
const API = "https://servfixy-production.up.railway.app/api";

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Request permission + register FCM token with backend
export async function registerPushToken(authToken) {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("[push] permission denied");
      return null;
    }
    // Wait for firebase messaging SW to be ready before subscribing
    if ('serviceWorker' in navigator) {
      await navigator.serviceWorker.ready;
    }
    const fcmToken = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (!fcmToken) {
      console.warn("[push] no FCM token received");
      return null;
    }
    // Register with backend
    await fetch(`${API}/push-tokens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        token: fcmToken,
        device_type: "web",
        user_type: "tech"
      })
    });
    console.log("[push] token registered:", fcmToken.slice(0, 20) + "...");
    return fcmToken;
  } catch (err) {
    console.error("[push] registration error:", err.message);
    return null;
  }
}

// Handle foreground messages (app is open)
export function onForegroundMessage(callback) {
  return onMessage(messaging, (payload) => {
    console.log("[push] foreground message:", payload);
    callback(payload);
  });
}

export { messaging };
