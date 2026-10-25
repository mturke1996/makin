/**
 * Builds MAKIN's brand PDFs (logo sheet + visual identity guide).
 * The letterhead logo of the in-app PDFs is public/brand/logo-pdf.png, cut from brand/MAKIN-Logo-Building.png; this
 * script no longer writes it.
 * Chromium shapes the Arabic, so no manual reshaping is needed.
 *   PHOSPHOR_DIR=/path/to/@phosphor-icons/core/assets/regular node scripts/generate-brand-pdfs.cjs
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'brand');
const FONTS = path.join(ROOT, 'public', 'fonts');
const PH = process.env.PHOSPHOR_DIR;

const C = { ink: '#1F2633', ink2: '#2B3444', ivory: '#F4EFE6', gold: '#C9972B', goldSoft: '#F3E7C8', canvas: '#FAF9F7', line: '#E6E3DC', muted: '#6B6F78' };

const mark = (stroke, accent, size) => `<svg viewBox="0 0 128 128" width="${size}" height="${size}" style="display:block"><path d="M32 88 V40 L64 68 L96 40 V88" fill="none" stroke="${stroke}" stroke-width="9" stroke-linecap="square" stroke-linejoin="miter"/><rect x="28" y="97" width="72" height="6" rx="1" fill="${accent}"/></svg>`;
const tile = (size, bg = C.ink, fg = C.ivory) => `<svg viewBox="0 0 128 128" width="${size}" height="${size}" style="display:block"><rect x="4" y="4" width="120" height="120" rx="28" fill="${bg}"/><path d="M32 88 V40 L64 68 L96 40 V88" fill="none" stroke="${fg}" stroke-width="9" stroke-linecap="square" stroke-linejoin="miter"/><rect x="28" y="97" width="72" height="6" rx="1" fill="${C.gold}"/></svg>`;

const lockupH = (fg, accent, ms = 64, dark = false) => `
  <div style="display:flex;align-items:center;gap:18px;direction:ltr">
    ${mark(fg, accent, ms)}
    <div style="display:flex;flex-direction:column;line-height:1">
      <span style="font-weight:700;font-size:${ms * 0.62}px;letter-spacing:.14em;color:${fg}">MAKIN</span>
      <span style="font-weight:600;font-size:${ms * 0.26}px;color:${accent};margin-top:${ms * 0.12}px;direction:rtl;letter-spacing:0">ماكين للمقاولات والإنشاءات</span>
    </div>
  </div>`;
const lockupV = (fg, accent, ms = 96) => `
  <div style="display:flex;flex-direction:column;align-items:center;gap:14px">
    ${mark(fg, accent, ms)}
    <span style="font-weight:700;font-size:${ms * 0.4}px;letter-spacing:.2em;color:${fg};padding-inline-start:.2em">MAKIN</span>
    <span style="font-weight:600;font-size:${ms * 0.17}px;color:${accent}">ماكين للمقاولات والإنشاءات</span>
  </div>`;

const css = `
@font-face{font-family:Cairo;font-weight:400;src:url(file://${FONTS}/Cairo-Regular.ttf)}
@font-face{font-family:Cairo;font-weight:600 700;src:url(file://${FONTS}/Cairo-Bold.ttf)}
@page{size:A4;margin:0}
*{box-sizing:border-box;margin:0}
body{font-family:Cairo,sans-serif;color:${C.ink};direction:rtl}
.page{width:210mm;height:297mm;page-break-after:always;position:relative;overflow:hidden;padding:18mm 16mm;background:${C.canvas}}
.page:last-child{page-break-after:auto}
.foot{position:absolute;inset-inline:16mm;bottom:10mm;display:flex;justify-content:space-between;font-size:9px;color:${C.muted};direction:ltr}
h1{font-size:30px;font-weight:700;margin-bottom:4px}
h2{font-size:12px;font-weight:600;color:${C.gold};letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px;direction:ltr;text-align:right}
p.lead{font-size:13px;color:${C.muted};line-height:1.9;max-width:150mm;margin-bottom:10mm}
.card{border:1px solid ${C.line};border-radius:12px;background:#fff;display:flex;align-items:center;justify-content:center}
.grid{display:grid;gap:5mm}
.label{font-size:10px;color:${C.muted};margin-top:6px;text-align:center}
.sw{border-radius:12px;overflow:hidden;border:1px solid ${C.line};background:#fff}
.sw .c{height:34mm;display:flex;align-items:flex-end;padding:10px}
.sw .m{padding:10px 12px;font-size:11px;line-height:1.7}
.sw b{font-size:13px}
.mono{font-family:ui-monospace,monospace;direction:ltr;display:inline-block;font-size:10.5px;color:${C.muted}}
`;

const doc = (body) => `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`;
const foot = (n) => `<div class="foot"><span>MAKIN · Brand Identity</span><span>${n}</span></div>`;

// ───────── Logo sheet ─────────
const logoSheet = doc(`
<div class="page" style="padding:0;background:${C.ink};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16mm;color:${C.ivory}">
  ${lockupV(C.ivory, C.gold, 150)}
  <div style="position:absolute;bottom:14mm;font-size:10px;letter-spacing:.2em;color:#9aa1ad;direction:ltr">LOGO SHEET · 2026</div>
</div>
<div class="page">
  <h2>Primary logo</h2><h1>الشعار الأساسي</h1>
  <p class="lead">الرمز حرف M مبني من عمودين وسقف مائل، فوق خط أساس ذهبي يرمز إلى الأساسات. الشكل هندسي وصلب ويقرأ بوضوح في الأحجام الصغيرة.</p>
  <div class="grid" style="grid-template-columns:1fr 1fr">
    <div><div class="card" style="height:62mm">${lockupH(C.ink, C.gold, 64)}</div><div class="label">أفقي · على خلفية فاتحة</div></div>
    <div><div class="card" style="height:62mm;background:${C.ink};border-color:${C.ink}">${lockupH(C.ivory, C.gold, 64)}</div><div class="label">أفقي · على خلفية داكنة</div></div>
    <div><div class="card" style="height:78mm">${lockupV(C.ink, C.gold, 92)}</div><div class="label">عمودي · على خلفية فاتحة</div></div>
    <div><div class="card" style="height:78mm;background:${C.ink};border-color:${C.ink}">${lockupV(C.ivory, C.gold, 92)}</div><div class="label">عمودي · على خلفية داكنة</div></div>
  </div>
  ${foot(2)}
</div>
<div class="page">
  <h2>Mark &amp; variants</h2><h1>الرمز والنسخ</h1>
  <p class="lead">الرمز وحده يُستخدم أيقونة للتطبيق وصورة للحساب وختماً. النسخ أحادية اللون للطباعة بالحبر الواحد والحفر والختم.</p>
  <div class="grid" style="grid-template-columns:repeat(3,1fr)">
    <div><div class="card" style="height:50mm">${tile(110)}</div><div class="label">أيقونة التطبيق</div></div>
    <div><div class="card" style="height:50mm">${mark(C.ink, C.gold, 96)}</div><div class="label">الرمز بلا خلفية</div></div>
    <div><div class="card" style="height:50mm;background:${C.gold};border-color:${C.gold}">${mark(C.ink, C.ink, 96)}</div><div class="label">على الذهبي</div></div>
    <div><div class="card" style="height:50mm">${mark('#000', '#000', 96)}</div><div class="label">أسود أحادي</div></div>
    <div><div class="card" style="height:50mm;background:#000;border-color:#000">${mark('#fff', '#fff', 96)}</div><div class="label">أبيض أحادي</div></div>
    <div><div class="card" style="height:50mm">${tile(32)}<span style="width:14px"></span>${tile(20)}<span style="width:14px"></span>${tile(14)}</div><div class="label">الحد الأدنى للحجم: 14px / 5mm</div></div>
  </div>
  <div style="margin-top:12mm" class="grid" >
    <h2>Clear space</h2>
    <div class="card" style="height:62mm;flex-direction:column">
      <div style="padding:18px;border:1px dashed ${C.gold};position:relative">${lockupH(C.ink, C.gold, 56)}
      <span style="position:absolute;top:-1px;left:50%;font-size:9px;color:${C.gold};transform:translate(-50%,-130%)">x</span></div>
      <div class="label" style="margin-top:10px">المساحة الآمنة حول الشعار لا تقل عن ارتفاع الخط الذهبي مضروباً في ثلاثة (x = عرض ساق الحرف)</div>
    </div>
  </div>
  ${foot(3)}
</div>`);

// ───────── Identity guide ─────────
const sw = (name, ar, hex, extra, fg = '#fff') =>
  `<div class="sw"><div class="c" style="background:${hex};color:${fg}"><b>${ar}</b></div><div class="m"><b style="direction:ltr;display:block;text-align:right">${name}</b><span class="mono">${hex}</span><div style="color:${C.muted};font-size:10px">${extra}</div></div></div>`;

const icons = ['house-line', 'users-three', 'receipt', 'hand-coins', 'wallet', 'hard-hat', 'buildings', 'file-text', 'chart-line-up', 'shield-check', 'handshake', 'clipboard-text']
  .map((n) => {
    const f = PH && path.join(PH, `${n}.svg`);
    if (!f || !fs.existsSync(f)) return '';
    const svg = fs.readFileSync(f, 'utf8').replace('<svg', `<svg width="30" height="30" fill="${C.ink}"`);
    return `<div style="text-align:center">${svg}<div class="mono" style="display:block;margin-top:6px;font-size:9px">${n}</div></div>`;
  })
  .join('');

const guide = doc(`
<div class="page" style="padding:0;background:${C.ink};color:${C.ivory}">
  <div style="position:absolute;top:22mm;inset-inline:18mm;direction:ltr">${lockupH(C.ivory, C.gold, 56)}</div>
  <div style="position:absolute;bottom:40mm;inset-inline:18mm">
    <div style="font-size:11px;letter-spacing:.2em;color:${C.gold};direction:ltr;text-align:right;margin-bottom:6px">BRAND IDENTITY GUIDELINES</div>
    <div style="font-size:46px;font-weight:700;line-height:1.3">دليل الهوية البصرية</div>
    <div style="font-size:15px;color:#b6bcc8;margin-top:8px">شركة ماكين للمقاولات والإنشاءات · الإصدار 1.0 · 2026</div>
  </div>
  <div style="position:absolute;bottom:0;inset-inline:0;height:10mm;background:${C.gold}"></div>
</div>

<div class="page">
  <h2>01 · Brand</h2><h1>الشخصية</h1>
  <p class="lead">ماكين شركة إنشاءات: صلبة، دقيقة، موثوقة. الهوية تعكس ذلك بلون حبري عميق وذهب مقتصد ومساحات هادئة، دون زخرفة. نفس لغة التصميم المستخدمة في تطبيق Linda Shop: ألوان دافئة محايدة، حواف معتدلة، خط Cairo، وأيقونات Phosphor.</p>
  <div class="grid" style="grid-template-columns:repeat(3,1fr)">
    ${[['متين', 'خطوط سميكة وزوايا حادة في الرمز، وهيكل واضح في الواجهات.'], ['دقيق', 'أرقام متراصة، جداول مرتبة، وتسلسل بصري واضح للمبالغ.'], ['هادئ', 'ذهب لا يتجاوز 10% من الشاشة، وفواصل رفيعة بدل الظلال.']]
      .map(([t, d]) => `<div class="card" style="padding:14px;flex-direction:column;align-items:flex-start;gap:6px;min-height:42mm"><b style="font-size:17px">${t}</b><span style="font-size:11px;color:${C.muted};line-height:1.8">${d}</span></div>`).join('')}
  </div>
  <div style="margin-top:12mm"><h2>Logo</h2></div>
  <div class="grid" style="grid-template-columns:1fr 1fr">
    <div class="card" style="height:56mm">${lockupH(C.ink, C.gold, 60)}</div>
    <div class="card" style="height:56mm;background:${C.ink};border-color:${C.ink}">${lockupH(C.ivory, C.gold, 60)}</div>
  </div>
  <p class="lead" style="margin-top:8mm;font-size:12px">لا تمدد الشعار ولا تغيّر ألوانه ولا تضف إليه ظلاً أو تدرجاً. على الصور استخدم النسخة البيضاء أو الداكنة حسب التباين.</p>
  ${foot(2)}
</div>

<div class="page">
  <h2>02 · Color</h2><h1>الألوان</h1>
  <p class="lead">لونان أساسيان وعاجي دافئ كخلفية. الألوان الدلالية للمال فقط: أخضر للمقبوض، أحمر للمصروف أو المستحق، كهرماني للتنبيه. لا تعتمد على اللون وحده، أضف إشارة أو نصاً.</p>
  <div class="grid" style="grid-template-columns:repeat(3,1fr)">
    ${sw('Ink', 'حبر', C.ink, 'اللون الأساسي · الأزرار والتنقل والنصوص')}
    ${sw('Gold', 'ذهبي', C.gold, 'اللون المميز · الخط الأساسي في الشعار والتمييز')}
    ${sw('Ivory', 'عاجي', C.ivory, 'الشعار على الداكن · الخلفيات الدافئة', C.ink)}
  </div>
  <div style="margin-top:8mm"><h2>Neutrals</h2></div>
  <div class="grid" style="grid-template-columns:repeat(4,1fr)">
    ${sw('Canvas', 'خلفية', C.canvas, 'خلفية الصفحة', C.ink)}
    ${sw('Line', 'فاصل', C.line, 'حدود رفيعة', C.ink)}
    ${sw('Muted', 'نص ثانوي', C.muted, 'تسميات وملاحظات')}
    ${sw('Ink 2', 'حبر ثانٍ', C.ink2, 'أسطح داكنة مرتفعة')}
  </div>
  <div style="margin-top:8mm"><h2>Semantic</h2></div>
  <div class="grid" style="grid-template-columns:repeat(4,1fr)">
    ${sw('Success', 'مقبوض', '#0D9488', 'دفعات واردة · رصيد موجب')}
    ${sw('Danger', 'مصروف', '#B91C1C', 'مصروفات · مستحقات · عجز')}
    ${sw('Warning', 'تنبيه', '#D97706', 'بانتظار الإجراء')}
    ${sw('Info', 'معلومة', '#0369A1', 'ملاحظات وإرشادات')}
  </div>
  ${foot(3)}
</div>

<div class="page">
  <h2>03 · Typography</h2><h1>الخطوط</h1>
  <p class="lead">عائلة واحدة للعربية واللاتينية والأرقام: <b>Cairo</b>. أرقامها متراصة فتصطف المبالغ في الأعمدة. لا تستخدم خطاً زخرفياً في الأزرار أو الجداول.</p>
  <div class="card" style="flex-direction:column;align-items:flex-start;padding:14mm;gap:6px;height:84mm">
    <div style="font-size:54px;font-weight:700;line-height:1.2">أساس متين</div>
    <div style="font-size:42px;font-weight:700;letter-spacing:.14em;direction:ltr;align-self:flex-start">MAKIN</div>
    <div style="font-size:17px;color:${C.muted};direction:ltr;align-self:flex-start">Aa Bb Cc 0123456789 · ١٢٣٤٥٦٧٨٩٠</div>
  </div>
  <div style="margin-top:8mm" class="card">
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      ${[['عنوان الصفحة', '24px', '700', 'تقرير المشروع'], ['عنوان القسم', '18px', '700', 'المصروفات والمدفوعات'], ['نص أساسي', '14px', '400', 'يعرض هذا الجدول حركة الحساب لكل عميل.'], ['تسمية', '12px', '600', 'الرصيد بعد الديون'], ['رقم كبير', '24px', '600', '48,250.000 د.ل']]
        .map((r) => `<tr style="border-bottom:1px solid ${C.line}"><td style="padding:10px 14px;color:${C.muted};width:28%">${r[0]}</td><td style="padding:10px;direction:ltr;text-align:right;width:22%;white-space:nowrap" class="mono">${r[1]} / ${r[2]}</td><td style="padding:10px 14px;font-size:${r[1]};font-weight:${r[2]};line-height:1.3">${r[3]}</td></tr>`).join('')}
    </table>
  </div>
  <div style="margin-top:8mm"><h2>Rules</h2></div>
  <p class="lead" style="font-size:12px;margin:0">لا تتباعد الأحرف في العربية (يكسر الاتصال). المسافة المتباعدة للاتينية فقط، وللشعار. حجم النص الأدنى 12px، وحقول الإدخال 16px على الهاتف.</p>
  ${foot(4)}
</div>

<div class="page">
  <h2>04 · Iconography</h2><h1>الأيقونات</h1>
  <p class="lead">أيقونات Phosphor بوزن Regular، بسمك خط موحد ولون الحبر. أيقونة لكل معنى، وفي الأزرار بجانب نص دائماً ما لم يكن لها وصف بديل.</p>
  <div class="card" style="padding:12mm;display:grid;grid-template-columns:repeat(6,1fr);gap:10mm 4mm">${icons || '<span class="label">—</span>'}</div>
  <div style="margin-top:10mm"><h2>Components</h2></div>
  <div class="card" style="padding:12mm;gap:8mm;flex-wrap:wrap">
    <div style="background:${C.ink};color:${C.ivory};padding:10px 22px;border-radius:10px;font-weight:600;font-size:14px">حفظ</div>
    <div style="border:1px solid ${C.line};background:#fff;padding:10px 22px;border-radius:10px;font-weight:600;font-size:14px">إلغاء</div>
    <div style="background:${C.goldSoft};color:#7a5a12;padding:6px 14px;border-radius:999px;font-weight:600;font-size:12px">قيد التنفيذ</div>
    <div style="background:#E3F3F1;color:#0b6b62;padding:6px 14px;border-radius:999px;font-weight:600;font-size:12px">مدفوع</div>
    <div style="background:#F7E2E2;color:#8f1717;padding:6px 14px;border-radius:999px;font-weight:600;font-size:12px">متأخر</div>
  </div>
  <p class="lead" style="margin-top:6mm;font-size:12px">حواف الأزرار والحقول 8-10px، البطاقات 12-16px، الأوراق السفلية 24px. الفصل بخطوط رفيعة لا ظلال، والظل للنوافذ العائمة فقط.</p>
  ${foot(5)}
</div>

<div class="page">
  <h2>05 · Applications</h2><h1>التطبيقات</h1>
  <p class="lead">الأوراق الرسمية، بطاقة العمل، وأيقونة التطبيق على الهاتف.</p>
  <div class="grid" style="grid-template-columns:1.25fr 1fr;align-items:start">
    <div class="card" style="height:150mm;flex-direction:column;align-items:stretch;justify-content:flex-start;padding:10mm;box-shadow:0 8px 24px -12px rgba(0,0,0,.25)">
      <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:8px;border-bottom:2px solid ${C.gold}">
        ${lockupH(C.ink, C.gold, 40)}<div style="text-align:left;font-size:9px;color:${C.muted};direction:ltr">+218 00 000 0000<br>info@makin.example</div>
      </div>
      <div style="font-size:10px;color:${C.muted};margin-top:12px">التاريخ: 25 / 10 / 2026 &nbsp;·&nbsp; الرقم: MK-0001</div>
      <div style="margin-top:14px;font-weight:700;font-size:13px">إلى السادة / ............................</div>
      <div style="margin-top:10px;display:grid;gap:7px">${[100, 96, 99, 90, 97, 60].map((w) => `<div style="height:6px;border-radius:3px;background:${C.line};width:${w}%"></div>`).join('')}</div>
      <div style="margin-top:auto;display:flex;justify-content:space-between;font-size:9px;color:${C.muted};border-top:1px solid ${C.line};padding-top:8px"><span>ماكين للمقاولات والإنشاءات</span><span>العنوان</span></div>
    </div>
    <div style="display:grid;gap:5mm">
      <div class="card" style="height:46mm;background:${C.ink};border-color:${C.ink};flex-direction:column;gap:6px">${lockupV(C.ivory, C.gold, 52)}</div>
      <div class="card" style="height:46mm;flex-direction:column;align-items:flex-start;padding:10mm;gap:2px"><b style="font-size:14px">الاسم الكامل</b><span style="font-size:11px;color:${C.muted}">مدير المشاريع</span><span class="mono" style="margin-top:8px">+218 00 000 0000</span></div>
      <div class="card" style="height:46mm;background:#e9e6df;gap:10px">${tile(70)}${tile(48)}</div>
    </div>
  </div>
  ${foot(6)}
</div>`);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const pdf = async (html, file) => {
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({ path: path.join(OUT, file), format: 'A4', printBackground: true, preferCSSPageSize: true });
    console.log('wrote brand/' + file);
  };
  await pdf(logoSheet, 'MAKIN-Logo.pdf');
  await pdf(guide, 'MAKIN-Brand-Identity.pdf');

  await browser.close();
})();
