import { useEffect, useRef, useState } from 'react';
import { Check } from '../../../design-system/icons';
import {
  PERMISSIONS,
  PERMISSION_GROUPS,
  PERMISSION_TEMPLATES,
  normalizePermissions,
  type Permission,
  type PermissionDef,
  type PermissionGroup,
} from '../../../core/access';
import { ListGroup, ListRow, Segmented, SwitchRow } from '../../../design-system/primitives';
import { AccessSummaryBar } from './AccessSummary';
import { applyToggle, matchTemplate } from './accessSummaryModel';

interface PermissionsEditorProps {
  value: readonly Permission[];
  onChange: (next: Permission[]) => void;
  /** Lists what is granted and nothing else: for someone looking at their own access. */
  readOnly?: boolean;
}

/** The "this switch changed others" line. Scrolls itself into view: it sits under the group, often below the fold. */
function ToggleNote({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest' });
  }, [text]);
  return (
    <p ref={ref} role="status" className="rounded-md bg-info-soft px-3 py-2 text-xs leading-relaxed text-info-ink">
      {text}
    </p>
  );
}

const TEMPLATE_OPTIONS = PERMISSION_TEMPLATES.map((t) => ({ value: t.id, label: t.label }));

/**
 * What an employee may do: one-tap templates as a starting point, then a switch per permission.
 * Prerequisites switch on and dependents switch off through `togglePermission`, and a line under the
 * group says so whenever a switch moved others.
 */
export function PermissionsEditor({ value, onChange, readOnly }: PermissionsEditorProps) {
  const [note, setNote] = useState<{ group: PermissionGroup; text: string } | null>(null);
  const selected = new Set(value);
  const template = matchTemplate(value);

  const toggle = (def: PermissionDef, on: boolean) => {
    const result = applyToggle(value, def.id, on);
    onChange(result.next);
    setNote(result.note ? { group: def.group, text: result.note } : null);
  };

  const pickTemplate = (id: string) => {
    const picked = PERMISSION_TEMPLATES.find((t) => t.id === id);
    if (!picked) return;
    onChange(normalizePermissions(picked.permissions));
    setNote(null);
  };

  const groups = PERMISSION_GROUPS.map((group) => {
    const defs = PERMISSIONS.filter((p) => p.group === group.id);
    return { ...group, defs, on: defs.filter((d) => selected.has(d.id)).length };
  }).filter((group) => !readOnly || group.on > 0);

  return (
    <div className="space-y-5">
      {!readOnly && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-fg-subtle">ابدأ من قالب جاهز</p>
          <Segmented<string>
            layout="scroll"
            className="flex-wrap"
            aria-label="قوالب الصلاحيات"
            options={TEMPLATE_OPTIONS}
            value={template?.id ?? ''}
            onChange={pickTemplate}
          />
          <p className="text-xs leading-relaxed text-fg-muted">
            {template
              ? template.description
              : value.length === 0
                ? 'القالب نقطة بداية فقط، ويمكنك تعديل أي صلاحية بعده.'
                : 'مخصّص: عدّلت على القالب، أو اخترت الصلاحيات بنفسك.'}
          </p>
        </div>
      )}

      <AccessSummaryBar permissions={value} sticky={!readOnly} />

      {groups.map((group) => (
        <section key={group.id} aria-labelledby={`perm-group-${group.id}`} className="space-y-2">
          <header className="flex items-baseline justify-between gap-3 px-1">
            <h3 id={`perm-group-${group.id}`} className="text-sm font-semibold text-fg">
              {group.label}
            </h3>
            {!readOnly && (
              <span className="text-xs tabular-nums text-fg-muted">
                {group.on} من {group.defs.length}
              </span>
            )}
          </header>
          <ListGroup>
            {readOnly
              ? group.defs
                  .filter((def) => selected.has(def.id))
                  .map((def) => (
                    <ListRow
                      key={def.id}
                      density="compact"
                      leading={<Check sx={{ fontSize: 20 }} className="text-success-ink" aria-hidden />}
                      title={def.label}
                      subtitle={def.hint}
                    />
                  ))
              : group.defs.map((def) => (
                  <SwitchRow
                    key={def.id}
                    title={def.label}
                    subtitle={def.hint}
                    checked={selected.has(def.id)}
                    onChange={(on) => toggle(def, on)}
                  />
                ))}
          </ListGroup>
          {note?.group === group.id && <ToggleNote text={note.text} />}
        </section>
      ))}
    </div>
  );
}
