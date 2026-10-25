// @ts-nocheck
import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import './pdfFonts';
import { ar, arDate } from './arabicPDF';
import type { Letter, LetterType } from '../../types';
import { getPdfBrand } from './pdfBrand';
import { makePdfStyles, PdfBrandedReportHeader, PdfBrandedFooter, PdfNotesBox, INK } from './pdfKit';

/** Re-export for backwards compatibility with legacy callers. */
export type { Letter as LetterData, LetterType } from '../../types';

const typeLabelsAr: Record<LetterType, string> = {
  official: 'خطاب رسمي',
  offer: 'عرض سعر',
  entitlement: 'مستخلص',
};

const typeLabelsEn: Record<LetterType, string> = {
  official: 'OFFICIAL LETTER',
  offer: 'QUOTATION',
  entitlement: 'STATEMENT',
};

interface Props {
  letter: Letter;
}

export const LetterPDF: React.FC<Props> = ({ letter }) => {
  const B = getPdfBrand();
  const s = makePdfStyles(B);

  return (
    <Document title={typeLabelsAr[letter.type]} author={B.fullName} language="ar">
      <Page size="A4" style={s.page}>
        <PdfBrandedReportHeader
          s={s}
          B={B}
          titleEn={typeLabelsEn[letter.type]}
          subtitleAr={typeLabelsAr[letter.type]}
          refLine={`#${letter.refNumber}`}
        />

        <View style={s.infoRow}>
          <View style={s.datesCol}>
            <View style={s.dateRow}>
              <Text style={s.dateLabel}>{ar('التاريخ')}</Text>
              <Text style={s.dateVal}>{arDate(letter.date)}</Text>
            </View>
            <View style={s.dateRow}>
              <Text style={s.dateLabel}>{ar('النوع')}</Text>
              <Text style={s.dateVal}>{ar(typeLabelsAr[letter.type])}</Text>
            </View>
          </View>
          <View style={s.clientBox}>
            <Text style={s.clientSectionLbl}>{ar('إلى السيد / السادة')}</Text>
            <Text style={s.clientName}>{ar(letter.recipientName)}</Text>
            {letter.recipientTitle ? <Text style={s.clientSub}>{ar(letter.recipientTitle)}</Text> : null}
            {letter.recipientAddress ? <Text style={s.clientSub}>{ar(letter.recipientAddress)}</Text> : null}
            {letter.recipientPhone ? <Text style={s.clientSub}>{letter.recipientPhone}</Text> : null}
          </View>
        </View>

        <View
          style={{
            backgroundColor: B.palette.primary,
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 5,
            marginBottom: 18,
            alignItems: 'flex-end',
          }}
        >
          <Text style={{ fontSize: 7.5, color: INK.white, opacity: 0.7, fontWeight: 'bold', marginBottom: 2 }}>
            {ar('الموضوع')}
          </Text>
          <Text style={{ fontSize: 12, fontWeight: 'bold', color: INK.white, textAlign: 'right' }}>
            {ar(letter.subject)}
          </Text>
        </View>

        {letter.greeting.split('\n').map((line, i) => (
          <Text
            key={`g${i}`}
            style={{ fontSize: 11, fontWeight: 'bold', color: INK.text, textAlign: 'right', marginBottom: 6 }}
          >
            {ar(line)}
          </Text>
        ))}

        <View style={{ marginTop: 6 }}>
          {letter.bodyParagraphs.map((para, i) => (
            <Text
              key={i}
              style={{ fontSize: 10.5, color: INK.text, lineHeight: 2, textAlign: 'right', marginBottom: 8 }}
            >
              {ar(para)}
            </Text>
          ))}
        </View>

        {letter.notes ? (
          <PdfNotesBox s={s}>
            <Text style={s.notesTxt}>{ar(letter.notes)}</Text>
          </PdfNotesBox>
        ) : null}

        <View style={{ marginTop: 16 }}>
          {letter.closing.split('\n').map((line, i) => (
            <Text
              key={`c${i}`}
              style={
                i === 0
                  ? { fontSize: 10.5, color: INK.text, textAlign: 'right', marginBottom: 4 }
                  : { fontSize: 11, fontWeight: 'bold', color: INK.text, textAlign: 'right', marginBottom: 18 }
              }
            >
              {ar(line)}
            </Text>
          ))}
        </View>

        <PdfBrandedFooter s={s} B={B} />
      </Page>
    </Document>
  );
};
