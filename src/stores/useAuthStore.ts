import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { User } from '../types';
import { normalizePermissions } from '../core/access/permissions';
import { normalizeRole } from '../core/access/principal';
import { useDataStore } from './useDataStore';
import { useNotificationStore } from './useNotificationStore';

type FirebaseIdentity = { email: string | null; displayName: string | null; photoURL: string | null };

/** Builds the app's user from the sign-in identity plus the profile document (when there is one). */
function toUser(uid: string, identity: FirebaseIdentity, profile: Record<string, unknown> | undefined): User {
  const role = profile ? normalizeRole(profile.role as string | undefined) : 'employee';
  return {
    id: uid,
    email: identity.email || (profile?.email as string) || '',
    displayName: (profile?.displayName as string) || identity.displayName || 'مستخدم النظام',
    photoURL: identity.photoURL || undefined,
    role,
    // Only employees carry a list; an account without one gets the default set in buildPrincipal.
    ...(role === 'employee' && Array.isArray(profile?.permissions) ? { permissions: normalizePermissions(profile!.permissions) } : {}),
  };
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  /** First auth check on app start (the app shows a splash only for this). */
  isLoading: boolean;
  /** A sign-in / sign-out request is in flight (the UI stays mounted; buttons show a busy state). */
  isSubmitting: boolean;
  /**
   * Signed in with Firebase but no profile document in `users`: the account was never registered or
   * was removed. Such a person can open nothing (the rules agree) and sees an explanation.
   */
  profileMissing: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => (() => void);
  setUser: (user: User | null) => void;
}

/** One live listener on the signed-in person's own profile, so a change of role or permissions applies at once. */
let stopProfileWatch: Unsubscribe | null = null;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      const watchProfile = (uid: string, identity: FirebaseIdentity) => {
        stopProfileWatch?.();
        stopProfileWatch = onSnapshot(
          doc(db, 'users', uid),
          (snap) => {
            const profile = snap.exists() ? (snap.data() as Record<string, unknown>) : undefined;
            set({ user: toUser(uid, identity, profile), isAuthenticated: true, isLoading: false, profileMissing: !snap.exists() });
          },
          (error) => {
            // Offline or rules outage: keep what we have for this same person, otherwise nothing.
            console.warn('[auth] profile watch failed:', error?.code || error?.message);
            const current = get().user;
            set({
              user: current?.id === uid ? current : toUser(uid, identity, { role: 'employee', permissions: [] }),
              isAuthenticated: true,
              isLoading: false,
            });
          },
        );
      };

      return {
        user: null,
        isAuthenticated: false,
        isLoading: true,
        isSubmitting: false,
        profileMissing: false,
        error: null,

        login: async (email, password) => {
          set({ isSubmitting: true, error: null });
          try {
            const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password);
            watchProfile(firebaseUser.uid, firebaseUser);
            set({ isSubmitting: false });
          } catch (error: any) {
            let errorMessage = 'فشل تسجيل الدخول';
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
              errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
            } else if (error.code === 'auth/too-many-requests') {
              errorMessage = 'محاولات كثيرة خاطئة. يرجى المحاولة لاحقاً';
            } else if (error.code === 'auth/configuration-not-found' || String(error.message).includes('CONFIGURATION_NOT_FOUND')) {
              errorMessage = 'تفعيل Email/Password مطلوب من Firebase Console → Authentication → Sign-in method';
            } else if (error.code === 'auth/network-request-failed') {
              errorMessage = 'فشل الاتصال بالشبكة. تحقّق من الإنترنت.';
            } else if (error.code === 'auth/invalid-api-key' || error.code === 'auth/api-key-not-valid') {
              errorMessage = 'مفتاح Firebase غير صالح — تحقّق من الإعدادات.';
            }
            set({ error: errorMessage, isSubmitting: false });
            throw error;
          }
        },

        logout: async () => {
          set({ isSubmitting: true });
          try {
            // Drop everything the next person on this device must not inherit.
            stopProfileWatch?.();
            stopProfileWatch = null;
            useNotificationStore.getState().clear();
            useDataStore.getState().reset();
            await firebaseSignOut(auth);
            set({ user: null, isAuthenticated: false, profileMissing: false, isSubmitting: false });
            // Clear the persisted session from localStorage on explicit logout
            localStorage.removeItem('auth-storage');
          } catch {
            set({ error: 'فشل تسجيل الخروج', isSubmitting: false });
          }
        },

        checkAuth: () => {
          let hasPersistedUser = false;
          try {
            const parsed = JSON.parse(localStorage.getItem('auth-storage') || '{}');
            hasPersistedUser = !!(parsed?.state?.isAuthenticated && parsed?.state?.user);
          } catch {}

          // A remembered session paints immediately; the live profile below corrects it within a moment.
          if (hasPersistedUser) set({ isLoading: false });

          const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
              watchProfile(firebaseUser.uid, firebaseUser);
            } else if (hasPersistedUser && get().user) {
              // Firebase session expired but a local session exists — keep the shell, rules will refuse data.
              set({ isLoading: false });
            } else {
              stopProfileWatch?.();
              stopProfileWatch = null;
              set({ user: null, isAuthenticated: false, isLoading: false, profileMissing: false });
            }
          });
          return () => {
            unsubscribe();
            stopProfileWatch?.();
            stopProfileWatch = null;
          };
        },

        setUser: (user) => set({ user, isAuthenticated: !!user }),
      };
    },
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
);
