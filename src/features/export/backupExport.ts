import * as XLSX from 'xlsx';
import { BACKUP_SETS, backupFileName, type BackupFile } from '../../core/backup';

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** The whole copy as one JSON file: the complete, exact form (nested lists such as agreement items stay whole). */
export function downloadBackupJson(file: BackupFile, at = new Date(file.createdAt)) {
  save(new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }), backupFileName(at, 'json'));
}

const cell = (value: unknown): string | number | boolean => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return value as string | number | boolean;
};

/** The same copy for people who read it in Excel: a sheet per collection, nested values written as JSON text. */
export function downloadBackupExcel(file: BackupFile, at = new Date(file.createdAt)) {
  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] };
  for (const { key, label } of BACKUP_SETS) {
    const rows = file.data[key] as Record<string, unknown>[];
    const columns = ['id', ...Array.from(new Set(rows.flatMap((r) => Object.keys(r)))).filter((k) => k !== 'id')];
    const body = rows.length === 0 ? [['لا سجلات']] : [columns, ...rows.map((r) => columns.map((c) => cell(r[c])))];
    const ws = XLSX.utils.aoa_to_sheet(body);
    ws['!cols'] = columns.map((c) => ({ wch: Math.min(40, Math.max(10, c.length + 2)) }));
    XLSX.utils.book_append_sheet(wb, ws, label.slice(0, 31));
  }
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  save(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), backupFileName(at, 'xlsx'));
}
