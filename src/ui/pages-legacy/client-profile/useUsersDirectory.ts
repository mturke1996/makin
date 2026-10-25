import { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import type { SystemUser } from './types';

/**
 * The users directory (names and roles of colleagues), live.
 *
 * Firestore only lets some people read it (`access.canViewDirectory`), and a refused listener is an
 * error, not an empty list. So the subscription exists only while `enabled` is true; for everybody
 * else this returns an empty list and never touches the `users` collection.
 */
export function useUsersDirectory(enabled: boolean): SystemUser[] {
  const [users, setUsers] = useState<SystemUser[]>([]);

  useEffect(() => {
    if (!enabled) {
      setUsers([]);
      return;
    }
    const unsubscribe = onSnapshot(
      query(collection(db, 'users')),
      (snap) => setUsers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SystemUser, 'id'>) }))),
      (error) => {
        console.warn('[access] users directory unavailable:', error);
        setUsers([]);
      }
    );
    return () => unsubscribe();
  }, [enabled]);

  return users;
}
