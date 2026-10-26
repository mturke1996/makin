import { useEffect, useState } from 'react';

const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

/** The app works online only: with no connection nothing can be saved, so the person is told before they try. */
export function OfflineBanner() {
  const [offline, setOffline] = useState(isOffline);
  useEffect(() => {
    const sync = () => setOffline(isOffline());
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);
  if (!offline) return null;
  return (
    <div role="alert" className="fixed inset-x-0 top-0 z-[1300] bg-danger px-4 py-2 text-center text-sm font-semibold text-white">
      لا يوجد اتصال بالإنترنت. لا يمكن تسجيل أو تعديل أي شيء حتى يعود الاتصال.
    </div>
  );
}
