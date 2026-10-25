import { useEffect, useRef } from 'react';
import { useDataStore } from '../../stores/useDataStore';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { useAccess } from '../access/useAccess';
import { alertAllowFor, buildSmartAlerts } from './smartAlerts';

const DAY_MS = 86_400_000;

export function useSmartAlerts() {
  const { invoices, payments, clients, projectPhases, expenses, standaloneDebts, isLoading } = useDataStore();
  const items = useNotificationStore((s) => s.items);
  const push = useNotificationStore((s) => s.push);
  const triggeredRef = useRef(false);
  const access = useAccess();

  useEffect(() => {
    // Wait for the data (and for the person): alerts quote names and amounts, so they are raised only from
    // what this person holds and only for the areas they can open (see `alertAllowFor`).
    if (isLoading || !access.principal || triggeredRef.current) return;
    triggeredRef.current = true;

    const alerts = buildSmartAlerts({
      allow: alertAllowFor(access.principal),
      invoices,
      payments,
      clients,
      projectPhases,
      expenses: access.listableExpenses(expenses),
      standaloneDebts,
    });

    for (const alert of alerts) {
      const duplicate = items.some(
        (i) =>
          i.title === alert.title &&
          (i.body === alert.body || i.href === alert.href) &&
          Date.now() - i.createdAt < DAY_MS
      );
      if (duplicate) continue;
      push({
        type: alert.type,
        title: alert.title,
        body: alert.body,
        href: alert.href,
        source: 'in_app',
      });
    }
    // runs once per session, after the data is ready (the ref guards every later change)
  }, [isLoading, invoices, payments, clients, projectPhases, expenses, standaloneDebts, items, push, access]);
}
