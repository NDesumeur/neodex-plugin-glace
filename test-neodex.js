// lancé par le test « local » de NeoDex : vérification interne (les 80 niveaux, les règles des nouveautés), le plus court chemin joué au clavier,
// puis un niveau de chaque nouveauté (glace fissurée, tas de neige, téléporteurs) joué jusqu'au drapeau, le plein écran et la place prise (avec NEO_SHOTS : garde des images du jeu)
module.exports = async ({ pj, sleep }) => {
  const C = code => pj(`(() => { const T = document.getElementById('glCanvas').__gl, st = T.st(); ${code} })()`);
  const key = k => pj(`document.dispatchEvent(new KeyboardEvent('keydown', {key: '${k}', bubbles: true})), 0`);
  const label = () => pj(`document.getElementById('glCanvas').getAttribute('aria-label')`);
  const shot = async n => { if (!process.env.NEO_SHOTS) return; const d = await pj(`document.getElementById('glCanvas').toDataURL()`); require('fs').writeFileSync(require('path').join(process.env.NEO_SHOTS, 'glace-' + n + '.png'), Buffer.from(d.split(',')[1], 'base64')); };
  await pj(`window.__e = []; addEventListener('error', e => __e.push(e.message)); 0`);
  const sc = await pj(`document.querySelector('[data-selfcheck]')?.dataset.selfcheck`); if (sc !== 'ok') throw new Error('vérification interne : ' + sc);
  const all = await C('return T.check(true);'); if (all !== 'ok') throw new Error('vérification des 80 niveaux : ' + all);
  await sleep(300);
  const play = async (n, shots) => {
    await C(`T.go(${n}); return 0;`); await sleep(200); if (shots) await shot(n + '-0-depart');
    const path = await pj(`document.getElementById('glCanvas').__solve()`); let i = 0;
    for (const m of path) { await key(m); await sleep(140); if (shots && i === shots) await shot(n + '-1-glisse'); i++; await sleep(Math.max(0, 700 - 140)); }
    await sleep(500); const l = await label(); if (!/niveau fini/.test(l)) throw new Error('le niveau ' + n + ' devait être fini : « ' + l + ' »');
    if (shots) await shot(n + '-2-fin');
  };
  for (const m of await pj(`document.getElementById('glCanvas').__solve()`)) { await key(m); await sleep(800); }
  await sleep(500); if (!/niveau fini/.test(await label())) throw new Error('le premier niveau devait être fini');
  for (const n of [61, 66, 71]) await play(n, n === 61 ? 3 : n === 66 ? 2 : 2);
  const errs = await pj(`window.__e.join(' | ')`); if (errs) throw new Error('erreur : ' + errs);
  // plein écran, et la zone de jeu qui tient dans la fenêtre
  await pj(`document.fullscreenElement && document.exitFullscreen(), 0`); await sleep(200);
  await pj(`document.getElementById('glFs').click(), 0`); await sleep(700);
  const fs = await pj(`(() => { const c = document.getElementById('glCanvas'), r = c.getBoundingClientRect(); return document.fullscreenElement === c.parentElement && (Math.abs(r.height - innerHeight) < 3 || Math.abs(r.width - innerWidth) < 3); })()`);
  await pj(`document.fullscreenElement && document.exitFullscreen(), 0`); await sleep(300);
  if (!fs) throw new Error('le plein écran ne remplit pas l\'écran');
  const L = await pj(`(() => { const r = document.getElementById('glCanvas').getBoundingClientRect(); let s = 0; for (let e = document.getElementById('glCanvas').parentElement; e; e = e.parentElement) s += e.scrollTop; return { bottom: Math.round(r.bottom + s), h: Math.round(r.height), wh: innerHeight, ww: innerWidth, sw: document.documentElement.scrollWidth }; })()`);
  if (process.env.NEO_FIT_LOG) console.log('FIT', JSON.stringify(L));
  if (L.bottom > L.wh + 1 || L.sw > L.ww + 1 || L.h < 300) throw new Error('la zone de jeu dépasse la fenêtre ou reste petite : ' + JSON.stringify(L));
  await C('T.go(71); return 0;'); await sleep(300);  // on finit sur un niveau à téléporteurs, pour la capture
  return 'vérification ok (80 niveaux) · niveaux 61, 66 et 71 finis (fissures, tas de neige, téléporteurs) · plein écran · ' + L.h + ' px dans ' + L.ww + '×' + L.wh;
};
