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
