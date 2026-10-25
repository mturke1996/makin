// @ts-nocheck
/**
 * PdfTable — a clear, printable ledger table.
 *
 * - Header: white bold words on the brand navy, so it is unmistakable on paper and on screen.
 * - Rows: alternating tints, hairline separators and a light frame on both sides, so the eye can follow a row
 *   across the page. Amounts are set in even-width digits, right-aligned, with one number of
 *   decimals per column so the decimal points line up; the currency is named once, above the table.
 * - Columns are given in reading order (first = rightmost); money ends up on the physical left.
 * - A cell of kind `stack` carries a title and a muted second line, so a category or a worker
 *   sits under the description instead of taking a column of its own.
 * - No total row by default: the figure is already stated above. A table that really needs one passes `footer`.
 */
import { useLabel } from './pdfI18n';
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
  const lb = useLabel();
  return (
    <Text style={{ flex, color: INK.white, fontSize: 8.4, fontWeight: 'bold', textAlign: alignOf(kind), lineHeight: 1.35, fontFamily: FF, paddingHorizontal: 5 }}>
      {ar(lb(children))}
    </Text>
  );
}

function PdfTd({ flex, kind = 'text', color, bold, children }: { flex: number; kind?: PdfColKind; color?: string; bold?: boolean; children: any }) {
  if (kind === 'stack') {
    const v: PdfStack = typeof children === 'object' && children ? children : { t: String(children ?? '') };
    return (
      <View style={{ flex, alignItems: 'flex-end', paddingHorizontal: 5 }}>
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
        paddingHorizontal: 5,
      }}
    >
      {figures ? raw : raw === '—' ? raw : ar(raw)}
    </Text>
  );
}

function PdfTdMoney({ flex, amount, decimals, color, bold }: { flex: number; amount: number; decimals: number; color?: string; bold?: boolean }) {
  return (
    <View style={{ flex, justifyContent: 'center', paddingHorizontal: 5 }}>
      <PdfAmount amount={amount} decimals={decimals} bare size={9.2} bold={!!bold} color={color} />
    </View>
  );
}

const headRow = {
  flexDirection: 'row',
  paddingVertical: 8,
  paddingHorizontal: 6,
  alignItems: 'center',
  backgroundColor: INK.text,
};

/** A body row: tinted on every other line, ruled below, and framed on both sides so the table reads as one block. */
const bodyRow = (index: number, last: boolean) => ({
  flexDirection: 'row',
  paddingVertical: 8,
  paddingHorizontal: 6,
  alignItems: 'center',
  backgroundColor: index % 2 === 1 ? INK.stripe : INK.white,
  borderLeftWidth: 0.6,
  borderLeftColor: INK.tableLine,
  borderRightWidth: 0.6,
  borderRightColor: INK.tableLine,
  borderBottomWidth: last ? 0.9 : 0.5,
  borderBottomColor: last ? INK.text : INK.tableLine,
});

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
    <View key={i} style={bodyRow(i, i === rows.length - 1)} wrap={false}>
      {cols.map((c) => {
        const kind = c.kind ?? 'text';
        const val = row[c.key] ?? '';
        if (kind === 'money') {
          const n = numberOf(val);
          // A figure below zero (an overspent budget, a shortfall) is red unless the table sets its own colour.
          return <PdfTdMoney key={c.key} flex={c.flex} amount={Number.isFinite(n) ? n : 0} decimals={decimals[c.key]} color={moneyColor ?? (n < 0 ? INK.danger : undefined)} bold={c.bold} />;
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
        <Text style={{ fontSize: 9, color: INK.muted, textAlign: 'center', paddingVertical: 16, fontFamily: FF, borderWidth: 0.6, borderColor: INK.border, borderTopWidth: 0 }}>{ar(emptyMessage)}</Text>
      ) : (
        (repeat ? rows : rows.slice(1)).map((row, i) => renderRow(row, repeat ? i : i + 1))
      )}

      {footer ? (
        <View style={{ flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 6, backgroundColor: INK.panel, borderTopWidth: 1, borderTopColor: INK.text, borderBottomWidth: 1, borderBottomColor: INK.text, alignItems: 'center' }} wrap={false} minPresenceAhead={PDF_PAGINATION.totalBar}>
          {cols
            .filter((c) => c.kind === 'money' && footer.values[c.key] != null)
            .map((c) => (
              <PdfTdMoney key={c.key} flex={c.flex} amount={footer.values[c.key]} decimals={decimals[c.key]} color={footer.colors?.[c.key]} bold />
            ))}
          <Text style={{ flex: 1, fontSize: 9.4, fontWeight: 'bold', color: INK.text, textAlign: 'right', fontFamily: FF, paddingHorizontal: 5 }}>{ar(footer.label)}</Text>
        </View>
      ) : null}
    </View>
  );
}
