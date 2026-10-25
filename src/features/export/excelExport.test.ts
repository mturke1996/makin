import { expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import type { Client, BoqLineItem } from '../../types';
import { buildProjectWorkbook } from './excelExport';
it('exports one RTL workbook with project and quantity sheets, retaining numeric thousandths', () => {
  const client = { id: 'c1', name: 'مشروع اختبار' } as Client;
  const items = [0.1, 0.2].map((total, i) => ({ id: String(i), clientId: 'c1', description: 'بند', unit: 'm2', quantity: 1, unitPrice: total, total })) as BoqLineItem[];
  const wb = buildProjectWorkbook(client, [], items, []);
  const data = XLSX.utils.sheet_to_json(wb.Sheets['الكميات'], { header: 1 }) as (string | number)[][];
  expect(wb.SheetNames).toEqual(['المشروع', 'الكميات']);
  expect(data[data.length - 1][7]).toBe(0.3);
  expect(wb.Sheets['الكميات'].H4.z).toBe('#,##0.000');
  const bytes = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const decoded = XLSX.read(bytes, { type: 'buffer' });
  expect(decoded.SheetNames).toEqual(wb.SheetNames);
});
