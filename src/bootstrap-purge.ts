/** Purge poisoned brand/firebase cache from mistaken sync or encoding corruption. */
try {
  const raw = localStorage.getItem('brand-override');
  if (!raw) {
    /* no-op */
  } else if (/rkeaz|ركايز|ركائز|\?\?\?|تطبيقك/.test(raw)) {
    localStorage.removeItem('brand-override');
  } else {
    const parsed = JSON.parse(raw);
    const name = parsed?.state?.override?.name ?? '';
    if (typeof name === 'string' && /\?{2,}/.test(name)) {
      localStorage.removeItem('brand-override');
    } else if (parsed?.state?.override?.firebase) {
      delete parsed.state.override.firebase;
      localStorage.setItem('brand-override', JSON.stringify(parsed));
    }
  }
} catch {
  localStorage.removeItem('brand-override');
}

/**
 * The app used to keep a copy of the data on the device (offline mode). It is online only now: remove what the old
 * versions left behind so it cannot show stale records or take up space.
 */
try {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('app-cache-') || key.startsWith('quick-expense:draft:') || key.startsWith('saas-build.worker-payment.')) localStorage.removeItem(key);
  }
  void (indexedDB as IDBFactory & { databases?: () => Promise<Array<{ name?: string }>> }).databases?.()
    .then((all) => all.forEach((entry) => { if (entry.name?.startsWith('firestore/')) indexedDB.deleteDatabase(entry.name); }))
    .catch(() => undefined);
} catch {
  /* storage is blocked: there is nothing to remove */
}
