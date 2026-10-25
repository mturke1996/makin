import type { ProjectPhase } from "../../types";

type Stage = { key: string; name: string };
export type ProjectTemplate = {
  id: string;
  name: string;
  description: string;
  stages: readonly Stage[];
};

const stage = (key: string, name: string): Stage => ({ key, name });
const survey = stage("survey", "المعاينة والتجهيز");
const structure = stage("structure", "الهيكل الخرساني");
const masonry = stage("masonry", "المباني والقواطع");
const roughMep = stage("rough-mep", "تأسيس الكهرباء والسباكة");
const insulation = stage("insulation", "العزل");
const plaster = stage("plaster", "اللياسة والمحارة");
const floors = stage("floors", "الأرضيات والكسوة");
const openings = stage("openings", "الأبواب والنوافذ");
const finishes = stage("finishes", "الدهانات والتشطيبات النهائية");
const handover = stage("handover", "الاختبارات والتسليم");

/** Starting checklists, not engineering specifications or fabricated budgets. */
export const PROJECT_TEMPLATES: readonly ProjectTemplate[] = [
  {
    id: "new-build",
    name: "بناء جديد",
    description: "من تجهيز الموقع إلى التسليم.",
    stages: [
      survey,
      stage("earthworks", "الحفر والردم"),
      stage("foundations", "الأساسات"),
      structure,
      masonry,
      roughMep,
      insulation,
      plaster,
      floors,
      openings,
      finishes,
      handover,
    ],
  },
  {
    id: "finishing",
    name: "تشطيب",
    description: "لمشروع اكتمل هيكله ويحتاج أعمال التشطيب.",
    stages: [
      survey,
      roughMep,
      insulation,
      plaster,
      floors,
      openings,
      finishes,
      handover,
    ],
  },
  {
    id: "renovation",
    name: "ترميم وتجديد",
    description: "تنظيم الإزالة والإصلاح وإعادة التشطيب.",
    stages: [
      survey,
      stage("demolition", "الإزالة والترحيل"),
      stage("repairs", "الإصلاحات والمعالجة"),
      roughMep,
      insulation,
      plaster,
      floors,
      finishes,
      handover,
    ],
  },
];

export const normalizeStageName = (name: string) =>
  name.trim().replace(/\s+/g, " ").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي");
export const templatePhaseId = (clientId: string, key: string) =>
  `template_${encodeURIComponent(clientId)}_${key}`;

/** The same stable key is shared between templates; applying twice never reopens an existing stage. */
export function buildTemplatePhases(
  template: ProjectTemplate,
  clientId: string,
  existing: readonly ProjectPhase[],
  by: string,
  at: string,
): ProjectPhase[] {
  const scoped = existing.filter((p) => p.clientId === clientId);
  const names = new Set(scoped.map((p) => normalizeStageName(p.name)));
  const ids = new Set(scoped.map((p) => p.id));
  let order = Math.max(
    0,
    ...scoped.map((p) => (Number.isFinite(p.order) ? p.order : 0)),
  );
  return template.stages.flatMap((item) => {
    const id = templatePhaseId(clientId, item.key);
    if (ids.has(id) || names.has(normalizeStageName(item.name))) return [];
    names.add(normalizeStageName(item.name));
    return [
      {
        id,
        clientId,
        name: item.name,
        order: ++order,
        status: "planned" as const,
        createdAt: at,
        updatedAt: at,
        createdBy: by,
      },
    ];
  });
}
