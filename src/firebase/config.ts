import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDWEv0uPcDJs0CzXzo42KmSGx2tPPq-4i4",
  authDomain: "toolkit-76e34.firebaseapp.com",
  projectId: "toolkit-76e34",
  storageBucket: "toolkit-76e34.firebasestorage.app",
  messagingSenderId: "1029344840900",
  appId: "1:1029344840900:web:5a7baf57526aee2bf5cd91"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
