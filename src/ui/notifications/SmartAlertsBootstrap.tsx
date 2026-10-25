import { useSmartAlerts } from '../../core/hooks/useSmartAlerts';
import { useDataStore } from '../../stores/useDataStore';

/** يفعّل التنبيهات الذكية بعد تحميل البيانات */
export function SmartAlertsBootstrap() {
  const isLoading = useDataStore((s) => s.isLoading);
  if (isLoading) return null;
  return <SmartAlertsRunner />;
}

function SmartAlertsRunner() {
  useSmartAlerts();
  return null;
}
