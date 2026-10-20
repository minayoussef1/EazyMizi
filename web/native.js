/* جسر الإشعارات للأندرويد. على المتصفح ما بيعملش حاجة. */
(function () {
  'use strict';
  const LN = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
  const ID = 1;
  // بيحدد تذكير واحد جاي: بكرة لو اتسجلت وجبة رئيسية النهارده، أو النهارده لو لسه ما اتسجلتش ولسه بدري
  window.syncReminder = async function (meals, prefs) {
    if (!LN || !window.Vitalis) return;
    await LN.cancel({ notifications: [{ id: ID }] }).catch(() => {});
    if (!prefs || !prefs.reminderOn) return;
    const perm = await LN.requestPermissions().catch(() => ({ display: 'denied' }));
    if (perm.display !== 'granted') return;
    const now = new Date();
    const target = new Date(now);
    target.setHours(prefs.reminderHour, 0, 0, 0);
    const loggedToday = window.Vitalis.mainLogged(meals, window.Vitalis.dayKey(now)) > 0;
    if (loggedToday || target <= now) target.setDate(target.getDate() + 1);
    await LN.schedule({ notifications: [{
      id: ID, title: 'ميزو', body: 'لسه ماسجلتش وجبة النهارده 🌿',
      schedule: { at: target, allowWhileIdle: true }
    }] });
  };
  if (LN && LN.createChannel) LN.createChannel({ id: 'reminders', name: 'تذكير الوجبات', importance: 3 }).catch(() => {});
})();
