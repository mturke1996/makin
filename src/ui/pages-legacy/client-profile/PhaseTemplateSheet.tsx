import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Button, Sheet } from "../../../design-system/primitives";
import {
  PROJECT_TEMPLATES,
  buildTemplatePhases,
} from "../../../core/finance/projectTemplates";
import { applyProjectTemplate } from "../../../services/projectTemplatesService";
import { db } from "../../../config/firebase";
import { useAuthStore } from "../../../stores/useAuthStore";
import type { Client, ProjectPhase } from "../../../types";

export function PhaseTemplateSheet({
  client,
  phases,
  onClose,
}: {
  client: Client;
  phases: ProjectPhase[];
  onClose: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const [selected, setSelected] = useState(PROJECT_TEMPLATES[0].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const template = PROJECT_TEMPLATES.find((t) => t.id === selected)!;
  const candidates = useMemo(
    () =>
      buildTemplatePhases(
        template,
        client.id,
        phases,
        user?.id ?? "",
        new Date().toISOString(),
      ),
    [template, client.id, phases, user?.id],
  );
  const apply = async () => {
    if (!user || busy || !candidates.length) return;
    setBusy(true);
    setError("");
    try {
      const count = await applyProjectTemplate(db, client.id, candidates);
      toast.success(count ? `أُضيفت ${count} مرحلة` : "المراحل موجودة بالفعل");
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "تعذّر إضافة المراحل. حاول مجددًا.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet
      open
      onClose={() => {
        if (!busy) onClose();
      }}
      title="قوالب مراحل المشروع"
      subtitle={client.name}
      maxWidth="sm"
      footer={
        <Button
          block
          loading={busy}
          disabled={!user || !candidates.length || busy}
          onClick={apply}
        >
          إضافة المراحل ({candidates.length})
        </Button>
      }
    >
      <div className="space-y-5 p-4 lg:p-6">
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold text-fg">
            اختر نوع المشروع
          </legend>
          {PROJECT_TEMPLATES.map((item) => (
            <label
              key={item.id}
              className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-border p-3 has-[:checked]:border-accent has-[:checked]:bg-accent-soft"
            >
              <input
                type="radio"
                name="project-template"
                value={item.id}
                checked={selected === item.id}
                disabled={busy}
                onChange={() => {
                  setSelected(item.id);
                  setError("");
                }}
                className="size-5 accent-accent"
              />
              <span>
                <span className="block text-sm font-semibold text-fg">
                  {item.name}
                </span>
                <span className="text-xs text-fg-subtle">
                  {item.description}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
        <div>
          <h3 className="text-sm font-semibold text-fg">المراحل التي ستُضاف</h3>
          <p className="mt-1 text-sm leading-relaxed text-fg-subtle">
            تُضاف بحالة «مخطط». يمكنك تعديلها وتحديد ميزانياتها وتواريخها
            لاحقًا. المراحل الموجودة تبقى كما هي.
          </p>
          {candidates.length ? (
            <ol className="mt-3 divide-y divide-border rounded-xl border border-border px-3">
              {candidates.map((p) => (
                <li key={p.id} className="flex gap-3 py-3 text-sm text-fg">
                  <span className="tabular-nums text-fg-muted">{p.order}</span>
                  {p.name}
                </li>
              ))}
            </ol>
          ) : (
            <p role="status" className="mt-3 text-sm text-fg-subtle">
              كل مراحل هذا القالب موجودة في المشروع.
            </p>
          )}
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger-ink">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  );
}
