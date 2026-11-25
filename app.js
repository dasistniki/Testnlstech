// Center OS – Mall-Leitstand als Spiel. Alles läuft im Browser, der Spielstand bleibt auf diesem Gerät.
// Mobile-Web-App: Tabs auf dem Handy, Bottom-Sheet für die Zonensteuerung, offline spielbar (Service Worker).
(() => {
'use strict';
const $ = (id) => document.getElementById(id);
const NF = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
const fmt = (n) => NF.format(Math.round(n) || 0);
const euro = (n) => `${n < 0 ? '−' : ''}${fmt(Math.abs(n))} €`;
const zwei = (n) => String(Math.floor(n)).padStart(2, '0');
const zufall = (a, b) => a + Math.random() * (b - a);
const wahl = (arr) => arr[Math.floor(Math.random() * arr.length)];
const begrenzen = (v, a, b) => Math.max(a, Math.min(b, v));
const gewichtet = (eintraege) => { let s = eintraege.reduce((a, e) => a + e[1], 0) * Math.random(); for (const [w, g] of eintraege) if ((s -= g) <= 0) return w; return eintraege[0][0]; };
const istMobil = () => matchMedia('(max-width: 979px)').matches;

// Nur ins DOM schreiben, wenn sich etwas geändert hat – spart auf dem Handy viel Layout-Arbeit
const text = (el, v) => { v = String(v); if (el._t !== v) { el._t = v; el.textContent = v; } };
const html = (el, v) => { if (el._h !== v) { el._h = v; el.innerHTML = v; } };
const stil = (el, p, v) => { const k = '_s' + p; if (el[k] !== v) { el[k] = v; el.style[p] = v; } };
const klasse = (el, v) => { if (el._c !== v) { el._c = v; el.className = v; } };
const attr = (el, a, v) => { v = String(v); if (el.getAttribute(a) !== v) el.setAttribute(a, v); };

// MARK: Symbole
const I = {
  becher: '<path d="M6 4h12l-1.5 16h-9z"/><path d="M6 8h12"/>',
  glas: '<path d="m4 20 6-8-3-8M14 4l3 7-7 9M20 20l-5-6"/>',
  kind: '<circle cx="12" cy="6" r="3"/><path d="M8 21v-6l-2-4h12l-2 4v6"/>',
  dieb: '<path d="M4 8h16l-2 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  treppe: '<path d="M3 20h4v-4h4v-4h4V8h6"/>',
  strom: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  auto: '<path d="M5 16V11l2-5h10l2 5v5"/><path d="M3 16h18v3H3z"/>',
  muell: '<path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"/>',
  feuer: '<path d="M12 2s6 5 6 11a6 6 0 0 1-12 0c0-3 2-5 2-5s0 3 3 4c0-4 1-7 1-10z"/>',
  wasser: '<path d="M12 2s7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 7-12 7-12z"/>',
  besen: '<path d="M14 3 9 14M5 21l4-7h6l-2 7z"/>',
  schild: '<path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5z"/>',
  werkzeug: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
  haken: '<path d="M5 12l5 5L20 7"/>',
  stern: '<path d="m12 2 3 6.5 7 .8-5.2 4.8 1.5 7L12 17.6 5.7 21l1.5-7L2 9.3l7-.8z"/>',
  kasse: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
};
const ic = (n, fill) => `<svg viewBox="0 0 24 24" fill="${fill ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n] || I.strom}</svg>`;

// MARK: Spielregeln
const ZONEN = {
  nord:   { name: 'Nordflügel', kurz: 'Nord', gewicht: .27, kap: 3800, licht: 160, spezial: 'Rolltreppen', spInfo: 'Aus spart Strom, ärgert aber Gäste', groesse: 1.2 },
  atrium: { name: 'Zentrales Atrium', kurz: 'Atrium', gewicht: .2, kap: 3000, licht: 130, spezial: 'Springbrunnen', spInfo: 'Gäste lieben ihn (+ Zufriedenheit)', groesse: 1 },
  park:   { name: 'Parkdeck 1–3', kurz: 'Parkdeck', gewicht: 0, kap: 0, licht: 90, spezial: 'Schranken offen', spInfo: 'Zu = keine neuen Autos', groesse: .8 },
  sued:   { name: 'Südflügel', kurz: 'Süd', gewicht: .23, kap: 3400, licht: 140, spezial: 'Lastenaufzug', spInfo: 'Aus = Lieferungen langsamer, Shops verdienen weniger', groesse: 1.1 },
  food:   { name: 'Food Court & Kino', kurz: 'Food Court', gewicht: .3, kap: 4200, licht: 150, spezial: 'Markisen', spInfo: 'Bei Sonne und Hitze ein Muss', groesse: 1.2 },
};
const SPEZIAL_KW = { nord: 60, atrium: 35, park: 5, sued: 40, food: 10 };
const WETTER = [
  { name: 'Sonnig', aussen: 18, faktor: 1, sonne: true },
  { name: 'Regen', aussen: 10, faktor: 1.18 },
  { name: 'Hitze', aussen: 32, faktor: .9, sonne: true },
  { name: 'Schnee', aussen: -2, faktor: .8 },
  { name: 'Wolkig', aussen: 13, faktor: 1.05 },
  { name: 'Sturm', aussen: 8, faktor: .85 },
];
const PERSONAL = {
  reinigung: { name: 'Reinigung', ic: 'besen', lohn: 22 },
  sicherheit: { name: 'Sicherheit', ic: 'schild', lohn: 28 },
  technik: { name: 'Technik', ic: 'werkzeug', lohn: 34 },
};
const EINSATZ = {
  getraenk: { name: 'Getränk ausgelaufen', ic: 'becher', wer: 'reinigung', dauer: 12, last: 1.2, gewicht: 5, zonen: ['nord', 'sued', 'atrium', 'food'] },
  glas: { name: 'Glasbruch', ic: 'glas', wer: 'reinigung', dauer: 18, last: 2.2, gewicht: 2, zonen: ['nord', 'sued', 'atrium'] },
  muell: { name: 'Mülleimer voll', ic: 'muell', wer: 'reinigung', dauer: 8, last: 1, gewicht: 4, zonen: ['food', 'atrium', 'nord', 'sued'] },
  kind: { name: 'Kind sucht Eltern', ic: 'kind', wer: 'sicherheit', dauer: 14, last: 2.5, gewicht: 2, zonen: ['nord', 'sued', 'atrium', 'food'] },
  dieb: { name: 'Ladendiebstahl', ic: 'dieb', wer: 'sicherheit', dauer: 22, last: 1.6, gewicht: 2.5, zonen: ['nord', 'sued'], verlust: 40 },
  streit: { name: 'Streit am Kino', ic: 'schild', wer: 'sicherheit', dauer: 16, last: 2, gewicht: 1.2, zonen: ['food'] },
  falsch: { name: 'Falschparker Lieferzone', ic: 'auto', wer: 'sicherheit', dauer: 12, last: .8, gewicht: 2, zonen: ['park'] },
  treppe: { name: 'Rolltreppe steht', ic: 'treppe', wer: 'technik', dauer: 35, last: 2.4, gewicht: 1.5, zonen: ['nord', 'atrium', 'sued'] },
  strom: { name: 'Stromausfall', ic: 'strom', wer: 'technik', dauer: 40, last: 3.5, gewicht: .7, zonen: ['nord', 'sued', 'food', 'atrium'], dunkel: true },
  wasser: { name: 'Wasserrohrbruch', ic: 'wasser', wer: 'technik', dauer: 45, last: 3, gewicht: .6, zonen: ['food', 'sued'] },
  kasse: { name: 'Kassenautomat defekt', ic: 'kasse', wer: 'technik', dauer: 20, last: 1.4, gewicht: 1.5, zonen: ['park'] },
  brand: { name: 'Feueralarm', ic: 'feuer', wer: 'technik', dauer: 6, last: 4, gewicht: 0, zonen: [] },
};
const AUSBAU = [
  { id: 'led', name: 'LED-Beleuchtung', text: 'Licht braucht nur noch halb so viel Strom.', preis: 9000, level: 1 },
  { id: 'reinigung', name: '+1 Reinigungskraft', text: 'Mehr Hände für Pfützen, Scherben und Müll.', preis: 4000, level: 1, mehrfach: true },
  { id: 'sicherheit', name: '+1 Sicherheitskraft', text: 'Mehr Leute für Diebe, Streit und vermisste Kinder.', preis: 5000, level: 1, mehrfach: true },
  { id: 'technik', name: '+1 Technikerin', text: 'Rolltreppen, Strom und Wasser schneller im Griff.', preis: 6500, level: 2, mehrfach: true },
  { id: 'funk', name: 'Digitalfunk', text: 'Alle Einsätze gehen 25 % schneller.', preis: 11000, level: 2 },
  { id: 'show', name: 'Wasserspiele-Show', text: 'Springbrunnen gibt doppelt so viel Zufriedenheit.', preis: 8000, level: 2 },
  { id: 'konzert', name: 'Konzert im Atrium (morgen)', text: 'Morgen +35 % Besucher und gute Laune. Gilt für einen Tag.', preis: 7000, level: 2, einmalig: true },
  { id: 'solar', name: 'Solardach', text: 'Strom kostet 35 % weniger – bei Sonne sogar 60 %.', preis: 16000, level: 3 },
  { id: 'parkdeck', name: 'Parkdeck 4', text: '+300 Stellplätze, weniger Frust bei vollem Haus.', preis: 14000, level: 3 },
  { id: 'sensor', name: 'Rauchsensoren 2.0', text: 'Zeigt bei Feueralarm an, wie wahrscheinlich ein echter Brand ist.', preis: 10000, level: 3 },
  { id: 'ki', name: 'Leitstand-KI', text: 'Verteilt neue Einsätze automatisch ans freie Personal.', preis: 24000, level: 4 },
  { id: 'app', name: 'Mall-App mit Gutscheinen', text: '+12 % Umsatz je Besucher.', preis: 18000, level: 4 },
];
const RAENGE = ['Praktikant', 'Schichtleitung', 'Leitstand-Profi', 'Center-Managerin', 'Mall-Legende', 'Shopping-Imperator'];
const OEFFNET = 9 * 60, SCHLIESST = 20 * 60;

// MARK: Einstellungen (pro Gerät)
const EINST_KEY = 'center-os-einstellungen';
let E = { vibration: true, vorlauf: true, hilfeGesehen: false };
try { Object.assign(E, JSON.parse(localStorage.getItem(EINST_KEY) || '{}')); } catch {}
const einstSpeichern = () => { try { localStorage.setItem(EINST_KEY, JSON.stringify(E)); } catch {} };
const brumm = (muster) => { if (E.vibration && navigator.vibrate) try { navigator.vibrate(muster); } catch {} };

// MARK: Spielstand
const SPEICHER = 'nls-center-os-v2';
function neuesSpiel() {
  return {
    tag: 1, minute: OEFFNET - 30, tempo: 1, geld: 25000, zufr: 78, xp: 0,
    personal: { reinigung: 3, sicherheit: 2, technik: 1 },
    ausbau: {}, morgenKonzert: false, konzert: false, rekord: 0,
    zonen: Object.fromEntries(Object.keys(ZONEN).map((z) => [z, { licht: true, tuer: true, spezial: true, temp: 21, besucher: 0 }])),
    einsaetze: [], naechsteId: 1, evakuiertBis: 0, brand: null, bericht: null,
    wetter: WETTER[0], heute: null, aufgaben: [], verlaufB: [], verlaufG: [], gesehenLevel: 1,
  };
}
function laden() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(SPEICHER) || 'null'); } catch {}
  if (!s || !s.zonen) return null;
  // Ältere Spielstände ergänzen
  const neu = neuesSpiel();
  for (const k of Object.keys(neu)) if (s[k] === undefined) s[k] = neu[k];
  for (const z of Object.keys(ZONEN)) s.zonen[z] = { ...neu.zonen[z], ...(s.zonen[z] || {}) };
  s.einsaetze = (s.einsaetze || []).filter((e) => EINSATZ[e.typ]);
  return s;
}
let S = laden() || neuesSpiel();
const speichern = () => { try { localStorage.setItem(SPEICHER, JSON.stringify(S)); } catch {} };
if (!S.heute) tagStarten(true);

function tagStarten(erster) {
  S.minute = OEFFNET - 30;
  S.wetter = erster ? WETTER[0] : wahl(WETTER);
  S.konzert = S.morgenKonzert; S.morgenKonzert = false;
  S.sale = S.tag % 7 === 0;
  S.einsaetze = []; S.evakuiertBis = 0; S.brand = null; S.bericht = null;
  S.heute = { umsatz: 0, kosten: 0, besucherSumme: 0, gelost: 0, verpasst: 0, energieSumme: 0, ticks: 0, zufrSumme: 0, start: S.geld };
  // Drei Tagesaufgaben – mit jedem Tag etwas schwerer
  const pool = [
    { id: 'umsatz', text: `Umsatz von ${fmt(32000 + S.tag * 2500)} €`, ziel: 32000 + S.tag * 2500 },
    { id: 'geloest', text: `${8 + S.tag} Einsätze erledigen`, ziel: 8 + S.tag },
    { id: 'zufrieden', text: `Mit mindestens ${Math.min(90, 75 + S.tag)} % Zufriedenheit schließen`, ziel: Math.min(90, 75 + S.tag) },
    { id: 'energie', text: `Im Schnitt unter ${fmt(Math.max(700, 1100 - S.tag * 20))} kW bleiben`, ziel: Math.max(700, 1100 - S.tag * 20) },
    { id: 'keinVerpasst', text: 'Keinen Einsatz verpassen', ziel: 0 },
    { id: 'besucher', text: `${fmt(80000 + S.tag * 6000)} Besuche an einem Tag`, ziel: 80000 + S.tag * 6000 },
  ];
  // Fisher-Yates statt sort(random) – gleichmäßig verteilt
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  S.aufgaben = pool.slice(0, 3).map((a) => ({ ...a, fertig: false }));
  for (const z of Object.values(S.zonen)) z.besucher = 0;
}

// MARK: Rechnen
const level = () => { let l = 1, rest = S.xp; while (rest >= l * 150) { rest -= l * 150; l++; } return { l, rest, noetig: l * 150 }; };
const hat = (id) => !!S.ausbau[id];
const offen = () => S.minute >= OEFFNET && S.minute < SCHLIESST && S.minute >= S.evakuiertBis;
const ANDRANG = [[9, .25], [10, .45], [11, .65], [12, .9], [13, .85], [14, .7], [15, .75], [16, .9], [17, 1], [18, .95], [19, .65], [20, .3]];
function andrang(min) {
  // Besucherkurve über den Tag (Mittag und Feierabend sind voll)
  const h = min / 60, p = ANDRANG;
  for (let i = 0; i < p.length - 1; i++) if (h >= p[i][0] && h <= p[i + 1][0]) { const t = (h - p[i][0]) / (p[i + 1][0] - p[i][0]); return p[i][1] + (p[i + 1][1] - p[i][1]) * t; }
  return 0;
}
const besucher = () => { let s = 0; for (const z of Object.values(S.zonen)) s += z.besucher; return s; };
const parkKap = () => 850 + (hat('parkdeck') ? 300 : 0);
const personalFrei = (typ) => S.personal[typ] - S.einsaetze.filter((e) => e.trupp === typ).length;
const istDunkel = (id) => S.einsaetze.some((e) => e.zone === id && EINSATZ[e.typ].dunkel && !e.fertigUm);
function energie() {
  let kw = 120; // Grundlast
  for (const [id, z] of Object.entries(S.zonen)) {
    const d = ZONEN[id];
    if (z.licht && !istDunkel(id)) kw += d.licht * (hat('led') ? .5 : 1);
    if (id !== 'park') kw += Math.abs(z.temp - S.wetter.aussen) * 9 * d.groesse;
    if (z.spezial) kw += SPEZIAL_KW[id];
  }
  return kw;
}
const strompreis = () => .32 * (hat('solar') ? (S.wetter.sonne ? .4 : .65) : 1);

// MARK: Eine Spielminute
function minute() {
  S.minute++;
  const h = S.heute, w = S.wetter;
  const auf = offen();
  // Besucher strömen in die Zonen
  const ziel = auf ? 13500 * andrang(S.minute) * w.faktor * (S.sale ? 1.6 : 1) * (S.konzert ? 1.35 : 1) * (.55 + S.zufr / 180) : 0;
  const parkVoll = S.zonen.park.besucher > parkKap() * .98;
  for (const [id, z] of Object.entries(S.zonen)) {
    if (id === 'park') continue;
    const d = ZONEN[id];
    const dunkel = !z.licht || istDunkel(id);
    let soll = ziel * d.gewicht * (z.tuer ? 1 : 0) * (dunkel ? .3 : 1) * (S.zonen.park.spezial ? 1 : .75) * (parkVoll ? .9 : 1);
    if (id === 'atrium' && S.konzert) soll *= 1.3;
    z.besucher += (soll - z.besucher) * (auf ? .06 : .2);
    if (z.besucher < 1) z.besucher = 0;
  }
  const alle = besucher() - S.zonen.park.besucher;
  // Autos zählen nicht mehr als Gäste (früher flossen sie in Umsatz und Besucherzahl ein) – Umsatz je Gast dafür leicht angehoben
  S.zonen.park.besucher = Math.min(parkKap(), alle / 8 * (S.zonen.park.spezial ? 1 : .8));

  // Geld
  const proKopf = .0069 * (hat('app') ? 1.12 : 1) * (S.zonen.sued.spezial ? 1 : .85) * (S.zonen.food.spezial || !w.sonne ? 1 : .9);
  const umsatz = alle * proKopf;
  const kw = energie();
  const lohn = S.minute >= OEFFNET - 30 && S.minute < SCHLIESST ? Object.entries(S.personal).reduce((a, [t, n]) => a + n * PERSONAL[t].lohn / 60, 0) : 0;
  const kosten = kw * strompreis() / 60 + lohn + 4.5;
  S.geld += umsatz - kosten;
  h.umsatz += umsatz; h.kosten += kosten; h.besucherSumme += alle / 45; h.energieSumme += kw; h.ticks++;

  // Zufriedenheit
  let soll = 84;
  for (const [id, z] of Object.entries(S.zonen)) {
    if (id === 'park') continue;
    const anteil = alle ? z.besucher / alle : .25;
    soll -= Math.abs(z.temp - 21) * 2.4 * anteil * 4;
    if (!z.licht && z.besucher > 50) soll -= 10 * anteil * 4;
    if (z.besucher > ZONEN[id].kap) soll -= Math.min(12, (z.besucher / ZONEN[id].kap - 1) * 30);
  }
  if (S.zonen.atrium.spezial) soll += hat('show') ? 6 : 3;
  if (!S.zonen.nord.spezial) soll -= 4;
  if (w.sonne && !S.zonen.food.spezial) soll -= w.name === 'Hitze' ? 6 : 2;
  if (w.name === 'Hitze' && S.zonen.food.temp > 22) soll -= 4;
  if (parkVoll) soll -= 7;
  if (S.konzert) soll += 4;
  for (const e of S.einsaetze) soll -= EINSATZ[e.typ].last * (e.eskaliert ? 2.2 : 1) * (e.trupp ? .5 : 1);
  soll = begrenzen(soll, 5, 100);
  S.zufr = begrenzen(S.zufr + (soll - S.zufr) * .03, 0, 100);
  h.zufrSumme += S.zufr;

  // Einsätze entstehen …
  if (auf) {
    const rate = .045 * (alle / 7000) * (S.sale ? 1.4 : 1) * (w.name === 'Sturm' ? 1.2 : 1);
    if (Math.random() < rate) einsatzNeu();
    if (parkVoll && Math.random() < .03 && !S.einsaetze.some((e) => e.typ === 'falsch')) einsatzNeu('falsch');
    if (!S.brand && Math.random() < .0009 * (alle / 8000)) brandalarm();
  }
  // … werden erledigt oder eskalieren
  for (const e of [...S.einsaetze]) {
    const d = EINSATZ[e.typ];
    if (e.typ === 'brand') continue; // Feueralarm läuft über S.brand
    if (e.fertigUm && S.minute >= e.fertigUm) {
      S.einsaetze = S.einsaetze.filter((x) => x !== e);
      h.gelost++; S.xp += e.eskaliert ? 6 : 12;
      toast(`${d.name} erledigt`, 'gut');
      continue;
    }
    if (!e.trupp) {
      const alter = S.minute - e.seit;
      if (alter > 40 && !e.eskaliert) { e.eskaliert = true; toast(`${d.name} wird schlimmer!`, 'schlecht'); brumm([60, 40, 60]); }
      if (d.verlust && alter % 10 === 0) S.geld -= d.verlust;
      if (alter > 110) { S.einsaetze = S.einsaetze.filter((x) => x !== e); h.verpasst++; S.zufr = Math.max(0, S.zufr - 4); toast(`Verpasst: ${d.name}`, 'schlecht'); }
    }
  }
  if (hat('ki')) for (const e of S.einsaetze) if (!e.trupp && e.typ !== 'brand' && personalFrei(EINSATZ[e.typ].wer) > 0) schicken(e, true);

  // Brandprüfung läuft
  if (S.brand && S.brand.pruefBis && S.minute >= S.brand.pruefBis) {
    if (S.brand.echt) {
      S.brand.pruefBis = 0; S.brand.bestaetigt = true;
      S.brand.text = 'Die Technik meldet: Es brennt wirklich! Jetzt sofort evakuieren.';
      const be = S.einsaetze.find((x) => x.typ === 'brand'); if (be) be.trupp = null;
      brandDialog(); brumm([200, 80, 200, 80, 200]);
    } else { S.brand = null; S.einsaetze = S.einsaetze.filter((e) => e.typ !== 'brand'); S.xp += 25; toast('Fehlalarm – gut geprüft!', 'gut'); }
  }
  if (S.brand && S.brand.echt && !S.brand.pruefBis && !S.brand.bestaetigt && S.minute - S.brand.seit > 12) {
    S.geld -= 30000; S.zufr = Math.max(5, S.zufr - 30); evakuieren(true); toast('Brand zu spät evakuiert: 30.000 € Schaden', 'schlecht');
  }

  aufgabenPruefen(false);
  if (S.minute >= SCHLIESST + 15 && !S.bericht) tagEnde();
}

function einsatzNeu(typ) {
  typ ||= gewichtet(Object.entries(EINSATZ).filter(([, v]) => v.gewicht > 0).map(([k, v]) => [k, v.gewicht]));
  const d = EINSATZ[typ];
  const zonen = d.zonen.filter((z) => S.zonen[z].tuer || z === 'park');
  if (!zonen.length) return;
  const zone = gewichtet(zonen.map((z) => [z, z === 'park' ? 1 : Math.max(1, S.zonen[z].besucher)]));
  if (S.einsaetze.some((e) => e.zone === zone && e.typ === typ)) return;
  const e = { id: S.naechsteId++, typ, zone, seit: S.minute, x: zufall(14, 84), y: zufall(40, 80) };
  S.einsaetze.push(e);
  toast(`${d.name} · ${ZONEN[zone].name}`, 'info');
  brumm(25);
}

function schicken(e, auto) {
  const d = EINSATZ[e.typ];
  if (e.trupp || e.typ === 'brand') return;
  if (personalFrei(d.wer) <= 0) { if (!auto) { toast(`Kein ${PERSONAL[d.wer].name}-Team frei – im Ausbau mehr Personal holen`, 'schlecht'); brumm(80); } return; }
  const weg = e.zone === 'park' ? 6 : 4;
  e.trupp = d.wer; e.start = S.minute; e.fertigUm = S.minute + Math.round((d.dauer * (e.eskaliert ? 1.3 : 1) + weg) * (hat('funk') ? .75 : 1));
  if (!auto) { toast(`${PERSONAL[d.wer].name} ist unterwegs`, 'info'); brumm(12); }
  zeichnen();
}

function brandalarm() {
  const zone = wahl(['nord', 'sued', 'food', 'atrium']);
  const echt = Math.random() < .3;
  const tipp = hat('sensor') ? ` Sensoren: ${echt ? 'starker Rauch, hohe Temperatur' : 'kaum Rauch, Temperatur normal'}.` : '';
  S.brand = { zone, echt, seit: S.minute, pruefBis: 0, text: `Brandmelder im Bereich ${ZONEN[zone].name} hat ausgelöst.${tipp} Was tust du?` };
  S.einsaetze.push({ id: S.naechsteId++, typ: 'brand', zone, seit: S.minute, x: 50, y: 60 });
  brandDialog();
  brumm([200, 80, 200, 80, 200]);
}
function brandDialog() {
  if (!S.brand) return;
  if (S.brand.pruefBis) { toast('Die Technik prüft den Alarm gerade …', 'info'); return; }
  $('brand-text').textContent = S.brand.text || '';
  $('brand-pruef').hidden = !!S.brand.bestaetigt;
  dialogAuf('brand');
}

function evakuieren(automatisch) {
  S.evakuiertBis = S.minute + 25;
  if (!automatisch) {
    if (S.brand?.echt) { S.xp += 60; S.zufr = Math.min(100, S.zufr + 5); toast('Richtig entschieden – alle sind in Sicherheit!', 'gut'); }
    else if (S.brand) { S.zufr = Math.max(0, S.zufr - 8); toast('Es war ein Fehlalarm. Sicher ist sicher – kostet aber Umsatz.', 'info'); }
    else { S.zufr = Math.max(0, S.zufr - 12); toast('Evakuierung ohne Grund: Gäste sind genervt', 'schlecht'); }
  }
  S.brand = null; S.einsaetze = S.einsaetze.filter((e) => e.typ !== 'brand');
  for (const z of Object.values(S.zonen)) z.besucher *= .2;
  brumm([100, 50, 100]);
}

// MARK: Aufgaben, Level, Tagesende
function aufgabenWert(a) {
  const h = S.heute;
  return { umsatz: h.umsatz, geloest: h.gelost, zufrieden: S.zufr, energie: h.ticks ? h.energieSumme / h.ticks : 0, keinVerpasst: h.verpasst, besucher: h.besucherSumme }[a.id];
}
function aufgabenPruefen(ende) {
  for (const a of S.aufgaben) {
    if (a.fertig) continue;
    const w = aufgabenWert(a);
    const ok = { umsatz: w >= a.ziel, geloest: w >= a.ziel, besucher: w >= a.ziel, zufrieden: ende && w >= a.ziel, energie: ende && w > 0 && w < a.ziel, keinVerpasst: ende && w === 0 }[a.id];
    if (ok) { a.fertig = true; S.xp += 50; S.geld += 3000; toast(`Aufgabe geschafft: ${a.text} (+3.000 €)`, 'gut'); brumm([30, 40, 30]); }
  }
}
function tagEnde() {
  aufgabenPruefen(true);
  const h = S.heute, gewinn = S.geld - h.start;
  const zufr = h.ticks ? h.zufrSumme / h.ticks : S.zufr;
  const sterne = Math.min(5, 1 + (gewinn > 10000) + (gewinn > 25000) + (zufr > 75) + (h.verpasst === 0 && h.gelost > 5));
  S.xp += sterne * 15;
  const neuerRekord = gewinn > (S.rekord || 0);
  if (neuerRekord) S.rekord = gewinn;
  // Bericht im Spielstand ablegen: nach einem Neuladen erscheint er wieder statt den Tag doppelt zu werten
  S.bericht = {
    tag: S.tag, sterne,
    titel: sterne >= 4 ? 'Starker Tag' : sterne >= 3 ? 'Solider Tag' : 'Das geht besser',
    zeilen: [['Umsatz', euro(h.umsatz)], ['Kosten (Strom, Personal, Betrieb)', euro(-h.kosten)], ['Gewinn heute', euro(gewinn)], ['Besuche', fmt(h.besucherSumme)],
      ['Einsätze erledigt / verpasst', `${h.gelost} / ${h.verpasst}`], ['Ø Zufriedenheit', `${Math.round(zufr)} %`], ['Aufgaben', `${S.aufgaben.filter((a) => a.fertig).length} von 3`],
      ['Bester Tag bisher', euro(S.rekord) + (neuerRekord ? ' · neuer Rekord!' : '')]],
    pleite: S.geld < 0,
  };
  speichern();
  berichtZeigen();
}
function berichtZeigen() {
  const b = S.bericht; if (!b) return;
  $('b-tag').textContent = `Tag ${b.tag}`;
  $('b-titel').textContent = b.titel;
  $('b-sterne').innerHTML = Array.from({ length: 5 }, (_, i) => ic('stern', true).replace('<svg', `<svg class="${i < b.sterne ? 'an' : ''}" style="animation-delay:${i * .12}s"`)).join('');
  const zeilen = b.pleite ? [...b.zeilen, ['Achtung', 'Die Kasse ist im Minus!']] : b.zeilen;
  $('b-zeilen').innerHTML = zeilen.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('');
  dialogAuf('bericht');
}
$('b-weiter').addEventListener('click', () => {
  dialogZu('bericht'); S.tag++; tagStarten(false); tempoSetzen(1); zeichnen(true); speichern();
  toast(`Tag ${S.tag}: ${S.wetter.name}${S.sale ? ' · Sale-Tag!' : ''}${S.konzert ? ' · Konzert im Atrium' : ''}`, 'info');
});

// MARK: Dialoge
const DIALOGE = ['bericht', 'brand', 'frage', 'hilfe'];
const dialogOffen = () => DIALOGE.some((d) => !$(d).hidden);
function dialogAuf(id) { $(id).hidden = false; const b = $(id).querySelector('.btn'); setTimeout(() => b?.focus({ preventScroll: true }), 50); }
function dialogZu(id) { $(id).hidden = true; }
let frageAntwort = null;
function frage(textInhalt, ja = 'Ja') {
  return new Promise((ok) => { $('frage-text').textContent = textInhalt; $('frage-ja').textContent = ja; frageAntwort = ok; dialogAuf('frage'); });
}
const frageSchliessen = (wert) => { dialogZu('frage'); const f = frageAntwort; frageAntwort = null; f?.(wert); };
$('frage-ja').addEventListener('click', () => frageSchliessen(true));
$('frage-nein').addEventListener('click', () => frageSchliessen(false));
$('frage').addEventListener('click', (e) => { if (e.target === $('frage')) frageSchliessen(false); });
$('hilfe-zu').addEventListener('click', () => { dialogZu('hilfe'); E.hilfeGesehen = true; einstSpeichern(); });
$('hilfe-auf').addEventListener('click', () => dialogAuf('hilfe'));

// MARK: Tabs (Handy)
let tab = 'lage';
try { tab = sessionStorage.getItem('center-os-tab') || 'lage'; } catch {}
function tabSetzen(t) {
  tab = t; document.body.dataset.tab = t;
  for (const b of $('tabs').querySelectorAll('button')) { if (b.dataset.tab === t) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); }
  try { sessionStorage.setItem('center-os-tab', t); } catch {}
  if (t === 'ziele') { requestAnimationFrame(malen); }
  if (t === 'ausbau') { S.gesehenLevel = level().l; }
  if (t !== 'team') sheetZu();
  window.scrollTo({ top: 0 });
  zeichnen(true);
}
$('tabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) tabSetzen(b.dataset.tab); });

// MARK: Steuerung als Bottom-Sheet (Handy)
const sheet = $('steuerung');
function sheetAuf() { if (!istMobil()) { sheet.classList.remove('blitz'); void sheet.offsetWidth; sheet.classList.add('blitz'); return; } sheet.classList.add('offen'); $('sheet-bg').classList.add('offen'); }
function sheetZu() { sheet.classList.remove('offen'); $('sheet-bg').classList.remove('offen'); }
$('sheet-bg').addEventListener('click', sheetZu);
$('st-zu').addEventListener('click', sheetZu);
// Nach unten wischen schließt das Sheet
let wischStart = null;
sheet.addEventListener('touchstart', (e) => { if (sheet.scrollTop <= 0 && !e.target.closest('input,.zonenwahl')) wischStart = e.touches[0].clientY; }, { passive: true });
sheet.addEventListener('touchmove', (e) => { if (wischStart == null) return; const dy = e.touches[0].clientY - wischStart; if (dy > 0) { sheet.style.transition = 'none'; sheet.style.transform = `translateY(${dy}px)`; } }, { passive: true });
sheet.addEventListener('touchend', (e) => { if (wischStart == null) return; const dy = e.changedTouches[0].clientY - wischStart; sheet.style.transition = ''; sheet.style.transform = ''; wischStart = null; if (dy > 80) sheetZu(); });

// MARK: Anzeige – DOM wird einmal aufgebaut und danach nur noch aktualisiert
const karte = $('karte');
let gewaehlt = 'atrium';
const zonenEl = {};
for (const [id, d] of Object.entries(ZONEN)) {
  const el = document.createElement('div');
  el.className = `zone z-${id}`; el.dataset.z = id;
  el.setAttribute('role', 'button'); el.tabIndex = 0; el.setAttribute('aria-label', d.name);
  el.innerHTML = `<div class="hitze"></div><div class="name"><span class="lang">${d.name}</span><span class="kurz">${d.kurz}</span></div><div class="info"></div><div class="leute"></div>`;
  karte.append(el);
  zonenEl[id] = { el, hitze: el.querySelector('.hitze'), info: el.querySelector('.info'), leute: el.querySelector('.leute'), pins: new Map() };
}
const zoneWaehlen = (id, oeffnen) => { gewaehlt = id; steuerungZeichnen(); zeichnen(); if (oeffnen) sheetAuf(); };
karte.addEventListener('click', (ev) => {
  const pin = ev.target.closest('.pin');
  if (pin) { einsatzAntippen(+pin.dataset.id); return; }
  const z = ev.target.closest('.zone'); if (z) zoneWaehlen(z.dataset.z, true);
});
karte.addEventListener('keydown', (ev) => { if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.classList.contains('zone')) { ev.preventDefault(); zoneWaehlen(ev.target.dataset.z, true); } });

// Zonenwahl im Sheet und Zonenliste im Team-Bereich
$('zonenwahl').innerHTML = Object.entries(ZONEN).map(([id, d]) => `<button type="button" data-z="${id}">${d.kurz}</button>`).join('');
$('zonenwahl').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) zoneWaehlen(b.dataset.z); });
$('zonenliste').innerHTML = Object.entries(ZONEN).map(([id, d]) => `<button type="button" data-z="${id}"><b>${d.name}</b><small></small></button>`).join('');
$('zonenliste').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) zoneWaehlen(b.dataset.z, true); });

function einsatzAntippen(id) {
  const e = S.einsaetze.find((x) => x.id === id); if (!e) return;
  if (e.typ === 'brand') { brandDialog(); return; }
  if (!e.trupp) schicken(e); else { toast(`${PERSONAL[e.trupp].name} ist schon vor Ort`, 'info'); }
}

function leuteBewegen() {
  if (document.hidden || !S.tempo || dialogOffen()) return;
  if (istMobil() && tab !== 'lage') return;
  for (const [id, r] of Object.entries(zonenEl)) {
    const z = S.zonen[id], box = r.leute;
    const soll = Math.min(id === 'park' ? 24 : 30, Math.round(z.besucher / (id === 'park' ? 30 : 110)));
    const bw = Math.max(0, box.clientWidth - 5), bh = Math.max(0, box.clientHeight - 5);
    while (box.children.length < soll) { const i = document.createElement('i'); i.style.transform = `translate(${zufall(0, bw)}px,${zufall(0, bh)}px)`; box.append(i); }
    while (box.children.length > soll) box.lastChild.remove();
    for (const i of box.children) if (Math.random() < .5) i.style.transform = `translate(${zufall(0, bw).toFixed(1)}px,${zufall(0, bh).toFixed(1)}px)`;
  }
}

// Einsatzliste mit festen Elementen pro Einsatz – Knöpfe bleiben beim Antippen stehen
const einsatzBox = $('einsaetze');
const einEls = new Map();
einsatzBox.addEventListener('click', (ev) => {
  const row = ev.target.closest('.ein'); if (!row) return;
  const e = S.einsaetze.find((x) => x.id === +row.dataset.id); if (!e) return;
  if (ev.target.closest('button') || !e.trupp) einsatzAntippen(e.id);
  else { gewaehlt = e.zone; zeichnen(true); }
});
function einsatzElement(e) {
  const el = document.createElement('div');
  el.dataset.id = e.id;
  el.innerHTML = `<span class="ic"></span><span class="txt"><b></b><small></small><div class="fort"><span></span></div></span><span class="akt"><button class="btn" type="button"></button></span>`;
  el._r = { ic: el.querySelector('.ic'), b: el.querySelector('b'), small: el.querySelector('small'), fort: el.querySelector('.fort'), fortS: el.querySelector('.fort span'), akt: el.querySelector('.akt'), btn: el.querySelector('button') };
  return el;
}
function einsaetzeZeichnen() {
  const liste = [...S.einsaetze].sort((a, b) => (a.typ === 'brand' ? -1 : 0) - (b.typ === 'brand' ? -1 : 0) || (!!a.trupp - !!b.trupp) || (!!b.eskaliert - !!a.eskaliert) || a.seit - b.seit);
  const ids = new Set(liste.map((e) => e.id));
  for (const [id, el] of einEls) if (!ids.has(id)) { el.remove(); einEls.delete(id); }
  let vorher = null;
  for (const e of liste) {
    const d = EINSATZ[e.typ];
    let el = einEls.get(e.id);
    if (!el) { el = einsatzElement(e); einEls.set(e.id, el); }
    const r = el._r;
    if (el._typ !== e.typ) { el._typ = e.typ; r.ic.innerHTML = ic(d.ic); r.b.textContent = d.name; }
    klasse(el, `ein${e.trupp ? ' lauf' : ''}${e.eskaliert ? ' eskaliert' : ''}`);
    const alter = S.minute - e.seit;
    text(r.small, `${ZONEN[e.zone].name} · ${e.typ === 'brand' ? (S.brand?.pruefBis ? 'Technik prüft' : 'Entscheidung nötig') : e.trupp ? `${PERSONAL[e.trupp].name} vor Ort` : `seit ${alter} Min${e.eskaliert ? ' · eskaliert' : ''}`}`);
    r.fort.hidden = !e.trupp;
    if (e.trupp && e.fertigUm) stil(r.fortS, 'width', Math.min(100, (S.minute - e.start) / Math.max(1, e.fertigUm - e.start) * 100).toFixed(0) + '%');
    const zeigen = e.typ === 'brand' ? !S.brand?.pruefBis : !e.trupp;
    r.akt.hidden = !zeigen;
    if (zeigen) {
      if (e.typ === 'brand') { klasse(r.btn, 'btn rot'); text(r.btn, 'Entscheiden'); }
      else { const frei = personalFrei(d.wer) > 0; klasse(r.btn, `btn${frei ? ' primary' : ''}`); text(r.btn, frei ? `${PERSONAL[d.wer].name} schicken` : 'Kein Team frei'); }
    }
    const soll = vorher ? vorher.nextElementSibling : einsatzBox.firstElementChild;
    if (el !== soll) einsatzBox.insertBefore(el, soll);
    vorher = el;
  }
  $('ein-leer').hidden = liste.length > 0;
  const offenZahl = S.einsaetze.filter((e) => !e.trupp && !(e.typ === 'brand' && S.brand?.pruefBis)).length;
  text($('ein-zahl'), `${offenZahl} offen · ${S.einsaetze.length - offenZahl} unterwegs`);
  const badge = $('badge-lage'); badge.hidden = !offenZahl || tab === 'lage'; text(badge, offenZahl);
}

function pinsZeichnen() {
  for (const [id, r] of Object.entries(zonenEl)) {
    const hier = S.einsaetze.filter((x) => x.zone === id);
    const ids = new Set(hier.map((e) => e.id));
    for (const [pid, p] of r.pins) if (!ids.has(pid)) { p.remove(); r.pins.delete(pid); }
    for (const e of hier) {
      let p = r.pins.get(e.id);
      if (!p || p._typ !== e.typ) {
        p?.remove();
        p = document.createElement('button'); p.type = 'button'; p.dataset.id = e.id; p._typ = e.typ;
        p.style.left = e.x + '%'; p.style.top = e.y + '%';
        p.innerHTML = ic(EINSATZ[e.typ].ic); p.setAttribute('aria-label', EINSATZ[e.typ].name); p.title = EINSATZ[e.typ].name;
        r.el.append(p); r.pins.set(e.id, p);
      }
      klasse(p, `pin${e.trupp ? ' lauf' : ''}${e.eskaliert ? ' eskaliert' : ''}${e.typ === 'brand' ? ' brand' : ''}`);
    }
  }
}

// Personal
const teamEl = {};
$('team').innerHTML = Object.entries(PERSONAL).map(([t, p]) => `<div class="mann" data-t="${t}"><span class="ic">${ic(p.ic)}</span><b>${p.name}</b><small></small><div class="punkte"></div></div>`).join('');
for (const t of Object.keys(PERSONAL)) { const el = $('team').querySelector(`[data-t=${t}]`); teamEl[t] = { small: el.querySelector('small'), punkte: el.querySelector('.punkte') }; }

// Shop
const shopEl = {};
for (const a of AUSBAU) {
  const el = document.createElement('div');
  el.innerHTML = `<b>${a.name}<span class="tag" hidden></span></b><small>${a.text}</small><span class="lock">Ab Level ${a.level}</span><button class="btn" type="button" data-id="${a.id}"></button>`;
  $('shop').append(el);
  shopEl[a.id] = { el, tag: el.querySelector('.tag'), lock: el.querySelector('.lock'), btn: el.querySelector('button') };
}
$('shop').addEventListener('click', (ev) => {
  const b = ev.target.closest('button[data-id]'); if (!b) return;
  const a = AUSBAU.find((x) => x.id === b.dataset.id);
  if (!a || S.geld < a.preis || level().l < a.level || gekauft(a)) return;
  S.geld -= a.preis;
  if (a.mehrfach) S.personal[a.id]++; else if (a.einmalig) S.morgenKonzert = true; else S.ausbau[a.id] = true;
  S.xp += 20;
  const r = b.getBoundingClientRect();
  const f = document.createElement('div'); f.className = 'geld-fliegt minus'; f.style.left = r.left + 'px'; f.style.top = r.top + 'px'; f.textContent = '−' + euro(a.preis); document.body.append(f); setTimeout(() => f.remove(), 1300);
  toast(`${a.name} gekauft`, 'gut'); brumm(20);
  zeichnen(true); speichern();
});
const gekauft = (a) => !a.mehrfach && (a.einmalig ? S.morgenKonzert : hat(a.id));
function shopZeichnen() {
  const lv = level().l;
  let kaufbar = false;
  for (const a of AUSBAU) {
    const r = shopEl[a.id];
    const istGekauft = gekauft(a), zuTeuer = S.geld < a.preis, gesperrt = lv < a.level;
    klasse(r.el, `ware${istGekauft ? ' gekauft' : ''}${gesperrt ? ' gesperrt' : ''}${!gesperrt && !istGekauft && !zuTeuer ? ' neu' : ''}`);
    r.tag.hidden = !a.mehrfach; if (a.mehrfach) text(r.tag, `${S.personal[a.id]} im Team`);
    r.lock.hidden = !gesperrt; r.btn.hidden = gesperrt;
    if (!gesperrt) {
      klasse(r.btn, `btn${istGekauft || zuTeuer ? '' : ' primary'}`);
      r.btn.disabled = istGekauft || zuTeuer;
      text(r.btn, istGekauft ? 'Gekauft' : euro(a.preis));
      if (!istGekauft && !zuTeuer) kaufbar = true;
    }
  }
  text($('shop-geld'), `Kasse ${euro(S.geld)}`);
  $('badge-ausbau').hidden = !kaufbar || tab === 'ausbau';
}

function zeichnen(alles) {
  const alle = besucher() - S.zonen.park.besucher, kw = energie(), h = S.heute, w = S.wetter;
  text($('h-tag'), S.tag);
  html($('h-zeit'), `${zwei(S.minute / 60)}<em>:</em>${zwei(S.minute % 60)}`);
  text($('h-wetter'), `${w.name} · ${w.aussen} °C${S.sale ? ' · Sale' : ''}${S.konzert ? ' · Konzert' : ''}${S.minute < OEFFNET ? ' · öffnet 9 Uhr' : S.minute >= SCHLIESST ? ' · zu' : ''}`);
  const g = $('h-geld'); text(g, euro(S.geld)); klasse(g, 'w' + (S.geld < 0 ? ' minus' : ''));
  const heute = h.umsatz - h.kosten; html($('h-heute'), `Heute <span class="${heute >= 0 ? 'plus' : 'minus'}">${heute >= 0 ? '+' : ''}${euro(heute)}</span>`);
  html($('h-zufr'), `${Math.round(S.zufr)}<small>%</small>`);
  const zb = $('h-zufr-b'); stil(zb, 'width', S.zufr.toFixed(0) + '%'); stil(zb, 'background', S.zufr > 70 ? 'var(--ok)' : S.zufr > 45 ? 'var(--warn)' : 'var(--bad)');
  text($('h-bes'), fmt(alle));
  text($('h-bes-sub'), `${fmt(h.besucherSumme)} Besuche heute`);
  text($('h-park'), `${fmt(S.zonen.park.besucher)} / ${fmt(parkKap())}`);
  const pb = $('h-park-b'); stil(pb, 'width', (S.zonen.park.besucher / parkKap() * 100).toFixed(0) + '%'); stil(pb, 'background', S.zonen.park.besucher > parkKap() * .95 ? 'var(--bad)' : 'var(--ok)');
  text($('h-en'), `${fmt(kw)} kW`);
  text($('h-en-sub'), `${fmt(kw * strompreis())} € / Std`);
  document.body.classList.toggle('evakuiert', S.minute < S.evakuiertBis);

  // Karte
  for (const [id, r] of Object.entries(zonenEl)) {
    const z = S.zonen[id], d = ZONEN[id];
    const dunkel = !z.licht || istDunkel(id);
    klasse(r.el, `zone z-${id}${id === gewaehlt ? ' an' : ''}${dunkel ? ' dunkel' : ''}${!z.tuer ? ' zu' : ''}`);
    stil(r.hitze, 'opacity', (id === 'park' ? S.zonen.park.besucher / parkKap() * .7 : Math.min(.85, z.besucher / d.kap * .8)).toFixed(2));
    text(r.info, id === 'park' ? `${fmt(z.besucher)}\u00a0Autos` : `${fmt(z.besucher)}\u00a0Gäste · ${z.temp}\u00a0°C`);
  }
  pinsZeichnen();
  einsaetzeZeichnen();

  // Personal
  let lohnStunde = 0;
  for (const [t, p] of Object.entries(PERSONAL)) {
    lohnStunde += S.personal[t] * p.lohn;
    const frei = personalFrei(t);
    text(teamEl[t].small, `${frei} von ${S.personal[t]} frei`);
    html(teamEl[t].punkte, Array.from({ length: S.personal[t] }, (_, i) => `<i class="${i >= frei ? 'weg' : ''}"></i>`).join(''));
  }
  text($('lohn'), `${fmt(lohnStunde)} € / Std`);

  // Zonenliste (Handy)
  for (const b of $('zonenliste').children) {
    const id = b.dataset.z, z = S.zonen[id];
    const flags = [!z.licht && 'Licht aus', !z.tuer && 'Türen zu', !z.spezial && `${ZONEN[id].spezial} aus`].filter(Boolean);
    html(b.querySelector('small'), (id === 'park' ? `${fmt(z.besucher)} Autos` : `${fmt(z.besucher)} · ${z.temp} °C`) + (flags.length ? ` · <span class="aus">${flags.join(', ')}</span>` : ''));
  }

  // Level + Aufgaben
  const lv = level();
  text($('lv'), lv.l); text($('lv-name'), RAENGE[Math.min(RAENGE.length - 1, lv.l - 1)]);
  text($('lv-xp'), `${lv.rest} / ${lv.noetig} XP`); stil($('lv-b'), 'width', (lv.rest / lv.noetig * 100).toFixed(1) + '%');
  html($('aufgaben'), S.aufgaben.map((a) => {
    const w = aufgabenWert(a);
    const stand = { umsatz: euro(w), geloest: `${w} / ${a.ziel}`, zufrieden: `${Math.round(w)} %`, energie: `Ø ${fmt(w)} kW`, keinVerpasst: `${w} verpasst`, besucher: fmt(w) }[a.id];
    return `<div class="aufgabe${a.fertig ? ' ok' : ''}"><span class="haken">${a.fertig ? ic('haken') : ''}</span><span>${a.text}</span><span class="stand">${stand}</span></div>`;
  }).join(''));
  $('badge-ziele').hidden = tab === 'ziele' || !S.aufgaben.some((a) => a.fertig && !a.gesehen);
  if (tab === 'ziele') for (const a of S.aufgaben) if (a.fertig) a.gesehen = true;

  if (alles) steuerungZeichnen();
  shopZeichnen();
}
function steuerungZeichnen() {
  const z = S.zonen[gewaehlt], d = ZONEN[gewaehlt], park = gewaehlt === 'park';
  text($('st-zone'), d.name);
  for (const b of $('zonenwahl').children) attr(b, 'aria-pressed', b.dataset.z === gewaehlt);
  attr($('st-licht'), 'aria-pressed', z.licht);
  text($('st-licht-info'), `${Math.round(d.licht * (hat('led') ? .5 : 1))} kW`);
  attr($('st-tuer'), 'aria-pressed', z.tuer);
  $('st-tuer').disabled = park;
  $('st-spezial-name').innerHTML = `${d.spezial}<small>${d.spInfo}</small>`;
  attr($('st-spezial'), 'aria-pressed', z.spezial);
  const t = $('st-temp'); t.disabled = park; t.value = z.temp;
  $('st-minus').disabled = park || z.temp <= 16; $('st-plus').disabled = park || z.temp >= 27;
  $('st-temp-w').textContent = park ? '–' : `${z.temp} °C`;
  $('st-temp-info').textContent = park ? 'Das Parkhaus wird nicht klimatisiert.' : `Wohlfühlwert 21 °C · draußen ${S.wetter.aussen} °C · jedes Grad Unterschied kostet Strom`;
}

// MARK: Bedienung
const zoneSchalten = (feld) => { const z = S.zonen[gewaehlt]; z[feld] = !z[feld]; brumm(8); steuerungZeichnen(); zeichnen(); };
$('st-licht').addEventListener('click', () => zoneSchalten('licht'));
$('st-tuer').addEventListener('click', () => zoneSchalten('tuer'));
$('st-spezial').addEventListener('click', () => zoneSchalten('spezial'));
const tempSetzen = (v) => { S.zonen[gewaehlt].temp = begrenzen(Math.round(v * 2) / 2, 16, 27); steuerungZeichnen(); zeichnen(); };
$('st-temp').addEventListener('input', (e) => tempSetzen(+e.target.value));
$('st-minus').addEventListener('click', () => { tempSetzen(S.zonen[gewaehlt].temp - .5); brumm(6); });
$('st-plus').addEventListener('click', () => { tempSetzen(S.zonen[gewaehlt].temp + .5); brumm(6); });
$('alarm').addEventListener('click', async () => {
  const vorher = S.tempo; tempoSetzen(0);
  if (await frage(S.brand ? 'Jetzt evakuieren?' : 'Es gibt keinen Alarm. Trotzdem alle Gäste rausschicken?', 'Evakuieren')) evakuieren(false);
  tempoSetzen(vorher || 1); zeichnen();
});
$('brand-evak').addEventListener('click', () => { dialogZu('brand'); evakuieren(false); tempoSetzen(1); zeichnen(); });
$('brand-pruef').addEventListener('click', () => {
  dialogZu('brand');
  if (!S.brand) return;
  const frei = personalFrei('technik') > 0;
  if (!frei) toast('Keine Technik frei – die Prüfung dauert länger', 'schlecht');
  S.brand.pruefBis = S.minute + (frei ? 6 : 12);
  const e = S.einsaetze.find((x) => x.typ === 'brand'); if (e) { e.trupp = frei ? 'technik' : null; e.start = S.minute; e.fertigUm = S.brand.pruefBis; }
  tempoSetzen(1); zeichnen();
});
$('neu').addEventListener('click', async () => {
  const vorher = S.tempo; tempoSetzen(0);
  if (await frage('Spielstand löschen und neu anfangen?', 'Neu anfangen')) {
    for (const r of Object.values(zonenEl)) { for (const p of r.pins.values()) p.remove(); r.pins.clear(); }
    for (const el of einEls.values()) el.remove(); einEls.clear();
    S = neuesSpiel(); tagStarten(true); speichern(); zeichnen(true); malen(); tempoSetzen(1); tabSetzen('lage');
  } else tempoSetzen(vorher);
});
for (const [id, k] of [['e-vib', 'vibration'], ['e-vorlauf', 'vorlauf']]) {
  attr($(id), 'aria-pressed', E[k]);
  $(id).addEventListener('click', () => { E[k] = !E[k]; attr($(id), 'aria-pressed', E[k]); einstSpeichern(); if (k === 'vibration') brumm(20); });
}
if (!navigator.vibrate) $('e-vib').closest('.reihe').hidden = true;

function tempoSetzen(t) {
  S.tempo = t;
  for (const b of $('tempo').querySelectorAll('button')) attr(b, 'aria-pressed', +b.dataset.t === t);
}
$('tempo').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b && !dialogOffen()) { tempoSetzen(+b.dataset.t); brumm(6); } });
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input')) return;
  if (e.key === 'Escape') { if (!$('frage').hidden) frageSchliessen(false); else if (!$('hilfe').hidden) $('hilfe-zu').click(); else sheetZu(); return; }
  if (dialogOffen()) return;
  if (e.key === ' ' && !e.target.matches('button,[role=button]')) { e.preventDefault(); tempoSetzen(S.tempo ? 0 : 1); }
  if (['1', '2', '4'].includes(e.key)) tempoSetzen(+e.key);
  if (e.key === '0' || e.key === 'p') tempoSetzen(0);
});

// Meldungen
const TOAST_MAX = () => istMobil() ? 2 : 4;
function toast(t, art = 'info') {
  const box = $('toasts');
  const d = document.createElement('div'); d.className = `toast ${art}`; d.textContent = t; box.append(d);
  while (box.children.length > TOAST_MAX()) box.firstChild.remove();
  setTimeout(() => { d.classList.add('weg'); setTimeout(() => d.remove(), 300); }, art === 'schlecht' ? 3600 : 2600);
}

// Diagramme
function linie(canvas, werte, farbe) {
  const r = canvas.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
  if (!r.width || werte.length < 2) return;
  const bw = Math.round(r.width * dpr), bh = Math.round(r.height * dpr);
  if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
  const g = canvas.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, r.width, r.height);
  let min = Infinity, max = -Infinity; for (const v of werte) { if (v < min) min = v; if (v > max) max = v; }
  const span = max - min || 1, pad = 8;
  const x = (i) => (i / (werte.length - 1)) * r.width, y = (v) => pad + (1 - (v - min) / span) * (r.height - 2 * pad);
  g.beginPath(); werte.forEach((v, i) => (i ? g.lineTo(x(i), y(v)) : g.moveTo(x(i), y(v))));
  g.strokeStyle = farbe; g.lineWidth = 2.5; g.lineJoin = 'round'; g.stroke();
  g.lineTo(r.width, r.height); g.lineTo(0, r.height); g.closePath();
  g.globalAlpha = .14; g.fillStyle = farbe; g.fill(); g.globalAlpha = 1;
}
function malen() {
  if (istMobil() && tab !== 'ziele') return;
  const ink = getComputedStyle(document.body).color;
  linie($('c-bes'), S.verlaufB, ink); linie($('c-geld'), S.verlaufG, '#C9AE98');
}
let resizeTimer; addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { malen(); if (!istMobil()) sheetZu(); }, 150); });
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', malen);

// MARK: App-Lebenszyklus: beim Verlassen pausieren und speichern
let autoPause = false;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (S.tempo) { autoPause = true; tempoSetzen(0); } speichern(); }
  else { letzte = performance.now(); if (autoPause) { autoPause = false; toast('Pausiert, während du weg warst. Tippe 1×, um weiterzuspielen.', 'info'); } }
});
addEventListener('pagehide', speichern);

// Installieren
let installEvent = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvent = e; $('installieren').hidden = false; });
$('installieren').addEventListener('click', async () => { if (!installEvent) return; installEvent.prompt(); await installEvent.userChoice.catch(() => {}); installEvent = null; $('installieren').hidden = true; });
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
if (!standalone && /iphone|ipad|ipod/i.test(navigator.userAgent)) $('ios-hinweis').hidden = false;
if ('serviceWorker' in navigator && location.protocol !== 'file:') addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));

// MARK: Spielschleife – 1× = 2 Spielminuten pro Sekunde
let rest = 0, letzte = performance.now(), zaehler = 0;
function schleife(jetzt) {
  const dt = Math.min(250, jetzt - letzte); letzte = jetzt;
  if (S.tempo && !dialogOffen() && !S.bericht) {
    // Vor 9 und nach 20 Uhr ohne offene Einsätze: Zeit läuft schneller
    const vorlauf = E.vorlauf && (S.minute < OEFFNET || S.minute >= SCHLIESST) && !S.einsaetze.length ? 3 : 1;
    rest += dt / 1000 * 2 * S.tempo * vorlauf;
    let geaendert = false;
    while (rest >= 1) { rest--; minute(); geaendert = true; if (S.bericht || dialogOffen()) { rest = 0; break; } }
    if (geaendert) {
      zeichnen();
      if (++zaehler % 8 === 0) { S.verlaufB.push(besucher() - S.zonen.park.besucher); S.verlaufG.push(S.geld); if (S.verlaufB.length > 120) { S.verlaufB.shift(); S.verlaufG.shift(); } malen(); }
      if (zaehler % 30 === 0) speichern();
    }
  }
  requestAnimationFrame(schleife);
}
setInterval(leuteBewegen, 1500);
// Höhe der Kopfzeile für die Position der Meldungen
const hudHoehe = () => document.documentElement.style.setProperty('--hud-h', $('hud').getBoundingClientRect().bottom + 'px');
if (window.ResizeObserver) new ResizeObserver(hudHoehe).observe($('hud')); hudHoehe();

// Start
tabSetzen(['lage', 'team', 'ziele', 'ausbau'].includes(tab) ? tab : 'lage');
tempoSetzen(S.tempo ?? 1);
zeichnen(true); leuteBewegen(); malen();
// Offene Dialoge aus dem Spielstand wiederherstellen
if (S.bericht) berichtZeigen();
else if (S.brand && !S.brand.pruefBis) brandDialog();
else if (!E.hilfeGesehen) dialogAuf('hilfe');
requestAnimationFrame(schleife);
if (S.tag === 1 && S.minute < OEFFNET && E.hilfeGesehen) toast('Willkommen im Leitstand! Um 9 Uhr öffnet die Mall.', 'info');
else if (!S.tempo && !dialogOffen()) toast('Pausiert. Tippe 1×, um weiterzuspielen.', 'info');
})();
