'use client';

import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  Link,
  StyleSheet,
  Font,
  Svg,
  Path,
  Circle,
  Ellipse,
  Rect,
  G,
} from '@react-pdf/renderer';
import { WeddingDayTimelineItem } from '@/lib/client-helpers';

// react-pdf charge les fontes via fetch() : il faut des URL absolues
const fontUrl = (file: string) =>
  `${typeof window !== 'undefined' ? window.location.origin : ''}/fonts/${file}`;

Font.register({
  family: 'Cormorant',
  fonts: [
    { src: fontUrl('cormorant-400.ttf'), fontWeight: 400, fontStyle: 'normal' },
    { src: fontUrl('cormorant-500.ttf'), fontWeight: 500, fontStyle: 'normal' },
    { src: fontUrl('cormorant-400i.ttf'), fontWeight: 400, fontStyle: 'italic' },
  ],
});
Font.register({
  family: 'PlexMono',
  fonts: [
    { src: fontUrl('plexmono-400.ttf'), fontWeight: 400, fontStyle: 'normal' },
    { src: fontUrl('plexmono-500.ttf'), fontWeight: 500, fontStyle: 'normal' },
  ],
});

const PAPIER = '#FAF6EF';
const PAPIER_BORD = '#F1E9DC';
const ENCRE = '#2A2320';
const ENCRE_DOUCE = '#6B5E53';
const TAUPE = '#B3A08B';
const TAUPE_PALE = '#E7DCCE';

const CHAPITRES = [
  { nom: 'Préparatifs', de: 0, a: 12 * 60, bg: '#DCE4D8', encre: '#5E7059' },
  { nom: 'Cérémonie', de: 12 * 60, a: 16 * 60 + 30, bg: '#E4DBFB', encre: '#5B4E7A' },
  { nom: "Vin d'honneur", de: 16 * 60 + 30, a: 18 * 60, bg: '#F3DDDD', encre: '#96606A' },
  { nom: 'Dîner', de: 18 * 60, a: 21 * 60, bg: '#F0E1C6', encre: '#8C6C3B' },
  { nom: 'Soirée', de: 21 * 60, a: 48 * 60, bg: '#DCE3EC', encre: '#55677F' },
];

const minOf = (h: string) => {
  const [a, b] = (h || '00:00').split(':').map(Number);
  return ((a || 0) < 5 ? (a || 0) + 24 : a || 0) * 60 + (b || 0);
};

const mapsUrl = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

const chapOf = (h: string) => {
  const m = minOf(h);
  return CHAPITRES.find((c) => m >= c.de && m < c.a) || CHAPITRES[CHAPITRES.length - 1];
};

const initialsOf = (coupleNames: string) => {
  const cleaned = (coupleNames || '').trim();
  if (!cleaned) return 'LP';
  const parts = cleaned
    .split(/[&+]|\bet\b/i)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0] || ''}·${parts[1][0] || ''}`.toUpperCase();
  return cleaned.slice(0, 3).toUpperCase();
};

const SIDEBAR_W = 236;

const styles = StyleSheet.create({
  page: {
    backgroundColor: PAPIER,
    fontFamily: 'Cormorant',
    color: ENCRE,
    fontSize: 11,
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_W,
    backgroundColor: PAPIER_BORD,
    paddingTop: 26,
    paddingHorizontal: 22,
    paddingBottom: 26,
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: TAUPE_PALE,
  },
  archWrap: { alignItems: 'center', marginBottom: 8 },
  sceau: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E4DBFB',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: -20,
    marginBottom: 14,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#C9BBDB',
    transform: 'rotate(-4deg)',
  },
  sceauText: { fontFamily: 'Cormorant', fontSize: 15, color: '#5B4E7A' },
  surtitre: {
    fontFamily: 'PlexMono',
    fontSize: 7.5,
    letterSpacing: 2.2,
    color: TAUPE,
    textAlign: 'center',
    marginBottom: 10,
  },
  maries: {
    fontFamily: 'Cormorant',
    fontWeight: 500,
    fontSize: 24,
    lineHeight: 1.15,
    textAlign: 'center',
    marginBottom: 6,
  },
  lieuDate: {
    fontFamily: 'Cormorant',
    fontStyle: 'italic',
    fontSize: 10.5,
    color: ENCRE_DOUCE,
    textAlign: 'center',
    marginBottom: 14,
  },
  filetTop: { borderTopWidth: 0.75, borderTopStyle: 'solid', borderTopColor: TAUPE, marginBottom: 1.5 },
  filetBot: { borderTopWidth: 0.75, borderTopStyle: 'solid', borderTopColor: TAUPE, marginBottom: 16 },
  repere: { marginBottom: 9 },
  repereLabel: { fontFamily: 'PlexMono', fontSize: 7, letterSpacing: 1.6, color: TAUPE },
  repereValue: { fontFamily: 'Cormorant', fontSize: 15, marginTop: 1 },

  main: { marginLeft: SIDEBAR_W, paddingTop: 26, paddingRight: 32, paddingBottom: 72, paddingLeft: 32 },

  chapitre: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 8,
  },
  chapitrePill: {
    fontFamily: 'PlexMono',
    fontSize: 7.5,
    letterSpacing: 1.8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 2,
  },
  chapitreTrait: { flex: 1, height: 1, marginHorizontal: 10 },
  chapitrePlage: { fontFamily: 'PlexMono', fontSize: 7.5, color: TAUPE },

  moment: {
    flexDirection: 'row',
    paddingVertical: 7,
    borderBottomWidth: 0.5,
    borderBottomStyle: 'solid',
    borderBottomColor: TAUPE_PALE,
  },
  heure: { width: 62, paddingTop: 1 },
  heureTxt: { fontFamily: 'PlexMono', fontSize: 9.5 },
  duree: { fontFamily: 'PlexMono', fontSize: 7, color: TAUPE, marginTop: 2, letterSpacing: 0.8 },
  axe: {
    width: 18,
    borderLeftWidth: 1.5,
    borderLeftStyle: 'solid',
    alignItems: 'center',
    position: 'relative',
  },
  puce: {
    position: 'absolute',
    left: 2.25,
    top: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: PAPIER,
    borderWidth: 1.5,
    borderStyle: 'solid',
  },
  corps: { flex: 1, paddingLeft: 10 },
  ligne: { flexDirection: 'row', alignItems: 'baseline' },
  titre: { fontFamily: 'Cormorant', fontSize: 13.5, lineHeight: 1.25 },
  pointilles: { flex: 1, borderBottomWidth: 0.75, borderBottomStyle: 'dotted', borderBottomColor: TAUPE, marginHorizontal: 8 },
  qui: { fontFamily: 'PlexMono', fontSize: 7.5, color: ENCRE_DOUCE },
  ou: { fontFamily: 'Cormorant', fontStyle: 'italic', fontSize: 10.5, color: ENCRE_DOUCE, marginTop: 3 },
  adresse: {
    fontFamily: 'PlexMono',
    fontSize: 7.5,
    color: TAUPE,
    marginTop: 3,
    textDecoration: 'underline',
  },
  note: { fontFamily: 'Cormorant', fontSize: 10, color: ENCRE_DOUCE, marginTop: 4, maxWidth: '90%' },

  fort: { paddingHorizontal: 6, marginHorizontal: -6, borderRadius: 2 },
  fortTitre: { fontSize: 16, fontStyle: 'italic' },

  footerAnchor: {
    position: 'absolute',
    left: SIDEBAR_W,
    right: 0,
    bottom: 0,
    height: 62,
  },
  footer: {
    height: 62,
    backgroundColor: PAPIER,
    borderTopWidth: 0.75,
    borderTopStyle: 'dashed',
    borderTopColor: TAUPE,
    paddingTop: 6,
    paddingBottom: 10,
    paddingHorizontal: 32,
  },
  footerBrin: { alignItems: 'center', marginBottom: 4 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerTxt: { fontFamily: 'PlexMono', fontSize: 7, letterSpacing: 1.2, color: TAUPE },

  vide: { marginTop: 60, alignItems: 'center' },
  videT: { fontFamily: 'Cormorant', fontStyle: 'italic', fontSize: 16, color: ENCRE_DOUCE },
  videS: { fontFamily: 'PlexMono', fontSize: 8, color: TAUPE, marginTop: 6, letterSpacing: 1.4 },
});

// react-pdf attend transform sous forme de matrice/operations, pas de string SVG.
// On calcule la matrice combinee translate + rotate + scale.
const svgMatrix = (tx: number, ty: number, angle = 0, sx = 1, sy?: number) => {
  const r = (angle * Math.PI) / 180;
  const sY = sy ?? sx;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return [
    {
      operation: 'matrix',
      value: [cos * sx, sin * sx, -sin * sY, cos * sY, tx, ty],
    },
  ] as any;
};

// Une feuille orientée autour de son centre
const Leaf = ({
  x,
  y,
  rx,
  ry,
  fill,
  angle,
}: {
  x: number;
  y: number;
  rx: number;
  ry: number;
  fill: string;
  angle: number;
}) => (
  <G transform={svgMatrix(x, y, angle)}>
    <Ellipse cx={0} cy={0} rx={rx} ry={ry} fill={fill} />
  </G>
);

// Le brin floral du design : 5 feuilles + 3 boutons
const Brin = ({
  x,
  y,
  angle = 0,
  s = 1,
  sy,
}: {
  x: number;
  y: number;
  angle?: number;
  s?: number;
  sy?: number;
}) => (
  <G transform={svgMatrix(x, y, angle, s, sy)}>
    <Leaf x={-17} y={-6} rx={12} ry={5} angle={-25} fill="#B9C9B3" />
    <Leaf x={15} y={-9} rx={11} ry={4.5} angle={20} fill="#B9C9B3" />
    <Leaf x={-4} y={-19} rx={10} ry={4} angle={-72} fill="#9FB29A" />
    <Leaf x={11} y={9} rx={13} ry={5} angle={35} fill="#9FB29A" />
    <Leaf x={-15} y={10} rx={11} ry={4.5} angle={-40} fill="#B9C9B3" />
    <Circle cx={0} cy={0} r={8.5} fill="#FFFCF6" stroke="#CDBBA5" strokeWidth={0.9} />
    <Circle cx={14} cy={-3} r={5.5} fill="#FFFCF6" stroke="#CDBBA5" strokeWidth={0.9} />
    <Circle cx={-9} cy={7} r={5} fill="#F6EDE0" stroke="#CDBBA5" strokeWidth={0.9} />
  </G>
);

const Candle = ({ x, y, h }: { x: number; y: number; h: number }) => (
  <G>
    <Rect x={x} y={y} width={7} height={h} rx={3} fill="#F6EDE0" stroke="#CDBBA5" strokeWidth={0.8} />
    <Ellipse cx={x + 3.5} cy={y - 6} rx={3.4} ry={6} fill="#EFD3A0" />
  </G>
);

// Arche fleurie du bandeau du design (560x210)
const ArchDecoration = () => (
  <Svg viewBox="0 0 560 210" width={192} height={72}>
    <Path
      d="M280 24c118 0 214 34 214 84s-96 96-214 96S66 158 66 108 162 24 280 24z"
      fill="#E4DBFB"
      opacity={0.75}
    />
    <Ellipse cx={280} cy={196} rx={236} ry={13} fill="#EFE7DA" />
    <Path d="M186 198V104a94 94 0 0 1 188 0v94" fill="none" stroke="#C4B29B" strokeWidth={1.6} />
    <Path d="M206 198v-92a74 74 0 0 1 148 0v92" fill="none" stroke="#DACBB7" strokeWidth={1} />
    {/* branches fleuries autour de l'arche */}
    <Brin x={192} y={120} angle={-14} s={1.05} />
    <Brin x={206} y={72} angle={22} s={0.9} />
    <Brin x={246} y={42} angle={-8} />
    <Brin x={300} y={38} angle={12} s={1.08} />
    <Brin x={348} y={64} angle={-24} s={0.92} />
    <Brin x={370} y={116} angle={16} />
    <Brin x={180} y={176} angle={-30} s={1.15} />
    <Brin x={380} y={178} angle={28} s={1.1} />
    {/* petit vase au centre */}
    <Rect x={266} y={150} width={28} height={46} rx={3} fill="#FFFCF6" stroke="#CDBBA5" strokeWidth={0.9} />
    <Path d="M280 150v-16" stroke="#9FB29A" strokeWidth={1.2} />
    <Brin x={280} y={128} s={0.55} />
    {/* bougies */}
    <Candle x={120} y={158} h={38} />
    <Candle x={140} y={170} h={26} />
    <Candle x={414} y={164} h={32} />
    <Candle x={434} y={174} h={22} />
  </Svg>
);

// Le petit brin + cœur du pied de page du design (140x30)
const BrinPied = () => (
  <Svg viewBox="0 0 140 30" width={96} height={21}>
    <Brin x={40} y={16} angle={-8} s={0.62} />
    <Brin x={100} y={16} angle={8} s={-0.62} sy={0.62} />
    <Path
      d="M70 10c3-5 11-3 11 3 0 5-7 8-11 12-4-4-11-7-11-12 0-6 8-8 11-3z"
      fill="#E4DBFB"
      stroke="#9A8CC0"
      strokeWidth={0.8}
    />
  </Svg>
);

interface Props {
  items: WeddingDayTimelineItem[];
  coupleNames: string;
  eventDate: string;
  location?: string;
}

export function WeddingDayTimelineDocument({ items, coupleNames, eventDate, location }: Props) {
  const sorted = [...items].sort((a, b) => minOf(a.time) - minOf(b.time));
  const version = new Date().toLocaleDateString('fr-FR') + ' — ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const dateText = eventDate
    ? new Date(eventDate + 'T00:00:00').toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
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

  // group consecutive items by chapter
  const groups: { ch: (typeof CHAPITRES)[number]; items: WeddingDayTimelineItem[] }[] = [];
  for (const m of sorted) {
    const ch = chapOf(m.time);
    const last = groups[groups.length - 1];
    if (last && last.ch.nom === ch.nom) last.items.push(m);
    else groups.push({ ch, items: [m] });
  }

  return (
    <Document
      title={`Planning du jour J — ${coupleNames}`}
      author="Le Oui Parfait"
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Sidebar fixe : identité + repères sur chaque page */}
        <View style={styles.sidebar} fixed>
          <View style={styles.archWrap}>
            <ArchDecoration />
          </View>
          <View style={styles.sceau}>
            <Text style={styles.sceauText}>{initialsOf(coupleNames)}</Text>
          </View>
          <Text style={styles.surtitre}>DÉROULÉ DU JOUR J</Text>
          <Text style={styles.maries}>{coupleNames}</Text>
          {lieuDate ? <Text style={styles.lieuDate}>{lieuDate}</Text> : null}
          <View style={styles.filetTop} />
          <View style={styles.filetBot} />
          {reperes.map((r) => (
            <View key={r.k} style={styles.repere}>
              <Text style={styles.repereLabel}>{r.k.toUpperCase()}</Text>
              <Text style={styles.repereValue}>{r.v}</Text>
            </View>
          ))}
        </View>

        {/* Contenu principal */}
        <View style={styles.main}>
          {sorted.length === 0 ? (
            <View style={styles.vide}>
              <Text style={styles.videT}>Le déroulé est encore vierge.</Text>
              <Text style={styles.videS}>AJOUTEZ UN PREMIER MOMENT POUR COMMENCER</Text>
            </View>
          ) : (
            groups.map((g, gi) => (
              <View key={gi}>
                <View style={styles.chapitre} wrap={false}>
                  <Text style={[styles.chapitrePill, { backgroundColor: g.ch.bg, color: g.ch.encre }]}>
                    {g.ch.nom.toUpperCase()}
                  </Text>
                  <View style={[styles.chapitreTrait, { backgroundColor: g.ch.bg }]} />
                  <Text style={styles.chapitrePlage}>
                    {g.items[0].time} – {g.items[g.items.length - 1].time}
                  </Text>
                </View>
                {g.items.map((m, mi) => (
                  <View
                    key={mi}
                    wrap={false}
                    style={
                      m.highlight
                        ? [styles.moment, styles.fort, { backgroundColor: g.ch.bg }]
                        : styles.moment
                    }
                  >
                    <View style={styles.heure}>
                      <Text style={[styles.heureTxt, m.highlight ? { color: g.ch.encre } : {}]}>
                        {m.time}
                      </Text>
                      {m.duration ? <Text style={styles.duree}>{m.duration}</Text> : null}
                    </View>
                    <View style={[styles.axe, { borderLeftColor: g.ch.bg }]}>
                      <View
                        style={[
                          styles.puce,
                          m.highlight
                            ? { backgroundColor: g.ch.encre, borderColor: g.ch.encre }
                            : { borderColor: g.ch.encre },
                        ]}
                      />
                    </View>
                    <View style={styles.corps}>
                      <View style={styles.ligne}>
                        <Text style={[styles.titre, m.highlight ? styles.fortTitre : {}]}>
                          {m.title}
                        </Text>
                        <View style={styles.pointilles} />
                        {m.who ? <Text style={styles.qui}>{m.who}</Text> : null}
                      </View>
                      {m.location ? <Text style={styles.ou}>{m.location}</Text> : null}
                      {m.address ? (
                        <Link src={mapsUrl(m.address)} style={styles.adresse}>
                          {`→ ${m.address}`}
                        </Link>
                      ) : null}
                      {m.note ? <Text style={styles.note}>{m.note}</Text> : null}
                      {m.description && !m.note ? <Text style={styles.note}>{m.description}</Text> : null}
                    </View>
                  </View>
                ))}
              </View>
            ))
          )}
        </View>

        {/* Footer affiché uniquement sur la dernière page */}
        <View style={styles.footerAnchor} fixed>
          <View
            render={(p: any) =>
              p.pageNumber === p.totalPages ? (
                <View style={styles.footer}>
                  <View style={styles.footerBrin}>
                    <BrinPied />
                  </View>
                  <View style={styles.footerRow}>
                    <Text style={styles.footerTxt}>Version du {version}</Text>
                    <Text style={styles.footerTxt}>Planning créé avec Le Oui Parfait</Text>
                    <Text style={styles.footerTxt}>Page {p.pageNumber} / {p.totalPages}</Text>
                  </View>
                </View>
              ) : null
            }
          />
        </View>
      </Page>
    </Document>
  );
}
