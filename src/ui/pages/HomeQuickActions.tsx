import type { ReactNode } from 'react';
import { Button } from '../../design-system/primitives';
import { cn } from '../../design-system/primitives/cn';

export interface QuickAction {
  label: string;
  path: string;
  icon: ReactNode;
}

interface HomeQuickActionsProps {
  /** The first action is the primary one (filled); the rest are outlined. */
  actions: QuickAction[];
  onOpen: (path: string) => void;
  label: string;
  className?: string;
}

/**
 * Three-ish things people do every day. One filled button, the others outlined,
 * so the thumb always knows where "new invoice" is.
 */
export function HomeQuickActions({ actions, onOpen, label, className }: HomeQuickActionsProps) {
  if (actions.length === 0) return null;
  const count = actions.length;
  return (
    <div role="group" aria-label={label} className={cn('grid grid-cols-2 gap-3 lg:grid-cols-1', className)}>
      {actions.map((a, i) => (
        <Button
          key={a.path}
          size="lg"
          block
          variant={i === 0 ? 'primary' : 'outline'}
          leftIcon={a.icon}
          onClick={() => onOpen(a.path)}
          // With 3 actions (or 1) the primary spans the row on phones; with 2 they share it.
          className={cn(i === 0 && count !== 2 && 'col-span-2 lg:col-span-1')}
        >
          {a.label}
        </Button>
      ))}
    </div>
  );
}
