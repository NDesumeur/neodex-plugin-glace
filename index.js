// Glace : un pingouin glisse sur la glace jusqu'au prochain rocher ; trouve le chemin jusqu'au drapeau en le moins de coups possible.
// Jeu NeoDex en pixel art dessiné à la main. Chaque niveau est tiré de son numéro et vérifié faisable (recherche du plus court chemin). Il tourne dans le bac à sable de NeoDex.
const HTML = `<div class="appWrap wide">
  <div class="agHead"><span class="label">Glace</span><span class="hint">Flèches : glisser · Retour arrière : annuler · R : recommencer · H : indice · P : pause</span></div>
  <div class="gMain"><div class="gameBox"><canvas id="glCanvas" width="240" height="136" role="img" aria-label="Glace"></canvas></div>
    <div class="gSide">
      <div class="sysCard"><b>RECORDS</b><div class="gStats" id="glStats"></div></div>
      <div class="row"><button class="btn main" id="glNew">RECOMMENCER</button><button class="btn" id="glPrev">◀</button><button class="btn" id="glNext">▶</button><button class="btn" id="glFs">PLEIN ÉCRAN</button></div>
      <div class="row"><button class="btn" id="glDaily">NIVEAU DU JOUR</button><button class="btn" id="glEdit">ÉDITEUR</button></div>
      <div class="sysCard glEd" id="glEd" hidden><b>ÉDITEUR</b>
        <div class="row" id="glTools"><button class="btn" data-t="#">Rocher</button><button class="btn" data-t="s">Neige</button><button class="btn" data-t=".">Glace</button><button class="btn" data-t="P">Pingouin</button><button class="btn" data-t="F">Drapeau</button></div>
        <div class="row"><button class="btn main" id="glTest">ESSAYER</button><button class="btn" id="glSave">GARDER</button><button class="btn" id="glClear">VIDER</button></div>
        <div class="row"><input class="f" id="glCode" placeholder="Code d’un niveau" spellcheck="false"><button class="btn" id="glCopy">COPIER</button><button class="btn" id="glPaste">OUVRIR</button></div>
        <label class="row">Mes niveaux <select class="f gSel" id="glMine"></select></label>
      </div>
      <div class="hint">Sur la glace, le pingouin ne s'arrête pas : il glisse jusqu'au prochain rocher ou jusqu'au bord. La neige l'arrête net. Amène-le sur le drapeau. Trois étoiles si tu trouves le plus court chemin, deux s'il te faut deux coups de plus. Un indice montre le bon coup, mais la partie ne vaut plus qu'une étoile. Après le niveau 60 : la glace fissurée casse quand tu la quittes (l'eau t'arrête ensuite), les tas de neige se poussent et glissent à leur tour, les téléporteurs t'envoient de l'un à l'autre.</div>
    </div></div>
</div>`;
const CSS = `.gMain{display:flex;gap:22px;align-items:flex-start;flex-wrap:wrap}
.gameBox{display:grid;place-items:center;padding:10px;background:#05010b;flex:0 0 auto;position:relative}
.gameBox canvas{width:min(calc(100vw - 140px),calc((100vh - 190px) * 240 / 136),1400px);height:auto;aspect-ratio:240/136;image-rendering:pixelated;touch-action:none}
.gameBox:fullscreen{padding:0}
.gameBox:fullscreen canvas{width:min(100vw,calc(100vh * 240 / 136))}
.gSide{display:flex;flex-direction:column;gap:14px;flex:1;min-width:250px;max-width:420px}
.gSide .sysCard{display:flex;flex-direction:column}
.glEd{gap:8px}
.glEd .row{flex-wrap:wrap}
#glTools .btn.on{outline:3px solid #ffd84a}
#glCode{min-width:0;flex:1}
.gStats{display:grid;grid-template-columns:1fr auto;gap:4px 14px}
.gStats b{text-align:right}`;
// le pingouin, de face, de dos et de profil (un seul œil) ; k noir, w blanc, o orange, r écharpe
const GL_P = {
  down: ['...kkkk...', '..kkkkkk..', '.kkwwwwkk.', '.kwkwwkwk.', '.kwwoowwk.', 'krrrrrrrrk', 'kkwwwwwwkk', '.kwwwwwwk.', '.kkwwwwkk.', '..oo..oo..'],
  up: ['...kkkk...', '..kkkkkk..', '..kkkkkk..', '..kkkkkk..', '.krrrrrrk.', 'kkkkrkkkkk', 'kkkkrkkkkk', '.kkkkkkkk.', '..kkkkkk..', '..oo..oo..'],
  right: ['...kkkk...', '..kkkkkk..', '..kkkkwkk.', '..kkkkkkoo', '.krrrrrrk.', '.kkkwwwwk.', '.kkkwwwwk.', '.kkkwwwwk.', '..kkkwwk..', '...oo.oo..'],
};
GL_P.left = GL_P.right.map(r => [...r].reverse().join(''));
const GL_PAL = { k: '#16141e', w: '#f4f4fa', o: '#ff9a2a', r: '#e83a4a' };
const GL_NEW = { 61: ['NOUVEAU : GLACE FISSURÉE', 'Elle casse quand tu la quittes'], 66: ['NOUVEAU : TAS DE NEIGE', 'Pousse-le : il glisse à son tour'], 71: ['NOUVEAU : TÉLÉPORTEURS', "Entre dans l'un, ressors de l'autre"] };
const GL_DIR = { ArrowUp: [0, -1, 'up'], ArrowDown: [0, 1, 'down'], ArrowLeft: [-1, 0, 'left'], ArrowRight: [1, 0, 'right'] };
/* ---------- l'habillage pixel art, dessiné à la main : police bitmap (accents compris), cadres, boutons, icônes ----------
   Tout est en pixels pleins, agrandis par 2 sans lissage : aucun dégradé, aucune ombre floue. */
const PXK = (() => {
  // chaque lettre : ses lignes, de haut en bas, à partir de la ligne 2 de la case (0-1 : accents des majuscules, 9-10 : jambages)
  const S = {
    A: '.###. #...# #...# ##### #...# #...# #...#', B: '####. #...# #...# ####. #...# #...# ####.', C: '.###. #...# #.... #.... #.... #...# .###.',
    D: '####. #...# #...# #...# #...# #...# ####.', E: '##### #.... #.... ####. #.... #.... #####', F: '##### #.... #.... ####. #.... #.... #....',
    G: '.###. #...# #.... #.### #...# #...# .####', H: '#...# #...# #...# ##### #...# #...# #...#', I: '### .#. .#. .#. .#. .#. ###',
    J: '..### ...#. ...#. ...#. #..#. #..#. .##..', K: '#...# #..#. #.#.. ##... #.#.. #..#. #...#', L: '#.... #.... #.... #.... #.... #.... #####',
    M: '#...# ##.## #.#.# #.#.# #...# #...# #...#', N: '#...# ##..# #.#.# #..## #...# #...# #...#', O: '.###. #...# #...# #...# #...# #...# .###.',
    P: '####. #...# #...# ####. #.... #.... #....', Q: '.###. #...# #...# #...# #.#.# #..#. .##.#', R: '####. #...# #...# ####. #.#.. #..#. #...#',
    S: '.#### #.... #.... .###. ....# ....# ####.', T: '##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..', U: '#...# #...# #...# #...# #...# #...# .###.',
    V: '#...# #...# #...# #...# #...# .#.#. ..#..', W: '#...# #...# #...# #.#.# #.#.# ##.## #...#', X: '#...# #...# .#.#. ..#.. .#.#. #...# #...#',
    Y: '#...# #...# .#.#. ..#.. ..#.. ..#.. ..#..', Z: '##### ....# ...#. ..#.. .#... #.... #####',
    a: '..... ..... .###. ....# .#### #...# .####', b: '#.... #.... ####. #...# #...# #...# ####.', c: '..... ..... .###. #.... #.... #.... .###.',
    d: '....# ....# .#### #...# #...# #...# .####', e: '..... ..... .###. #...# ##### #.... .###.', f: '..## .#.. #### .#.. .#.. .#.. .#..',
    g: '..... ..... .#### #...# #...# #...# .#### ....# .###.', h: '#.... #.... ####. #...# #...# #...# #...#', i: '.#. ... ##. .#. .#. .#. ###',
    'ı': '... ... ##. .#. .#. .#. ###', j: '...# .... ..## ...# ...# ...# ...# #..# .##.', k: '#... #... #..# #.#. ##.. #.#. #..#',
    l: '##. .#. .#. .#. .#. .#. ###', m: '..... ..... ##.#. #.#.# #.#.# #.#.# #...#', n: '..... ..... ####. #...# #...# #...# #...#',
    o: '..... ..... .###. #...# #...# #...# .###.', p: '..... ..... ####. #...# #...# #...# ####. #.... #....', q: '..... ..... .#### #...# #...# #...# .#### ....# ....#',
    r: '.... .... #.## ##.. #... #... #...', s: '..... ..... .#### #.... .###. ....# ####.', t: '.#.. .#.. #### .#.. .#.. .#.. ..##',
    u: '..... ..... #...# #...# #...# #..## .##.#', v: '..... ..... #...# #...# #...# .#.#. ..#..', w: '..... ..... #...# #...# #.#.# #.#.# .#.#.',
    x: '..... ..... #...# .#.#. ..#.. .#.#. #...#', y: '..... ..... #...# #...# #...# #...# .#### ....# .###.', z: '..... ..... ##### ...#. ..#.. .#... #####',
    0: '.###. #...# #..## #.#.# ##..# #...# .###.', 1: '..#.. .##.. ..#.. ..#.. ..#.. ..#.. .###.', 2: '.###. #...# ....# ...#. ..#.. .#... #####',
    3: '####. ....# ....# .###. ....# ....# ####.', 4: '...#. ..##. .#.#. #..#. ##### ...#. ...#.', 5: '##### #.... ####. ....# ....# #...# .###.',
    6: '.###. #.... #.... ####. #...# #...# .###.', 7: '##### ....# ...#. ..#.. .#... .#... .#...', 8: '.###. #...# #...# .###. #...# #...# .###.',
    9: '.###. #...# #...# .#### ....# ....# .###.',
    '.': '. . . . . . #', ',': '.. .. .. .. .. .# .# #.', ':': '. . # . . . #', ';': '.. .. .# .. .. .# .# #.', '!': '# # # # # . #',
    '?': '.###. #...# ....# ...#. ..#.. ..... ..#..', "'": '# # . . . . .', '"': '#.# #.# ... ... ... ... ...', '-': '... ... ... ### ... ... ...',
    '+': '..... ..#.. ..#.. ##### ..#.. ..#.. .....', '/': '....# ...#. ...#. ..#.. .#... .#... #....', '(': '.# #. #. #. #. #. .#', ')': '#. .# .# .# .# .# #.',
    '%': '##..# ##.#. ...#. ..#.. .#... .#.## #..##', '·': '. . . # . . .', '×': '..... ..... #...# .#.#. ..#.. .#.#. #...#',
    '<': '...# ..#. .#.. #... .#.. ..#. ...#', '>': '#... .#.. ..#. ...# ..#. .#.. #...', '=': '.... .... #### .... #### .... ....',
    '_': '..... ..... ..... ..... ..... ..... #####', '#': '.#.#. .#.#. ##### .#.#. ##### .#.#. .#.#.', '&': '.##.. #..#. #.#.. .#... #.#.# #..#. .##.#',
    '…': '..... ..... ..... ..... ..... ..... #.#.#', '«': '..... ..#.# .#.#. #.#.. .#.#. ..#.# .....', '»': '..... #.#.. .#.#. ..#.# .#.#. #.#.. .....',
    '◀': '...# ..## .### #### .### ..## ...#', '▶': '#... ##.. ###. #### ###. ##.. #...', '→': '..... ..#.. ...#. ##### ...#. ..#.. .....',
    '←': '..... ..#.. .#... ##### .#... ..#.. .....', '↑': '..#.. .###. #.#.# ..#.. ..#.. ..#.. ..#..', '↓': '..#.. ..#.. ..#.. ..#.. #.#.# .###. ..#..',
    '*': '..... #.#.# .###. ##### .###. #.#.# .....', '[': '## #. #. #. #. #. ##', ']': '## .# .# .# .# .# ##', '|': '# # # # # # #',
    '@': '.###. #...# #.### #.#.# #.### #.... .###.', '€': '..### .#... ####. .#... ####. .#... ..###', '$': '..#.. .#### #.#.. .###. ..#.# ####. ..#..',
    '°': '.#. #.# .#. ... ... ... ...', '~': '..... ..... .#..# #.##. ..... ..... .....', '♪': '..##. ..#.# ..#.. ..#.. .##.. ###.. .#...',
  };
  const ACC = { a: ['..#', '.#.'], g: ['#..', '.#.'], c: ['.#.', '#.#'], d: ['...', '#.#'], t: ['.#.#', '#.#.'], z: ['.#.', '##.'] };  // aigu, grave, circonflexe, tréma, tilde, cédille
  const COMP = { é: 'ea', è: 'eg', ê: 'ec', ë: 'ed', á: 'aa', à: 'ag', â: 'ac', ä: 'ad', í: 'ıa', ì: 'ıg', î: 'ıc', ï: 'ıd', ó: 'oa', ò: 'og', ô: 'oc', ö: 'od',
    ú: 'ua', ù: 'ug', û: 'uc', ü: 'ud', ÿ: 'yd', ñ: 'nt', ç: 'cz', É: 'Ea', È: 'Eg', Ê: 'Ec', Ë: 'Ed', Á: 'Aa', À: 'Ag', Â: 'Ac', Ä: 'Ad', Í: 'Ia', Î: 'Ic', Ï: 'Id',
    Ó: 'Oa', Ô: 'Oc', Ö: 'Od', Ú: 'Ua', Ù: 'Ug', Û: 'Uc', Ü: 'Ud', Ñ: 'Nt', Ç: 'Cz' };
  const SUB = { 'œ': 'oe', 'Œ': 'OE', '’': "'", '‘': "'", '“': '"', '”': '"', '–': '-', '—': '-', ' ': ' ', ' ': ' ', '•': '·', '✓': 'v', 'ᐸ': '<', 'ᐳ': '>', '＜': '<', '＞': '>', '｜': '|', '／': '/', '！': '!', '？': '?', '（': '(', '）': ')', '：': ':', '　': ' ' };  // ᐸ ᐳ : les < > des titres YouTube
  const H = 11, glyphs = new Map(); let raster;
  function glyph(ch) {
    let g = glyphs.get(ch); if (g) return g;
    const px = [], add = (rows, ox, oy) => rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] === '#') px.push([ox + x, oy + y]); });
    const c = COMP[ch], src = S[c ? c[0] : ch]; let w = 3;
    if (src) {
      const rows = src.split(' '); w = Math.max(...rows.map(r => r.length)); add(rows, 0, 2);
      if (c) { const a = ACC[c[1]]; add(a, Math.floor((w - a[0].length) / 2), c[1] === 'z' ? 9 : /[A-Z]/.test(c[0]) ? 0 : 1); }
    } else if (ch !== ' ') {  // japonais, emoji… : la lettre du système, réduite à des pixels nets (sans lissage) sur la même hauteur que la police
      const q = (raster ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true })), RW = 16;
      q.canvas.width = RW; q.canvas.height = H; q.font = '11px "MS Gothic", "Yu Gothic UI", Meiryo, "Segoe UI Symbol", sans-serif'; q.fillStyle = '#000'; q.fillText(ch, 0, 10);
      const d = q.getImageData(0, 0, RW, H).data; let mx = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < RW; x++) if (d[(y * RW + x) * 4 + 3] > 110) { px.push([x, y]); mx = Math.max(mx, x + 1); }
      w = mx || 3;
      if (!px.length) { w = 5; add(['#####', '#...#', '#...#', '#...#', '#...#', '#...#', '#####'], 0, 2); }  // vraiment inconnue : une petite case
    }
    g = { w, px }; glyphs.set(ch, g); return g;
  }
  function layout(text) {
    let x = 0; const items = [];
    for (const ch of String(text)) for (const c of SUB[ch] ?? ch) { const g = glyph(c); items.push([g, x]); x += g.w + 1; }
    return { w: Math.max(0, x - 1), items };
  }
  function draw(g, text, x, y, color, s = 1) {  // (x, y) : coin haut gauche de la case
    const L = layout(text); g.fillStyle = color;
    for (const [gl, ox] of L.items) for (const [px, py] of gl.px) g.fillRect(x + (ox + px) * s, y + py * s, s, s);
    return L.w * s;
  }
  const bmp = new Map();
  function sprite(text, color, s = 1) {  // le texte tout prêt, gardé pour les images suivantes du jeu
    const k = text + '|' + color + '|' + s; let c = bmp.get(k); if (c) return c;
    c = document.createElement('canvas'); c.width = Math.max(1, layout(text).w * s); c.height = H * s; draw(c.getContext('2d'), text, 0, 0, color, s);
    if (bmp.size > 400) bmp.delete(bmp.keys().next().value);
    bmp.set(k, c); return c;
  }
  // comme fillText : (x, y) sur la ligne de base, aligné à gauche, au centre ou à droite
  function fill(g, text, x, y, color, s = 1, align = 'left') {
    const c = sprite(String(text), color, s), dx = align === 'center' ? -c.width / 2 : align === 'right' ? -c.width : 0;
    g.drawImage(c, Math.round(x + dx), Math.round(y - 9 * s));
  }
  const scale = size => Math.max(1, Math.round((size || 8) / 8));
  function art(rows, pal, s = 1) {  // un dessin en lignes de caractères, chaque caractère une couleur de la palette (« . » : transparent)
    const c = document.createElement('canvas'); c.width = Math.max(...rows.map(r => r.length)) * s; c.height = rows.length * s;
    const g = c.getContext('2d');
    rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const col = pal[r[x]]; if (col) { g.fillStyle = col; g.fillRect(x * s, y * s, s, s); } } });
    return c;
  }
  return { H, layout, draw, sprite, fill, scale, art };
})();

// les pièces de l'interface, pixel par pixel (K : contour, les autres lettres : la palette du jeu)
const PX_PANEL = ['..KKKKKKKKKKKK..', '.KAAAAAAAAAAAAK.', 'KALAAAAAAAAAALSK', 'KAAKKKKKKKKKKSSK', 'KAAKHHHHHHHHKSSK', 'KAAKHDDDDDDDKSSK', 'KAAKHDDDDDDDKSSK', 'KAAKHDDDDDDDKSSK',
  'KAAKHDDDDDDDKSSK', 'KAAKHDDDDDDDKSSK', 'KAAKHDDDDDDDKSSK', 'KAAKHDDDDDDDKSSK', 'KAAKKKKKKKKKKSSK', 'KALSSSSSSSSSSLSK', '.KSSSSSSSSSSSSK.', '..KKKKKKKKKKKK..'];
const PX_CARD = ['.KKKKKKKKKK.', 'KFFFFFFFFFFK', 'KFHHHHHHHHFK', 'KFHDDDDDDDFK', 'KFHDDDDDDDFK', 'KFHDDDDDDDFK', 'KFHDDDDDDDFK', 'KFHDDDDDDDFK', 'KFHDDDDDDDFK', 'KFSSSSSSSSFK', 'KFFFFFFFFFFK', '.KKKKKKKKKK.'];
const PX_BTN = ['.KKKKKKKKKK.', 'KWWWWWWWWWWK', 'KWMMMMMMMMBK', 'KWMMMMMMMMBK', 'KWMMMMMMMMBK', 'KWMMMMMMMMBK', 'KWMMMMMMMMBK', 'KWMMMMMMMMBK', 'KBBBBBBBBBBK', 'KKKKKKKKKKKK', 'KDDDDDDDDDDK', '.KKKKKKKKKK.'];
const PX_BTN_DOWN = ['............', '............', '.KKKKKKKKKK.', 'KBBBBBBBBBBK', 'KBMMMMMMMMWK', 'KBMMMMMMMMWK', 'KBMMMMMMMMWK', 'KBMMMMMMMMWK', 'KBMMMMMMMMWK', 'KBMMMMMMMMWK', 'KWWWWWWWWWWK', '.KKKKKKKKKK.'];
const PX_TRACK = ['.KKKKKKKKKK.', 'KDDDDDDDDDDK', 'KDDDDDDDDDDK', 'KDDDDDDDDDDK', 'KHHHHHHHHHHK', '.KKKKKKKKKK.'];
const PX_KNOB = ['.KKKKK.', 'KWWWWWK', 'KWAAABK', 'KWAAABK', 'KKKKKKK', 'KWAAABK', 'KWAAABK', 'KBBBBBK', 'KDDDDDK', '.KKKKK.'];
const PX_RAIL = ['KDDDDDDK', 'KDDDDDDK', 'KDDDDDDK', 'KDDHHDDK'];
const PX_ICONS = {
  play: ['kk......', 'kakk....', 'kaaakk..', 'kaaaaakk', 'kaaaaaak', 'kaaaaakk', 'kaaakk..', 'kakk....', 'kk......'],
  full: ['www...www', 'w.......w', 'w.......w', '.........', '....a....', '.........', 'w.......w', 'w.......w', 'www...www'],
  note: ['...aaaaaa', '...aaaaaa', '...a....a', '...a....a', '...a....a', '.aaa..aaa', 'aaaa.aaaa', 'aaaa.aaaa', '.aa...aa.'],
  star: ['....g....', '....g....', '...ggg...', 'ggggwgggg', '.ggwwwgg.', '..ggggg..', '..oo.oo..', '.oo...oo.', '.o.....o.'],
  crown: ['g...g...g', 'gg.ggg.gg', 'ggggggggg', 'grgggggrg', 'ggggggggg', 'ooooooooo'],
  folder: ['oooo.....', 'oggoooooo', 'ggggggggg', 'ggggggggg', 'ggggggggg', 'ggggggggg', 'ooooooooo'],
  vol: ['....w....', '...ww..b.', 'wwwww.b.b', 'wwwww.b.b', 'wwwww.b.b', 'wwwww.b.b', '...ww..b.', '....w....'],
  clock: ['..wwwww..', '.w.....w.', 'w...a...w', 'w...a...w', 'w...aaa.w', 'w.......w', 'w.......w', '.w.....w.', '..wwwww..'],
  cursor: ['....a....', '..aaaaa..', '.a..a..a.', '.a.....a.', 'aaa.w.aaa', '.a.....a.', '.a..a..a.', '..aaaaa..', '....a....'],
  plus: ['...b...', '...b...', '...b...', 'bbbbbbb', '...b...', '...b...', '...b...'],
  down: ['wwwwwww', '.wwwww.', '..www..', '...w...'],
};

/* habille la page du jeu : root = son conteneur, T = sa palette, icons = [motif du texte, icône] pour les boutons et libellés */
function pxSkin(root, { T, icons = [], emblem, title }) {
  root.classList.add('pxk'); const s = 2, url = c => c.toDataURL();
  const btnPal = (M, W, B, D) => ({ K: T.k, W, M, B, D });
  const BN = btnPal(T.btn, T.btnHi, T.btnLo, T.k2), BH = btnPal(T.btnHov, T.btnHovHi, T.btnLo, T.k2);
  const BA = btnPal(T.acc, T.accL, T.accS, T.accD), BAH = btnPal(T.accL, '#ffffff', T.acc, T.accD);
  const img = { panel: PXK.art(PX_PANEL, { K: T.k, A: T.acc, S: T.accS, L: T.rivet, H: T.hl, D: T.fill }, s),
    card: PXK.art(PX_CARD, { K: T.k, F: T.line, H: T.hl, D: T.fill, S: T.k2 }, s), cardOn: PXK.art(PX_CARD, { K: T.k, F: T.acc, H: T.accS, D: T.fillOn, S: T.accD }, s),
    btn: PXK.art(PX_BTN, BN, s), btnH: PXK.art(PX_BTN, BH, s), btnD: PXK.art(PX_BTN_DOWN, BH, s),
    main: PXK.art(PX_BTN, BA, s), mainH: PXK.art(PX_BTN, BAH, s), mainD: PXK.art(PX_BTN_DOWN, BA, s),
    track: PXK.art(PX_TRACK, { K: T.k, D: T.k2, H: T.line }, s), knob: PXK.art(PX_KNOB, { K: T.k, W: T.accL, A: T.acc, B: T.accS, D: T.accD }, s),
    rail: PXK.art(PX_RAIL, { K: T.k, D: T.k2, H: T.line }, s), tile: PXK.art(T.tile, { x: T.bgDot, ':': T.bgDot2, '+': T.spark, '*': T.spark2 }, s) };
  const u = Object.fromEntries(Object.entries(img).map(([k, c]) => [k, url(c)]));
  const nine = (k, sl) => `border-style:solid;border-width:${sl * s}px;border-image:url(${u[k]}) ${sl * s} fill / ${sl * s}px stretch`;
  const IP = { k: T.k, w: T.text, a: T.acc, b: T.acc2, g: T.gold, o: T.orange, r: T.red, n: T.green, N: T.green2, m: T.muted, s: T.accS };
  const iconUrl = new Map(), icon = name => {
    let v = iconUrl.get(name); if (!v) { const c = PXK.art(PX_ICONS[name] || emblem, IP, s); v = { u: url(c), w: c.width, h: c.height }; iconUrl.set(name, v); }
    const b = document.createElement('b'); b.className = 'pxI'; b.setAttribute('aria-hidden', 'true'); b.style.cssText = `width:${v.w}px;height:${v.h}px;background-image:url(${v.u})`; return b;
  };
  const R = '.pxk.pxk';
  const css = document.createElement('style');
  css.textContent = `html,html body{background:${T.bg} url(${u.tile}) 0 0/${img.tile.width}px ${img.tile.height}px repeat!important}
::-webkit-scrollbar{width:16px;height:16px} ::-webkit-scrollbar-track{background:url(${u.rail}) 0 0/16px 8px repeat-y} ::-webkit-scrollbar-thumb{${nine('main', 4)}} ::-webkit-scrollbar-corner{background:none}
${R}{color:${T.text}}
${R} .px{box-shadow:none;background:none}
${R} .agHead{gap:18px;margin:0}
${R} .agHead .label{display:flex;align-items:center;gap:12px}
${R} .btn,${R} .tab{${nine('btn', 4)};height:auto;min-height:0;padding:0 6px 4px;margin:0;color:${T.text};font:12px/1 monospace;display:inline-flex;align-items:center;gap:6px;filter:none;text-shadow:none;letter-spacing:0;cursor:var(--cp,pointer)}
${R} .btn:hover,${R} .tab:hover{border-image-source:url(${u.btnH})}
${R} .btn:active,${R} .tab:active{border-image-source:url(${u.btnD});padding:4px 6px 0}
${R} .btn.main,${R} .tab.on{border-image-source:url(${u.main});color:${T.k}}
${R} .btn.main:hover,${R} .tab.on:hover{border-image-source:url(${u.mainH})}
${R} .btn.main:active,${R} .tab.on:active{border-image-source:url(${u.mainD})}
${R} .btn:focus-visible,${R} .tab:focus-visible{outline:2px dashed ${T.acc2};outline-offset:2px}
${R} .btn .pxV,${R} .tab .pxV{white-space:nowrap}
${R} .sysCard{${nine('card', 4)};padding:4px 6px;gap:8px;background:none}
${R} .sysCard.on{border-image-source:url(${u.cardOn})}
${R} .sysCard.on>b{color:${T.acc}}
${R} .sysCard>b{color:${T.text}}
${R} .row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
${R} .gameBox,${R} .thBox{${nine('panel', 5)};box-shadow:none;background:none;padding:2px;gap:8px;grid-template-rows:auto auto}
${R} .gameBox canvas,${R} .thBox canvas{display:block;background:#05010b}
${R} .gameBox:fullscreen,${R} .thBox:fullscreen{border:0;padding:0;background:#000}
${R} .rhFs{position:static;opacity:1;justify-self:end;margin:0 6px 6px 0}
${R} .rhTabs{gap:8px;flex-wrap:wrap}
${R} .hint{color:${T.muted};line-height:24px}
${R} label{color:${T.muted};display:inline-flex;align-items:center;gap:8px}
${R} .rhDel{color:${T.red};top:6px;right:8px}
${R} input[type=range]{-webkit-appearance:none;appearance:none;background:none;height:20px;width:150px}
${R} input[type=range]::-webkit-slider-runnable-track{height:12px;${nine('track', 2)}}
${R} input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:20px;border:0;background:url(${u.knob}) 0 0/100% 100%;margin-top:-8px;cursor:var(--cp,pointer)}
${R} .pxSel{justify-content:space-between;gap:10px;max-width:100%;overflow:hidden}
${R} .rhImport .pxSel{flex:1;min-width:0}
.pxMenu{position:fixed;z-index:50;${nine('card', 4)};padding:2px;max-height:280px;overflow-y:auto;display:flex;flex-direction:column;gap:2px;color:${T.text}}
.pxMenu button{all:unset;padding:3px 8px;cursor:var(--cp,pointer);white-space:nowrap}
.pxMenu button:hover,.pxMenu button:focus-visible,.pxMenu button.on{background:${T.btnHov};color:${T.text}}
.pxMenu button.on{color:${T.acc}}
.pxT{position:relative;white-space:normal;font:12px/1 monospace;letter-spacing:0;text-transform:none}
.pxT i{display:inline-block;vertical-align:middle;background:currentColor;-webkit-mask:var(--m) 0 0/100% 100% no-repeat;mask:var(--m) 0 0/100% 100% no-repeat;image-rendering:pixelated}
.pxI{display:inline-block;vertical-align:middle;background:0 0/100% 100% no-repeat;image-rendering:pixelated;margin-right:6px}
.pxV>.pxI+.pxI{margin-left:-4px}
.pxSr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}`;
  document.head.append(css);
  // un mot = une image (en masque : sa couleur suit celle du texte), une règle par mot pour ne pas répéter l'image
  const words = new Map(), sheet = document.head.appendChild(document.createElement('style')).sheet;
  const word = w => {
    let k = words.get(w);
    if (!k) { const c = PXK.sprite(w, '#fff', s); k = 'pw' + words.size; words.set(w, k); sheet.insertRule(`.${k}{--m:url(${c.toDataURL()});width:${c.width}px;height:${c.height}px}`, sheet.cssRules.length); }
    const i = document.createElement('i'); i.className = k; return i;
  };
  function render(vis, text, lead) {
    const parts = [], ic = lead && icons.find(([re]) => re.test(text.trim()));
    if (ic) parts.push(icon(ic[1]));
    for (const m of text.matchAll(/(★+)|(\s+)|([^\s★]+)/g)) {
      if (m[1]) for (const _ of m[1]) parts.push(icon('star'));
      else if (m[2]) parts.push(document.createTextNode(' '));
      else parts.push(word(m[3]));
    }
    vis.replaceChildren(...parts);
  }
  const lead = node => node.parentElement?.matches('button,label,.tab,.btn') && !node.previousSibling;
  function pixText(node) {  // le texte reste dans la page (lecteur d'écran, copier) ; on voit ses lettres en pixels
    const wrap = document.createElement('span'), sr = document.createElement('span'), vis = document.createElement('span');
    wrap.className = 'pxT'; sr.className = 'pxSr'; vis.className = 'pxV'; vis.setAttribute('aria-hidden', 'true');
    const first = lead(node); node.replaceWith(wrap); sr.append(node); wrap.append(sr, vis); render(vis, node.data, first);
  }
  function pxSelect(sel) {  // une liste déroulante en pixels ; la vraie reste cachée et garde sa valeur et ses événements
    sel.dataset.px = '1'; sel.style.display = 'none';
    const b = document.createElement('button'), lab = document.createElement('span'); b.type = 'button'; b.className = 'btn pxSel'; b.append(lab, icon('down')); sel.after(b);
    const sync = () => { const t = sel.selectedOptions[0]?.textContent || '—'; if (lab.dataset.t !== t) { lab.dataset.t = t; lab.textContent = t; } };
    const d = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    Object.defineProperty(sel, 'value', { configurable: true, get() { return d.get.call(this); }, set(v) { d.set.call(this, v); sync(); } });
    new MutationObserver(sync).observe(sel, { childList: true, subtree: true, characterData: true, attributes: true });
    sel.addEventListener('change', sync);
    b.onclick = () => {
      document.querySelector('.pxMenu')?.remove();
      const m = document.createElement('div'), r = b.getBoundingClientRect(); m.className = 'pxMenu'; m.setAttribute('role', 'listbox');
      for (const o of sel.options) {
        const it = document.createElement('button'); it.type = 'button'; it.textContent = o.textContent; it.className = o.selected ? 'on' : ''; it.setAttribute('role', 'option');
        it.onclick = () => { sel.value = o.value; sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); close(); b.focus(); };
        m.append(it);
      }
      root.append(m);
      const below = innerHeight - r.bottom; m.style.minWidth = r.width + 'px'; m.style.left = Math.min(r.left, innerWidth - m.offsetWidth - 4) + 'px';
      m.style.top = (below > m.offsetHeight + 8 || below > r.top ? r.bottom + 2 : r.top - m.offsetHeight - 2) + 'px';
      const close = () => { m.remove(); removeEventListener('pointerdown', out, true); removeEventListener('keydown', key, true); removeEventListener('blur', close); };
      const out = e => { if (!m.contains(e.target) && e.target !== b && !b.contains(e.target)) close(); };
      const key = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); b.focus(); } };
      addEventListener('pointerdown', out, true); addEventListener('keydown', key, true); addEventListener('blur', close);
      (m.querySelector('.on') || m.firstChild)?.focus();
    };
    sync();
  }
  const SKIP = 'select,option,textarea,script,style,canvas,.pxT,[data-pxskip]';
  let queued = false;
  function pass() {
    queued = false;
    root.querySelectorAll('select.gSel:not([data-px])').forEach(pxSelect);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), todo = [];
    for (let n; (n = w.nextNode());) if (n.data.trim() && n.parentElement && !n.parentElement.closest(SKIP)) todo.push(n);
    todo.forEach(pixText);
  }
  new MutationObserver(ms => {
    for (const m of ms) if (m.type === 'characterData') { const wrap = m.target.parentNode?.closest?.('.pxT'); if (wrap) render(wrap.lastChild, m.target.data, false); }
    if (!queued) { queued = true; queueMicrotask(pass); }
  }).observe(root, { childList: true, subtree: true, characterData: true });
  // le titre : grosses lettres à contour, trois tons, et l'emblème du jeu
  const lab = root.querySelector('.agHead .label');
  if (lab) {
    const L = PXK.layout(title), c = document.createElement('canvas'), g = c.getContext('2d'), on = [];
    c.width = L.w + 3; c.height = PXK.H + 3;
    for (const [gl, ox] of L.items) for (const [x, y] of gl.px) on.push([ox + x + 1, y + 1]);
    g.fillStyle = T.k; for (const [x, y] of on) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [2, 2], [1, 2], [2, 1]]) g.fillRect(x + dx, y + dy, 1, 1);
    for (const [x, y] of on) { g.fillStyle = y <= 5 ? T.accL : y <= 7 ? T.acc : T.accS; g.fillRect(x, y, 1, 1); }
    const big = document.createElement('canvas'), z = 4; big.width = c.width * z; big.height = c.height * z;
    const bg = big.getContext('2d'); bg.imageSmoothingEnabled = false; bg.drawImage(c, 0, 0, big.width, big.height);
    const t = document.createElement('b'); t.className = 'pxI'; t.style.cssText = `width:${big.width}px;height:${big.height}px;background-image:url(${big.toDataURL()})`;
    const e = PXK.art(emblem, IP, 3), em = document.createElement('b'); em.className = 'pxI'; em.style.cssText = `width:${e.width}px;height:${e.height}px;background-image:url(${e.toDataURL()})`;
    const sr = document.createElement('span'); sr.className = 'pxSr'; sr.textContent = lab.textContent;
    lab.dataset.pxskip = '1'; lab.replaceChildren(em, t, sr);
  }
  pass();
}



export default async function (ctx) {
  const view = ctx.view;
  if (!ctx.host) { view.textContent = "Ce plugin doit être approuvé par NeoDex pour s'ouvrir."; return; }
  const host = ctx.host, { el, toast } = host;
  const folder = ctx.folder;
  host.addStyle(CSS);
  view.innerHTML = HTML;
  const $ = id => view.querySelector('#' + id) || document.getElementById(id);
  const doc = async n => { try { return await folder.read(n); } catch { return null; } };
  const px = (g, color, x, y, w = 1, h = 1) => { g.fillStyle = color; g.fillRect(Math.round(x), Math.round(y), w, h); };
  const sprite = (g, rows, x, y, pal) => rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const c = pal[r[i]]; if (c) px(g, c, x + i, y + j); } });
  const seeded = s => () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const pxFont = (g, text, x, y, color, size = 8, align = 'left') => { const s = PXK.scale(size); PXK.fill(g, text, x + s, y + s, '#05010b', s, align); PXK.fill(g, text, x, y, color, s, align); };
  const gameText = (g, w, lines, y0) => {  // lignes centrées en police pixel, sur une bande sombre
    g.fillStyle = 'rgba(11,3,28,.78)'; g.fillRect(0, y0 - 14, w, lines.length * 14 + 14);
    lines.forEach(([text, color, size], i) => PXK.fill(g, text, w / 2, y0 + i * 14, color, PXK.scale(size), 'center'));
  };
  const theme = (acc, accL, accS, accD, acc2, base = ['#0c0a12', '#16121e', '#221c2c', '#2e263a', '#3a3046', '#62566e']) => {
    const [k, k2, fill, fillOn, hl, line] = base;
    return { k, k2, fill, fillOn, hl, line, acc, accL, accS, accD, rivet: '#f0f0f8', btn: hl, btnHi: line, btnLo: k2, btnHov: '#443852', btnHovHi: '#82768e', text: '#f4f0f8', muted: '#c0b8cc',
      acc2, gold: '#ffd84a', orange: '#ff8a3a', red: '#ff4a3a', green: '#7ee07a', green2: '#2f8a3a', bg: '#100c16', bgDot: fill, bgDot2: k2, spark: accD, spark2: acc,
      tile: ['................', '...:............', '................', '..........+.....', '................', '................', '.....:..........', '................', '................', '.............:..', '................', '..+.............', '................', '.........:......', '................', '................'] };
  };
  let ac = null, mute = false;
  const beep = (f, d, type = 'square', slide = 0, vol = .03, at = 0) => { if (mute) return; try { ac ??= new AudioContext(); const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + at; o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d); } catch {} };
  const on = () => view.classList.contains('on');
  // la manette : croix et stick gauche = flèches, A = Entrée, B = Échap, X = Retour arrière, Y = H, Start = P ; envoyées comme des touches du clavier
  const padKeys = (map = {}) => {
    const KEY = { 12: 'ArrowUp', 13: 'ArrowDown', 14: 'ArrowLeft', 15: 'ArrowRight', 0: 'Enter', 1: 'Escape', 2: 'Backspace', 3: 'h', 9: 'p', ...map };
    const held = new Map(), send = (k, type) => document.dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true }));
    const loop = () => {
      requestAnimationFrame(loop);
      if (!on() || !navigator.getGamepads) return;
      const p = [...navigator.getGamepads()].find(Boolean); if (!p) return;
      const now = performance.now(), down = new Set();
      for (const [i, k] of Object.entries(KEY)) if (p.buttons[i]?.pressed) down.add(k);
      const [ax = 0, ay = 0] = p.axes;
      if (ax < -.5) down.add('ArrowLeft'); if (ax > .5) down.add('ArrowRight'); if (ay < -.5) down.add('ArrowUp'); if (ay > .5) down.add('ArrowDown');
      for (const k of down) { const t = held.get(k); if (t === undefined) { held.set(k, now + 260); send(k, 'keydown'); } else if (/^Arrow/.test(k) && now > t) { held.set(k, now + 110); send(k, 'keydown'); } }
      for (const k of [...held.keys()]) if (!down.has(k)) { held.delete(k); send(k, 'keyup'); }
    };
    requestAnimationFrame(loop);
  };
  pxSkin(view.querySelector('.appWrap'), { title: 'GLACE', T: theme('#8ad8ff', '#e0f6ff', '#4a9ac8', '#0a2030', '#ff6a7a'),
    emblem: ['....kkkk....', '...kkkkkk...', '..kkwwwwkk..', '..kwkwwkwk..', '..kwwaawwk..', '.krrrrrrrrk.', '.kkwwwwwwkk.', '..kwwwwwwk..', '..kkwwwwkk..', '...aa..aa...', 'bbbbbbbbbbbb', '.b.b.b.b.b.b'],
    icons: [[/^RECOMMENCER/, 'play'], [/^RECORDS/, 'crown']] });
  const W = 240, H = 136, T = 12, COLS = 20, ROWS = 10, Y0 = 16, MAXL = 80;
  const save = { level: 1, stars: {}, moves: 0, ...(await doc('records')) };
  // les trophées de NeoDex (3.4.8 et plus) : succès et records déclarés dans plugin.json ; sur un NeoDex plus ancien, rien ne se passe
  const trophy = id => { ctx.games?.unlock(id).catch(() => {}); };
  const trophyRecord = (id, v) => { if (v != null && Number.isFinite(+v)) ctx.games?.record(id, +v).catch(() => {}); };
  if (save.level === 60 && save.stars[60]) save.level = 61;  // les 20 nouveaux niveaux s'ouvrent à qui avait fini le 60
  const keep = () => mute ? 0 : folder.write('records', save).catch(() => {});  // rien n'est écrit pendant la vérification (mute), qui joue des niveaux pour de faux
  // un coup depuis l'état S = {x, y, br, pl} : le pingouin glisse jusqu'au rocher, au bord, à l'eau ou à un tas de neige (qu'il pousse) ;
  // la neige et le drapeau l'arrêtent ; la glace fissurée casse quand il la quitte (br : fissures cassées) ; un téléporteur l'envoie sur l'autre, d'où il repart
  function step(L, S, dx, dy) {
    let { x, y, br } = S; const pl = S.pl.slice(), path = [[x, y]], broke = [], at = (cx, cy) => cy * L.w + cx; let pile = null, tel = false;
    const wall = (cx, cy) => cx < 0 || cy < 0 || cx >= L.w || cy >= L.h || L.g[cy][cx] === '#' || (L.g[cy][cx] === 'c' && (br >> L.ci[at(cx, cy)] & 1));
    for (let guard = 0; guard < 400; guard++) {
      const nx = x + dx, ny = y + dy; if (wall(nx, ny)) break;
      const pi = pl.indexOf(at(nx, ny));
      if (pi >= 0) {  // un tas de neige : il glisse à son tour jusqu'à un obstacle (ou s'arrête dans la neige), le pingouin reste derrière
        let qx = nx, qy = ny; const pp = [[qx, qy]];
        for (;;) { const ax = qx + dx, ay = qy + dy; if (wall(ax, ay) || pl.includes(at(ax, ay)) || (ax === L.ex && ay === L.ey) || L.g[ay][ax] === 'T' || (ax === x && ay === y)) break; qx = ax; qy = ay; pp.push([qx, qy]); if (L.g[qy][qx] === 's') break; }
        if (pp.length > 1) { pl[pi] = at(qx, qy); pl.sort((a, b) => a - b); pile = { path: pp }; }
        break;
      }
      if (L.g[y][x] === 'c' && !(br >> L.ci[at(x, y)] & 1)) { br |= 1 << L.ci[at(x, y)]; broke.push([x, y, path.length - 1]); }
      x = nx; y = ny; path.push([x, y]);
      if (L.g[y][x] === 's' || (x === L.ex && y === L.ey)) break;
      if (L.g[y][x] === 'T') { if (tel) break; [x, y] = L.tp[L.tp[0][0] === x && L.tp[0][1] === y ? 1 : 0]; path.push([x, y]); tel = true; }
    }
    if (x === S.x && y === S.y && !pile && br === S.br) return null;
    return { S: { x, y, br, pl }, path, broke, pile, tel };
  }
  const skey = S => S.x + ',' + S.y + (S.br || S.pl.length ? '|' + S.br + '|' + S.pl.join('.') : '');
  const start0 = L => ({ x: L.sx, y: L.sy, br: 0, pl: L.pl || [] });
  // le plus court chemin (en coups) jusqu'au drapeau ; pos : chaque case atteinte et en combien de coups (pour placer le drapeau loin)
  function solve(L, S0 = start0(L), cap = 60000) {
    const dist = new Map([[skey(S0), 0]]), from = new Map(), q = [S0], pos = new Map([[S0.y * L.w + S0.x, 0]]);
    for (let i = 0; i < q.length && q.length < cap; i++) { const S = q[i], k = skey(S), d = dist.get(k);
      if (S.x === L.ex && S.y === L.ey) { let c = k, path = []; while (from.has(c)) { const [p, m] = from.get(c); path.unshift(m); c = p; } return { n: d, path, pos }; }
      for (const [m, [dx, dy]] of Object.entries(GL_DIR)) { const r = step(L, S, dx, dy); if (!r) continue; const nk = skey(r.S);
        if (!dist.has(nk)) { dist.set(nk, d + 1); from.set(nk, [k, m]); q.push(r.S); const p = r.S.y * L.w + r.S.x; if (!pos.has(p)) pos.set(p, d + 1); } } }
    return { n: Infinity, path: [], pos };
  }
  // le niveau n : sa taille grandit, ses rochers et sa neige sont tirés de son numéro, puis on garde le drapeau le plus loin (en coups) qui reste faisable ;
  // après le niveau 60 viennent la glace fissurée (61), les tas de neige à pousser (66) puis les téléporteurs (71), et le plus court chemin doit s'en servir
  const levels = new Map();
  function makeLevel(n, seed) {
    const key = seed ? 'd' + seed : n; if (levels.has(key)) return levels.get(key);
    const r = seeded(seed ?? n * 7919 + 17), w = Math.min(COLS, 7 + n), h = Math.min(ROWS, 5 + Math.floor(n / 2)), want = n > 60 ? Math.min(16, 9 + Math.floor((n - 61) / 3)) : Math.min(14, 3 + Math.floor(n * .6));
    const crack = n >= 61, piles = n >= 76 ? 2 : n >= 66 ? 1 : 0, tel = n >= 71, need = n >= 76 ? 'b' : n >= 71 ? 'T' : n >= 66 ? 'b' : 'c';
    let best = null;
    for (let tries = 0; tries < 80; tries++) {
      const g = Array.from({ length: h }, () => Array.from({ length: w }, () => r() < .14 ? '#' : n > 3 && r() < .05 ? 's' : crack && r() < (n >= 66 ? .05 : .09) ? 'c' : '.'));
      const L = { w, h, g, sx: Math.floor(r() * w), sy: Math.floor(r() * h), ex: -1, ey: -1 }; g[L.sy][L.sx] = '.';
      if (n > 60) {
        const free = () => { for (let k = 0; k < 50; k++) { const x = Math.floor(r() * w), y = Math.floor(r() * h); if (g[y][x] === '.' && (x !== L.sx || y !== L.sy) && !(L.pl || []).includes(y * w + x)) return [x, y]; } return null; };
        L.ci = new Int8Array(w * h).fill(-1); let nc = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (g[y][x] === 'c') { if (nc < 6) L.ci[y * w + x] = nc++; else g[y][x] = '.'; }
        if (tel) { const a = free(); if (a) g[a[1]][a[0]] = 'T'; const b = free(); if (b) g[b[1]][b[0]] = 'T'; if (!a || !b) continue; L.tp = [a, b]; }
        L.pl = []; for (let k = 0; k < piles; k++) { const p = free(); if (p && p[0] > 0 && p[1] > 0 && p[0] < w - 1 && p[1] < h - 1) L.pl.push(p[1] * w + p[0]); } L.pl.sort((a, b) => a - b);
      }
      const far = [...solve(L).pos.entries()].sort((a, b) => b[1] - a[1]);
      for (const [c] of far.slice(0, 6)) { const ex = c % w, ey = Math.floor(c / w); if ((ex === L.sx && ey === L.sy) || g[ey][ex] === 'T' || g[ey][ex] === 'c') continue;
        const M = { ...L, ex, ey }, s = solve(M); if (s.n === Infinity) continue;
        if (n > 60 && (s.n > want + 8 || !uses(M, s.path, need))) continue;  // pas de niveau interminable
        if (!best || s.n > best.opt) best = { ...M, opt: s.n };
        if (s.n >= want) { levels.set(key, best); return best; } }
    }
    levels.set(key, best); return best;
  }
  // le plus court chemin passe-t-il par la nouveauté du niveau (fissure cassée, tas poussé, téléporteur pris) ?
  function uses(L, path, f) { let S = start0(L), u = false; for (const m of path) { const [dx, dy] = GL_DIR[m], r = step(L, S, dx, dy); if (f === 'c' ? r.broke.length : f === 'b' ? r.pile : r.tel) u = true; S = r.S; } return u; }
  let g = null, st = null;
  // le niveau du jour (tiré d'après la date, le même pour tous) ; l'éditeur : ses niveaux, en code à copier pour les partager
  const day = (k = 0) => { const d = new Date(Date.now() - k * 864e5); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  save.daily ??= { last: '', streak: 0, best: 0 }; save.mine ??= [];
  const glCode = L => 'G1:' + L.w + 'x' + L.h + ':' + [L.sx, L.sy, L.ex, L.ey].join(',') + ':' + L.g.map(r => r.join('')).join('');
  function glParse(code) {  // un code collé vient de n'importe où : on vérifie tout (taille, cases, positions) avant de s'en servir
    const m = /^G1:(\d{1,2})x(\d{1,2}):(\d{1,2}),(\d{1,2}),(\d{1,2}),(\d{1,2}):([.#s]+)$/.exec(String(code).trim()); if (!m) return null;
    const [w, h, sx, sy, ex, ey] = m.slice(1, 7).map(Number), cells = m[7];
    if (w < 3 || h < 3 || w > COLS || h > ROWS || cells.length !== w * h || sx >= w || ex >= w || sy >= h || ey >= h || (sx === ex && sy === ey)) return null;
    const g = Array.from({ length: h }, (_, y) => [...cells.slice(y * w, y * w + w)]); g[sy][sx] = '.'; g[ey][ex] = '.';
    return { w, h, g, sx, sy, ex, ey, pl: [] };
  }
  const glOpt = L => solve(L).n;
  const start = (n, opts = {}) => { const L = opts.L || (opts.daily && makeLevel(45, +day().replace(/-/g, ''))) || makeLevel(n); if (opts.L) L.opt = glOpt(L); st = { n, L, S: start0(L), x: L.sx, y: L.sy, face: 'down', moves: 0, hist: [], hint: false, mode: 'play', tick: 0, anim: null, won: false, dead: 0, intro: GL_NEW[n] && !opts.L && !opts.daily ? 300 : 0, daily: !!opts.daily, custom: !!opts.L }; info(); };
  let ed = null;  // le niveau en cours d'édition et l'outil choisi
  const edNew = () => ({ w: 12, h: 8, g: Array.from({ length: 8 }, () => Array(12).fill('.')), sx: 1, sy: 1, ex: 10, ey: 6, pl: [] });
  function edOpen(L = ed?.L || edNew()) { ed = { L, tool: ed?.tool || '#' }; L.opt = glOpt(L); st = { n: 0, L, S: start0(L), x: L.sx, y: L.sy, face: 'down', moves: 0, hist: [], mode: 'edit', tick: 0, anim: null, dead: 0, intro: 0 }; $('glEd').hidden = false; edTools(); }
  function edTools() { $('glTools').querySelectorAll('.btn').forEach(b => b.classList.toggle('on', b.dataset.t === ed.tool)); $('glMine').replaceChildren(Object.assign(el('option', '', save.mine.length ? '— choisir —' : 'aucun pour l’instant'), { value: '' }), ...save.mine.map((c, i) => { const L = glParse(c); return Object.assign(el('option', '', 'Niveau ' + (i + 1) + (L ? ' · ' + L.w + ' × ' + L.h : '')), { value: String(i) }); })); }
  function edPut(x, y) {
    const L = ed.L; if (x < 0 || y < 0 || x >= L.w || y >= L.h) return; const t = ed.tool;
    if (t === 'P') { if (x === L.ex && y === L.ey) return; L.sx = x; L.sy = y; L.g[y][x] = '.'; st.x = x; st.y = y; st.S = start0(L); }
    else if (t === 'F') { if (x === L.sx && y === L.sy) return; L.ex = x; L.ey = y; L.g[y][x] = '.'; }
    else { if ((x === L.sx && y === L.sy) || (x === L.ex && y === L.ey)) return; L.g[y][x] = t; }
    L.opt = glOpt(L); beep(500, .03, 'square', 0, .02);
  }
  function move(m) {
    if (st.mode !== 'play' || st.anim) return;
    const [dx, dy, face] = GL_DIR[m], r = step(st.L, st.S, dx, dy); st.face = face;
    if (!r) { beep(140, .06); return; }
    st.hist.push(st.S); st.anim = { ...r, t: 0, d: r.path.length - 1 + (r.pile ? r.pile.path.length - 1 : 0) }; st.S = r.S; st.x = r.S.x; st.y = r.S.y; st.moves++; save.moves++; st.intro = Math.min(st.intro, 40);
    beep(700, .12, 'triangle', 300, .025);
    r.broke.forEach(([, , i]) => beep(1800, .05, 'square', 600, .02, i * .033 + .03));  // la fissure craque au passage
    if (r.tel) beep(300, .3, 'sine', 1400, .03, .05);
    if (r.pile) beep(160, .2, 'triangle', 90, .03, (r.path.length - 1) * .033);
  }
  function arrive() {
    if (st.x !== st.L.ex || st.y !== st.L.ey) { if (st.L.g[st.y][st.x] === 's') beep(220, .05, 'square', 0, .02); return; }
    st.mode = 'won'; st.dead = 0; const o = st.L.opt, s = st.hint ? 1 : st.moves <= o ? 3 : st.moves <= o + 2 ? 2 : 1; st.stars = s;
    if (st.daily) { const d = save.daily; if (d.last !== day()) { d.streak = d.last === day(1) ? d.streak + 1 : 1; d.best = Math.max(d.best, d.streak); d.last = day(); } }
    else if (!st.custom) { if (s > (save.stars[st.n] || 0)) save.stars[st.n] = s; if (st.n === save.level && st.n < MAXL) save.level = st.n + 1; }
    keep(); info(); [523, 659, 784, 1047].forEach((f, i) => beep(f, .15, 'square', 0, .03, i * .09));
  }
  function undo() { if (st.mode !== 'play' || st.anim || !st.hist.length) return; st.S = st.hist.pop(); st.x = st.S.x; st.y = st.S.y; st.moves++; beep(300, .05); }
  function hint() { if (st.mode !== 'play' || st.anim) return; const s = solve(st.L, st.S); if (!s.path.length) return; st.hint = true; st.show = { m: s.path[0], t: 90 }; }
  function update() {
    st.tick++; if (st.show && --st.show.t <= 0) st.show = null; if (st.intro > 0) st.intro--;
    if (st.mode === 'won' || st.mode === 'edit') { st.dead++; return; }
    if (st.anim) { st.anim.t += .5; if (st.anim.t >= st.anim.d) { st.anim = null; arrive(); } }
  }
  function tile(x, y, c) {
    const X = x * T, Y = Y0 + y * T;
    if (c === '#') { px(g, '#bfe6ff', X, Y, T, T); px(g, '#3a4a5a', X + 1, Y + 2, T - 2, T - 3); px(g, '#5a6e82', X + 2, Y + 2, T - 5, T - 6); px(g, '#8a9cb0', X + 3, Y + 3, 3, 2); px(g, '#f4faff', X + 2, Y + 1, T - 5, 2); px(g, '#26323e', X + 1, Y + T - 2, T - 2, 1); return; }
    if (c === 'c' || c === 'w') {  // glace fissurée, puis eau une fois cassée
      if (c === 'w') { px(g, '#1a5a8a', X, Y, T, T); px(g, '#2a78b0', X, Y, T, 1); const o = Math.floor(st.tick / 20 + x + y) % 3; px(g, '#4a9ad0', X + 2 + o, Y + 4, 3, 1); px(g, '#4a9ad0', X + 6 - o, Y + 8, 3, 1); return; }
      px(g, '#b4dcf4', X, Y, T, T); px(g, '#a8d8f4', X, Y + T - 1, T, 1); px(g, '#a8d8f4', X + T - 1, Y, 1, T);
      for (const [i, j] of [[2, 2], [3, 3], [4, 3], [5, 4], [6, 5], [6, 6], [7, 7], [8, 8], [5, 5], [4, 6], [3, 7], [7, 4], [8, 3], [9, 3], [6, 8], [6, 9]]) px(g, '#5a8eb4', X + i, Y + j);
      px(g, '#e8f8ff', X + 2, Y + 9, 2, 1); return; }
    if (c === 'T') {  // téléporteur : un anneau violet qui tourne
      px(g, '#bfe6ff', X, Y, T, T); px(g, '#4a2a7a', X + 2, Y + 2, 8, 8); px(g, '#b06aff', X + 3, Y + 2, 6, 1); px(g, '#b06aff', X + 3, Y + 9, 6, 1); px(g, '#b06aff', X + 2, Y + 3, 1, 6); px(g, '#b06aff', X + 9, Y + 3, 1, 6);
      const a = Math.floor(st.tick / 6) % 4, sp = [[4, 4], [7, 4], [7, 7], [4, 7]]; for (let i = 0; i < 2; i++) { const [u, v] = sp[(a + i * 2) % 4]; px(g, '#f0d8ff', X + u, Y + v, 1, 1); } px(g, '#e0c0ff', X + 5, Y + 5, 2, 2); return; }
    if (c === 's') { px(g, '#f0f6fa', X, Y, T, T); px(g, '#d4e2ec', X + 2, Y + 3, 1, 1); px(g, '#d4e2ec', X + 7, Y + 6, 1, 1); px(g, '#d4e2ec', X + 4, Y + 9, 1, 1); px(g, '#ffffff', X + 9, Y + 2, 1, 1); return; }
    px(g, '#bfe6ff', X, Y, T, T); px(g, '#a8d8f4', X, Y + T - 1, T, 1); px(g, '#a8d8f4', X + T - 1, Y, 1, T);
    if ((x * 7 + y * 13) % 5 === 0) { px(g, '#e8f8ff', X + 3, Y + 3, 4, 1); px(g, '#e8f8ff', X + 7, Y + 4, 1, 1); }
    if ((x * 3 + y * 5) % 7 === 0) px(g, '#ffffff', X + 8, Y + 8, 1, 1);
  }
  function draw() {
    g.imageSmoothingEnabled = false; const L = st.L;
    px(g, '#0e2236', 0, 0, W, H);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) px(g, (x + y) % 2 ? '#122a42' : '#10263c', x * T, Y0 + y * T, T, T);
    const ox = Math.floor((COLS - L.w) / 2), oy = Math.floor((ROWS - L.h) / 2);
    g.save(); g.translate(ox * T, oy * T);
    const A = st.anim, intact = new Set(A ? A.broke.filter(([, , i]) => A.t < i + 1).map(([x, y]) => y * L.w + x) : []);
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) { const c = L.g[y][x]; tile(x, y, c === 'c' && (st.S.br >> L.ci[y * L.w + x] & 1) && !intact.has(y * L.w + x) ? 'w' : c); }
    // les tas de neige (celui qu'on pousse glisse après l'arrêt du pingouin)
    const heap = (X, Y) => { px(g, '#8ab8d8', X + 1, Y + T - 2, T - 2, 1); px(g, '#c8dcea', X + 1, Y + 5, T - 2, 6); px(g, '#ffffff', X + 2, Y + 3, T - 4, 6); px(g, '#ffffff', X + 4, Y + 2, 4, 1); px(g, '#e0ecf4', X + 3, Y + 8, 6, 1); px(g, '#ffffff', X + 3, Y + 4, 2, 1); };
    for (const p of st.S.pl) { const x = p % L.w, y = Math.floor(p / L.w), pp = A?.pile?.path;
      if (pp && pp[pp.length - 1][0] === x && pp[pp.length - 1][1] === y) { const k = Math.max(0, Math.min(pp.length - 1, A.t - (A.path.length - 1))), i = Math.floor(k), f = k - i, [ax, ay] = pp[i], [bx, by] = pp[Math.min(pp.length - 1, i + 1)]; heap((ax + (bx - ax) * f) * T, Y0 + (ay + (by - ay) * f) * T); }
      else heap(x * T, Y0 + y * T); }
    { const X = L.ex * T, Y = Y0 + L.ey * T, wv = Math.floor(st.tick / 12) % 2; px(g, '#5a3a1e', X + 3, Y + 1, 1, 10); px(g, '#e83a4a', X + 4, Y + 1, 5, 4); px(g, '#ff7a6a', X + 4, Y + 1, 5, 1); if (wv) px(g, '#e83a4a', X + 9, Y + 2, 1, 2); px(g, '#8ab8d8', X + 1, Y + 10, 5, 1); }
    let fx = st.x, fy = st.y; if (A) { const k = Math.min(A.path.length - 1, A.t), i = Math.floor(k), [ax, ay] = A.path[i], [bx, by] = A.path[Math.min(A.path.length - 1, i + 1)], f = Math.abs(bx - ax) + Math.abs(by - ay) > 1 ? 1 : k - i; fx = ax + (bx - ax) * f; fy = ay + (by - ay) * f; }
    const bob = st.anim ? 0 : Math.floor(st.tick / 30) % 2;
    px(g, '#8ab8d8', fx * T + 2, Y0 + fy * T + T - 1, 8, 1);
    sprite(g, GL_P[st.face], Math.round(fx * T) + 1, Math.round(Y0 + fy * T) + 1 - bob, GL_PAL);
    if (st.show && st.tick % 20 < 14) { const [dx, dy] = GL_DIR[st.show.m], cx = st.x * T + 6 + dx * 10, cy = Y0 + st.y * T + 6 + dy * 10; px(g, '#ffd84a', cx - 2, cy - 2, 4, 4); px(g, '#ffd84a', cx + dx * 3 - 1, cy + dy * 3 - 1, 2, 2); }
    g.restore();
    px(g, '#08141f', 0, 0, W, 14);
    pxFont(g, st.mode === 'edit' ? 'Éditeur' : st.custom ? 'Mon niveau' : st.daily ? 'Niveau du jour' : 'Niveau ' + st.n, 4, 11, st.mode === 'edit' || st.daily ? '#ffd84a' : '#ffffff');
    pxFont(g, st.mode === 'edit' ? (L.opt === Infinity ? 'pas de chemin jusqu’au drapeau' : 'le plus court : ' + L.opt + (L.opt > 1 ? ' coups' : ' coup')) : st.moves + ' coups · meilleur : ' + L.opt, W - 4, 11, st.mode === 'edit' && L.opt === Infinity ? '#ff6a7a' : '#8ad8ff', 8, 'right');
    if (st.intro > 0 && st.mode === 'play' && GL_NEW[st.n] && st.intro % 1 === 0 && (st.intro > 40 || st.intro % 8 < 5)) { px(g, 'rgba(8,20,31,.9)', 0, H - 26, W, 26); pxFont(g, GL_NEW[st.n][0], W / 2, H - 15, '#b06aff', 8, 'center'); pxFont(g, GL_NEW[st.n][1], W / 2, H - 4, '#e0f6ff', 8, 'center'); }
    if (st.mode === 'pause') gameText(g, W, [['PAUSE', '#8ad8ff', 12], ['Entrée : reprendre', '#b8b0c8']], 64);
    if (st.mode === 'won' && st.dead > 20) gameText(g, W, [['BRAVO !', '#7ae05a', 12], ['★'.repeat(st.stars) + '☆'.repeat(3 - st.stars), '#ffd84a', 12], [st.moves + ' coups (le plus court : ' + L.opt + ')', '#ffffff'], [st.dead > 40 ? (st.custom ? 'Entrée : retour à l’éditeur' : st.daily ? 'Entrée : retour aux niveaux' : st.n < MAXL ? 'Entrée : niveau suivant' : 'Tu as fini les ' + MAXL + ' niveaux !') : '', '#b8b0c8']], 48);
    if (st.tick % 15 === 0) g.canvas.setAttribute('aria-label', 'Glace, niveau ' + st.n + ' : pingouin en ' + (st.x + 1) + ', ' + (st.y + 1) + ', drapeau en ' + (L.ex + 1) + ', ' + (L.ey + 1) + ', ' + st.moves + ' coups' + (st.mode === 'won' ? ', niveau fini' : '') + '.');
  }
  function info() {
    setTimeout(glTrophies);
    const stars = Object.values(save.stars).reduce((a, b) => a + b, 0);
    $('glStats').replaceChildren(...[['Niveau atteint', save.level], ['Étoiles', stars + ' / ' + MAXL * 3], ['Coups joués', save.moves], ['Niveau du jour', save.daily.last === day() ? 'fait ✓' : 'à faire'], ['Série de jours', (save.daily.last === day() || save.daily.last === day(1) ? save.daily.streak : 0) + ' (record ' + save.daily.best + ')']].flatMap(([a, c]) => [el('span', '', a), el('b', '', String(c))]));
  }
  const go = n => { if (n >= 1 && n <= Math.min(save.level, MAXL)) { $('glEd').hidden = true; start(n); } };
  const next = () => st.custom ? edOpen() : st.daily ? go(Math.min(save.level, MAXL)) : go(Math.min(MAXL, st.n + 1));
  document.addEventListener('keydown', e => {
    if (!on() || !st || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    const k = e.key;
    if (st.mode === 'edit') return;
    if (st.mode === 'won') { if ((k === 'Enter' || k === ' ') && st.dead > 40) { e.preventDefault(); next(); } return; }
    if (k === 'p' || k === 'P' || k === 'Escape') { st.mode = st.mode === 'pause' ? 'play' : 'pause'; return; }
    if (st.mode === 'pause') { if (k === 'Enter') st.mode = 'play'; return; }
    if (GL_DIR[k]) { e.preventDefault(); move(k); return; }
    if (k === 'Backspace' || k === 'u' || k === 'U') { undo(); return; }
    if (k === 'r' || k === 'R') { start(st.n, st.custom ? { L: st.L } : { daily: st.daily }); return; }
    if (k === 'h' || k === 'H') hint();
  });
  { const cv = $('glCanvas');  // à la souris ou au doigt : un clic du côté où glisser
    cv.onpointerdown = e => { e.preventDefault(); if (!st) return; if (st.mode === 'won') { if (st.dead > 40) next(); return; } if (st.mode === 'pause') { st.mode = 'play'; return; }
      const b = cv.getBoundingClientRect(), ox = Math.floor((COLS - st.L.w) / 2), oy = Math.floor((ROWS - st.L.h) / 2);
      if (st.mode === 'edit') { edPut(Math.floor(((e.clientX - b.left) / b.width * W - ox * T) / T), Math.floor(((e.clientY - b.top) / b.height * H - Y0 - oy * T) / T)); return; }
      const x = (e.clientX - b.left) / b.width * W - (ox * T + st.x * T + 6), y = (e.clientY - b.top) / b.height * H - (Y0 + oy * T + st.y * T + 6);
      move(Math.abs(x) > Math.abs(y) ? (x > 0 ? 'ArrowRight' : 'ArrowLeft') : (y > 0 ? 'ArrowDown' : 'ArrowUp')); };
  }
  $('glNew').onclick = () => { if (st.mode === 'edit') return; start(st.n, st.custom ? { L: st.L } : { daily: st.daily }); $('glNew').blur(); };
  $('glDaily').onclick = () => { $('glEd').hidden = true; start(st.n, { daily: true }); $('glDaily').blur(); };
  $('glEdit').onclick = () => { edOpen(); $('glEdit').blur(); };
  $('glTools').onclick = e => { const t = e.target.closest('[data-t]')?.dataset.t; if (t && ed) { ed.tool = t; edTools(); } };
  const edCopy = () => JSON.parse(JSON.stringify(ed.L));
  $('glTest').onclick = () => { $('glTest').blur(); if (!ed || ed.L.opt === Infinity) { beep(140, .1); return; } start(0, { L: edCopy() }); st.L.opt = ed.L.opt; };
  $('glSave').onclick = () => { $('glSave').blur(); if (!ed || ed.L.opt === Infinity) { beep(140, .1); return; } const c = glCode(ed.L); if (!save.mine.includes(c)) save.mine = [c, ...save.mine].slice(0, 12); keep(); edTools(); $('glCode').value = c; };
  $('glClear').onclick = () => { $('glClear').blur(); edOpen(edNew()); };
  $('glCopy').onclick = () => { $('glCopy').blur(); if (!ed) return; const c = glCode(ed.L); $('glCode').value = c; navigator.clipboard?.writeText(c).catch(() => {}); };
  $('glPaste').onclick = () => { $('glPaste').blur(); const L = glParse($('glCode').value); if (!L) { $('glCode').value = ''; $('glCode').placeholder = 'Code pas reconnu'; beep(140, .1); return; } edOpen(L); };
  $('glMine').onchange = () => { const L = glParse(save.mine[+$('glMine').value]); if (L) edOpen(L); $('glMine').blur(); };
  $('glPrev').onclick = () => go(st.n - 1); $('glNext').onclick = () => go(st.n + 1);
  $('glFs').onclick = () => { $('glFs').blur(); try { if (document.fullscreenElement) document.exitFullscreen(); else $('glCanvas').parentElement.requestFullscreen?.().catch(() => {}); } catch {} };
  padKeys({ 3: 'h', 4: 'r' });
  // vérification : les niveaux sont faisables et assez longs, le même numéro donne toujours le même niveau, la solution trouvée les finit (avec ses fissures,
  // tas poussés et téléporteurs) ; les règles des nouveautés sur un petit plateau fait main. Au démarrage : les 60 premiers et un niveau de chaque nouveauté (all : les 80)
  function glCheck(all) {
    const bad = [], keepS = JSON.stringify(save), keepSt = st; mute = true;
    for (let n = 1; n <= MAXL; n++) { if (!all && n > 60 && ![61, 66, 72].includes(n)) continue; const L = makeLevel(n); if (!L || L.opt === Infinity) { bad.push(n + ' : impossible'); continue; } if (L.opt < Math.min(3, 2 + n) || (n > 60 && L.opt < 8)) bad.push(n + ' : trop court (' + L.opt + ')');
      if (n <= 60 || all) { levels.delete(n); if (JSON.stringify([makeLevel(n).g, makeLevel(n).pl]) !== JSON.stringify([L.g, L.pl])) bad.push(n + ' : pas toujours le même'); } }
    for (const n of all ? [5, 61, 66, 71, 76, 80] : [5, 61]) { start(n); for (const m of solve(st.L).path) { move(m); while (st.anim) update(); } if (st.mode !== 'won' || st.stars !== 3) bad.push(n + ' : la solution ne finit pas le niveau'); }
    // fait main : P glisse à droite sur une fissure, la casse ; revenir à gauche s'arrête avant l'eau ; le tas poussé glisse jusqu'au rocher ; le téléporteur renvoie et on repart
    const L = { w: 7, h: 3, g: ['.c.....', '..b..#.', 'T..#.T.'].map(r => [...r.replace('b', '.')]), ex: 6, ey: 0, ci: new Int8Array(21).fill(-1), tp: [[0, 2], [5, 2]], pl: [1 * 7 + 2] }; L.ci[1] = 0;
    let r = step(L, { x: 0, y: 0, br: 0, pl: L.pl }, 1, 0); if (!r || r.S.x !== 6 || r.S.br !== 1 || !r.broke.length) bad.push('fissure : ' + JSON.stringify(r?.S));
    r = r && step(L, { ...r.S, x: 3 }, -1, 0); if (!r || r.S.x !== 2) bad.push('eau : ' + JSON.stringify(r?.S));
    r = step(L, { x: 0, y: 1, br: 0, pl: L.pl }, 1, 0); if (!r || r.S.x !== 1 || r.S.pl[0] !== 1 * 7 + 4) bad.push('tas : ' + JSON.stringify(r?.S));
    r = step(L, { x: 2, y: 2, br: 0, pl: [] }, -1, 0); if (!r || !r.tel || r.S.x !== 4 || r.S.y !== 2) bad.push('téléporteur : ' + JSON.stringify(r?.S));
    { const L = edNew(); L.g[3][4] = '#'; L.g[5][2] = 's'; const c = glCode(L), P = glParse(c); if (!P || glCode(P) !== c) bad.push('code du niveau');
      for (const z of ['G1:99x9:0,0,1,1:' + '.'.repeat(891), 'G1:3x3:0,0,0,0:.........', 'G1:3x3:0,0,2,2:..x......', '<b>']) if (glParse(z)) bad.push('code refusé : ' + z.slice(0, 12)); }
    { const s = 20261123, A = makeLevel(45, s); levels.delete('d' + s); const B = makeLevel(45, s); if (!A || A.opt === Infinity || glCode(A) !== glCode(B)) bad.push('niveau du jour'); }
    Object.keys(save).forEach(k => delete save[k]); Object.assign(save, JSON.parse(keepS)); mute = false; st = keepSt;
    return bad.join(' | ') || 'ok';
  }
  { const c = glCheck(); console.assert(c === 'ok', 'glace', c); view.dataset.selfcheck = c; }
  start(Math.min(save.level, MAXL));
  view.querySelector('#glCanvas').__solve = () => solve(st.L, st.S).path;  // pour le test « local »
  view.querySelector('#glCanvas').__gl = { st: () => st, check: glCheck, go: n => { save.level = Math.max(save.level, n); start(n); } };
  const STEP = 1000 / 60; let acc = 0, last = performance.now(), raf = 0;
  const frame = t => { if (!on()) { raf = 0; if (st.mode === 'play') st.mode = 'pause'; return; } raf = requestAnimationFrame(frame); acc += Math.min(200, t - last); last = t; while (acc >= STEP) { update(); acc -= STEP; } draw(); };
  // les trophées, tirés des statistiques et des records gardés (aussi à l'ouverture : ce qui a été fait avant compte)
  function glTrophies() {
    const v = Object.values(save.stars), done = v.filter(Boolean).length, st = v.reduce((a, b) => a + b, 0), sig = [done, st, save.daily.best, save.mine.length].join(); if (sig === glTrophies.sig) return; glTrophies.sig = sig;
    trophyRecord('etoiles', st || null);
    if (done >= 1) trophy('premier'); if (done >= 20) trophy('n20'); if (done >= 60) trophy('n60'); if (done >= MAXL) trophy('n80'); if (st >= MAXL * 3) trophy('etoiles');
    if (save.daily.best >= 7) trophy('jour7'); if (save.mine.length >= 1) trophy('createur');
  }
  ctx.onOpen(() => { g ??= $('glCanvas').getContext('2d'); info(); last = performance.now(); if (!raf) raf = requestAnimationFrame(frame); });
}
