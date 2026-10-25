import * as XLSX from "xlsx";
import type { Client, ProjectPhase, BoqLineItem } from "../../types";
import type { PhaseBudgetRow } from "../../core/finance/projectBudget";
import { sumMoney, subtractMoney } from "../../core/finance/money";

const BOQ_UNIT_LABELS: Record<string, string> = {
  m2: "م²",
  m3: "م³",
  m: "م.ط",
  kg: "كغ",
  ton: "طن",
  piece: "قطعة",
  lot: "مقطوعية",
  day: "يوم",
};
const PHASE_STATUS_LABELS: Record<string, string> = {
  planned: "مخطط",
  in_progress: "قيد التنفيذ",
  completed: "مكتمل",
  on_hold: "متوقف",
};

type Cell = string | number;
function sheet(rows: Cell[][], widths: number[], moneyColumns: number[]) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = widths.map((wch) => ({ wch }));
  for (let row = 1; row < rows.length; row++)
    for (const col of moneyColumns) {
      const cell = ws[XLSX.utils.encode_cell({ r: row, c: col })];
      if (cell && typeof cell.v === "number") cell.z = "#,##0.000";
    }
  return ws;
}
function workbook() {
  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] };
  return wb;
}
const filenamePart = (name: string) =>
  Array.from(name, (char) => (char.charCodeAt(0) < 32 ? "-" : char))
    .join("")
    .replace(/[<>:"/\\|?*]/g, "-")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 100) || "project";

export function buildBoqSheet(phases: ProjectPhase[], items: BoqLineItem[]) {
  const phaseMap = new Map(phases.map((p) => [p.id, p.name]));
  const rows: Cell[][] = [
    [
      "#",
      "كود البند",
      "الوصف",
      "المرحلة",
      "الوحدة",
      "الكمية",
      "سعر الوحدة",
      "الإجمالي",
      "ملاحظات",
    ],
  ];
  items.forEach((item, i) =>
    rows.push([
      i + 1,
      item.itemCode || "",
      item.description,
      item.phaseId ? phaseMap.get(item.phaseId) || "" : "",
      BOQ_UNIT_LABELS[item.unit] || item.unit,
      item.quantity,
      item.unitPrice,
      item.total,
      item.notes || "",
    ]),
  );
  rows.push([
    "",
    "",
    "الإجمالي",
    "",
    "",
    "",
    "",
    sumMoney(items.map((item) => item.total)),
    "",
  ]);
  return sheet(rows, [6, 16, 42, 28, 12, 14, 18, 20, 40], [6, 7]);
}
export function buildPhaseBudgetSheet(rows: PhaseBudgetRow[]) {
  const data: Cell[][] = [
    [
      "#",
      "المرحلة",
      "الحالة",
      "الميزانية",
      "المصروف الفعلي",
      "الفرق",
      "نسبة الاستهلاك %",
    ],
  ];
  rows.forEach((row, i) =>
    data.push([
      i + 1,
      row.phase.name,
      PHASE_STATUS_LABELS[row.phase.status] || row.phase.status,
      row.budget,
      row.actual,
      row.variance,
      Math.round(row.pctUsed),
    ]),
  );
  const budget = sumMoney(rows.map((row) => row.budget));
  const actual = sumMoney(rows.map((row) => row.actual));
  data.push([
    "",
    "الإجمالي",
    "",
    budget,
    actual,
    subtractMoney(budget, actual),
    budget > 0 ? Math.round((actual / budget) * 100) : 0,
  ]);
  return sheet(data, [6, 36, 20, 20, 20, 20, 22], [3, 4, 5]);
}
/** One portable workbook; browsers no longer need to permit multiple automatic downloads. */
export function buildProjectWorkbook(
  client: Client,
  phases: ProjectPhase[],
  items: BoqLineItem[],
  rows: PhaseBudgetRow[],
) {
  const wb = workbook();
  XLSX.utils.book_append_sheet(
    wb,
    sheet(
      [
        ["المشروع", client.name],
        ["تاريخ التصدير", new Date().toISOString().slice(0, 10)],
        ["عدد المراحل", phases.length],
        ["عدد بنود الكميات", items.length],
      ],
      [24, 48],
      [],
    ),
    "المشروع",
  );
  XLSX.utils.book_append_sheet(wb, buildBoqSheet(phases, items), "الكميات");
  if (rows.length)
    XLSX.utils.book_append_sheet(wb, buildPhaseBudgetSheet(rows), "الميزانية");
  return wb;
}
export function exportBoqToExcel(
  client: Client,
  phases: ProjectPhase[],
  items: BoqLineItem[],
) {
  const wb = workbook();
  XLSX.utils.book_append_sheet(wb, buildBoqSheet(phases, items), "BOQ");
  XLSX.writeFile(wb, `BOQ-${filenamePart(client.name)}.xlsx`, {
    bookType: "xlsx",
  });
}
export function exportPhaseBudgetToExcel(
  client: Client,
  rows: PhaseBudgetRow[],
) {
  const wb = workbook();
  XLSX.utils.book_append_sheet(wb, buildPhaseBudgetSheet(rows), "الميزانية");
  XLSX.writeFile(wb, `Budget-${filenamePart(client.name)}.xlsx`, {
    bookType: "xlsx",
  });
}
export function exportProjectReportToExcel(
  client: Client,
  phases: ProjectPhase[],
  items: BoqLineItem[],
  rows: PhaseBudgetRow[],
) {
  XLSX.writeFile(
    buildProjectWorkbook(client, phases, items, rows),
    `Project-${filenamePart(client.name)}.xlsx`,
    { bookType: "xlsx" },
  );
}
export { BOQ_UNIT_LABELS, PHASE_STATUS_LABELS };
