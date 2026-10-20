/* شكل الشخصية: جسم كامل (راس، رقبة، صدر، بطن، إيدين، رجلين)، بيتحدد من الجنس والعمر والطول والبنية.
   مش بيحكم على الجسم، والشكل بيفضل ودود ومتناسق. */
(function (root) {
  'use strict';
  const BUILD = {
    slim:     { W: 24, Wa: 16, H: 20, belly: 0, arm: 6.5, leg: 10 },
    standard: { W: 30, Wa: 21, H: 25, belly: 4, arm: 8,   leg: 13 },
    sturdy:   { W: 36, Wa: 26, H: 30, belly: 9, arm: 9.5, leg: 16 }
  };
  const SCALE_Y = { short: 0.94, medium: 1, tall: 1.04 };
  const SKIN = '#f1c9a5', SKIN_SHADE = '#dcae86', INK = '#222';

  function avatarSpec(p) {
    const gender = p.gender === 'm' ? 'm' : 'f';
    const age = +p.age || 30;
    const ageGroup = age < 30 ? 'young' : age < 45 ? 'adult' : 'mature';
    const hM = (+p.height || 170) / 100, w = +p.weight || 70;
    const bmi = w / (hM * hM);
    const auto = bmi < 18.5 ? 'slim' : bmi < 27 ? 'standard' : 'sturdy';
    const build = ['slim', 'standard', 'sturdy'].includes(p.buildOverride) ? p.buildOverride : auto;
    const cm = hM * 100;
    const heightClass = cm < 165 ? 'short' : cm < 180 ? 'medium' : 'tall';
    return { gender, ageGroup, build, heightClass, auto };
  }

  function avatarSVG(mood, profile) {
    const s = avatarSpec(profile || {});
    const f = s.gender === 'f';
    const b = BUILD[s.build];
    const W = b.W + (f ? -3 : 4), Wa = b.Wa + (f ? -2 : 0), H = b.H + (f ? 3 : 0);
    const belly = f ? b.belly * 0.5 : b.belly;
    const shirt = f ? '#7c5cff' : '#3d6bff';
    const shorts = f ? '#2e3a59' : '#26324d';
    const shoe = '#2b2b33';
    const hairCol = s.ageGroup === 'young' && !f ? '#3a2a1f' : '#2b1d16';
    const sy = SCALE_Y[s.heightClass];
    const X = d => (100 + d).toFixed(1);
    const P = (dx, y) => `${X(dx)} ${y}`;
    const path = pts => 'M' + pts.map(q => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(' L');
    const happy = mood === 'happy' || mood === 'proud';

    // الجذع (التيشرت): كتف، صدر، بطن، حوض
    const torso = `M${P(-W, 74)} Q100 62 ${P(W, 74)} Q${X(W + 2)} 112 ${P(Wa + belly, 140)} Q${X(H)} 160 ${P(H, 172)} L${P(-H, 172)} Q${X(-H)} 160 ${P(-(Wa + belly), 140)} Q${X(-W - 2)} 112 ${P(-W, 74)}Z`;

    // الإيد: كم قصير + ذراع + كف
    const arm = sg => {
      const sh = [100 + sg * (W + 1), 80], el = [100 + sg * (W + 7), 128], wr = [100 + sg * (W + 9), 170];
      const sleeveEnd = [100 + sg * (W + 4), 104];
      return {
        sh,
        skin: `<path d="${path([sleeveEnd, el, wr])}" stroke="${SKIN}" stroke-width="${b.arm}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
        hand: `<circle cx="${wr[0].toFixed(1)}" cy="${wr[1] + 6}" r="${(b.arm * 0.85).toFixed(1)}" fill="${SKIN}"/>`,
        sleeve: `<path d="${path([sh, sleeveEnd])}" stroke="${shirt}" stroke-width="${b.arm + 4}" stroke-linecap="round" fill="none"/>`
      };
    };
    const R = arm(1), L = arm(-1);
    const rightArm = `<g class="${happy ? 'wave' : ''}" style="transform-origin:${R.sh[0].toFixed(1)}px ${R.sh[1]}px">${R.skin}${R.hand}${R.sleeve}</g>`;
    const leftArm = `${L.skin}${L.hand}${L.sleeve}`;

    // الرجلين: الشورت لحد نص الفخد، وبعدين الرجل والقدم
    const leg = sg => {
      const hip = [100 + sg * (H - 7), 168], kn = [100 + sg * (H - 5), 222], an = [100 + sg * (H - 6), 262];
      const mid = [hip[0] + (kn[0] - hip[0]) * 0.55, hip[1] + (kn[1] - hip[1]) * 0.55];
      return `<path d="${path([hip, kn, an])}" stroke="${SKIN}" stroke-width="${(b.leg * 0.9).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
        + `<path d="${path([hip, mid])}" stroke="${shorts}" stroke-width="${b.leg + 4}" stroke-linecap="round" fill="none"/>`
        + `<ellipse cx="${(an[0] + sg * 2).toFixed(1)}" cy="274" rx="9" ry="5" fill="${shoe}"/>`;
    };

    // الراس والوش
    const hairBack = f ? `<path d="M74 44Q70 12 100 12Q130 12 126 44L130 84Q100 92 70 84Z" fill="${hairCol}"/>` : '';
    const hairFront = f
      ? `<path d="M76 36Q80 14 100 16Q120 14 124 36Q106 26 76 36Z" fill="${hairCol}"/>`
      : `<path d="M76 40Q76 16 100 16Q124 16 124 40Q112 28 100 28Q88 28 76 40Z" fill="${hairCol}"/>`;
    const grey = s.ageGroup === 'mature'
      ? '<path d="M78 34Q82 26 86 30M122 34Q118 26 114 30" stroke="#c9c9d1" stroke-width="4" fill="none" stroke-linecap="round"/>' : '';
    const beard = (!f && s.ageGroup !== 'young')
      ? '<path d="M80 50Q100 74 120 50Q114 60 100 62Q86 60 80 50Z" fill="#3a2a1f" opacity=".75"/>' : '';
    const eyes = mood === 'sleep'
      ? `<path d="M90 42h7M103 42h7" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`
      : happy
        ? `<path d="M90 44q4-5 8 0M102 44q4-5 8 0" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`
        : `<g class="blink"><circle cx="94" cy="42" r="2.8" fill="${INK}"/><circle cx="106" cy="42" r="2.8" fill="${INK}"/></g>`;
    const mouth = happy
      ? `<path d="M92 54q8 6 16 0" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`
      : mood === 'sleep'
        ? `<circle cx="100" cy="56" r="2.4" fill="${INK}"/>`
        : `<path d="M94 55h12" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`;
    const bust = f
      ? `<circle cx="${X(-9)}" cy="98" r="6" fill="#000" opacity=".12"/><circle cx="${X(9)}" cy="98" r="6" fill="#000" opacity=".12"/>` : '';

    const figure = `
      ${leftArm}
      ${leg(-1)}${leg(1)}
      <path d="${torso}" fill="${shirt}"/>
      ${bust}
      <ellipse cx="100" cy="146" rx="${10 + belly}" ry="8" fill="#000" opacity="${belly ? 0.07 : 0}"/>
      ${rightArm}
      <rect x="93" y="58" width="14" height="18" rx="5" fill="${SKIN_SHADE}"/>
      ${hairBack}
      <circle cx="76" cy="44" r="4.5" fill="${SKIN}"/><circle cx="124" cy="44" r="4.5" fill="${SKIN}"/>
      <circle cx="100" cy="42" r="24" fill="${SKIN}"/>
      ${hairFront}${grey}${beard}${eyes}${mouth}
      <circle cx="84" cy="50" r="3.5" fill="#ff8fa3" opacity=".5"/><circle cx="116" cy="50" r="3.5" fill="#ff8fa3" opacity=".5"/>`;

    return `<svg viewBox="0 0 200 292" xmlns="http://www.w3.org/2000/svg" data-hair="${f ? 'long' : 'short'}" data-build="${s.build}">
      <ellipse cx="100" cy="282" rx="44" ry="6" fill="#000" opacity=".12"/>
      <g transform="translate(0 ${(280 * (1 - sy)).toFixed(2)}) scale(1 ${sy})">${figure}</g>
    </svg>`;
  }

  root.VitalisAvatar = { avatarSpec, avatarSVG };
  if (typeof module !== 'undefined') module.exports = root.VitalisAvatar;
})(typeof globalThis !== 'undefined' ? globalThis : this);
