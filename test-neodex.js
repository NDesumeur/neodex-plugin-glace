// lancé par le test « local » de NeoDex : vérification interne, puis joue le plus court chemin au clavier et regarde le bilan
module.exports = async ({ pj, sleep }) => {
  const key = k => pj(`document.dispatchEvent(new KeyboardEvent('keydown', {key: '${k}', bubbles: true})), 0`);
  const label = () => pj(`document.getElementById('glCanvas').getAttribute('aria-label')`);
  const sc = await pj(`document.querySelector('[data-selfcheck]')?.dataset.selfcheck`); if (sc !== 'ok') throw new Error('vérification interne : ' + sc);
  await sleep(300);
  for (const m of await pj(`document.getElementById('glCanvas').__solve()`)) { await key(m); await sleep(800); }
  await sleep(500);
  const l = await label();
  if (!/niveau fini/.test(l)) throw new Error('le niveau devait être fini : « ' + l + ' »');
  return l;
};
