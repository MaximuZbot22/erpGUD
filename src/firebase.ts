import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  EmailAuthProvider,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyB-w5AZmpbxt4AH7xbZ7CMQWltEDgWAOAM',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'goodoria-erp-af1f5.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'goodoria-erp-af1f5',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'goodoria-erp-af1f5.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '641064529975',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:641064529975:web:14a0f7e56165fd3f0b0fb2',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-8PJ1GW0JCS',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Google Sign-In Provider for Google Workspace Access
export const googleProvider = new GoogleAuthProvider();

// Request scopes for Google APIs (Workspace integration)
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
googleProvider.addScope('https://www.googleapis.com/auth/drive');
googleProvider.addScope('https://www.googleapis.com/auth/documents.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/calendar');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.send');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.readonly');

export { GoogleAuthProvider, EmailAuthProvider, signInWithPopup, signOut };
export default app;
