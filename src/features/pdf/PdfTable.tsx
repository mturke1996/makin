// @ts-nocheck
/**
 * PdfTable — a quiet ledger table.
 *
 * - Header: a pale band with a single ink rule under it. No solid colour block.
 * - Rows: hairline separators only. Numbers are plain; the currency is named once, in the header.
 * - Columns are given in reading order (first = rightmost); money ends up on the physical left.
 * - A cell of kind `stack` carries a title and a muted second line, so a category or a worker
 *   sits under the description instead of taking a column of its own.
 * - No total row by default: the figure is already in the summary strip above. A table that
 *   really needs one passes `footer`.
 */
import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { ar } from './arabicPDF';
import { PDF_FONT_FAMILY } from './pdfFonts';
import { INK, PDF_PAGINATION, PdfMoneyText, PdfSectionHeading } from './pdfKit';

export type PdfColKind = 'text' | 'num' | 'money' | 'date' | 'multiline' | 'stack';

export type PdfColumn = {
  key: string;
  label: string;
  flex: number;
  kind?: PdfColKind;
};

export type PdfStack = { t: string; s?: string };

const FF = PDF_FONT_FAMILY;
const CURRENCY = 'د.ل';

/** Render columns reversed so money ends up on the physical left. */
const visualCols = (columns: PdfColumn[]) => [...columns].reverse();

// The page's bottom padding already keeps clear of the footer, so a row only needs room for itself.
const headPresenceAhead = PDF_PAGINATION.tableHead + PDF_PAGINATION.minRowHeight + 24;

const alignOf = (kind: PdfColKind = 'text') => (kind === 'money' ? 'left' : kind === 'num' || kind === 'date' ? 'center' : 'right');

export function PdfTh({ flex, kind = 'text', children }: { flex: number; kind?: PdfColKind; children: string }) {
  return (
    <View style={{ flex, flexDirection: 'row', justifyContent: kind === 'money' ? 'flex-start' : kind === 'num' || kind === 'date' ? 'center' : 'flex-end', alignItems: 'baseline', gap: 4 }}>
      {kind === 'money' ? <Text style={{ fontSize: 7, color: INK.faint, fontFamily: FF }}>{CURRENCY}</Text> : null}
      <Text style={{ color: INK.text, fontSize: 8.2, fontWeight: 'bold', textAlign: alignOf(kind), lineHeight: 1.35, fontFamily: FF }}>{ar(children)}</Text>
    </View>
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
  const text = kind === 'num' || kind === 'date' ? raw : isMulti && raw === '—' ? raw : ar(raw);
  return (
    <Text
      style={{
        flex,
        fontSize: isMulti ? 8.3 : 9,
        fontWeight: bold ? 'bold' : 'normal',
        color: color || (raw === '—' || raw === '-' ? INK.faint : INK.text),
        textAlign: alignOf(kind),
        lineHeight: isMulti ? 1.6 : 1.45,
        paddingLeft: 4,
        fontFamily: FF,
      }}
    >
      {text}
    </Text>
  );
}

function PdfTdMoney({ flex, amount, color, bold = true }: { flex: number; amount: number; color?: string; bold?: boolean }) {
  return (
    <View style={{ flex, justifyContent: 'center', alignItems: 'flex-start' }}>
      <PdfMoneyText amount={amount} bare style={{ fontSize: 9.2, fontWeight: bold ? 'bold' : 'normal', color: color || INK.text }} />
    </View>
  );
}

const headRow = {
  flexDirection: 'row',
  backgroundColor: INK.panel,
  paddingVertical: 7,
  paddingHorizontal: 8,
  alignItems: 'center',
  borderTopWidth: 0.8,
  borderTopColor: INK.border,
  borderBottomWidth: 1.1,
  borderBottomColor: INK.text,
};

export function PdfTableHead({ columns, fixed = false }: { columns: PdfColumn[]; fixed?: boolean }) {
  return (
    <View style={headRow} fixed={fixed || undefined}>
      {visualCols(columns).map((c) => (
        <PdfTh key={c.key} flex={c.flex} kind={c.kind}>{c.label}</PdfTh>
      ))}
    </View>
  );
}

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
  /** @deprecated the header is always ink on a pale band. */
  primary?: string;
}) {
  const cols = visualCols(columns);
  // A short table is kept whole with its header (never a header alone at the foot of a page). A long one
  // repeats its header on every page it runs onto.
  const repeat = repeatHeader ?? rows.length > 12;
  // Up to six rows stay in one piece with their heading; longer tables flow over pages.
  const whole = rows.length <= 6;
  return (
    <View style={{ marginBottom: 4 }} {...(whole ? { wrap: false } : {})}>
      {heading ? <PdfSectionHeading s={s} hint={hint}>{heading}</PdfSectionHeading> : null}
      {repeat ? <View minPresenceAhead={headPresenceAhead} /> : null}
      <View style={headRow} fixed={repeat || undefined} minPresenceAhead={repeat ? undefined : headPresenceAhead}>
        {cols.map((c) => (
          <PdfTh key={c.key} flex={c.flex} kind={c.kind}>{c.label}</PdfTh>
        ))}
      </View>

      {rows.length === 0 ? (
        <Text style={{ fontSize: 9, color: INK.muted, textAlign: 'center', paddingVertical: 16, fontFamily: FF }}>{ar(emptyMessage)}</Text>
      ) : (
        rows.map((row, i) => (
          <View
            key={i}
            style={{ flexDirection: 'row', paddingVertical: 7, paddingHorizontal: 8, borderBottomWidth: 0.6, borderBottomColor: INK.hair, alignItems: 'flex-start' }}
            wrap={false}
          >
            {cols.map((c) => {
              const kind = c.kind ?? 'text';
              const val = row[c.key] ?? '';
              if (kind === 'money') {
                const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
                return <PdfTdMoney key={c.key} flex={c.flex} amount={Number.isFinite(n) ? n : 0} color={moneyColor} />;
              }
              return <PdfTd key={c.key} flex={c.flex} kind={kind} bold={c.key === 'name' || c.key === 'desc'}>{val}</PdfTd>;
            })}
          </View>
        ))
      )}

      {footer ? (
        <View
          style={{ flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 8, backgroundColor: INK.panel, borderTopWidth: 1.1, borderTopColor: INK.text, alignItems: 'center' }}
          wrap={false}
          minPresenceAhead={PDF_PAGINATION.totalBar}
        >
          {cols
            .filter((c) => c.kind === 'money' && footer.values[c.key] != null)
            .map((c) => (
              <PdfTdMoney key={c.key} flex={c.flex} amount={footer.values[c.key]} color={footer.colors?.[c.key]} />
            ))}
          <Text style={{ flex: 1, fontSize: 9, fontWeight: 'bold', color: INK.text, textAlign: 'right', fontFamily: FF }}>{ar(footer.label)}</Text>
        </View>
      ) : null}
    </View>
  );
}
