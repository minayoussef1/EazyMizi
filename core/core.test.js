const V = require('./core.js');
const assert = require('assert');
let pass = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('✓', name); } catch (e) { console.log('✗', name, '\n  ', e.message); process.exitCode = 1; } };
const today = V.dayKey(new Date(2026, 9, 19));
const base = { gender: 'f', age: 30, height: 165, weight: 85, activity: 'low', goal: 'loss', target: 75 };

t('حساب هدف منطقي للتخسيس', () => {
  const r = V.calcTargets(base);
  assert.deepStrictEqual(r.errors, []);
  assert.ok(r.calories >= 1200 && r.calories < r.tdee, 'calories between floor and tdee');
  assert.ok(r.rateKgPerWeek > 0 && r.weeksToTarget > 0);
});
t('الوزن المستهدف لازم يكون أقل من الحالي', () => {
  assert.ok(V.calcTargets({ ...base, target: 90 }).errors.length > 0);
});
t('الحد الأدنى للسعرات بيتطبق وبيطلع تحذير', () => {
  const r = V.calcTargets({ ...base, height: 150, weight: 50, target: 45 });
  assert.strictEqual(r.calories, 1200);
  assert.ok(r.warnings.length > 0);
});
t('تطبيع العربي للبحث', () => {
  assert.ok(V.searchDishes('ام علي').some(d => d.name === 'أم علي (حصة)'));
  assert.ok(V.searchDishes('طعميه').length >= 2);
});
t('حجم الحصة بيغيّر السعرات', () => {
  const d = V.DISHES.find(x => x.id === 'koshari-m');
  assert.strictEqual(V.dishToInput(d, 'large').cal, 675);
});
t('استيراد رد AI مع ``` وثقة منخفضة يتعلم كمراجعة', () => {
  const r = V.parseAIResult('```json\n{"name":"مشبك","calories":300,"confidence":"low"}\n```');
  assert.deepStrictEqual(r.errors, []);
  assert.strictEqual(r.draft.needsReview, true);
});
t('رد AI غلط بيترفض', () => {
  assert.ok(V.parseAIResult('مش JSON').errors.length > 0);
  assert.ok(V.parseAIResult('{"name":"","calories":100}').errors.length > 0);
});
t('السلسلة بتتحسب وما بتتكسرش قبل ما اليوم يخلص', () => {
  const meals = [V.addDays(today, -1), V.addDays(today, -2)].map((d, i) => ({ day: d, id: 'x' + i }));
  assert.strictEqual(V.streak(meals, today), 2);
  assert.strictEqual(V.streak([{ day: today }, { day: V.addDays(today, -1) }], today), 2);
});
t('ميل الوزن بيطلع بالكيلو في الأسبوع', () => {
  const w = [0, 7, 14].map(i => ({ day: V.addDays(today, -14 + i), v: 85 - 0.5 * (i / 7) }));
  const s = V.weightSlopePerWeek(w, today);
  assert.ok(Math.abs(s + 0.5) < 0.05, 'got ' + s);
});
t('الأمان: 3 أيام أكل قليل = تدخل', () => {
  const meals = [0, 1, 2].map(i => ({ day: V.addDays(today, -i), cal: 300, type: 'غداء', id: 'm' + i }));
  assert.strictEqual(V.safetyCheck(meals, { gender: 'f' }, today).flag, true);
  assert.strictEqual(V.safetyCheck([], { gender: 'f' }, today).flag, false);
});
t('التذكير: يظهر بعد الساعة 2 ولو مفيش وجبة، ويختفي بعد التسجيل', () => {
  const at = h => new Date(2026, 9, 19, h, 0);
  assert.strictEqual(V.reminderDecision(at(15), [], V.DEFAULT_PREFS, null).show, true);
  assert.strictEqual(V.reminderDecision(at(15), [{ day: today, type: 'غداء' }], V.DEFAULT_PREFS, null).show, false);
  assert.strictEqual(V.reminderDecision(at(23), [], V.DEFAULT_PREFS, null).reason, 'quiet');
  assert.strictEqual(V.reminderDecision(at(15), [], V.DEFAULT_PREFS, today).reason, 'already');
});
t('تعديل وحذف مع undo', () => {
  const meals = [V.makeMeal({ name: 'فول', cal: 250, type: 'فطار' }, today).meal];
  const e = V.editMeal(meals, meals[0].id, { cal: 9999 });
  assert.ok(e.errors.length > 0);
  const r = V.removeMeal(meals, meals[0].id);
  assert.strictEqual(r.meals.length, 0);
  assert.strictEqual(r.removed.name, 'فول');
});
t('تصدير ثم استيراد بيرجع البيانات', () => {
  const state = V.migrate({ meals: [{ name: 'فول', cal: 250, type: 'فطار', day: today }], weights: [{ day: today, v: 84.5 }], profile: base });
  const r = V.importData(V.exportData(state));
  assert.deepStrictEqual(r.errors, []);
  assert.strictEqual(r.state.meals[0].name, 'فول');
  assert.ok(V.importData('{"app":"other"}').errors.length > 0);
});
t('ترحيل بيانات v1 (من غير أيام)', () => {
  const s = V.migrate({ meals: [{ name: 'كشري', cal: 450, type: 'غداء' }], weights: [] });
  assert.strictEqual(s.meals[0].day, V.dayKey());
  assert.ok(s.meals[0].id);
});
console.log(`\n${pass} اختبار نجح`);
