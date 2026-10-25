// @ts-nocheck
import React from 'react';
import { Document, Text, View } from '@react-pdf/renderer';
import './pdfFonts';
import { ar, arDate } from './arabicPDF';
import type { Letter, LetterType } from '../../types';
import { getPdfBrand } from './pdfBrand';
import { INK, PdfDocTitle, PdfNotesBox, PdfPage, makePdfStyles } from './pdfKit';

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
  const body = { fontSize: 10.6, color: INK.text, lineHeight: 2, textAlign: 'right' as const };

  return (
    <Document title={typeLabelsAr[letter.type]} author={B.fullName} language="ar">
      <PdfPage B={B} s={s} letterhead runningTitle={`${typeLabelsAr[letter.type]}  ·  ${letter.subject}`} docRef={letter.refNumber}>
        <PdfDocTitle
          s={s}
          titleEn={typeLabelsEn[letter.type]}
          titleAr={typeLabelsAr[letter.type]}
          meta={[{ label: 'الرقم', value: letter.refNumber }, { label: 'التاريخ', value: arDate(letter.date) }]}
        />

        <View style={{ alignItems: 'flex-end', marginBottom: 14 }} wrap={false}>
          <Text style={{ fontSize: 8, color: INK.faint, marginBottom: 3 }}>{ar('إلى السيد / السادة')}</Text>
          <Text style={{ fontSize: 12, fontWeight: 'bold', color: INK.text, textAlign: 'right' }}>{ar(letter.recipientName)}</Text>
          {[letter.recipientTitle, letter.recipientAddress].filter(Boolean).map((line) => (
            <Text key={line} style={{ fontSize: 9, color: INK.muted, textAlign: 'right', marginTop: 2 }}>{ar(line)}</Text>
          ))}
          {letter.recipientPhone ? <Text style={{ fontSize: 9, color: INK.muted, marginTop: 2 }}>{letter.recipientPhone}</Text> : null}
        </View>

        <View style={{ alignItems: 'flex-end', marginBottom: 16 }} wrap={false}>
          <Text style={{ fontSize: 12.4, fontWeight: 'bold', color: INK.text, textAlign: 'right' }}>{ar(`الموضوع: ${letter.subject}`)}</Text>
          <View style={s.sectionRule} />
        </View>

        {letter.greeting.split('\n').map((line, i) => (
          <Text key={`g${i}`} style={{ ...body, fontWeight: 'bold', marginBottom: 4 }}>{ar(line)}</Text>
        ))}

        <View style={{ marginTop: 4 }}>
          {letter.bodyParagraphs.map((para, i) => (
            <Text key={i} style={{ ...body, marginBottom: 8 }}>{ar(para)}</Text>
          ))}
        </View>

        {letter.notes ? (
          <PdfNotesBox s={s}>
            <Text style={s.notesTxt}>{ar(letter.notes)}</Text>
          </PdfNotesBox>
        ) : null}

        <View style={{ marginTop: 18 }} wrap={false}>
          {letter.closing.split('\n').map((line, i) => (
            <Text key={`c${i}`} style={i === 0 ? { ...body, marginBottom: 4 } : { ...body, fontWeight: 'bold', marginBottom: 18 }}>{ar(line)}</Text>
          ))}
        </View>
      </PdfPage>
    </Document>
  );
};
