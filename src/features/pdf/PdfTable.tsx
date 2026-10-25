// @ts-nocheck
/**
 * PdfTable — a quiet ledger table.
 *
 * - Header: bold words between a hairline above and an ink rule below. No fill, no colour block.
 * - Rows: hairline separators only. Amounts are set in even-width digits, right-aligned, with one number of
 *   decimals per column so the decimal points line up; the currency is named once, in the header.
 * - Columns are given in reading order (first = rightmost); money ends up on the physical left.
 * - A cell of kind `stack` carries a title and a muted second line, so a category or a worker
 *   sits under the description instead of taking a column of its own.
 * - No total row by default: the figure is already stated above. A table that really needs one passes `footer`.
 */
import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { ar } from './arabicPDF';
import { PDF_FONT_FAMILY, PDF_NUM_FONT } from './pdfFonts';
import { INK, PDF_PAGINATION, PdfAmount, PdfSectionHeading, decimalsFor } from './pdfKit';

export type PdfColKind = 'text' | 'num' | 'money' | 'date' | 'multiline' | 'stack';

export type PdfColumn = {
  key: string;
  label: string;
  flex: number;
  kind?: PdfColKind;
  /** Full weight for the figure or title that matters most in the row (the amount, the balance). */
  bold?: boolean;
};

export type PdfStack = { t: string; s?: string };

const FF = PDF_FONT_FAMILY;
const NUM = PDF_NUM_FONT;
/** Said once, above the table, instead of in every column header. */
const UNIT_NOTE = 'المبالغ بالدينار الليبي (د.ل)';

/** Render columns reversed so money ends up on the physical left. */
const visualCols = (columns: PdfColumn[]) => [...columns].reverse();


const alignOf = (kind: PdfColKind = 'text') => (kind === 'num' || kind === 'date' ? 'center' : 'right');

export function PdfTh({ flex, kind = 'text', children }: { flex: number; kind?: PdfColKind; children: string }) {
  return (
    <Text style={{ flex, color: INK.text, fontSize: 8.2, fontWeight: 'bold', textAlign: alignOf(kind), lineHeight: 1.35, fontFamily: FF, paddingLeft: 4 }}>
      {ar(children)}
    </Text>
  );
}

function PdfTd({ flex, kind = 'text', color, bold, children }: { flex: number; kind?: PdfColKind; color?: string; bold?: boolean; children: any }) {
  if (kind === 'stack') {
    const v: PdfStack = typeof children === 'object' && children ? children : { t: String(children ?? '') };
    return (
      <View style={{ flex, alignItems: 'flex-end', paddingLeft: 4 }}>
        <Text style={{ fontSize: 9, fontWeight: bold ? 'bold' : 'normal', color: color || INK.text, textAlign: 'right', lineHeight: 1.45, fontFamily: FF }}>{ar(v.t)}</Text>
        {v.s ? <Text style={{ fontSize: 7.6, color: INK.faint, textAlign: 'right', lineHeight: 1.5, marginTop: 1, fontFamily: FF }}>{ar(v.s)}</Text> : null}
      </View>
    );
  }
  const raw = String(children ?? '');
  const isMulti = kind === 'multiline';
  const figures = kind === 'num' || kind === 'date';
  return (
    <Text
      style={{
        flex,
        fontFamily: figures ? NUM : FF,
        fontSize: figures ? 8.6 : isMulti ? 8.3 : 9,
        fontWeight: bold ? 'bold' : 'normal',
        color: color || (raw === '—' || raw === '-' ? INK.faint : INK.text),
        textAlign: alignOf(kind),
        lineHeight: isMulti ? 1.6 : 1.45,
        paddingLeft: 4,
      }}
    >
      {figures ? raw : raw === '—' ? raw : ar(raw)}
    </Text>
  );
}

function PdfTdMoney({ flex, amount, decimals, color, bold }: { flex: number; amount: number; decimals: number; color?: string; bold?: boolean }) {
  return (
    <View style={{ flex, justifyContent: 'center', paddingLeft: 4 }}>
      <PdfAmount amount={amount} decimals={decimals} bare size={9.2} bold={!!bold} color={color} />
    </View>
  );
}

const headRow = {
  flexDirection: 'row',
  paddingVertical: 7,
  paddingHorizontal: 6,
  alignItems: 'flex-end',
  borderTopWidth: 0.6,
  borderTopColor: INK.border,
  borderBottomWidth: 1,
  borderBottomColor: INK.text,
};

const numberOf = (val: any) => (typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')));

export function PdfTable({
  s,
  heading,
  hint,
  columns,
  rows,
  emptyMessage = 'لا توجد بيانات',
  footer,
  moneyColor,
  repeatHeader,
}: {
  /** With `heading`: the section title printed above the table and kept together with it. */
  s?: any;
  heading?: string;
  hint?: string;
  columns: PdfColumn[];
  rows: Record<string, string | number | PdfStack>[];
  emptyMessage?: string;
  /** Only for a table whose total is not already stated above it. */
  footer?: { label: string; values: Record<string, number>; colors?: Record<string, string> };
  moneyColor?: string;
  /** Repeat the column header on every page the table runs onto (default: tables over 12 rows). */
  repeatHeader?: boolean;
  /** @deprecated the header is always ink on white. */
  primary?: string;
}) {
  const cols = visualCols(columns);
  // One number of decimals per money column (none for whole dinars, else three), so the points line up.
  const decimals = Object.fromEntries(
    columns
      .filter((c) => c.kind === 'money')
      .map((c) => [c.key, decimalsFor([...rows.map((r) => numberOf(r[c.key])), footer?.values?.[c.key] ?? 0].filter(Number.isFinite))]),
  );
  // A short table is kept whole with its header and heading (never a header alone at the foot of a page).
  // A long one repeats its header on every page it runs onto.
  const repeat = repeatHeader ?? rows.length > 12;
  const whole = rows.length <= 6;
  const renderRow = (row, i) => (
    <View key={i} style={{ flexDirection: 'row', paddingVertical: 7, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: INK.hair, alignItems: 'flex-start' }} wrap={false}>
      {cols.map((c) => {
        const kind = c.kind ?? 'text';
        const val = row[c.key] ?? '';
        if (kind === 'money') {
          const n = numberOf(val);
          return <PdfTdMoney key={c.key} flex={c.flex} amount={Number.isFinite(n) ? n : 0} decimals={decimals[c.key]} color={moneyColor} bold={c.bold} />;
        }
        return <PdfTd key={c.key} flex={c.flex} kind={kind} bold={c.bold}>{val}</PdfTd>;
      })}
    </View>
  );
  const head = (
    <View style={headRow} fixed={repeat || undefined}>
      {cols.map((c) => (
        <PdfTh key={c.key} flex={c.flex} kind={c.kind}>{c.label}</PdfTh>
      ))}
    </View>
  );
  const hasMoney = columns.some((c) => c.kind === 'money');
  const caption = [hint, hasMoney ? UNIT_NOTE : null].filter(Boolean).join('   ·   ');
  const title = heading ? (
    <PdfSectionHeading s={s} hint={caption}>{heading}</PdfSectionHeading>
  ) : hasMoney ? (
    <Text style={{ fontSize: 7.4, color: INK.faint, textAlign: 'right', marginBottom: 4, fontFamily: FF }}>{ar(UNIT_NOTE)}</Text>
  ) : null;
  return (
    <View style={{ marginBottom: 4 }} {...(whole ? { wrap: false } : {})}>
      {repeat ? (
        // A long table repeats its header on every page, so the header must be a direct child of the table.
        <>
          <View wrap={false} minPresenceAhead={110}>{title}</View>
          {head}
        </>
      ) : (
        // A short one keeps the heading, the header and the first row together, so a page never ends on a heading alone.
        <View wrap={false}>
          {title}
          {head}
          {rows.length > 0 ? renderRow(rows[0], 0) : null}
        </View>
      )}
      {rows.length === 0 ? (
        <Text style={{ fontSize: 9, color: INK.muted, textAlign: 'center', paddingVertical: 16, fontFamily: FF }}>{ar(emptyMessage)}</Text>
      ) : (
        (repeat ? rows : rows.slice(1)).map((row, i) => renderRow(row, repeat ? i : i + 1))
      )}

      {footer ? (
        <View style={{ flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 6, borderTopWidth: 1, borderTopColor: INK.text, alignItems: 'center' }} wrap={false} minPresenceAhead={PDF_PAGINATION.totalBar}>
          {cols
            .filter((c) => c.kind === 'money' && footer.values[c.key] != null)
            .map((c) => (
              <PdfTdMoney key={c.key} flex={c.flex} amount={footer.values[c.key]} decimals={decimals[c.key]} color={footer.colors?.[c.key]} bold />
            ))}
          <Text style={{ flex: 1, fontSize: 9, fontWeight: 'bold', color: INK.text, textAlign: 'right', fontFamily: FF }}>{ar(footer.label)}</Text>
        </View>
      ) : null}
    </View>
  );
}
