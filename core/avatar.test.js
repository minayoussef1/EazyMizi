const A = require('./avatar.js');
const assert = require('assert');
let pass = 0;
const t = (n, f) => { try { f(); pass++; console.log('✓', n); } catch (e) { console.log('✗', n, e.message); process.exitCode = 1; } };
t('شاب تقيل بيطلع sturdy', () => assert.strictEqual(A.avatarSpec({ gender: 'm', age: 22, height: 178, weight: 100 }).build, 'sturdy'));
t('بنت نحيفة بتطلع slim وقصيرة', () => { const s = A.avatarSpec({ gender: 'f', age: 25, height: 158, weight: 45 }); assert.strictEqual(s.build, 'slim'); assert.strictEqual(s.heightClass, 'short'); });
t('شكل يدوي بيغلب التلقائي', () => assert.strictEqual(A.avatarSpec({ gender: 'm', age: 30, height: 175, weight: 70, buildOverride: 'sturdy' }).build, 'sturdy'));
t('الفئة العمرية', () => { assert.strictEqual(A.avatarSpec({ age: 50 }).ageGroup, 'mature'); assert.strictEqual(A.avatarSpec({ age: 25 }).ageGroup, 'young'); });
t('الراجل عنده لحية والبنت شعر طويل', () => {
  assert.ok(A.avatarSVG('happy', { gender: 'm', age: 40 }).includes('#3a2a1f'));
  assert.ok(A.avatarSVG('happy', { gender: 'f', age: 25 }).includes('data-hair="long"'));
});
t('الجسم الكامل: رجلين وإيدين وجذع ووش', () => {
  const svg = A.avatarSVG('happy', { gender: 'm', age: 28 });
  assert.ok((svg.match(/stroke-width="[\d.]+" stroke-linecap="round" stroke-linejoin="round" fill="none"\/>/g) || []).length >= 4, 'limbs');
  assert.ok(svg.includes('<path d="M'), 'torso');
  assert.ok(svg.includes('r="24"'), 'head');
  assert.ok(svg.includes('class="wave"'), 'waving arm when happy');
});
t('البطن بيظهر مع البنية المتوسطة والتقيلة', () => {
  assert.ok(A.avatarSVG('happy', { gender: 'm', age: 30, buildOverride: 'sturdy' }).includes('rx="19"'));
});
t('الوجه بيتغير مع المود', () => assert.notStrictEqual(A.avatarSVG('sleep', {}), A.avatarSVG('happy', {})));
console.log(`\n${pass} اختبار نجح`);
