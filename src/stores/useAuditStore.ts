import { create } from 'zustand';
import { orderBy, limit } from 'firebase/firestore';
import { auditLogsService } from '../services/firebaseService';
import type { AuditLogEntry } from '../types';

interface AuditState {
  logs: AuditLogEntry[];
  isLoading: boolean;
  subscribe: () => () => void;
}

export const useAuditStore = create<AuditState>((set) => ({
  logs: [],
  isLoading: true,

  subscribe: () => {
    set({ isLoading: true });
    const unsub = auditLogsService.subscribe(
      (data) => set({ logs: data, isLoading: false }),
      [orderBy('createdAt', 'desc'), limit(300)]
    );
    return () => {
      unsub();
      set({ logs: [], isLoading: true });
    };
  },
}));
