import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDWEv0uPcDJs0CzXzo42KmSGx2tPPq-4i4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "toolkit-76e34.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "toolkit-76e34",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "toolkit-76e34.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1029344840900",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1029344840900:web:5a7baf57526aee2bf5cd91"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
