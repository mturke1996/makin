import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBHqHGoSFPlmftQiF2m1EQ7RMtLsC0qGQM",
  authDomain: "makin-e91d0.firebaseapp.com",
  projectId: "makin-e91d0",
  storageBucket: "makin-e91d0.firebasestorage.app",
  messagingSenderId: "801758923710",
  appId: "1:801758923710:web:08ae347e4907f421d647ef",
  measurementId: "G-9T15TECCHE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

export { analytics };
export default app;
