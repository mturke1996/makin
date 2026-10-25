// @ts-nocheck
/**
 * PdfTable — debtflow-pro layout: flex row, amount columns on physical left.
 */
import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { ar } from './arabicPDF';
import { PDF_FONT_FAMILY } from './pdfFonts';
import { INK, PDF_PAGINATION, PdfMoneyText } from './pdfKit';

export type PdfColKind = 'text' | 'num' | 'money' | 'date' | 'multiline';

export type PdfColumn = {
  key: string;
  label: string;
  flex: number;
  kind?: PdfColKind;
};

const FF = PDF_FONT_FAMILY;

const headStyle = {
  flexDirection: 'row',
  backgroundColor: '#003366',
  paddingVertical: 8,
  paddingHorizontal: 10,
  alignItems: 'center',
  borderRadius: 3,
  marginBottom: 2,
};

const rowStyle = {
  flexDirection: 'row',
  paddingVertical: 9,
  paddingHorizontal: 10,
  borderBottomWidth: 1,
  borderBottomColor: '#f0efeb',
  alignItems: 'flex-start',
};

const footStyle = {
  flexDirection: 'row',
  paddingVertical: 8,
  paddingHorizontal: 10,
  backgroundColor: '#f0ede7',
  borderTopWidth: 1.5,
  borderTopColor: '#003366',
  marginTop: 1,
  borderRadius: 2,
  alignItems: 'center',
};

/** Render columns reversed so money ends up on physical left (debtflow-pro). */
const visualCols = (columns: PdfColumn[]) => [...columns].reverse();

const rowPresenceAhead = PDF_PAGINATION.minRowHeight + PDF_PAGINATION.footerReserve;
const headPresenceAhead = PDF_PAGINATION.tableHead + PDF_PAGINATION.minRowHeight + PDF_PAGINATION.footerReserve;

export function PdfMoneyInline({
  amount,
  size = 9,
  color = INK.text,
  bold = true,
}: {
  amount: number;
  size?: number;
  color?: string;
  bold?: boolean;
}) {
  return <PdfMoneyText amount={amount} style={{ fontSize: size, fontWeight: bold ? 'bold' : 'normal', color }} />;
}

export function PdfTh({ flex, kind = 'text', children }: { flex: number; kind?: PdfColKind; children: string }) {
  const align = kind === 'money' ? 'left' : kind === 'num' || kind === 'date' ? 'center' : 'right';
  return (
    <Text style={{ flex, color: INK.white, fontSize: 8.5, fontWeight: 'bold', textAlign: align, lineHeight: 1.4, fontFamily: FF }}>
      {ar(children)}
    </Text>
  );
}

function PdfTd({
  flex,
  kind = 'text',
  color,
  children,
}: {
  flex: number;
  kind?: PdfColKind;
  color?: string;
  children: string | number;
}) {
  const align = kind === 'num' || kind === 'date' ? 'center' : 'right';
  const isMultiline = kind === 'multiline';
  const raw = String(children ?? '');
  const text = kind === 'num' || kind === 'date' ? raw : isMultiline && raw === '—' ? raw : ar(raw);
  return (
    <Text
      style={{
        flex,
        fontSize: isMultiline ? 8.5 : 9,
        color: color || INK.text,
        textAlign: align,
        lineHeight: isMultiline ? 1.65 : 1.45,
        fontFamily: FF,
      }}
    >
      {text}
    </Text>
  );
}

function PdfTdMoney({ flex, amount, color }: { flex: number; amount: number; color?: string }) {
  return (
    <View style={{ flex, justifyContent: 'center', alignItems: 'flex-start' }}>
      <PdfMoneyInline amount={amount} color={color || INK.text} bold />
    </View>
  );
}

export function PdfTableHead({
  columns,
  primary,
  fixed = false,
}: {
  columns: PdfColumn[];
  primary?: string;
  fixed?: boolean;
}) {
  const cols = visualCols(columns);
  const headBg = primary || '#003366';
  return (
    <View style={[headStyle, { backgroundColor: headBg }]} fixed={fixed || undefined}>
      {cols.map((c) => (
        <PdfTh key={c.key} flex={c.flex} kind={c.kind}>{c.label}</PdfTh>
      ))}
    </View>
  );
}

export function PdfSectionTitle({ children, primary }: { children: string; primary?: string }) {
  return (
    <Text
      style={{
        fontSize: 10.5,
        fontWeight: 'bold',
        color: primary || '#003366',
        marginBottom: 6,
        marginTop: 12,
        paddingBottom: 4,
        borderBottomWidth: 1.5,
        borderBottomColor: INK.border,
        textAlign: 'right',
        fontFamily: FF,
      }}
    >
      {ar(children)}
    </Text>
  );
}

export function PdfTable({
  columns,
  rows,
  primary,
  emptyMessage = 'لا توجد بيانات',
  footer,
  moneyColor,
  repeatHeader = false,
}: {
  columns: PdfColumn[];
  rows: Record<string, string | number>[];
  primary?: string;
  emptyMessage?: string;
  footer?: { label: string; values: Record<string, number>; colors?: Record<string, string> };
  moneyColor?: string;
  /** Repeat column headers on each page when the table spans multiple pages */
  repeatHeader?: boolean;
}) {
  const cols = visualCols(columns);
  const headBg = primary || '#003366';

  return (
    <View style={{ marginBottom: 4 }}>
      {repeatHeader ? (
        <>
          <View minPresenceAhead={headPresenceAhead} />
          <PdfTableHead columns={columns} primary={primary} fixed />
        </>
      ) : (
        <View style={[headStyle, { backgroundColor: headBg }]} minPresenceAhead={headPresenceAhead}>
          {cols.map((c) => (
            <PdfTh key={c.key} flex={c.flex} kind={c.kind}>{c.label}</PdfTh>
          ))}
        </View>
      )}

      {rows.length === 0 ? (
        <Text style={{ fontSize: 9, color: INK.muted, textAlign: 'center', paddingVertical: 14, fontFamily: FF }}>
          {ar(emptyMessage)}
        </Text>
      ) : (
        rows.map((row, i) => (
          <View
            key={i}
            style={[rowStyle, i % 2 === 1 ? { backgroundColor: INK.zebra } : null]}
            wrap={false}
            minPresenceAhead={rowPresenceAhead}
          >
            {cols.map((c) => {
              const kind = c.kind ?? 'text';
              const val = row[c.key] ?? '';
              if (kind === 'money') {
                const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
                return (
                  <PdfTdMoney
                    key={c.key}
                    flex={c.flex}
                    amount={Number.isFinite(n) ? n : 0}
                    color={moneyColor || footer?.colors?.[c.key]}
                  />
                );
              }
              return <PdfTd key={c.key} flex={c.flex} kind={kind} children={val} />;
            })}
          </View>
        ))
      )}

      {footer ? (
        <View
          style={[footStyle, { borderTopColor: headBg }]}
          wrap={false}
          minPresenceAhead={PDF_PAGINATION.totalBar + PDF_PAGINATION.footerReserve}
        >
          {visualCols(columns)
            .filter((c) => c.kind === 'money' && footer.values[c.key] != null)
            .map((c) => (
              <PdfTdMoney
                key={c.key}
                flex={c.flex}
                amount={footer.values[c.key]}
                color={footer.colors?.[c.key]}
              />
            ))}
          <Text style={{ flex: 1, fontSize: 9, fontWeight: 'bold', color: INK.text, textAlign: 'right', fontFamily: FF }}>
            {ar(footer.label === 'الإجمالي' ? 'المجموع الكلي' : footer.label)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
