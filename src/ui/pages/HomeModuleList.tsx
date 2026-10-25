import type { ComponentType, ReactNode } from 'react';
import { Section, ListGroup, ListRow, Skeleton } from '../../design-system/primitives';
import { HomeIconTile } from './HomeIconTile';

export interface HomeModule {
  label: string;
  /** One line: what is inside, or the one fact worth knowing. */
  description: ReactNode;
  path: string;
  Icon: ComponentType<{ sx?: object; className?: string }>;
  /** Optional figure at the inline end (e.g. the fund balance). */
  trailing?: ReactNode;
}

interface HomeModuleListProps {
  modules: HomeModule[];
  onOpen: (path: string) => void;
  title: string;
  loading?: boolean;
  className?: string;
}

/** Shortcuts to every module the user may open: one surface, one row each. */
export function HomeModuleList({ modules, onOpen, title, loading, className }: HomeModuleListProps) {
  if (modules.length === 0) return null;
  return (
    <Section title={title} className={className}>
      <ListGroup>
        {modules.map((m) => (
          <ListRow
            key={m.path}
            density="compact"
            leading={<HomeIconTile Icon={m.Icon} />}
            title={m.label}
            subtitle={loading ? <Skeleton height={10} width="45%" className="mt-1.5" /> : m.description}
            trailing={loading ? undefined : m.trailing}
            chevron
            onClick={() => onOpen(m.path)}
          />
        ))}
      </ListGroup>
    </Section>
  );
}
