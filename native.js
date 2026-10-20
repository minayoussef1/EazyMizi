/* Vitalis core: منطق البيانات والحسابات بدون أي واجهة.
   كل الدوال نقية (pure) تقريبًا وتتختبر بـ node. */
(function (root) {
  'use strict';
  const VERSION = 2;
  const TYPES = ['فطار', 'غداء', 'عشاء', 'سناك'];
  const MAIN = ['فطار', 'غداء', 'عشاء'];
  const FLOOR = { f: 1200, m: 1500 };          // حد أدنى آمن للسعرات
  const KCAL_PER_KG = 7700;
  const PORTIONS = { small: 0.6, medium: 1, large: 1.5 };

  // قاعدة الأكل المصري: سعرات تقريبية لحصة متوسطة (قابلة للتعديل من الجدول)
  const DISHES = [
    { id: 'ful-oil', name: 'فول بالزيت', kcal: 250, type: 'فطار' },
    { id: 'ful-tahina', name: 'فول بالطحينة والعيش', kcal: 380, type: 'فطار' },
    { id: 'taameya-3', name: 'طعمية (3 قطع)', kcal: 220, type: 'فطار' },
    { id: 'taameya-sand', name: 'ساندوتش طعمية', kcal: 350, type: 'فطار' },
    { id: 'eggs-2', name: 'بيض مقلي (بيضتين)', kcal: 200, type: 'فطار' },
    { id: 'qareesh', name: 'جبنة قريش وطماطم', kcal: 150, type: 'فطار' },
    { id: 'koshari-m', name: 'كشري وسط', kcal: 450, type: 'غداء' },
    { id: 'koshari-s', name: 'كشري صغير', kcal: 300, type: 'غداء' },
    { id: 'mahshi', name: 'محشي (4 قطع)', kcal: 320, type: 'غداء' },
    { id: 'molokhia', name: 'ملوخية بالفراخ والأرز', kcal: 520, type: 'غداء' },
    { id: 'sheariya', name: 'أرز بالشعرية', kcal: 350, type: 'غداء' },
    { id: 'grilled', name: 'فراخ مشوية وأرز', kcal: 600, type: 'غداء' },
    { id: 'hawawshi', name: 'حواوشي', kcal: 450, type: 'غداء' },
    { id: 'fatta', name: 'فتة', kcal: 650, type: 'غداء' },
    { id: 'moussaka', name: 'مسقعة', kcal: 400, type: 'غداء' },
    { id: 'hamam', name: 'حمام محشي', kcal: 500, type: 'غداء' },
    { id: 'shawarma', name: 'شاورما فراخ', kcal: 550, type: 'سناك' },
    { id: 'fiteer', name: 'فطير مشلتت (شريحة)', kcal: 350, type: 'سناك' },
    { id: 'salad', name: 'سلطة بلدي', kcal: 80, type: 'سناك' },
    { id: 'dates', name: 'تمر (5 حبات)', kcal: 140, type: 'سناك' },
    { id: 'balila', name: 'بليلة', kcal: 400, type: 'سناك' },
    { id: 'om-ali', name: 'أم علي (حصة)', kcal: 600, type: 'سناك' }
  ];

  // ---------- أدوات عامة ----------
  const pad = n => String(n).padStart(2, '0');
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (key, n) => { const [y, m, d] = key.split('-').map(Number); return dayKey(new Date(y, m - 1, d + n)); };
  const daysBetween = (a, b) => {
    const p = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
    return Math.round((p(b) - p(a)) / 86400000);
  };
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const clamp = (x, max) => { const v = Number(x); return Number.isFinite(v) && v > 0 ? Math.min(max, Math.round(v)) : 0; };
  // تطبيع للبحث العربي: بيشيل التشكيل ويوحّد الألف والياء والتاء المربوطة
  const normalizeAr = s => String(s || '').toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '').replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();

  // ---------- الملف الشخصي والأهداف ----------
  function validateProfile(p) {
    const e = [];
    if (!['f', 'm'].includes(p.gender)) e.push('حدد النوع');
    const age = +p.age; if (!(age >= 18 && age <= 90)) e.push('العمر لازم يكون بين 18 و90');
    const h = +p.height; if (!(h >= 120 && h <= 230)) e.push('الطول بين 120 و230 سم');
    const w = +p.weight; if (!(w >= 30 && w <= 300)) e.push('الوزن بين 30 و300 كجم');
    if (!['low', 'medium', 'high'].includes(p.activity)) e.push('حدد مستوى النشاط');
    if (!['habits', 'loss', 'maintain'].includes(p.goal)) e.push('حدد الهدف');
    if (p.goal === 'loss') {
      const tw = +p.target;
      if (!(tw > 0)) e.push('حدد الوزن المستهدف');
      else if (tw >= w) e.push('الوزن المستهدف لازم يكون أقل من وزنك الحالي');
    }
    return e;
  }

  function calcTargets(p) {
    const errors = validateProfile(p);
    if (errors.length) return { errors };
    const w = +p.weight, h = +p.height, a = +p.age;
    const bmr = 10 * w + 6.25 * h - 5 * a + (p.gender === 'm' ? 5 : -161);
    const tdee = bmr * { low: 1.2, medium: 1.45, high: 1.7 }[p.activity];
    const warnings = [];
    let kcal = tdee, rate = 0, weeks = null;
    if (p.goal === 'loss') {
      const tw = +p.target;
      kcal = tdee - 500;                               // عجز ~0.45 كجم/أسبوع
      if (kcal < FLOOR[p.gender]) {
        kcal = FLOOR[p.gender];
        warnings.push(`عشان نحافظ على أمانك الحد الأدنى ${FLOOR[p.gender]} سعرة. ممكن تطوّل المدة بدل ما تنزل أكتر.`);
      }
      rate = Math.max(0, (tdee - kcal) * 7 / KCAL_PER_KG);
      weeks = rate > 0 ? Math.ceil((w - tw) / rate) : null;
      if (tw / ((h / 100) ** 2) < 18.5) warnings.push('الوزن المستهدف أقل من النطاق الصحي لطولك، راجع الهدف مع مختص.');
    }
    kcal = Math.round(kcal);
    const protein = Math.round(w * (p.goal === 'loss' ? 1.6 : 1.2));
    const fat = Math.round(kcal * 0.25 / 9);
    const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
    return { errors: [], bmr: Math.round(bmr), tdee: Math.round(tdee), calories: kcal, protein, carbs, fat,
      rateKgPerWeek: Math.round(rate * 100) / 100, weeksToTarget: weeks, warnings };
  }

  // ---------- الوجبات ----------
  function makeMeal(input, day) {
    const name = String(input.name || '').trim();
    const cal = Number(input.cal ?? input.calories);
    const errors = [];
    if (!name || name.length > 80) errors.push('اكتب اسم الأكلة (حتى 80 حرف)');
    if (!(cal >= 0 && cal <= 3000)) errors.push('السعرات لازم تكون بين 0 و3000');
    if (errors.length) return { errors };
    return { errors: [], meal: {
      id: input.id || uid(), day: input.day || day || dayKey(),
      type: TYPES.includes(input.type) ? input.type : 'سناك', name, cal: Math.round(cal),
      p: clamp(input.p ?? input.protein, 500), c: clamp(input.c ?? input.carbs, 500), f: clamp(input.f ?? input.fat, 500),
      source: input.source || 'manual', needsReview: !!input.needsReview } };
  }
  function searchDishes(q, limit = 8) {
    const nq = normalizeAr(q);
    return DISHES.filter(d => !nq || normalizeAr(d.name).includes(nq)).slice(0, limit);
  }
  function dishToInput(dish, portion = 'medium') {
    return { name: dish.name, cal: Math.round(dish.kcal * (PORTIONS[portion] || 1)), type: dish.type, source: 'dish' };
  }
  function editMeal(meals, id, changes) {
    const old = meals.find(m => m.id === id);
    if (!old) return { errors: ['الوجبة مش موجودة'] };
    const r = makeMeal({ ...old, ...changes, id, day: old.day }, old.day);
    if (r.errors.length) return r;
    return { errors: [], meals: meals.map(m => m.id === id ? r.meal : m) };
  }
  function removeMeal(meals, id) {       // بترجع الوجبة المحذوفة عشان تقدر ترجعها (undo)
    const removed = meals.find(m => m.id === id);
    return { meals: meals.filter(m => m.id !== id), removed: removed || null };
  }

  // ---------- استيراد رد الـAI ----------
  function parseAIResult(text) {
    const raw = String(text || '').replace(/```(?:json)?/gi, '').trim();
    let j;
    try { j = JSON.parse(raw); } catch (e) { return { errors: ['الرد مش JSON صحيح، انسخه كما هو من الـAI'] }; }
    const name = String(j.name || '').trim(), cal = Number(j.calories), errors = [];
    if (!name) errors.push('الرد مفيهوش اسم أكلة');
    if (!(cal >= 0 && cal <= 3000)) errors.push('السعرات في الرد مش منطقية');
    if (errors.length) return { errors };
    const confidence = ['high', 'medium', 'low'].includes(j.confidence) ? j.confidence : 'low';
    return { errors: [], confidence, ingredients: Array.isArray(j.ingredients) ? j.ingredients.slice(0, 15).map(String) : [],
      draft: { name, cal, protein: j.protein, carbs: j.carbs, fat: j.fat, source: 'ai', needsReview: confidence !== 'high' } };
  }

  // ---------- الإحصائيات ----------
  const dayMeals = (meals, day) => meals.filter(m => m.day === day);
  function dayTotals(meals, day) {
    return dayMeals(meals, day).reduce((s, m) => ({ cal: s.cal + m.cal, p: s.p + m.p, c: s.c + m.c, f: s.f + m.f }), { cal: 0, p: 0, c: 0, f: 0 });
  }
  const mainLogged = (meals, day) => new Set(dayMeals(meals, day).map(m => m.type).filter(t => MAIN.includes(t))).size;
  function streak(meals, today) {
    const days = new Set(meals.map(m => m.day));
    let d = days.has(today) ? today : addDays(today, -1);   // اليوم لسه ما خلصش، فمش بنكسر السلسلة
    let s = 0;
    while (days.has(d)) { s++; d = addDays(d, -1); }
    return s;
  }
  function addWeight(weights, value, day) {
    if (!(value >= 30 && value <= 300)) return { errors: ['الوزن بين 30 و300 كجم'] };
    const list = weights.filter(w => w.day !== day).concat({ day, v: Math.round(value * 10) / 10 });
    return { errors: [], weights: list.sort((a, b) => (a.day < b.day ? -1 : 1)) };
  }
  // التغيّر في الوزن بالكيلو في الأسبوع (انحدار خطي على آخر N يوم)
  function weightSlopePerWeek(weights, today, windowDays = 14) {
    const pts = weights.filter(w => { const ago = daysBetween(w.day, today); return ago >= 0 && ago < windowDays; })
      .map(w => ({ x: -daysBetween(w.day, today), y: w.v }));
    if (pts.length < 2) return null;
    const mx = pts.reduce((s, p) => s + p.x, 0) / pts.length, my = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const den = pts.reduce((s, p) => s + (p.x - mx) ** 2, 0);
    if (!den) return null;
    const slope = pts.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0) / den;
    return Math.round(slope * 7 * 100) / 100;
  }
  function forecastMonthEnd(weights, today, slopePerWeek) {
    if (slopePerWeek == null || !weights.length) return null;
    const last = weights[weights.length - 1].v;
    const [y, m] = today.split('-').map(Number);
    const left = new Date(y, m, 0).getDate() - Number(today.split('-')[2]);
    return Math.round((last + slopePerWeek * left / 7) * 10) / 10;
  }

  // ---------- الأمان ----------
  // لو أكل قليل جدًا في 3 أيام من آخر 7، بنوقف الضغط على الهدف ونقترح مختص
  function safetyCheck(meals, profile, today) {
    const floor = FLOOR[profile.gender] || 1200;
    let low = 0;
    for (let i = 0; i < 7; i++) {
      const d = addDays(today, -i);
      if (dayMeals(meals, d).length && dayTotals(meals, d).cal < floor * 0.7) low++;
    }
    if (low >= 3) return { flag: true, goalOverride: 'maintain',
      message: 'لاحظت إن أكلك كان قليل في أكتر من يوم. الجسم محتاج طاقة كفاية، فهنوقف الهدف الحالي ونركز على انتظام الوجبات. لو ده متكرر، كلّم دكتور أو أخصائي تغذية.' };
    return { flag: false };
  }

  // ---------- التذكير ----------
  function reminderDecision(now, meals, prefs, lastReminderDay) {
    const today = dayKey(now), h = now.getHours();
    if (!prefs.reminderOn) return { show: false, reason: 'off' };
    if (h >= prefs.quietStart || h < prefs.quietEnd) return { show: false, reason: 'quiet' };
    if (h < prefs.reminderHour) return { show: false, reason: 'early' };
    if (mainLogged(meals, today) > 0) return { show: false, reason: 'logged' };
    if (lastReminderDay === today) return { show: false, reason: 'already' };
    return { show: true, reason: 'ok' };
  }
  const DEFAULT_PREFS = { reminderOn: true, reminderHour: 14, quietStart: 23, quietEnd: 7 };

  // ---------- التقرير الأسبوعي ----------
  function weeklyReport(meals, weights, today) {
    const days = [0, 1, 2, 3, 4, 5, 6].map(i => addDays(today, -i));
    const logged = days.filter(d => dayMeals(meals, d).length);
    const avg = logged.length ? Math.round(logged.reduce((s, d) => s + dayTotals(meals, d).cal, 0) / logged.length) : 0;
    return { loggedDays: logged.length, avgCalories: avg, streak: streak(meals, today),
      weightChangePerWeek: weightSlopePerWeek(weights, today, 7) };
  }

  // ---------- الحفظ والتصدير والاستيراد ----------
  function migrate(d) {
    return {
      version: VERSION,
      profile: d.profile || {},
      meals: (d.meals || []).map(m => ({ ...m, id: m.id || uid(), day: m.day || dayKey(),
        type: TYPES.includes(m.type) ? m.type : 'سناك', cal: Number(m.cal) || 0,
        p: +m.p || 0, c: +m.c || 0, f: +m.f || 0, source: m.source || 'manual' })),
      weights: (d.weights || []).filter(w => w.v >= 30 && w.v <= 300).map(w => ({ day: w.day || dayKey(), v: w.v })),
      prefs: { ...DEFAULT_PREFS, ...(d.prefs || {}) },
      lastReminderDay: d.lastReminderDay || null
    };
  }
  function exportData(state) {
    return JSON.stringify({ app: 'vitalis', version: VERSION, exportedAt: new Date().toISOString(), data: state }, null, 2);
  }
  function importData(text) {
    let o;
    try { o = JSON.parse(text); } catch (e) { return { errors: ['الملف مش صالح'] }; }
    if (!o || o.app !== 'vitalis' || !o.data) return { errors: ['ده مش ملف Vitalis'] };
    if (!Array.isArray(o.data.meals) || !Array.isArray(o.data.weights)) return { errors: ['الملف ناقص بيانات'] };
    return { errors: [], state: migrate(o.data) };
  }

  const api = { VERSION, TYPES, MAIN, FLOOR, DISHES, PORTIONS, DEFAULT_PREFS,
    dayKey, addDays, daysBetween, uid, normalizeAr,
    validateProfile, calcTargets, makeMeal, editMeal, removeMeal, searchDishes, dishToInput,
    parseAIResult, dayMeals, dayTotals, mainLogged, streak, addWeight, weightSlopePerWeek,
    forecastMonthEnd, safetyCheck, reminderDecision, weeklyReport, migrate, exportData, importData };
  root.Vitalis = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
