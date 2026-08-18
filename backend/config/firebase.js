import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import dotenv from "dotenv";

dotenv.config();

let messaging = null;

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
  : undefined;

if (projectId && clientEmail && privateKey) {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }
  messaging = getMessaging();
  console.log("✅ Firebase Admin initialized");
} else {
  console.warn("⚠️ Firebase credentials missing, push notifications disabled");
}

export { messaging };
