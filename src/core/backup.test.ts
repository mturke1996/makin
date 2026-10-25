import { describe, expect, it } from 'vitest';
import { BACKUP_SETS, backupAgeDays, backupDue, backupFileName, buildBackup, isBackupFile, totalRecords } from './backup';

describe('buildBackup', () => {
  const at = new Date('2026-10-25T09:00:00Z');

  it('carries every collection, counted, with the app\'s bookkeeping fields left out', () => {
    const file = buildBackup({ clients: [{ id: 'c1', name: 'x', _docId: 'c1' }], payments: [{ id: 'p1', amount: 10 }, { id: 'p2', amount: 5 }] }, { at, by: 'م. أحمد' });
    expect(file.format).toBe('makin-backup');
    expect(file.createdAt).toBe('2026-10-25T09:00:00.000Z');
    expect(file.createdBy).toBe('م. أحمد');
    expect(file.data.clients).toEqual([{ id: 'c1', name: 'x' }]);
    expect(file.counts.payments).toBe(2);
    expect(Object.keys(file.data)).toEqual(BACKUP_SETS.map((s) => s.key));
    expect(file.counts.expenses).toBe(0);
    expect(totalRecords(file.counts)).toBe(3);
  });

  it('survives a round trip through JSON', () => {
    const file = buildBackup({ workers: [{ id: 'w1', agreementItems: [{ id: 'i', unitPrice: 12.5 }] }] }, { at, by: 'x' });
    const back = JSON.parse(JSON.stringify(file));
    expect(isBackupFile(back)).toBe(true);
    expect(back.data.workers[0].agreementItems[0].unitPrice).toBe(12.5);
  });
});

describe('isBackupFile', () => {
  it('refuses anything else', () => {
    for (const v of [null, {}, 'x', { format: 'other', version: 1, data: {}, counts: {} }, { format: 'makin-backup', data: {} }]) expect(isBackupFile(v)).toBe(false);
  });
});

describe('backupFileName', () => {
  it('uses the local date and time', () => {
    expect(backupFileName(new Date(2026, 9, 5, 7, 3))).toBe('makin-backup-2026-10-05-0703.json');
    expect(backupFileName(new Date(2026, 9, 5, 7, 3), 'xlsx')).toBe('makin-backup-2026-10-05-0703.xlsx');
  });
});

describe('the reminder', () => {
  const now = new Date('2026-10-25T12:00:00Z');
  it('counts whole days since the last copy', () => {
    expect(backupAgeDays('2026-10-25T08:00:00Z', now)).toBe(0);
    expect(backupAgeDays('2026-10-18T11:00:00Z', now)).toBe(7);
    expect(backupAgeDays(null, now)).toBeNull();
    expect(backupAgeDays('not a date', now)).toBeNull();
  });

  it('is due after a week, or when there never was a copy, but only when there is data', () => {
    expect(backupDue('2026-10-24T12:00:00Z', now, 100)).toBe(false);
    expect(backupDue('2026-10-18T12:00:00Z', now, 100)).toBe(true);
    expect(backupDue(null, now, 100)).toBe(true);
    expect(backupDue(null, now, 0)).toBe(false);
  });
});
