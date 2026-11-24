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
  // le niveau du jour : le même à chaque départ, joué jusqu'au drapeau
  const dl = []; for (let k = 0; k < 2; k++) { await pj(`document.getElementById('glDaily').click(), 0`); await sleep(300); dl.push(await C('return st.daily + ":" + JSON.stringify(st.L.g) + st.L.opt;')); }
  if (dl[0] !== dl[1] || !dl[0].startsWith('true')) throw new Error('niveau du jour');
  for (const m of await pj(`document.getElementById('glCanvas').__solve()`)) { await key(m); await sleep(700); }
  await sleep(400); if (await C('return st.mode;') !== 'won') throw new Error('le niveau du jour devait être fini');
  // l'éditeur : un rocher posé au clic, essayer le niveau et le finir, le garder, son code recopié puis rouvert
  await pj(`document.getElementById('glEdit').click(), 0`); await sleep(200);
  const tap = (x, y) => pj(`(() => { const c = document.getElementById('glCanvas'), r = c.getBoundingClientRect(), L = c.__gl.st().L, ox = Math.floor((20 - L.w) / 2), oy = Math.floor((10 - L.h) / 2);
    c.onpointerdown({preventDefault() {}, clientX: r.left + ((ox + ${x}) * 12 + 6) / 240 * r.width, clientY: r.top + (16 + (oy + ${y}) * 12 + 6) / 136 * r.height}); return 0; })()`);
  await tap(10, 1); await tap(1, 7); await pj(`document.querySelector('#glTools [data-t="F"]').click(), 0`); await tap(1, 6); await pj(`document.querySelector('#glTools [data-t="s"]').click(), 0`); await tap(6, 3);
  const ed = await C('return st.mode + "|" + st.L.g[1][10] + st.L.g[7][1] + st.L.g[3][6] + "|" + st.L.ex + st.L.ey + "|" + st.L.opt;'); if (!/^edit\|##s\|16\|\d+$/.test(ed)) throw new Error('éditeur : ' + ed);
  await sleep(200); await shot('editeur');
  await pj(`document.getElementById('glTest').click(), 0`); await sleep(200);
  if (!await C('return st.custom && st.mode === "play";')) throw new Error('essayer le niveau : ' + await C('return st.mode + "|" + st.custom + "|" + st.L.opt + "|" + document.getElementById("glEd").hidden;') + ' ' + await pj(`window.__e.join(' | ')`));
  for (const m of await pj(`document.getElementById('glCanvas').__solve()`)) { await key(m); await sleep(700); }
  await sleep(400); if (await C('return st.mode;') !== 'won') throw new Error('le niveau de l’éditeur devait se finir');
  await C('st.dead = 99; return 0;'); await key('Enter'); await sleep(200); if (await C('return st.mode;') !== 'edit') throw new Error('retour à l’éditeur');
  await pj(`document.getElementById('glSave').click(), 0`); await pj(`document.getElementById('glClear').click(), 0`);
  const code = await pj(`document.getElementById('glCode').value`); await pj(`document.getElementById('glPaste').click(), 0`); await sleep(100);
  const back = await C('return st.L.g[1][10] + st.L.g[3][6];'); if (back !== '#s' || !/^G1:12x8:/.test(code)) throw new Error('code du niveau : ' + code + ' → ' + back);
  if (await pj(`document.getElementById('glMine').options.length`) < 2) throw new Error('mes niveaux');
  await C('T.go(1); return 0;');
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
