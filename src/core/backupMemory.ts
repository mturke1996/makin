const KEY = 'makin.backup.last';

/** When a copy was last taken ON THIS DEVICE (a copy taken on another computer is not known here). */
export function readLastBackup(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function rememberBackup(at: Date): void {
  try {
    localStorage.setItem(KEY, at.toISOString());
  } catch {
    /* private window or blocked storage: the reminder simply stays on */
  }
}
