import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  clearError: () => void;
  refreshUserProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true, error: null });
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const firebaseUser = userCredential.user;

          // Fetch user profile from Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          let userData: User;
          
          if (userDoc.exists()) {
             userData = {
              id: firebaseUser.uid,
              email: firebaseUser.email!,
              displayName: firebaseUser.displayName || undefined,
              photoURL: firebaseUser.photoURL || undefined,
              ...userDoc.data(), // Merge Firestore data (role, permissions, etc.)
            } as User;
          } else {
             // Fallback if no firestore doc exists
             userData = {
              id: firebaseUser.uid,
              email: firebaseUser.email!,
              displayName: firebaseUser.displayName || undefined,
              photoURL: firebaseUser.photoURL || undefined,
            };
          }

          set({
            user: userData,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          let errorMessage = 'حدث خطأ أثناء تسجيل الدخول';

          switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
              errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
              break;
            case 'auth/invalid-email':
              errorMessage = 'البريد الإلكتروني غير صحيح';
              break;
            case 'auth/user-disabled':
              errorMessage = 'تم تعطيل هذا الحساب';
              break;
            case 'auth/too-many-requests':
              errorMessage = 'تم تجاوز عدد المحاولات المسموح بها، يرجى المحاولة لاحقاً';
              break;
          }

          set({
            error: errorMessage,
            isLoading: false,
            isAuthenticated: false,
            user: null,
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          set({ isLoading: true });
          await firebaseSignOut(auth);
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            error: 'حدث خطأ أثناء تسجيل الخروج',
            isLoading: false,
          });
          throw error;
        }
      },

      setUser: (user: User | null) => {
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        });
      },

      refreshUserProfile: async () => {
        const currentUser = get().user;
        if (!currentUser) return;
        
        try {
          const userDocRef = doc(db, 'users', currentUser.id);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            set((state) => ({
              user: { ...state.user!, ...userDoc.data() } as User
            }));
          }
        } catch (error) {
          console.error("Failed to refresh user profile", error);
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'makin-auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Initialize auth state listener
onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
  if (firebaseUser) {
    try {
      // Fetch rich user data from Firestore
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      let user: User;
      
      if (userDoc.exists()) {
        user = {
          id: firebaseUser.uid,
          email: firebaseUser.email!,
          displayName: firebaseUser.displayName || undefined,
          photoURL: firebaseUser.photoURL || undefined,
          ...userDoc.data(), // Includes role, permissions, status
        } as User;
      } else {
        user = {
          id: firebaseUser.uid,
          email: firebaseUser.email!,
          displayName: firebaseUser.displayName || undefined,
          photoURL: firebaseUser.photoURL || undefined,
        };
      }
      
      useAuthStore.getState().setUser(user);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      // Fallback to basic auth user if Firestore fails
      const user: User = {
        id: firebaseUser.uid,
        email: firebaseUser.email!,
        displayName: firebaseUser.displayName || undefined,
        photoURL: firebaseUser.photoURL || undefined,
      };
      useAuthStore.getState().setUser(user);
    }
  } else {
    useAuthStore.getState().setUser(null);
  }
});

