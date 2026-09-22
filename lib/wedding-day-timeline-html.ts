import { WeddingDayTimelineItem } from './client-helpers';

type Chapter = { nom: string; de: number; a: number; c: string; cEncre: string };

export const CHAPITRES: Chapter[] = [
  { nom: 'Préparatifs', de: 0, a: 12 * 60, c: 'sauge', cEncre: 'sauge-encre' },
  { nom: 'Cérémonie', de: 12 * 60, a: 16 * 60 + 30, c: 'lavande', cEncre: 'lavande-encre' },
  { nom: "Vin d'honneur", de: 16 * 60 + 30, a: 18 * 60, c: 'rose', cEncre: 'rose-encre' },
  { nom: 'Dîner', de: 18 * 60, a: 21 * 60, c: 'champagne', cEncre: 'champagne-encre' },
  { nom: 'Soirée', de: 21 * 60, a: 48 * 60, c: 'brume', cEncre: 'brume-encre' },
];

const minOf = (h: string) => {
  const [a, b] = h.split(':').map(Number);
  return (a < 5 ? a + 24 : a) * 60 + b;
};

const chapOf = (h: string) => {
  const m = minOf(h);
  return CHAPITRES.find((c) => m >= c.de && m < c.a) || CHAPITRES[CHAPITRES.length - 1];
};

const esc = (s?: string | number) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] || c));

const initialsOf = (coupleNames: string) => {
  const parts = coupleNames
    .split(/[&+]|\bet\b/i)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ''} · ${parts[1][0] || ''}`.toUpperCase();
  }
  return coupleNames.slice(0, 3).toUpperCase();
};

const css = `
:root{
  --papier:#FAF6EF;
  --papier-bord:#F1E9DC;
  --encre:#2A2320;
  --encre-douce:#6B5E53;
  --taupe:#B3A08B;
  --taupe-pale:#E7DCCE;
  --canevas:#EDE6DC;
  --sauge:#DCE4D8;      --sauge-encre:#5E7059;  --sauge-rgb:220,228,216;
  --lavande:#E4DBFB;    --lavande-encre:#5B4E7A; --lavande-rgb:228,219,251;
  --rose:#F3DDDD;       --rose-encre:#96606A;    --rose-rgb:243,221,221;
  --champagne:#F0E1C6;  --champagne-encre:#8C6C3B; --champagne-rgb:240,225,198;
  --brume:#DCE3EC;      --brume-encre:#55677F;   --brume-rgb:220,227,236;
  --serif:"Cormorant Garamond", Iowan Old Style, Palatino, Georgia, serif;
  --mono:"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  box-sizing:border-box;
}
*,*::before,*::after{box-sizing:inherit}
html{scroll-padding-top:0}
body{ margin:0; background:var(--canevas); color:var(--encre);
  font-family:var(--serif); font-size:17px; line-height:1.5; -webkit-font-smoothing:antialiased }

.wrap{ padding:32px 16px 64px }
.sheet{
  max-width:760px; margin:0 auto; background:var(--papier);
  border:1px solid var(--papier-bord); overflow:hidden;
  box-shadow:0 1px 0 rgba(179,160,139,.35), 0 18px 40px -28px rgba(42,35,32,.45);
}
.marges{ padding:0 48px }

.bandeau{ position:relative; background:linear-gradient(180deg,#FFFDF9 0%,var(--papier) 100%) }
.bandeau svg{ display:block; width:100%; height:auto }

.tete{ text-align:center; padding-top:24px }
.sceau{
  width:62px; height:62px; margin:-46px auto 20px; position:relative; z-index:2;
  display:grid; place-items:center; border-radius:50%;
  background:var(--lavande); color:var(--lavande-encre);
  font-family:var(--serif); font-size:20px; letter-spacing:.04em;
  box-shadow:inset 0 0 0 1px rgba(91,78,122,.25), 0 0 0 6px var(--papier);
  transform:rotate(-4deg);
}
.surtitre{ font-family:var(--mono); font-size:11px; letter-spacing:.22em; color:var(--taupe); margin:0 0 16px }
.maries{ font-size:clamp(34px,7vw,52px); font-weight:300; line-height:1.08; margin:0 0 12px }
.maries .et{ font-style:italic; color:var(--taupe); font-size:.62em; display:block; margin:.15em 0 }
.lieu-date{ color:var(--encre-douce); font-size:16px; font-style:italic; margin:0 0 24px }
.filet{ border:0; border-top:1px solid var(--taupe); border-bottom:1px solid var(--taupe); height:3px; opacity:.5; margin:0 }

.reperes{ display:flex; justify-content:center; flex-wrap:wrap; gap:0 40px; margin:24px 0 40px }
.repere{ text-align:center; min-width:96px; padding:8px 0 }
.repere dt{ font-family:var(--mono); font-size:10.5px; letter-spacing:.16em; color:var(--taupe) }
.repere dd{ margin:5px 0 0; font-size:20px }

.chapitre{
  display:flex; align-items:center; gap:16px;
  margin:40px 0 16px;
  break-after:avoid; page-break-after:avoid;
}
.chapitre:first-of-type{ margin-top:16px }
.chapitre h2{
  font-family:var(--mono); font-weight:500; font-size:11px; letter-spacing:.2em; text-transform:uppercase;
  margin:0; white-space:nowrap; padding:6px 13px; border-radius:2px;
  background:var(--accent); color:var(--accent-encre);
}
.chapitre .trait{ flex:1; height:1px; background:var(--accent); }
.chapitre .plage{ font-family:var(--mono); font-size:11px; color:var(--taupe); white-space:nowrap }

.moment{
  display:grid; grid-template-columns:76px 22px 1fr; align-items:start;
  padding:14px 0;
  border-bottom:1px solid rgba(179,160,139,.26);
  break-inside:avoid; page-break-inside:avoid;
}
section .moment:last-child{ border-bottom:0 }
.heure{ font-family:var(--mono); font-size:14px; padding-top:4px }
.heure .duree{ display:block; font-size:10.5px; color:var(--taupe); margin-top:3px; letter-spacing:.08em }
.axe{ position:relative; align-self:stretch; justify-self:center; width:2px; background:var(--accent) }
.puce{
  position:absolute; top:11px; left:50%; width:9px; height:9px; margin-left:-4.5px;
  border-radius:50%; background:var(--papier); box-shadow:inset 0 0 0 2px var(--accent-encre);
}
.corps{ padding-left:16px; min-width:0 }
.ligne{ display:flex; align-items:baseline; gap:10px }
.titre{ font-size:21px; font-weight:400; line-height:1.25; margin:0 }
.pointilles{ flex:1; min-width:16px; border-bottom:1px dotted var(--taupe); transform:translateY(-4px); opacity:.8 }
.qui{ font-family:var(--mono); font-size:11px; color:var(--encre-douce); white-space:nowrap; letter-spacing:.04em }
.ou{ margin:5px 0 0; font-size:15.5px; font-style:italic; color:var(--encre-douce) }
.note{ margin:7px 0 0; font-size:15px; color:var(--encre-douce); max-width:58ch }

.moment.fort{ background:linear-gradient(90deg, rgba(var(--accent-rgb), .45), transparent 72%) }
.moment.fort .heure{ color:var(--accent-encre) }
.moment.fort .puce{ background:var(--accent-encre) }
.moment.fort .titre{ font-size:26px; font-style:italic }

.sheet[data-densite="compact"] .moment{ padding:9px 0 }
.sheet[data-densite="compact"] .titre{ font-size:18px }
.sheet[data-densite="compact"] .moment.fort .titre{ font-size:20px }
.sheet[data-densite="compact"] .note{ display:none }
.sheet[data-densite="compact"] .chapitre{ margin-top:28px }

.vide{ text-align:center; padding:56px 0; color:var(--encre-douce) }
.vide p{ margin:0 0 6px; font-size:19px; font-style:italic }
.vide small{ font-family:var(--mono); font-size:11px; letter-spacing:.1em; color:var(--taupe) }

.brin-pied{ display:block; margin:40px auto 8px; width:120px; height:auto }
.pied{
  border-top:1px dashed var(--taupe);
  display:flex; justify-content:space-between; gap:16px; flex-wrap:wrap;
  padding:20px 0 32px;
  font-family:var(--mono); font-size:10.5px; letter-spacing:.12em; color:var(--taupe);
}

@media (max-width:640px){
  .wrap{ padding:16px 12px 40px }
  .marges{ padding:0 24px }
  .reperes{ gap:0 24px }
}
@media (max-width:560px){
  .moment{ grid-template-columns:14px 1fr; column-gap:0 }
  .heure{ grid-column:2; grid-row:1; padding:0 0 0 16px; display:flex; gap:10px; align-items:baseline; font-size:12.5px; color:var(--taupe) }
  .heure .duree{ margin:0 }
  .axe{ grid-column:1; grid-row:1 / span 2; justify-self:start }
  .puce{ top:6px }
  .corps{ grid-column:2; grid-row:2; padding-top:4px }
  .pointilles{ display:none }
  .ligne{ flex-wrap:wrap; gap:2px 10px }
  .qui{ width:100%; order:3 }
  .titre{ font-size:19px }
  .moment.fort .titre{ font-size:21px }
}

@media print{
  @page{ size:A4; margin:14mm }
  body{ background:var(--canevas) }
  .wrap{ padding:0 }
  .sheet{ box-shadow:none; border:0; max-width:none; background:var(--papier); -webkit-print-color-adjust:exact; print-color-adjust:exact }
  .marges{ padding:0 }
  .chapitre{ break-after:avoid; page-break-after:avoid }
  .chapitre h2, .moment.fort{ -webkit-print-color-adjust:exact; print-color-adjust:exact }
  .brin-pied{ display:none }
  .pied{ position:fixed; bottom:0; left:14mm; right:14mm; padding:12px 0; background:var(--papier); -webkit-print-color-adjust:exact; print-color-adjust:exact; z-index:10 }
}
`;

const svgBandeau = `<svg viewBox="0 0 560 210" role="img" aria-label="Arche fleurie" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <g id="brin">
      <ellipse fill="#B9C9B3" cx="-17" cy="-6" rx="12" ry="5" transform="rotate(-25 -17 -6)"/>
      <ellipse fill="#B9C9B3" cx="15" cy="-9" rx="11" ry="4.5" transform="rotate(20 15 -9)"/>
      <ellipse fill="#9FB29A" cx="-4" cy="-19" rx="10" ry="4" transform="rotate(-72 -4 -19)"/>
      <ellipse fill="#9FB29A" cx="11" cy="9" rx="13" ry="5" transform="rotate(35 11 9)"/>
      <ellipse fill="#B9C9B3" cx="-15" cy="10" rx="11" ry="4.5" transform="rotate(-40 -15 10)"/>
      <circle fill="#FFFCF6" stroke="#CDBBA5" stroke-width=".9" cx="0" cy="0" r="8.5"/>
      <circle fill="#FFFCF6" stroke="#CDBBA5" stroke-width=".9" cx="14" cy="-3" r="5.5"/>
      <circle fill="#F6EDE0" stroke="#CDBBA5" stroke-width=".9" cx="-9" cy="7" r="5"/>
    </g>
  </defs>
  <path d="M280 24c118 0 214 34 214 84s-96 96-214 96S66 158 66 108 162 24 280 24z" fill="#E4DBFB" opacity=".75"/>
  <ellipse cx="280" cy="196" rx="236" ry="13" fill="#EFE7DA"/>
  <path d="M186 198V104a94 94 0 0 1 188 0v94" fill="none" stroke="#C4B29B" stroke-width="1.6"/>
  <path d="M206 198v-92a74 74 0 0 1 148 0v92" fill="none" stroke="#DACBB7" stroke-width="1"/>
  <use href="#brin" transform="translate(192,120) rotate(-14) scale(1.05)"/>
  <use href="#brin" transform="translate(206,72) rotate(22) scale(.9)"/>
  <use href="#brin" transform="translate(246,42) rotate(-8)"/>
  <use href="#brin" transform="translate(300,38) rotate(12) scale(1.08)"/>
  <use href="#brin" transform="translate(348,64) rotate(-24) scale(.92)"/>
  <use href="#brin" transform="translate(370,116) rotate(16)"/>
  <use href="#brin" transform="translate(180,176) rotate(-30) scale(1.15)"/>
  <use href="#brin" transform="translate(380,178) rotate(28) scale(1.1)"/>
  <g class="decor-centre">
    <rect x="266" y="150" width="28" height="46" rx="3" fill="#FFFCF6" stroke="#CDBBA5" stroke-width=".9"/>
    <path d="M280 150v-16" stroke="#9FB29A" stroke-width="1.2"/>
    <use href="#brin" transform="translate(280,128) scale(.55)"/>
  </g>
  <g>
    <rect x="120" y="158" width="7" height="38" rx="3" fill="#F6EDE0" stroke="#CDBBA5" stroke-width=".8"/>
    <ellipse cx="123.5" cy="152" rx="3.4" ry="6" fill="#EFD3A0"/>
    <rect x="140" y="170" width="7" height="26" rx="3" fill="#F6EDE0" stroke="#CDBBA5" stroke-width=".8"/>
    <ellipse cx="143.5" cy="164" rx="3.4" ry="6" fill="#EFD3A0"/>
    <rect x="414" y="164" width="7" height="32" rx="3" fill="#F6EDE0" stroke="#CDBBA5" stroke-width=".8"/>
    <ellipse cx="417.5" cy="158" rx="3.4" ry="6" fill="#EFD3A0"/>
    <rect x="434" y="174" width="7" height="22" rx="3" fill="#F6EDE0" stroke="#CDBBA5" stroke-width=".8"/>
    <ellipse cx="437.5" cy="168" rx="3.4" ry="6" fill="#EFD3A0"/>
  </g>
</svg>`;

const svgPied = `<svg class="brin-pied" viewBox="0 0 140 30" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  <use href="#brin" transform="translate(40,16) rotate(-8) scale(.62)"/>
  <use href="#brin" transform="translate(100,16) rotate(8) scale(-.62 .62)"/>
  <path d="M70 10c3-5 11-3 11 3 0 5-7 8-11 12-4-4-11-7-11-12 0-6 8-8 11-3z" fill="#E4DBFB" stroke="#9A8CC0" stroke-width=".8"/>
</svg>`;

export function buildWeddingDayTimelineHtml(
  items: WeddingDayTimelineItem[],
  coupleNames: string,
  eventDate: string,
  location?: string
) {
  const sorted = [...items].sort((a, b) => minOf(a.time) - minOf(b.time));
  const densite = sorted.length > 28 ? 'compact' : 'confort';
  const initials = initialsOf(coupleNames);
  const version = new Date().toLocaleDateString('fr-FR') + ' — ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const dateText = eventDate
    ? new Date(eventDate + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const lieuDate = [dateText, location].filter(Boolean).join(' — ');

  const reperes = sorted.length
    ? [
        { k: 'Premier moment', v: sorted[0].time },
        { k: 'Moment fort', v: sorted.find((m) => m.highlight)?.time || sorted[0].time },
        { k: 'Dernier moment', v: sorted[sorted.length - 1].time },
        { k: 'Moments', v: String(sorted.length) },
      ]
    : [];

  const reperesHtml = reperes
    .map((r) => `<div class="repere"><dt>${esc(r.k)}</dt><dd>${esc(r.v)}</dd></div>`)
    .join('');

  let mainHtml = '';
  let currentChap: Chapter | null = null;

  for (const m of sorted) {
    const ch = chapOf(m.time);
    if (ch.nom !== currentChap?.nom) {
      if (currentChap) mainHtml += '</section>';
      const chItems = sorted.filter((x) => chapOf(x.time).nom === ch.nom);
      const style = `--accent:var(--${ch.c}); --accent-encre:var(--${ch.c}-encre); --accent-rgb:var(--${ch.c}-rgb, 200,200,200)`;
      mainHtml += `<div class="chapitre" style="${style}">
        <h2>${esc(ch.nom)}</h2>
        <span class="trait"></span>
        <span class="plage">${esc(chItems[0].time)} – ${esc(chItems[chItems.length - 1].time)}</span>
      </div>
      <section style="${style}">`;
      currentChap = ch;
    }
    mainHtml += `<article class="moment${m.highlight ? ' fort' : ''}">
      <div class="heure">${esc(m.time)}${m.duration ? `<span class="duree">${esc(m.duration)}</span>` : ''}</div>
      <div class="axe"><span class="puce"></span></div>
      <div class="corps">
        <div class="ligne">
          <h3 class="titre">${esc(m.title)}</h3>
          <span class="pointilles"></span>
          ${m.who ? `<span class="qui">${esc(m.who)}</span>` : ''}
        </div>
        ${m.location ? `<p class="ou">${esc(m.location)}</p>` : ''}
        ${m.note ? `<p class="note">${esc(m.note)}</p>` : ''}
        ${m.description && !m.note ? `<p class="note">${esc(m.description)}</p>` : ''}
      </div>
    </article>`;
  }
  if (currentChap) mainHtml += '</section>';

  const empty = !sorted.length
    ? '<div class="vide"><p>Le déroulé est encore vierge.</p><small>Ajoutez un premier moment pour commencer</small></div>'
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Planning du jour J — ${esc(coupleNames)}</title>
<style>${css}</style>
</head>
<body>
  <div class="wrap">
    <article class="sheet" id="wdtSheet" data-densite="${densite}">
      <div class="bandeau">${svgBandeau}</div>
      <div class="marges">
        <header class="tete">
          <div class="sceau">${initials}</div>
          <p class="surtitre">Déroulé du jour J</p>
          <h1 class="maries">${esc(coupleNames)}</h1>
          ${lieuDate ? `<p class="lieu-date">${esc(lieuDate)}</p>` : ''}
          <hr class="filet">
          <dl class="reperes">${reperesHtml}</dl>
        </header>
        <main>${empty}${mainHtml}</main>
        ${svgPied}
        <footer class="pied">
          <span>Version du ${esc(version)}</span>
          <span>Planning créé avec Le Oui Parfait</span>
        </footer>
      </div>
    </article>
  </div>
</body>
</html>`;
}
