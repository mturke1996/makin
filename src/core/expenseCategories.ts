/** Stable accounting IDs. Existing categories and historical labels must never be renamed in data. */
export const EXPENSE_CATEGORY_GROUPS = [
  { id: 'preparation', label: 'تجهيز وأعمال الموقع' },
  { id: 'structure', label: 'مواد وأعمال الهيكل' },
  { id: 'services', label: 'كهرباء وسباكة وخدمات' },
  { id: 'finishes', label: 'تشطيبات وأعمال خارجية' },
  { id: 'operations', label: 'عمال ومعدات وتشغيل' },
  { id: 'general', label: 'إدارة ومصروفات عامة' },
] as const;

export const CONSTRUCTION_EXPENSE_CATEGORIES = [
  { id: 'permits', label: 'تراخيص ورسوم حكومية', shortLabel: 'تراخيص', group: 'preparation', keywords: 'بلدية تصريح رخصة' },
  { id: 'site_prep', label: 'تجهيز الموقع والمكاتب', shortLabel: 'تجهيز الموقع', group: 'preparation', keywords: 'سياج كرفان مكاتب' },
  { id: 'surveying', label: 'أعمال مساحة وتخطيط', shortLabel: 'مساحة', group: 'preparation', keywords: 'ميزانية مناسيب حدود' },
  { id: 'excavation', label: 'أعمال حفر وردم', shortLabel: 'حفر وردم', group: 'preparation', keywords: 'حفار أساس تربة' },
  { id: 'dewatering', label: 'نزح مياه وتجفيف الحفر', shortLabel: 'نزح مياه', group: 'preparation', keywords: 'مضخة جوفية طلمبة' },
  { id: 'testing', label: 'اختبارات التربة والمواد', shortLabel: 'اختبارات', group: 'preparation', keywords: 'مختبر مكعبات فحص خرسانة جودة' },
  { id: 'concrete', label: 'خرسانة (جاهزة/مسلحة)', shortLabel: 'خرسانة', group: 'structure', keywords: 'صب باطون جاهزة', defaultUnit: 'm3' },
  { id: 'rebar', label: 'حديد تسليح', shortLabel: 'حديد تسليح', group: 'structure', keywords: 'سيخ شبك أسياخ', defaultUnit: 'ton' },
  { id: 'cement', label: 'أسمنت ومونة جاهزة', shortLabel: 'أسمنت', group: 'structure', keywords: 'اسمنت إسمنت لاصق خرسانة', defaultUnit: 'sack' },
  { id: 'sand', label: 'رمل بناء وتشطيب', shortLabel: 'رمل', group: 'structure', keywords: 'بطحة ناعم خشن', defaultUnit: 'm3' },
  { id: 'aggregate', label: 'زلط وحصى ومواد ردم', shortLabel: 'زلط وحصى', group: 'structure', keywords: 'ركام كسر حجر بحص دفان', defaultUnit: 'm3' },
  { id: 'masonry', label: 'أعمال مباني (طوب/بلوك)', shortLabel: 'مباني', group: 'structure', keywords: 'حائط جدار بناء' },
  { id: 'blocks', label: 'توريد طوب وبلوك', shortLabel: 'طوب وبلوك', group: 'structure', keywords: 'آجر قرميد بلوك إسمنتي', defaultUnit: 'piece' },
  { id: 'formwork', label: 'خشب وشدات وقوالب صب', shortLabel: 'شدات وقوالب', group: 'structure', keywords: 'نجارة مسلحة بليوود لوح', defaultUnit: 'm2' },
  { id: 'concrete_pump', label: 'ضخ خرسانة وخدمات الصب', shortLabel: 'مضخة خرسانة', group: 'structure', keywords: 'بوم بمب صب هزاز', defaultUnit: 'hour' },
  { id: 'structural_steel', label: 'هياكل ومنشآت معدنية', shortLabel: 'هياكل معدنية', group: 'structure', keywords: 'جمالون جسور حديد', defaultUnit: 'ton' },
  { id: 'nails_fasteners', label: 'مسامير وأسلاك ربط ومثبتات', shortLabel: 'مثبتات وربط', group: 'structure', keywords: 'براغي سلك صامولة كانات' },
  { id: 'materials', label: 'توفير مواد خام متنوعة', shortLabel: 'مواد متنوعة', group: 'structure', keywords: 'مشتريات مواد بناء' },
  { id: 'plumbing', label: 'تأسيس وتشطيب سباكة', shortLabel: 'سباكة', group: 'services', keywords: 'مياه صرف صحي مواسير' },
  { id: 'plumbing_fittings', label: 'أنابيب ووصلات وخزانات مياه', shortLabel: 'أنابيب وخزانات', group: 'services', keywords: 'مواسير محبس خزان صرف' },
  { id: 'sanitaryware', label: 'أدوات صحية وخلاطات', shortLabel: 'أدوات صحية', group: 'services', keywords: 'حوض مغسلة مرحاض خلاط' },
  { id: 'electrical', label: 'تأسيس وتشطيب كهرباء', shortLabel: 'كهرباء', group: 'services', keywords: 'كهربائي تأسيس لوحة' },
  { id: 'cables', label: 'كابلات وأسلاك ولوحات كهرباء', shortLabel: 'كابلات ولوحات', group: 'services', keywords: 'سلك قواطع مفاتيح مخارج', defaultUnit: 'm' },
  { id: 'lighting', label: 'إنارة ومصابيح وكشافات', shortLabel: 'إنارة', group: 'services', keywords: 'لمبات ليد نجف إضاءة', defaultUnit: 'piece' },
  { id: 'hvac', label: 'تكييف وتهوية (HVAC)', shortLabel: 'تكييف وتهوية', group: 'services', keywords: 'مكيف دكت مجاري هواء تبريد' },
  { id: 'low_current', label: 'شبكات واتصالات وأنظمة مراقبة', shortLabel: 'شبكات ومراقبة', group: 'services', keywords: 'كاميرات انترنت بيانات إنذار حريق' },
  { id: 'insulation', label: 'أعمال عزل (مائي/حراري)', shortLabel: 'عزل', group: 'finishes', keywords: 'مائي حراري بيتومين رطوبة', defaultUnit: 'm2' },
  { id: 'plaster', label: 'أعمال لياسة (محارة)', shortLabel: 'لياسة', group: 'finishes', keywords: 'محارة قصارة مساح', defaultUnit: 'm2' },
  { id: 'flooring', label: 'أرضيات (سيراميك/رخام)', shortLabel: 'أرضيات', group: 'finishes', keywords: 'بلاط بورسلين رخام جرانيت', defaultUnit: 'm2' },
  { id: 'painting', label: 'دهانات وديكورات', shortLabel: 'دهانات', group: 'finishes', keywords: 'طلاء معجون بوية صبغ', defaultUnit: 'm2' },
  { id: 'gypsum', label: 'جبس مبرد / أسقف معلقة', shortLabel: 'جبس وأسقف', group: 'finishes', keywords: 'جبسن بورد كورنيش سقف', defaultUnit: 'm2' },
  { id: 'woodwork', label: 'أعمال نجارة (أبواب/ديكور)', shortLabel: 'نجارة وأبواب', group: 'finishes', keywords: 'خشب باب مطبخ دولاب' },
  { id: 'aluminum_glass', label: 'ألومنيوم وواجهات زجاجية', shortLabel: 'ألمنيوم وزجاج', group: 'finishes', keywords: 'شبابيك نافذة واجهة' },
  { id: 'iron_work', label: 'أعمال حديد ولحام', shortLabel: 'حدادة ولحام', group: 'finishes', keywords: 'سور درابزين بوابة' },
  { id: 'roofing', label: 'أسقف وتغطيات وقرميد', shortLabel: 'تغطيات أسقف', group: 'finishes', keywords: 'ساندوتش بانل سقف صاج قرميد', defaultUnit: 'm2' },
  { id: 'landscaping', label: 'تنسيق حدائق وشبكات ري', shortLabel: 'حدائق وري', group: 'finishes', keywords: 'زراعة نجيل شجر حديقة' },
  { id: 'paving', label: 'رصف وأرصفة وأعمال خارجية', shortLabel: 'رصف وأرصفة', group: 'finishes', keywords: 'انترلوك بردورة اسفلت ساحة', defaultUnit: 'm2' },
  { id: 'labor', label: 'أجور عمالة ومصنعية', shortLabel: 'أجور عمال', group: 'operations', keywords: 'عامل يومية دفعة مصنعية', defaultUnit: 'day' },
  { id: 'subcontractors', label: 'مستخلصات مقاولين باطن', shortLabel: 'مقاول باطن', group: 'operations', keywords: 'مستخلص مقاول مستحقات' },
  { id: 'equipment', label: 'إيجار معدات وسقالات', shortLabel: 'إيجار معدات', group: 'operations', keywords: 'حفار ونش رافعة سقالة', defaultUnit: 'day' },
  { id: 'generator_rental', label: 'إيجار مولدات ومضخات', shortLabel: 'مولدات ومضخات', group: 'operations', keywords: 'مولد كهرباء طلمبة', defaultUnit: 'day' },
  { id: 'tools', label: 'شراء عدد وأدوات صغيرة', shortLabel: 'عدد وأدوات', group: 'operations', keywords: 'دريل صاروخ معدات يدوية' },
  { id: 'consumables', label: 'مستهلكات الموقع وأدوات القص', shortLabel: 'مستهلكات', group: 'operations', keywords: 'قرص ريشة فرشاة شريط' },
  { id: 'transport', label: 'نقل وتشوين', shortLabel: 'نقل وتشوين', group: 'operations', keywords: 'شاحنة رحلة توصيل تحميل', defaultUnit: 'trip' },
  { id: 'disposal', label: 'نقل مخلفات (ردم)', shortLabel: 'نقل مخلفات', group: 'operations', keywords: 'مخلفات قمامة ردم هدم', defaultUnit: 'trip' },
  { id: 'fuel', label: 'وقود وزيوت', shortLabel: 'وقود وزيوت', group: 'operations', keywords: 'بنزين ديزل نافطة شحم', defaultUnit: 'liter' },
  { id: 'maintenance', label: 'صيانة معدات', shortLabel: 'صيانة', group: 'operations', keywords: 'إصلاح قطع غيار' },
  { id: 'site_safety', label: 'سلامة الموقع ومعدات الوقاية', shortLabel: 'سلامة ووقاية', group: 'operations', keywords: 'خوذة حذاء قفاز طفاية' },
  { id: 'cleaning', label: 'تنظيف الموقع وتجهيز التسليم', shortLabel: 'تنظيف وتسليم', group: 'operations', keywords: 'نظافة تسليم نهائي' },
  { id: 'security', label: 'حراسة وأمن الموقع', shortLabel: 'حراسة الموقع', group: 'operations', keywords: 'حارس أمن', defaultUnit: 'day' },
  { id: 'consulting', label: 'استشارات وإشراف هندسي', shortLabel: 'إشراف هندسي', group: 'general', keywords: 'مهندس تصميم مخططات أتعاب' },
  { id: 'hospitality', label: 'ضيافة وإعاشة موقع', shortLabel: 'إعاشة وضيافة', group: 'general', keywords: 'طعام شرب وجبات عمال' },
  { id: 'rent', label: 'إيجار سكن/مقر', shortLabel: 'إيجار سكن', group: 'general', keywords: 'سكن مكتب مقر' },
  { id: 'utilities', label: 'فواتير (كهرباء/مياه/نت)', shortLabel: 'فواتير خدمات', group: 'general', keywords: 'إنترنت ماء كهرباء اشتراك' },
  { id: 'other', label: 'مصروفات أخرى', shortLabel: 'أخرى', group: 'general', keywords: 'متنوعة أخرى' },
] as const;

export type ActiveExpenseCategory = typeof CONSTRUCTION_EXPENSE_CATEGORIES[number]['id'];
export const ACTIVE_EXPENSE_CATEGORY_IDS = CONSTRUCTION_EXPENSE_CATEGORIES.map((category) => category.id);
export const LEGACY_EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  government_fees: 'رسوم حكومية', office_supplies: 'قرطاسية ومكتبية', marketing: 'تسويق',
};
export const expenseCategories: Record<string, string> = Object.fromEntries(CONSTRUCTION_EXPENSE_CATEGORIES.map((category) => [category.id, category.label]));
export const getExpenseCategory = (id: string) => CONSTRUCTION_EXPENSE_CATEGORIES.find((category) => category.id === id);
export const getExpenseCategoryLabel = (id: string): string => expenseCategories[id] || LEGACY_EXPENSE_CATEGORY_LABELS[id] || id;
export const getExpenseCategoryShortLabel = (id: string): string => getExpenseCategory(id)?.shortLabel || getExpenseCategoryLabel(id);
export const getExpenseCategoryDefaultUnit = (id: string): string => {
  const category = getExpenseCategory(id);
  return category && 'defaultUnit' in category ? category.defaultUnit : '';
};
