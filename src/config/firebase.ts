import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
// يمكنك إنشاء ملف .env في جذر المشروع وإضافة القيم التالية:
// VITE_FIREBASE_API_KEY=your-api-key
// VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
// VITE_FIREBASE_PROJECT_ID=your-project-id
// VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
// VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
// VITE_FIREBASE_APP_ID=your-app-id

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCcnwb1V0NhW-tOZRQOTiMn9sMuW1CBWh4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "test-company-a0c68.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "test-company-a0c68",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "test-company-a0c68.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "426636793558",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:426636793558:web:28855be21b4f8a179f9b77"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;

