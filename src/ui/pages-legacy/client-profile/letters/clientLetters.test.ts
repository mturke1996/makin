import { describe, expect, it } from 'vitest';
import type { Letter } from '../../../../types';
import { countLettersByType, selectClientLetters } from './clientLetters';

const letter = (o: Partial<Letter> & { id: string }): Letter => ({
  type: 'official',
  refNumber: o.id,
  date: '2026-10-01',
  recipientName: 'العميل',
  clientId: 'c8',
  subject: 'موضوع',
  greeting: '',
  bodyParagraphs: [''],
  closing: '',
  signerName: '',
  signerTitle: '',
  showStamp: true,
  createdAt: '2026-10-01T08:00:00.000Z',
  ...o,
});

describe('selectClientLetters', () => {
  it('keeps this client only, newest date first, then newest written', () => {
    const list = selectClientLetters(
      [
        letter({ id: 'old', date: '2026-01-01' }),
        letter({ id: 'other', clientId: 'x' }),
        letter({ id: 'none', clientId: undefined }),
        letter({ id: 'new-a', date: '2026-09-01', createdAt: '2026-09-01T08:00:00.000Z' }),
        letter({ id: 'new-b', date: '2026-09-01', createdAt: '2026-09-01T12:00:00.000Z' }),
      ],
      'c8',
    );
    expect(list.map((l) => l.id)).toEqual(['new-b', 'new-a', 'old']);
  });

  it('is empty without a client id', () => {
    expect(selectClientLetters([letter({ id: 'a', clientId: undefined })], undefined)).toEqual([]);
  });
});

describe('countLettersByType', () => {
  it('counts every type, including those with none', () => {
    const counts = countLettersByType([letter({ id: 'a' }), letter({ id: 'b', type: 'offer' }), letter({ id: 'c', type: 'offer' })]);
    expect(counts).toEqual([
      { type: 'official', count: 1 },
      { type: 'offer', count: 2 },
      { type: 'entitlement', count: 0 },
    ]);
  });
});
