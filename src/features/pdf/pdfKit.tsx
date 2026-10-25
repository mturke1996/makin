// @ts-nocheck
/**
 * pdfKit — Shared building blocks for ALL PDF documents.
 * Layout aligned with debtflow-pro (PdfBrandedReportHeader, totalsBox, tables).
 */
import React from 'react';
import { Text, View, StyleSheet, Svg, Rect, Line, Circle, Path, G } from '@react-pdf/renderer';
import './pdfFonts';
import { PDF_FONT_FAMILY } from './pdfFonts';
import { ar, arDate, arMoney } from './arabicPDF';
import { getPdfBrand, buildFooterPhones, buildFooterAddressLine, type PdfBrandSnapshot } from './pdfBrand';
import { getPdfCompanyInfo } from './pdfCompanyInfo';

export const INK = {
  text: '#0F2340',
  muted: '#4A6080',
  faint: '#7A8FA8',
  border: '#D8E0EA',
  zebra: '#F4F7FB',
  totalBg: '#EEF2F8',
  cardBg: '#FAFBFD',
  paleGold: '#FFFCF5',
  white: '#FFFFFF',
  success: '#0D9488',
  warning: '#B45309',
  danger: '#B91C1C',
};

export const PDF_PAGINATION = {
  tableHead: 32,
  totalBar: 36,
  minRowHeight: 28,
  section: 36,
  /** Reserved space so flowing content does not overlap the fixed branded footer */
  footerReserve: 88,
} as const;

export function makePdfStyles(B: PdfBrandSnapshot) {
  return StyleSheet.create({
    page: {
      fontFamily: PDF_FONT_FAMILY,
      fontSize: 9,
      color: INK.text,
      backgroundColor: INK.white,
      paddingTop: 30,
      paddingBottom: PDF_PAGINATION.footerReserve,
      paddingHorizontal: 36,
    },

    /* ── Header (debtflow-pro) ── */
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    headerTitleCol: {
      alignItems: 'flex-start',
      justifyContent: 'center',
      maxWidth: '40%',
      paddingTop: 8,
    },
    titleEn: {
      fontSize: 26,
      fontWeight: 'bold',
      fontFamily: PDF_FONT_FAMILY,
      color: '#b8c5d6',
      letterSpacing: 1.2,
      marginBottom: 4,
    },
    titleAr: {
      fontSize: 11,
      fontWeight: 'bold',
      fontFamily: PDF_FONT_FAMILY,
      color: B.palette.primary,
    },
    titleRef: {
      marginTop: 4,
      fontSize: 9.5,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.muted,
    },
    identityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      flex: 1,
      marginLeft: 8,
    },
    identityText: {
      alignItems: 'flex-end',
      flexShrink: 1,
      maxWidth: 300,
      justifyContent: 'center',
    },
    companyFull: {
      fontSize: 13.5,
      fontWeight: 'bold',
      fontFamily: PDF_FONT_FAMILY,
      color: B.palette.primary,
      marginBottom: 3,
      textAlign: 'right',
      lineHeight: 1.35,
    },
    engineer: {
      fontSize: 10,
      fontWeight: 'bold',
      fontFamily: PDF_FONT_FAMILY,
      color: B.palette.accent,
      marginBottom: 2,
      textAlign: 'right',
    },
    tagEn: {
      fontSize: 8,
      fontWeight: 'bold',
      fontFamily: PDF_FONT_FAMILY,
      color: INK.muted,
      textAlign: 'right',
      letterSpacing: 0.6,
    },
    logoWrap: {
      paddingLeft: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    divider: {
      borderBottomWidth: 2,
      borderBottomColor: B.palette.primary,
      paddingBottom: 8,
      marginBottom: 14,
    },
    contactBlock: { alignItems: 'flex-end' },
    kvRow: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      width: '100%',
      marginTop: 4,
      paddingTop: 5,
      borderTopWidth: 1,
      borderTopColor: INK.border,
    },
    kvBox: { alignItems: 'flex-end' },
    kvLabel: {
      fontSize: 7,
      fontWeight: 'bold',
      fontFamily: PDF_FONT_FAMILY,
      color: B.palette.accent,
      marginBottom: 2,
      textAlign: 'right',
    },
    kvVal: {
      fontSize: 8.8,
      fontWeight: 'bold',
      fontFamily: PDF_FONT_FAMILY,
      color: INK.text,
      textAlign: 'right',
    },
    servicesRow: {
      marginTop: 6,
      paddingTop: 6,
      borderTopWidth: 1,
      borderTopColor: INK.border,
      alignItems: 'flex-end',
    },
    servicesLabel: {
      fontSize: 7,
      fontWeight: 'bold',
      fontFamily: PDF_FONT_FAMILY,
      color: B.palette.accent,
      marginBottom: 3,
      textAlign: 'right',
    },
    servicesText: {
      fontSize: 8,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.text,
      textAlign: 'right',
      lineHeight: 1.55,
    },

    /* ── Info row (debtflow-pro) ── */
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    datesCol: { width: '38%' },
    dateRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    dateLabel: { fontSize: 8.8, color: '#999', textAlign: 'right', fontFamily: PDF_FONT_FAMILY },
    dateVal: { fontSize: 8.8, fontWeight: 'bold', color: INK.text, textAlign: 'left', fontFamily: PDF_FONT_FAMILY },
    clientBox: {
      width: '55%',
      paddingVertical: 4,
      paddingRight: 12,
      borderRightWidth: 2,
      borderRightColor: B.palette.primary,
      alignItems: 'flex-end',
    },
    clientSectionLbl: {
      fontSize: 7.5,
      fontWeight: 'bold',
      fontFamily: PDF_FONT_FAMILY,
      color: B.palette.accent,
      marginBottom: 3,
      textAlign: 'right',
    },
    clientName: { fontSize: 12.5, fontWeight: 'bold', fontFamily: PDF_FONT_FAMILY, color: '#2d3a2d', textAlign: 'right', marginBottom: 2 },
    clientSub: { fontSize: 8.8, fontFamily: PDF_FONT_FAMILY, color: '#888', marginTop: 2, textAlign: 'right' },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    datesBox: { width: '38%' },
    dateValue: { fontSize: 8.8, fontWeight: 'bold', color: INK.text, textAlign: 'left', fontFamily: PDF_FONT_FAMILY },
    sectionLabel: {
      fontSize: 7.5,
      fontWeight: 'bold',
      fontFamily: PDF_FONT_FAMILY,
      color: B.palette.accent,
      marginBottom: 3,
      textAlign: 'right',
    },

    /* ── Summary cards ── */
    summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    summaryCard: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 8,
      backgroundColor: INK.zebra,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: INK.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    summaryCardLabel: { fontSize: 8, color: INK.muted, marginBottom: 5, fontWeight: 'bold', textAlign: 'center' },
    summaryCardValue: { fontSize: 13, fontWeight: 'bold', color: B.palette.primary, textAlign: 'center' },
    summaryLabel: { fontSize: 8, color: INK.muted, marginBottom: 5, fontWeight: 'bold', textAlign: 'center' },
    summaryValue: { fontSize: 13, fontWeight: 'bold', color: B.palette.primary, textAlign: 'center' },

    /* ── Section title ── */
    sectionTitle: {
      fontSize: 10.5,
      fontWeight: 'bold',
      fontFamily: PDF_FONT_FAMILY,
      color: B.palette.primary,
      marginBottom: 6,
      marginTop: 12,
      paddingBottom: 4,
      borderBottomWidth: 1.5,
      borderBottomColor: INK.border,
      textAlign: 'right',
    },

    totalsBox: { width: 240, alignSelf: 'flex-start', marginTop: 10 },
    totalLine: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    grandLblMuted: {
      fontSize: 11,
      fontWeight: 'bold',
      fontFamily: PDF_FONT_FAMILY,
      color: B.palette.primary,
      textAlign: 'right',
    },
    grandBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      marginTop: 10,
      borderTopWidth: 1.5,
      borderTopColor: B.palette.primary,
    },
    grandLbl: {
      fontSize: 12,
      fontWeight: 'bold',
      fontFamily: PDF_FONT_FAMILY,
      color: B.palette.primary,
      textAlign: 'right',
    },
    grandAmt: {
      fontSize: 13,
      fontWeight: 'bold',
      fontFamily: PDF_FONT_FAMILY,
      color: B.palette.primary,
      textAlign: 'left',
    },
    notesBox: {
      padding: 10,
      backgroundColor: INK.paleGold,
      borderRightWidth: 3,
      borderRightColor: B.palette.accent,
      borderRadius: 3,
      marginTop: 14,
      alignItems: 'flex-end',
    },
    notesLbl: {
      fontSize: 9,
      fontWeight: 'bold',
      fontFamily: PDF_FONT_FAMILY,
      color: B.palette.accent,
      marginBottom: 4,
      textAlign: 'right',
    },
    notesTxt: {
      fontSize: 9.5,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.muted,
      textAlign: 'right',
      lineHeight: 1.65,
    },

    /* ── Tables (debtflow-pro: flex row, RTL text) ── */
    tableHead: {
      flexDirection: 'row',
      backgroundColor: B.palette.primary,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 3,
      marginBottom: 2,
    },
    th: { color: INK.white, fontSize: 9, fontWeight: 'bold', fontFamily: PDF_FONT_FAMILY, textAlign: 'right' },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#f0efeb',
      alignItems: 'center',
    },
    rowEven: { backgroundColor: INK.zebra },
    totalRow: {
      flexDirection: 'row',
      paddingVertical: 8,
      paddingHorizontal: 10,
      backgroundColor: '#f0ede7',
      borderTopWidth: 1.5,
      borderTopColor: B.palette.primary,
      marginTop: 1,
      borderRadius: 2,
      alignItems: 'center',
    },
    td: { fontSize: 9, fontFamily: PDF_FONT_FAMILY, color: INK.text, textAlign: 'right' },
    tdBold: { fontSize: 9, fontWeight: 'bold', fontFamily: PDF_FONT_FAMILY, color: INK.text, textAlign: 'right' },
    tdPos: { fontSize: 9, fontWeight: 'bold', fontFamily: PDF_FONT_FAMILY, color: INK.success, textAlign: 'right' },
    tdNeg: { fontSize: 9, fontWeight: 'bold', fontFamily: PDF_FONT_FAMILY, color: INK.danger, textAlign: 'right' },
    tdNum: { direction: 'ltr', textAlign: 'left' },
    tdDate: { direction: 'ltr', textAlign: 'center' },
    moneyRow: { direction: 'ltr', flexDirection: 'row', alignItems: 'baseline', gap: 3 },

    /* ── Footer (debtflow-pro) ── */
    footer: {
      position: 'absolute',
      bottom: 14,
      left: 36,
      right: 36,
      textAlign: 'center',
      borderTopWidth: 1,
      borderTopColor: '#eee',
      paddingTop: 8,
    },
    footerBrand: {
      fontSize: 9.5,
      fontWeight: 'bold',
      fontFamily: PDF_FONT_FAMILY,
      color: B.palette.primary,
      marginBottom: 2,
    },
    footerEng: {
      fontSize: 8.5,
      fontWeight: 'bold',
      fontFamily: PDF_FONT_FAMILY,
      color: B.palette.accent,
      marginBottom: 3,
    },
    footerMuted: {
      fontSize: 7.8,
      fontFamily: PDF_FONT_FAMILY,
      color: '#778877',
      lineHeight: 1.4,
      marginBottom: 2,
    },
    footerNote: { fontSize: 6.8, fontFamily: PDF_FONT_FAMILY, color: '#888' },
  });
}

/** مكوّن يعرض المبلغ ثم العملة (debtflow-pro) */
export const PdfMoneyText = ({
  amount,
  style,
  currStyle,
  containerStyle,
  currency = 'د.ل',
  color,
  light = false,
}: {
  amount: number;
  style?: any;
  currStyle?: any;
  containerStyle?: any;
  currency?: string;
  color?: string;
  light?: boolean;
}) => {
  const hasFraction = Math.abs(amount % 1) > 1e-9;
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: hasFraction ? 6 : 0,
    minimumFractionDigits: 0,
  }).format(Math.abs(amount));
  const sign = amount < 0 ? '-' : '';
  const currColor = light ? 'rgba(255,255,255,0.92)' : INK.muted;
  const amtColor = color || (light ? INK.white : INK.text);
  return (
    <View
      wrap={false}
      style={[{ flexDirection: 'row-reverse', alignItems: 'baseline', justifyContent: 'flex-start' }, containerStyle]}
    >
      <Text style={[{ fontSize: 9, fontWeight: 'bold', color: amtColor, fontFamily: PDF_FONT_FAMILY }, style]}>
        {`${sign}${formatted}`}
      </Text>
      <Text style={[{ fontSize: 9, color: currColor, fontWeight: 'bold', marginRight: 3, fontFamily: PDF_FONT_FAMILY }, currStyle]}>
        {currency}
      </Text>
    </View>
  );
};

/** Brand logo mark — high-res crisp Vector SVG inside PDF */
export const PdfLogoMark = ({ 
  size = 68, 
  primary = '#003366', 
  accent: _accent = '#1A5276' 
}: { 
  size?: number; 
  primary?: string; 
  accent?: string; 
}) => {
  return (
    <View style={{ width: size, height: size, paddingLeft: 12, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {/* Blueprint/Drafting layout lines (very thin) */}
        <G stroke={primary} strokeWidth={0.6} opacity={0.3} strokeLinecap="round">
          <Line x1={50} y1={8} x2={50} y2={88} />
          <Line x1={25} y1={12} x2={25} y2={88} />
          <Line x1={75} y1={12} x2={75} y2={88} />
          <Line x1={15} y1={82} x2={85} y2={82} />
          <Line x1={22} y1={82} x2={28} y2={82} strokeWidth={0.4} />
          <Line x1={25} y1={79} x2={25} y2={85} strokeWidth={0.4} />
          <Line x1={72} y1={82} x2={78} y2={82} strokeWidth={0.4} />
          <Line x1={75} y1={79} x2={75} y2={85} strokeWidth={0.4} />
        </G>

        {/* Dot at top peak */}
        <Circle cx={50} cy={22} r={1.5} fill={primary} />

        {/* Main House and Key Structure */}
        <G fill="none" stroke={primary} strokeLinecap="round" strokeLinejoin="round">
          {/* Outer roof slopes (thick) */}
          <Path d="M 19 47 L 50 22 L 81 47" strokeWidth={2.5} />
          {/* Left outer wall */}
          <Line x1={25} y1={42} x2={25} y2={72} strokeWidth={2.5} />
          {/* Right outer wall */}
          <Line x1={75} y1={42} x2={75} y2={62} strokeWidth={2.5} />

          {/* Key Shaft */}
          <Line x1={25} y1={72} x2={75} y2={72} strokeWidth={2.5} />

          {/* Key Handle (Rounded loop) */}
          <Path d="M 75 62 C 84 62, 84 78, 75 78 Z" strokeWidth={2.5} />

          {/* Inner House roof */}
          <Path d="M 38 46 L 50 36 L 62 46" strokeWidth={2.0} />
          {/* Inner House walls */}
          <Line x1={38} y1={46} x2={38} y2={72} strokeWidth={2.0} />
          <Line x1={62} y1={46} x2={62} y2={72} strokeWidth={2.0} />

          {/* Window inside inner house */}
          <Rect x={45} y={52} width={10} height={10} strokeWidth={1.5} />
          <Line x1={45} y1={57} x2={55} y2={57} strokeWidth={1.2} />
          <Line x1={50} y1={52} x2={50} y2={62} strokeWidth={1.2} />

          {/* Hook / Chimney line on right side of inner house */}
          <Path d="M 66 42 V 68 H 62" strokeWidth={1.5} />
        </G>

        {/* Key Teeth & Tip (filled Paths instead of Polygons for safety) */}
        <Path 
          d="M 32 72 L 35 78 L 38 72 Z M 42 72 L 45 78 L 48 72 Z M 52 72 L 55 78 L 58 72 Z M 25 70.5 L 17 72 L 25 73.5 Z" 
          fill={primary} 
        />
      </Svg>
    </View>
  );
};

/** Totals block — debtflow-pro layout (space-between + border-top grand bar). */
export const PdfTotalsBlock = ({
  s,
  subtotal,
  taxAmount = 0,
  taxRate,
  total,
  subtotalLabel = 'المجموع الفرعي',
  taxLabel,
  grandLabel = 'الإجمالي النهائي',
}: {
  s: any;
  B?: PdfBrandSnapshot;
  subtotal: number;
  taxAmount?: number;
  taxRate?: number;
  total: number;
  subtotalLabel?: string;
  taxLabel?: string;
  grandLabel?: string;
}) => {
  const taxLbl = taxLabel || (taxRate != null ? `ضريبة (${taxRate}%)` : 'الضريبة');
  return (
    <View style={s.totalsBox} wrap={false}>
      <View style={s.totalLine}>
        <PdfMoneyText amount={subtotal} style={s.grandAmt} />
        <Text style={s.grandLblMuted}>{ar(subtotalLabel)}</Text>
      </View>
      {taxAmount > 0 ? (
        <View style={s.totalLine}>
          <PdfMoneyText amount={taxAmount} style={s.grandAmt} />
          <Text style={s.grandLblMuted}>{ar(taxLbl)}</Text>
        </View>
      ) : null}
      <View style={s.grandBar} minPresenceAhead={PDF_PAGINATION.totalBar}>
        <PdfMoneyText amount={total} style={[s.grandAmt, { fontSize: 15 }]} />
        <Text style={[s.grandLbl, { fontSize: 12 }]}>{ar(grandLabel)}</Text>
      </View>
    </View>
  );
};

/** Notes box with accent border (debtflow-pro). */
export const PdfNotesBox = ({ s, label = 'ملاحظات', children }: { s: any; label?: string; children: React.ReactNode }) => (
  <View style={s.notesBox}>
    <Text style={s.notesLbl}>{ar(label)}</Text>
    {children}
  </View>
);

/** Report header — debtflow-pro PdfBrandedReportHeader. */
export const PdfBrandedReportHeader = ({
  s,
  B,
  titleEn,
  subtitleAr,
  refLine,
}: {
  s: any;
  B: PdfBrandSnapshot;
  titleEn: string;
  subtitleAr: string;
  refLine?: string;
}) => {
  const phones = buildFooterPhones(B);
  const address = buildFooterAddressLine(B);
  const pdfInfo = getPdfCompanyInfo();
  const servicesBulleted = pdfInfo.services.join('   •   ');
  return (
    <View wrap={false}>
      <View style={s.headerTop}>
        <View style={s.headerTitleCol}>
          <Text style={s.titleEn}>{titleEn}</Text>
          <Text style={s.titleAr}>{ar(subtitleAr)}</Text>
          {refLine ? <Text style={s.titleRef}>{refLine}</Text> : null}
        </View>
        <View style={s.identityRow}>
          <View style={s.identityText}>
            <Text style={s.companyFull}>{ar(B.fullName)}</Text>
            {B.tagline ? <Text style={s.engineer}>{ar(B.tagline)}</Text> : null}
            <Text style={s.tagEn}>{pdfInfo.taglineEn}</Text>
          </View>
          <PdfLogoMark size={68} primary={B.palette.primary} accent={B.palette.accent} />
        </View>
      </View>
      <View style={s.divider}>
        <View style={s.contactBlock}>
          <View style={s.kvRow}>
            <View style={[s.kvBox, { width: '55%' }]}>
              <Text style={s.kvLabel}>{ar('العنوان')}</Text>
              <Text style={s.kvVal}>{ar(address || 'طرابلس، ليبيا')}</Text>
            </View>
            <View style={[s.kvBox, { width: '40%' }]}>
              <Text style={s.kvLabel}>{ar('الهاتف')}</Text>
              <Text style={s.kvVal}>{phones.length ? phones.join('\n') : '—'}</Text>
            </View>
          </View>
        </View>
        <View style={s.servicesRow}>
          <Text style={s.servicesLabel}>{ar('مجالات الخدمة')}</Text>
          <Text style={s.servicesText}>{ar(servicesBulleted)}</Text>
        </View>
      </View>
    </View>
  );
};

/** Centered footer — debtflow-pro PdfBrandedFooter. */
export const PdfBrandedFooter = ({ s, B }: { s: any; B: PdfBrandSnapshot }) => {
  const phones = buildFooterPhones(B);
  const pdfInfo = getPdfCompanyInfo();
  const line1 = [B.contact.address, ...phones].filter(Boolean).join(' • ');
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerBrand}>{ar(B.fullName)}</Text>
      {B.tagline ? <Text style={s.footerEng}>{ar(B.tagline)}</Text> : null}
      {line1 ? <Text style={s.footerMuted}>{ar(line1)}</Text> : null}
      {B.contact.email ? <Text style={s.footerMuted}>{B.contact.email}</Text> : null}
      <Text style={s.footerNote}>{pdfInfo.footerNote}</Text>
    </View>
  );
};

/** @deprecated — use PdfBrandedReportHeader */
export const PdfBand = ({
  s,
  B,
  title,
  titleEn = 'DOCUMENT',
  refText,
}: {
  s: any;
  B: PdfBrandSnapshot;
  title: string;
  titleEn?: string;
  refText?: string;
  kicker?: string;
}) => (
  <PdfBrandedReportHeader s={s} B={B} titleEn={titleEn} subtitleAr={title} refLine={refText} />
);

/** Summary cards row — debtflow-pro pattern. */
export const PdfSummaryStrip = ({
  s,
  cells,
}: {
  s: any;
  cells: { label: string; value: string | number; color?: string; accent?: boolean }[];
}) => (
  <View style={s.summaryRow}>
    {cells.map((cell, i) => (
      <View
        key={i}
        style={[
          s.summaryCard,
          cell.accent ? { borderTopWidth: 3, borderTopColor: cell.color || INK.danger, backgroundColor: '#fffcfc' } : null,
        ]}
      >
        <Text style={s.summaryLabel}>{ar(cell.label)}</Text>
        {typeof cell.value === 'number' ? (
          <PdfMoneyText amount={cell.value} style={[s.summaryValue, cell.color ? { color: cell.color } : null]} />
        ) : (
          <Text style={[s.summaryValue, cell.color ? { color: cell.color } : null]}>{ar(String(cell.value))}</Text>
        )}
      </View>
    ))}
  </View>
);

/** @deprecated — use PdfBrandedFooter */
export const PdfFooter = ({ s, B }: { s: any; B: PdfBrandSnapshot; docRef?: string; fixed?: boolean }) => (
  <PdfBrandedFooter s={s} B={B} />
);

/** @deprecated — debtflow-pro has no page accent */
export const PdfPageAccent = (_props: { s: any }) => null;

export { ar, arDate, arMoney, getPdfBrand };
