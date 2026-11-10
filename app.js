(() => {
'use strict';
/* ---------- Add to Tabi: the page reader ----------
   Used by the Add to Tabi button on a booking site and by the app. It reads structured data (JSON-LD),
   the page address and the title, and returns plain fields. Booking text is read in the app (clip_text.js),
   so the button stays small and gets better whenever the app updates. */
const TPB = (() => {
  const p2 = n => String(n).padStart(2, '0');
  // a local script: Japanese, Chinese, Korean, Thai or Greek (Latin-script names and addresses stay as they are)
  const JP = /[\u3040-\u30ff\u3400-\u9fff\uff66-\uff9f\uac00-\ud7af\u1100-\u11ff\u3130-\u318f\u0e00-\u0e7f\u0370-\u03ff]/;
  const isoOf = d => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
  const dayMs = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
  const num = s => +String(s).replace(/[,\s]/g, '');
  const HOST_KIND = [[/booking\.com|airbnb|agoda|hotels\.com|expedia|trip\.com\/hotels|jalan|travel\.rakuten|ikyu|hostelworld|japanican|relux/i, 'stay'], [/tabelog|tablecheck|omakase|gurunavi|hotpepper|retty|opentable/i, 'food'], [/smart-ex|eki-net|jr-?(?:west|central|east)|jrpass|japanrailpass|willer|kosokubus|12go|ferry|jal\.co|ana\.co|jetstar|flypeach|zipair|navitime/i, 'move'], [/klook|kkday|viator|getyourguide|teamlab|museum|ticket/i, 'see']];
  const kindOfHost = h => { for (const [re, k] of HOST_KIND) if (re.test(h || '')) return k; return ''; };
  const TYPE_KIND = [[/Lodging|Hotel|Hostel|Resort|BedAndBreakfast|Motel|Campground|VacationRental|Accommodation/i, 'stay'], [/Flight|Train|Bus|Boat|Taxi|RentalCar|Trip\b/i, 'move'], [/FoodEstablishment|Restaurant|Cafe|Bar|Bakery/i, 'food'], [/Event|Attraction|Museum|Gallery|Park|Product|Offer|Place|Landmark/i, 'see']];
  const typeKind = t => { for (const [re, k] of TYPE_KIND) if (re.test(t)) return k; return ''; };
  const typeOf = o => [].concat(o && o['@type'] || []).join(' ');
  const dt = v => { const m = /(20\d\d-\d\d-\d\d)(?:[T ](\d\d:\d\d))?/.exec(String(v || '')); return m ? { d: m[1], t: m[2] || '' } : null; };
  const addr = a => { if (!a) return ''; if (typeof a === 'string') return a; if (Array.isArray(a)) return addr(a[0]); return [a.postalCode, a.addressRegion, a.addressLocality, a.streetAddress].filter(Boolean).join(JP.test(JSON.stringify(a)) ? '' : ', ').trim() || addr(a.address); };
  const addrEn = a => { if (!a || typeof a !== 'object' || Array.isArray(a)) return addr(a); return [a.streetAddress, a.addressLocality, a.addressRegion, a.postalCode].filter(Boolean).join(', '); };
  // JSON-LD: reservations first, then places, events and products
  function fromLD(list) {
    const r = {}; if (!list || !list.length) return r;
    const rank = o => /Reservation/.test(typeOf(o)) ? 0 : typeKind(typeOf(o)) === 'stay' ? 1 : /Event|FoodEstablishment|Restaurant/.test(typeOf(o)) ? 2 : 3;
    const o = list.slice().sort((a, b) => rank(a) - rank(b))[0];
    const t = typeOf(o), isRes = /Reservation/.test(t), f = isRes ? (o.reservationFor || {}) : o;
    r.kind = typeKind(t.replace('Reservation', '')) || typeKind(typeOf(f)) || '';
    const nm = String(f.name || o.name || '').trim(); if (nm) { if (JP.test(nm) && !/[a-z]{3}/i.test(nm)) r.ja = nm; else r.name = nm; }
    const s = dt(o.checkinTime || o.checkinDate || f.checkinTime || o.startDate || f.startDate || f.departureTime || o.startTime || f.startTime), e = dt(o.checkoutTime || o.checkoutDate || f.checkoutTime || o.endDate || f.endDate);
    if (s) { r.start = s.d; if (s.t) { if (r.kind === 'stay') r.checkin = s.t; else r.time = s.t; } }
    if (e) { r.end = e.d; if (e.t && r.kind === 'stay') r.checkout = e.t; }
    const conf = o.reservationNumber || o.reservationId || o.confirmationNumber || o.orderNumber; if (conf) r.conf = String(conf).slice(0, 40);
    let pr = o.totalPrice != null ? o.totalPrice : o.price, cur = o.priceCurrency;
    const off = [].concat(f.offers || o.offers || [])[0];
    if (pr == null && off) { pr = off.price != null ? off.price : off.lowPrice; cur = off.priceCurrency; }
    if (pr && typeof pr === 'object') { cur = pr.priceCurrency || cur; pr = pr.price; }
    const pv = num(pr); if (pv > 0 && /^([A-Z]{3})?$/i.test(cur || '')) { r.price = pv; r.cur = String(cur || '').toUpperCase(); r.total = isRes; }
    const place = f.location && typeof f.location === 'object' && !Array.isArray(f.location) ? f.location : f;
    const a = place.address || f.address;
    if (a) { const ja = addr(a); if (JP.test(ja)) r.addressJa = ja.slice(0, 200); const en = addrEn(a); if (en && !JP.test(en)) r.address = en.slice(0, 200); }
    const g = place.geo || f.geo || o.geo; if (g && +g.latitude && +g.longitude) { r.lat = +g.latitude; r.lng = +g.longitude; }
    const tel = place.telephone || f.telephone; if (tel) r.phone = String(tel).slice(0, 40);
    if (f.departureStation || f.departureAirport || f.departureBoatTerminal) { const from = f.departureStation || f.departureAirport || f.departureBoatTerminal, to = f.arrivalStation || f.arrivalAirport || f.arrivalBoatTerminal; const fn = from && (from.name || from.iataCode), tn = to && (to.name || to.iataCode); if (fn && tn && !r.name) r.name = `${fn} to ${tn}`; }
    return r;
  }
  function coords(s) {
    const m = /@(-?\d+\.\d+),\s*(-?\d+\.\d+)/.exec(s) || /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/.exec(s) || /[?&](?:q|query|ll|center|daddr|destination|sll)=(-?\d+\.\d+)(?:,|%2C)\s*(-?\d+\.\d+)/i.exec(s);
    if (!m) return null; const lat = +m[1], lng = +m[2];
    return Math.abs(lat) <= 85 && Math.abs(lng) <= 180 && (lat || lng) ? { lat, lng } : null;
  }
  // dates and coordinates from a booking site's address (checkin=2026-11-05 and the like)
  function fromUrl(u) {
    const r = {}; let url; try { url = new URL(u); } catch (e) { return r; }
    const q = url.searchParams, get = (...ks) => { for (const k of ks) { const v = q.get(k); if (v) return v; } return ''; };
    const d = v => { let m = /^(20\d\d)-(\d\d)-(\d\d)/.exec(v); if (m) return `${m[1]}-${m[2]}-${m[3]}`; m = /^(\d{1,2})\/(\d{1,2})\/(20\d\d)$/.exec(v); return m ? `${m[3]}-${p2(m[1])}-${p2(m[2])}` : ''; };
    const s = d(get('checkin', 'check_in', 'checkIn', 'checkin_date', 'checkInDate', 'arrival', 'arrivalDate', 'chkin', 'startDate', 'start_date', 'date_from', 'date'));
    let e = d(get('checkout', 'check_out', 'checkOut', 'checkout_date', 'checkOutDate', 'departure', 'departureDate', 'chkout', 'endDate', 'end_date', 'date_to'));
    if (!s && q.get('checkin_year_month') && q.get('checkin_monthday')) { const ym = q.get('checkin_year_month'), dd = p2(q.get('checkin_monthday')); r.start = `${ym}-${dd}`; }
    if (s) r.start = s;
    const los = +get('los', 'nights', 'nflt_los'); if (!e && r.start && los > 0 && los < 60) { const x = new Date(dayMs(r.start)); x.setDate(x.getDate() + los); e = isoOf(x); }
    if (e) r.end = e;
    const c = coords(decodeURIComponent(url.href)); if (c) Object.assign(r, c);
    const pl = /\/maps\/place\/([^/@?]+)/.exec(url.pathname); if (pl) { const n = decodeURIComponent(pl[1].replace(/\+/g, ' ')).trim(); if (JP.test(n) && !/[a-z]{3}/i.test(n)) r.ja = n; else r.name = n; }
    return r;
  }
  const SITE_NAMES = /^(booking\.com|airbnb|agoda|expedia|hotels\.com|trip\.com|klook|kkday|google maps|tripadvisor|tabelog|jalan|rakuten travel|楽天トラベル|じゃらん|viator|getyourguide|hostelworld|instagram|facebook)$/i;
  // a place name from a page title: drop the site name and price chatter, split Japanese from English
  function title(t) {
    const r = {}; t = String(t || '').replace(/\s+/g, ' ').trim(); if (!t) return r;
    t = t.replace(/\((?:[^)]*?)(?:price|deal|review|updated|rates?|offers?|book|最新)[^)]*\)/gi, '').replace(/\b(?:updated\s+)?(?:20\d\d\s+)?(?:prices|deals|reviews)\b.*$/i, '').replace(/^(?:book|reserve)\s+/i, '').trim().replace(/[\s|–—\-·:,]+$/, '');
    const parts = t.split(/\s+[|–—\-·:]\s+|\s*[｜]\s*|\s*[【】]\s*/).map(s => s.trim()).filter(s => s && !SITE_NAMES.test(s) && !/^(official site|home|tickets?|booking confirmed|your booking|my bookings?|confirmation|reservation (?:complete|confirmed)|checkout|payment|公式サイト|公式|トップ|ログイン|マイページ|予約完了|予約確認|予約内容(?:の)?確認|ご予約.{0,8}|お申し?込み.{0,6}|完了|確認)$/i.test(s));
    if (!parts.length) return r;
    const en = parts.find(s => !JP.test(s)), ja = parts.find(s => JP.test(s) && !/[a-z]{4}/i.test(s));
    if (en) r.name = en.replace(/,\s*Japan$/i, '').slice(0, 80);
    if (ja) r.ja = ja.slice(0, 40);
    if (!r.name && !r.ja) r.name = parts[0].slice(0, 80);
    return r;
  }
  // merge in priority order: earlier sources win for each field
  function merge(...src) { const out = {}; for (const s of src) if (s) for (const [k, v] of Object.entries(s)) if (out[k] == null || out[k] === '') out[k] = v; return out; }
  function decode(text) { const m = /tabi:1:(\{[\s\S]*\})/.exec(String(text || '')); if (!m) return null; try { const o = JSON.parse(m[1]); return o && typeof o === 'object' ? o : null; } catch (e) { return null; } }
  /* A Google Maps list (a Saved list or one somebody shared): the list's id from a page or request address,
     and the places from Google's own list reply. Each place keeps its name, map location, address and note. */
  function listId(href) {
    let u = String(href || ''); try { u = decodeURIComponent(u); } catch (e) {}
    const m = /placelists\/list\/([\w-]{10,})/.exec(u) || /!11m\d+!2s([\w-]{10,})/.exec(u) || /entitylist\/getlist[^#]*?!1m\d+!1s([\w-]{10,})/.exec(u);
    return m ? m[1] : '';
  }
  function gmList(d) {
    const L = Array.isArray(d) && Array.isArray(d[0]) ? d[0] : [], items = Array.isArray(L[8]) ? L[8] : [], places = [];
    for (const it of items) {
      if (!Array.isArray(it)) continue;
      const p = Array.isArray(it[1]) ? it[1] : [], g = Array.isArray(p[5]) ? p[5].filter(v => typeof v === 'number') : [];
      const o = {}, a = typeof p[4] === 'string' && p[4].trim() ? p[4].trim() : typeof p[2] === 'string' ? p[2].trim() : '';
      if (g.length >= 2 && Math.abs(g[0]) <= 85 && Math.abs(g[1]) <= 180 && (g[0] || g[1])) { o.lat = +g[0].toFixed(6); o.lng = +g[1].toFixed(6); }
      o.n = (typeof it[2] === 'string' && it[2].trim() ? it[2].trim() : a ? a.split(',')[0] : o.lat != null ? 'Pinned place' : '').slice(0, 80);
      if (!o.n) continue;
      if (a) o.a = a.slice(0, 200);
      if (typeof it[3] === 'string' && it[3].trim()) o.note = it[3].trim().slice(0, 300);
      const c = Array.isArray(p[6]) ? p[6][1] : null;
      if (typeof c === 'string' && /^-?\d{1,20}$/.test(c)) { try { o.cid = BigInt.asUintN(64, BigInt(c)).toString(); } catch (e) {} }
      places.push(o);
    }
    return { list: typeof L[4] === 'string' ? L[4].trim().slice(0, 60) : '', places };
  }
  const encode = rec => rec.places ? `Add to Tabi: ${rec.places.length} places${rec.list ? ' from ' + rec.list : ''}\ntabi:1:${JSON.stringify(rec)}` : `Add to Tabi: ${rec.name || rec.ja || 'a place'}\ntabi:1:${JSON.stringify(rec)}`;
  return { fromLD, fromUrl, title, coords, merge, encode, decode, kindOfHost, JP, p2, num, isoOf, dayMs, listId, gmList };
})();

/* ---------- booking text reader (app only) ----------
   Reads an email, a confirmation page or a selection: dates, times, the total, the booking reference,
   phone and address. `loose` allows unlabelled guesses, for text the person chose to paste or select. */
const TP = (() => {
  const { JP, p2, num, isoOf, dayMs, kindOfHost } = TPB;
  const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  const okDate = (y, m, d) => m >= 1 && m <= 12 && d >= 1 && d <= 31;
  const MONTHS = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
  const MON_X = {}; [['gennaio', 'janvier', 'enero', 'janeiro', 'januar'], ['febbraio', 'février', 'febrero', 'fevereiro', 'februar'], ['marzo', 'mars', 'março', 'märz'], ['aprile', 'avril', 'abril'], ['maggio', 'mai', 'mayo', 'maio'], ['giugno', 'juin', 'junio', 'junho', 'juni'], ['luglio', 'juillet', 'julio', 'julho', 'juli'], ['agosto', 'août'], ['settembre', 'septembre', 'septiembre', 'setiembre', 'setembro'], ['ottobre', 'octobre', 'octubre', 'outubro', 'oktober'], ['novembre', 'noviembre', 'novembro'], ['dicembre', 'décembre', 'diciembre', 'dezembro', 'dezember']].forEach((l, i) => l.forEach(n => { MON_X[n] = i + 1; }));
  const DATE_RES = [
    [/(20\d\d)\s*[-/.年년]\s*(\d{1,2})\s*[-/.月월]\s*(\d{1,2})\s*[日일]?/g, m => [+m[1], +m[2], +m[3]]],
    [new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTHS}\\b\\.?,?(?:\\s+(20\\d\\d))?`, 'gi'), m => [m[3] ? +m[3] : 0, MON[m[2].slice(0, 3).toLowerCase()], +m[1]]],
    [new RegExp(`\\b${MONTHS}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b,?(?:\\s+(20\\d\\d))?`, 'gi'), m => [m[3] ? +m[3] : 0, MON[m[1].slice(0, 3).toLowerCase()], +m[2]]],
    [/(?<![\d年])(\d{1,2})\s*月\s*(\d{1,2})\s*日/g, m => [0, +m[1], +m[2]]],
    // 05/11/2026 and 05.11.2026: day first, as most of the world writes it; month first on a US trip
    [/(?<![\d/.-])(\d{1,2})[/.](\d{1,2})[/.](20\d\d)(?![\d/.-])/g, m => { const a = +m[1], b = +m[2], us = typeof TRIP_COUNTRY === 'function' && TRIP_COUNTRY() === 'US'; return (us && a <= 12) || b > 12 ? [+m[3], a, b] : [+m[3], b, a]; }, true],
    // 5 novembre 2026, 5 de noviembre de 2026, 5. November 2026: Italian, French, Spanish, Portuguese and German month names
    [new RegExp(`(?<![\\d.])(\\d{1,2})\\.?\\s+(?:de\\s+)?(${Object.keys(MON_X).join('|')})(?![a-zà-ÿ])\\.?,?(?:\\s+(?:de\\s+)?(20\\d\\d))?`, 'gi'), m => [m[3] ? +m[3] : 0, MON_X[m[2].toLowerCase()], +m[1]], true]
  ];
  // every date in the text, in order, with its position; yearless dates take the year nearest the reference day
  function dates(text, ref) {
    const hits = [];
    // the newer formats (marked true) are read on trips outside Japan only, so Japan bookings read exactly as before
    const jp = typeof TRIP_COUNTRY !== 'function' || TRIP_COUNTRY() === 'JP';
    for (const [re, f, extra] of DATE_RES) { if (extra && jp) continue; re.lastIndex = 0; let m; while ((m = re.exec(text))) { const [y, mo, d] = f(m); if (okDate(y || 2000, mo, d)) hits.push({ i: m.index, end: m.index + m[0].length, y, m: mo, d }); } }
    hits.sort((a, b) => a.i - b.i || b.end - a.end);
    const out = []; let last = -1;
    for (const h of hits) { if (h.i < last) continue; last = h.end; out.push(h); }
    const r = ref ? dayMs(ref) : Date.now(), ry = new Date(r).getFullYear();
    for (const h of out) {
      let y = h.y;
      if (!y) { let best = Infinity; for (const c of [ry - 1, ry, ry + 1]) { const dd = Math.abs(new Date(c, h.m - 1, h.d).getTime() - r); if (dd < best) { best = dd; y = c; } } }
      h.iso = `${y}-${p2(h.m)}-${p2(h.d)}`;
    }
    return out;
  }
  const TIME = /(?<![\d:])([01]?\d|2[0-3])[:：]([0-5]\d)(?!\d)\s*([ap]\.?m\.?)?/i;
  const to24 = m => { let h = +m[1]; const ap = (m[3] || '').toLowerCase(); if (ap.startsWith('p') && h < 12) h += 12; if (ap.startsWith('a') && h === 12) h = 0; return `${p2(h)}:${m[2]}`; };
  // first time within `span` characters after a label
  function timeAfter(text, label, span = 70, not = null) {
    const re = new RegExp(label, 'gi'); let m;
    while ((m = re.exec(text))) {
      const sl = text.slice(m.index + m[0].length, m.index + m[0].length + span);
      if (not !== null) {
        const by = new RegExp('(?:until|by|before|まで)\\s*' + TIME.source, 'i').exec(sl); if (by) return to24(by);
        const rg = new RegExp(TIME.source + '\\s*[-–~〜]\\s*' + TIME.source.replace(/\(/g, '(?:').replace(/\(\?:\?/g, '(?'), 'i').exec(sl); if (rg) { const t2 = new RegExp(TIME.source, 'gi'); const ts = [...rg[0].matchAll(t2)]; if (ts[1]) return to24(ts[1]); }
      }
      const all = [...sl.matchAll(new RegExp(TIME.source, 'gi'))].map(to24).filter(t => t !== not); if (all.length) return all[0];
    }
    return '';
  }
  function dateAfter(ds, text, label, span = 60) {
    const re = new RegExp(label, 'gi'); let m;
    while ((m = re.exec(text))) { const from = m.index + m[0].length; const d = ds.find(h => h.i >= from && h.i - from <= span); if (d) return d.iso; }
    return '';
  }
  // amounts in any currency Tabi knows. Yen and Australian dollars read exactly as they always have;
  // a bare $ is the trip's own dollar, else the home dollar. 1.234,50 € and €1,234.50 both read as 1234.5.
  const DOLLARS = ['AUD', 'USD', 'NZD', 'CAD', 'SGD'];
  const localCur = () => typeof COUNTRY === 'function' ? COUNTRY().cur : 'JPY';
  const homeCur = () => typeof S !== 'undefined' && S.settings && S.settings.home || 'AUD';
  const amt = s => { const t = String(s).replace(/[\s  ]/g, ''), m = /^(.*?)[.,](\d{1,2})$/.exec(t); return m ? +(m[1].replace(/[.,]/g, '') + '.' + m[2]) : +t.replace(/[.,]/g, ''); };
  const NUM = '(\\d{1,3}(?:[,.\\u00a0\\u202f ]\\d{3})+(?:[.,]\\d{1,2})?(?!\\d)|\\d+(?:[.,]\\d{1,2})?)';
  const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let AMT = null, AMT_KEY = '';
  function amountRes() {
    const key = localCur() + homeCur(); if (AMT && AMT_KEY === key) return AMT;
    const list = [
      [/(?:¥|￥|JPY)\s?(\d{1,3}(?:,\d{3})+|\d+)(?![\d.])/gi, 'JPY'],
      [/(\d{1,3}(?:,\d{3})+|\d{3,})\s?(?:円|JPY|yen)\b/gi, 'JPY'],
      [/(\d{1,3}(?:,\d{3})+|\d{3,})\s?円/g, 'JPY'],
      [/(?:A\$|AU\$|AUD)\s?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/gi, 'AUD'],
      [/(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\s?AUD\b/gi, 'AUD']
    ];
    if (typeof CUR === 'object') for (const [code, c] of Object.entries(CUR)) {
      if (code === 'JPY' || code === 'AUD') continue;
      for (const sym of c.re) {
        if (sym === '$') continue;
        const e = escRe(sym), word = /^[A-Za-z]/.test(sym) ? '(?<![A-Za-z])' : '', end = /[A-Za-z]$/.test(sym) ? '(?![A-Za-z])' : '';
        list.push([new RegExp(`${word}${e}\\s?${NUM}`, 'gi'), code], [new RegExp(`${NUM}\\s?${e}${end}`, 'gi'), code]);
      }
    }
    const bare = DOLLARS.includes(localCur()) ? localCur() : DOLLARS.includes(homeCur()) ? homeCur() : 'USD';
    list.push([/(?<![A-Za-z])\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/g, bare]);
    AMT_KEY = key; return (AMT = list);
  }
  function amounts(text) {
    const out = [];
    for (const [re, cur] of amountRes()) { re.lastIndex = 0; let m; while ((m = re.exec(text))) { const v = cur === 'JPY' || cur === 'AUD' ? num(m[1]) : amt(m[1]); if (v > 0 && !out.some(o => Math.abs(o.i - m.index) < 4)) out.push({ i: m.index, v, cur }); } }
    return out.sort((a, b) => a.i - b.i);
  }
  const TOTAL = '(?:grand total|total price|total cost|total amount|total|amount paid|you paid|you\'ll pay|charged|price|合計|お支払い金額|料金合計|支払金額|料金|totale|importo|gesamtbetrag|gesamtpreis|summe|montant|prix total|importe|precio total|preço total|σύνολο|합계|총 ?금액|결제 ?금액|總計|總金額|ยอดรวม|tổng cộng)';
  // the total: amounts just after a price or total label. Yen wins (that's what the property charges;
  // a dollar figure beside it is usually an estimate), and the biggest labelled amount is the total.
  function price(text, loose) {
    const all = amounts(text); if (!all.length) return null;
    const near = new Set(), re = new RegExp(TOTAL, 'gi'); let m;
    while ((m = re.exec(text))) { const from = m.index + m[0].length; all.forEach(x => { if (x.i >= from && x.i - from <= 90) near.add(x); }); }
    const fin = /(?:final price|grand total|total to pay|amount due|amount paid|you paid|you'll pay|お支払い金額|支払金額|totale da pagare|montant total|gesamtbetrag|importe total|결제 ?금액|총 ?결제)/gi; let f;
    while ((f = fin.exec(text))) { const from = f.index + f[0].length; const a = all.find(x => x.i >= from && x.i - from <= 40); if (a) return { price: a.v, cur: a.cur, total: true }; }
    let pool = [...near]; if (!pool.length) { if (!loose) return null; pool = all; }
    const yen = pool.filter(a => a.cur === localCur()); if (yen.length) pool = yen;
    const pick = pool.reduce((a, b) => (b.v > a.v ? b : a));
    return { price: pick.v, cur: pick.cur, total: true };
  }
  // GPS written out: N 034° 25.375, E 134° 3.326 (degrees and minutes), 34°25'22.5"N 134°03'19.6"E, or 34.42292, 134.05543
  function gps(text) {
    const D = '[°º˚]', inJp = (lat, lng) => Math.abs(lat) <= 85 && Math.abs(lng) <= 180 && (lat || lng) ? { lat: +lat.toFixed(6), lng: +lng.toFixed(6) } : null;
    const dm = (d, m, s) => +d + (+m || 0) / 60 + (+s || 0) / 3600;
    let m = new RegExp(`([NS])\\s*(\\d{1,3})\\s*${D}\\s*(\\d{1,2}(?:\\.\\d+)?)\\s*['′]?\\s*(?:(\\d{1,2}(?:\\.\\d+)?)\\s*["″])?[\\s,;/]*([EW])\\s*(\\d{1,3})\\s*${D}\\s*(\\d{1,2}(?:\\.\\d+)?)\\s*['′]?\\s*(?:(\\d{1,2}(?:\\.\\d+)?)\\s*["″])?`, 'i').exec(text);
    if (m) return inJp(dm(m[2], m[3], m[4]) * (/s/i.test(m[1]) ? -1 : 1), dm(m[6], m[7], m[8]) * (/w/i.test(m[5]) ? -1 : 1));
    m = new RegExp(`(\\d{1,3})\\s*${D}\\s*(\\d{1,2})\\s*['′]\\s*(\\d{1,2}(?:\\.\\d+)?)\\s*["″]?\\s*([NS])[\\s,;/]+(\\d{1,3})\\s*${D}\\s*(\\d{1,2})\\s*['′]\\s*(\\d{1,2}(?:\\.\\d+)?)\\s*["″]?\\s*([EW])`, 'i').exec(text);
    if (m) return inJp(dm(m[1], m[2], m[3]), dm(m[5], m[6], m[7]));
    m = /(?:gps|coordinates|lat(?:itude)?\s*[,/&]?\s*(?:lng|lon(?:gitude)?)|location)\s*[:：]?\s*(-?\d{1,2}\.\d{3,})\s*[,\s]\s*(-?\d{1,3}\.\d{3,})/i.exec(text);
    return m ? inJp(+m[1], +m[2]) : null;
  }
  const REF_RE = [
    /(?:booking|confirmation|reservation|order|itinerary|ticket|reference)\s*(?:number|no\.?|code|id|ref(?:erence)?)?\s*[:：#]\s*([A-Z0-9][A-Z0-9.\-]{2,28}[A-Z0-9])/gi,
    /(?:booking|confirmation|reservation|order|itinerary)\s+(?:number|no\.?|code|id|ref(?:erence)?)\s*[:：#]?\s*([A-Z0-9][A-Z0-9.\-]{2,28}[A-Z0-9])/gi,
    /(?:予約番号|確認番号|予約ID|予約コード|申込番号)\s*[:：]?\s*([A-Za-z0-9][A-Za-z0-9\-]{2,28})/g
  ];
  function ref(text) {
    for (const re of REF_RE) { re.lastIndex = 0; let m; while ((m = re.exec(text))) if (/\d/.test(m[1])) { const pin = /\bPIN(?:\s*code)?\s*[:：]?\s*(\d{3,8})\b/i.exec(text); return m[1] + (pin ? ' · PIN ' + pin[1] : ''); } }
    return '';
  }
  function phone(text) { const m = /(?:tel(?:ephone)?|phone(?:\s*number)?|call(?:\s+(?:host|hotel|property|us))?|contact(?:\s+(?:host|property))?|電話番号|電話)\.?\s*[:：]?\s*(\+?\d[\d\s()\-]{7,18}\d)/i.exec(text); return m ? m[1].replace(/\s+/g, ' ').trim() : ''; }
  const fold = s => String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const TOKYO = { chiyoda: '千代田区', chuo: '中央区', minato: '港区', shinjuku: '新宿区', bunkyo: '文京区', taito: '台東区', sumida: '墨田区', koto: '江東区', shinagawa: '品川区', meguro: '目黒区', ota: '大田区', setagaya: '世田谷区', shibuya: '渋谷区', nakano: '中野区', suginami: '杉並区', toshima: '豊島区', kita: '北区', arakawa: '荒川区', itabashi: '板橋区', nerima: '練馬区', adachi: '足立区', katsushika: '葛飾区', edogawa: '江戸川区' };
  function address(text) {
    const out = {};
    const re = /(?:^|\n)\s*(?:address|住所|所在地)\s*[:：]?\s*([^\n]{6,160})((?:\n[^\n]{3,120}){0,3})/gi; let m;
    const NEXT = /^\s*(?:phone|tel|gps|e-?mail|check|price|fax|website|電話|TEL)\b/i;
    while ((m = re.exec(text))) {
      let v = m[1].trim(); const more = m[2].split('\n').filter(Boolean); let jpLine = '';
      for (const l of more) {
        const t = l.trim(); if (!t || NEXT.test(t) || /[:：]/.test(t)) break;
        const jpAddr = JP.test(t) && /[都道府県市区町村]/.test(t) && /\d|番/.test(t);
        if (jpAddr && !JP.test(v)) { jpLine = t; continue; }
        if (/[,\-]$/.test(v) || /\b\d{3}-\d{4}\b|japan$/i.test(t)) v = v + (/-$/.test(v) ? '' : ' ') + t; else break;
      }
      const parts = v.split(/[,，、]/).map(p => p.trim()).filter(p => p && !/^(?:japan|日本)$/i.test(p) && !(typeof COUNTRY === 'function' && p.toLowerCase() === COUNTRY().name.toLowerCase()));
      const pc = (parts.find(p => /^〒?\s?\d{3}-\d{4}$/.test(p)) || '').replace(/^〒\s?/, '');
      const jp = parts.filter(p => JP.test(p)), en = parts.filter(p => !JP.test(p) && !/^〒?\s?\d{3}-\d{4}$/.test(p));
      if (en.length >= 2 && !out.address) out.address = parts.join(', ');
      const jaSrc = jpLine ? jpLine.split(/[,，、]/).map(p => p.trim()).filter(Boolean) : (en.length >= 2 ? jp : jp.length ? parts.filter(p => p !== pc) : []);
      if (jaSrc.length && !out.addressJa) {
        let ja = jaSrc.length > 1 && jaSrc.every(p => JP.test(p)) ? jaSrc.slice().reverse().join('') : jaSrc.join(' ');
        // Tokyo's wards are often written in English (Suginami City): put 東京都杉並区 in front for the driver
        const w = !/[都道府県区]/.test(ja) && en.map(p => TOKYO[fold(p).replace(/[\s-]*(?:ward|city|ku)$/, '')]).find(Boolean);
        if (w) ja = '東京都' + w + ja;
        out.addressJa = (pc ? '〒' + pc + ' ' : '') + ja;
      }
    }
    // an unlabelled address line: ends in Japan, or carries a Japanese postcode
    for (const l of text.split('\n')) { const v = l.trim(); if (v.length >= 12 && v.length <= 160 && !JP.test(v) && /,/.test(v) && (/,\s*Japan\.?$/i.test(v) || /\b\d{3}-\d{4}\b/.test(v) || (typeof COUNTRY === 'function' && TRIP_COUNTRY() !== 'JP' && new RegExp(',\\s*' + COUNTRY().name + '\\.?$', 'i').test(v))) && !/\b(?:check|total|paid|booking|confirmation)\b/i.test(v)) { if (!out.address) out.address = v.replace(/,\s*Japan\.?$/i, '').replace(typeof COUNTRY === 'function' ? new RegExp(',\\s*' + COUNTRY().name + '\\.?$', 'i') : /$^/, ''); break; } }
    if (!out.addressJa) { const j = /〒\s?\d{3}-?\d{4}\s*([^\n]{6,80})/.exec(text); if (j && JP.test(j[1])) out.addressJa = j[0].replace(/\s+/g, ' ').trim(); }
    if (out.addressJa && /[,，、]/.test(out.addressJa)) {
      const parts = out.addressJa.split(/[,，、]/).map(p => p.trim()).filter(p => p && !/^(?:japan|日本)$/i.test(p));
      const pc = parts.find(p => /^〒?\s?\d{3}-?\d{4}$/.test(p)), rest = parts.filter(p => p !== pc);
      if (rest.length >= 2 && rest.every(p => JP.test(p))) out.addressJa = (pc ? '〒' + pc.replace(/^〒\s?/, '') + ' ' : '') + rest.reverse().join('');
    }
    return out;
  }
  const KIND_WORDS = [
    ['stay', /\b(hotel|ryokan|hostel|guest ?house|inn|resort|minshuku|apartment|lodg\w*|check[\s-]?in|check[\s-]?out|nights?\b|room type|airbnb|booking\.com|agoda)|宿|旅館|ホテル|チェックイン/i],
    ['move', /\b(train|shinkansen|ferry|flight|airline|bus|coach|seat \w+|car \d|platform|departure|boarding|rail ?pass|jr )|新幹線|乗車|フェリー|航空/i],
    ['food', /\b(restaurant|izakaya|dinner|lunch|breakfast reservation|table for|omakase|course menu|tabelog|tablecheck|caf[eé])|レストラン|予約席|食事/i],
    ['see', /\b(ticket|admission|museum|gallery|exhibition|entry|tour|teamlab|garden|temple|shrine|klook|kkday|viator|getyourguide)|入場|美術館|チケット/i]
  ];
  function kindOf(text, host) {
    const hk = kindOfHost(host); if (hk) return hk;
    let best = '', score = 0;
    for (const [k, re] of KIND_WORDS) { const n = (String(text).match(new RegExp(re.source, 'gi')) || []).length; if (n > score) { score = n; best = k; } }
    return best;
  }
  function labelled(text) {
    const m = /(?:^|\n)\s*(?:property|hotel|accommodation|venue|restaurant|attraction|activity|event|宿泊施設|施設名|店名)\s*(?:name)?\s*[:：]\s*([^\n]{3,80})/i.exec(text);
    if (m) return m[1].trim();
    const lines = text.split('\n'), ai = lines.findIndex(l => /^\s*(?:address|住所)\s*[:：]/i.test(l));
    if (ai > 0) {
      const got = [];
      for (let k = ai - 1; k >= 0 && got.length < 3; k--) {
        const v = lines[k].trim();
        if (!v || /[:：]/.test(v) || /[\d¥$]/.test(v) || GEN_LABEL.test(v) || /^(?:mon|tues|wednes|thurs|fri|satur|sun)day$|^(?:january|february|march|april|may|june|july|august|september|october|november|december)$/i.test(v)) break;
        got.unshift(v);
      }
      const v = got.join(' ').trim(); if (/[a-z\u3040-\u9fff]{3}/i.test(v)) return v;
    }
    return '';
  }
  // "Takayama Ouan (高山桜庵 (共立 ))" → Takayama Ouan + 高山桜庵; "APB高円寺" keeps both scripts in the name
  function splitName(v) {
    v = v.replace(/\s+/g, ' ').trim(); const r = {};
    const p = v.indexOf('(');
    if (p > 2 && /[a-z]{3}/i.test(v.slice(0, p))) {
      r.name = v.slice(0, p).trim();
      const inner = v.slice(p + 1).split(/[()]/)[0].trim();
      if (JP.test(inner) && inner.replace(/\s/g, '').length >= 3) r.ja = inner;
    } else if (JP.test(v) && !/[a-z]{3}/i.test(v.replace(/[A-Z]{2,4}(?=[\u3040-\u9fff])/g, ''))) {
      if (/[A-Za-z]/.test(v)) r.name = v.replace(/([A-Za-z])(?=[\u3040-\u9fff])/g, '$1 ').replace(/([\u3040-\u9fff])(?=[A-Za-z])/g, '$1 '); else r.ja = v;
    } else r.name = v;
    if (r.name) r.name = tidyName(r.name.replace(/[(\s]+$/, ''));
    return r;
  }
  const GEN_LABEL = /^(?:check[\s-]?(?:in|out)|price|total|units|nights|guests?|your group|payment|booking|reservation|confirmation|details|summary|contact|phone|location|map)\b/i;
  // "Lemon tree hotel" reads better as "Lemon Tree Hotel"; names with their own capitals are left alone
  const tidyName = s => {
    s = s.replace(/\b[A-Z]{5,}\b/g, w => w[0] + w.slice(1).toLowerCase()); // CHISUN BUDGET → Chisun Budget; short ones like APB stay
    return /^[A-Z][a-z']+(?: [a-z']+){1,5}$/.test(s) ? s.split(' ').map((w, i) => i && /^(?:of|the|and|at|by|in|on|de|no)$/.test(w) ? w : w[0].toUpperCase() + w.slice(1)).join(' ') : s;
  };
  // booking text: an email, a confirmation page or a selection. `loose` allows unlabelled guesses.
  function fromText(text, { refDay, loose } = {}) {
    const r = {}; text = String(text || '').normalize('NFKC').replace(/\r/g, '').replace(/[ \t\u00a0]+/g, ' ').replace(/(\d)[‐‑‒–—―−－](?=\d)/g, '$1-');
    if (!text.trim()) return r;
    const ds = dates(text, refDay);
    r.kind = kindOf(text);
    const IN = '(?:check[\\s-]?in(?:\\s*date)?|arrival(?:\\s*date)?|arriving|チェックイン(?:日)?|到着日)', OUT = '(?:check[\\s-]?out(?:\\s*date)?|departure date|departing|チェックアウト(?:日)?)';
    let s = dateAfter(ds, text, IN), e = dateAfter(ds, text, OUT);
    if (!s) for (let i = 0; i + 1 < ds.length; i++) { const between = text.slice(ds[i].end, ds[i + 1].i); if (/^[\s,]*(?:[-–—~〜]|to|until|thru|through)[\s,]*(?:(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*\.?,?\s*)?(?:\([^)]{1,4}\)\s*)?$/i.test(between)) { s = ds[i].iso; e = e || ds[i + 1].iso; break; } }
    if (!s) s = dateAfter(ds, text, '(?:date|departure|departs?|visit(?:ing)?\\s*date|valid(?:\\s*on)?|admission|entry|reservation\\s*date|日時|日付|乗車日|利用日|来店日|入場日)');
    if (!s && loose && ds.length) s = ds[0].iso;
    if (s) r.start = s; if (e && (!s || e > s)) r.end = e;
    if (s && !r.end) { const a = ds.find(h => h.iso === s); const b = a && ds.find(h => h.i > a.i && h.i - a.end < 120 && h.iso > s); if (b && (r.kind === 'stay' || new RegExp(OUT, 'i').test(text))) r.end = b.iso; }
    r.checkin = timeAfter(text, IN + '(?:\\s*time)?'); r.checkout = timeAfter(text, OUT + '(?:\\s*time)?', 90, r.checkin || '');
    r.time = timeAfter(text, '(?:depart(?:s|ure)?(?:\\s*time)?|dep\\.|leaves?|boarding|start(?:s|ing)?(?:\\s*time)?|entry\\s*time|time\\s*slot|reservation\\s*time|発車|出発|開始|入場時間|来店時間)', 50);
    if (!r.time && loose) { const t = TIME.exec(text); if (t) r.time = to24(t); }
    Object.assign(r, price(text, loose) || {});
    r.conf = ref(text); r.phone = phone(text); Object.assign(r, address(text));
    const nm = labelled(text); if (nm) { Object.assign(r, splitName(nm)); r.nameFrom = 'label'; }
    // the room booked, and whether breakfast comes with it
    const rm = /(?:^|\n)([^\n:：]{4,70})\n\s*guest name\s*[:：]/i.exec(text); if (rm && !/[¥$]|\d{3}/.test(rm[1])) r.room = rm[1].trim();
    if (/breakfast (?:is )?included|includes breakfast|朝食付/i.test(text)) r.breakfast = true;
    const g = gps(text); if (g) Object.assign(r, g);
    // a journey written as A → B names a travel leg
    if (!nm) { const rt = /(?:^|[\s:：])((?:[^\s→⇒>\d:：]{2,20} ){0,2}[^\s→⇒>\d:：]{2,24})\s*(?:→|⇒|->|＞)\s*([^\s→⇒>\d]{2,24}(?:\s[^\s→⇒>\d]{2,12})?)/.exec(text); if (rt) { const v = `${rt[1]} → ${rt[2]}`; if (JP.test(v)) r.ja = v.slice(0, 40); else r.name = v.replace(' → ', ' to ').slice(0, 80); r.nameFrom = 'route'; if (!r.kind) r.kind = 'move'; } }
    r.dates = ds.map(h => h.iso).filter((v, i, a) => a.indexOf(v) === i).slice(0, 12);
    for (const k of Object.keys(r)) if (r[k] === '' || r[k] == null) delete r[k];
    return r;
  }
  // which booking site a document came from, when it says so
  const SITES = [[/airbnb/i, 'Airbnb'], [/booking\.com/i, 'Booking.com'], [/agoda/i, 'Agoda'], [/expedia/i, 'Expedia'], [/hotels\.com/i, 'Hotels.com'], [/trip\.com/i, 'Trip.com'], [/klook/i, 'Klook'], [/kkday/i, 'KKday'], [/jalan|じゃらん/i, 'Jalan'], [/rakuten|楽天/i, 'Rakuten Travel'], [/hostelworld/i, 'Hostelworld'], [/smart\s?ex|スマートEX/i, 'smart EX'], [/japan rail pass|jrpass/i, 'JR Pass']];
  function siteOf(text) { for (const [re, n] of SITES) if (re.test(text)) return n; if (/hosted by/i.test(text) && /confirmation code/i.test(text)) return 'Airbnb'; return ''; }
  // a place name from a document heading: drop tags like [Limited to one group], prefer a quoted name, keep the island or town
  const GENERIC = /^(?:booking|reservation|order|trip|stay)?\s*(?:confirmation|confirmed|details|summary|receipt|invoice|itinerary|voucher|e-?ticket|ticket|your (?:booking|reservation|trip|stay)|thank you.*|予約確認書?|予約完了|領収書|お支払い明細|乗車票)$/i;
  function docName(t) {
    const r = {}; t = String(t || '').replace(/\s+/g, ' ').trim();
    while (/^\s*(?:\[[^\]]{1,40}\]|【[^】]{1,40}】|〔[^〕]{1,40}〕)\s*/.test(t)) t = t.replace(/^\s*(?:\[[^\]]{1,40}\]|【[^】]{1,40}】|〔[^〕]{1,40}〕)\s*/, '');
    if (!t || GENERIC.test(t)) return r;
    const q = /["“「『]([^"”」』]{2,40}?)[,.、]?["”」』]/.exec(t);
    let name = q ? q[1].replace(/[,.、\s]+$/, '').trim() : t.split(/\s+[|–—-]\s+|\s*｜\s*/)[0].trim();
    if (q) { const at = /\b(?:on|in|at|near)\s+((?:[A-Z][\w'’-]+\s?){1,3})\s*$/.exec(t.replace(/[.!]+$/, '')); if (at) name += ', ' + at[1].trim(); }
    if (JP.test(name) && !/[a-z]{3}/i.test(name)) r.ja = name.slice(0, 40); else r.name = tidyName(name.slice(0, 80));
    return r;
  }
  // a booking number in the file name, like Booking_6738358498.pdf
  function fileRef(name) { const m = /(?:booking|confirmation|reservation|itinerary|order)[\s_#-]*(?:no\.?|number)?[\s_#-]*([A-Z0-9]{6,20})\b/i.exec(String(name || '').replace(/\.pdf$/i, '')); return m && /\d/.test(m[1]) ? m[1] : ''; }
  return Object.assign({}, TPB, { dates, fromText, kindOf, siteOf, docName, fileRef, gps, GENERIC });
})();

/* ---------- countries ----------
   Each trip is set in one country. The country decides the local currency, the language for place names,
   addresses and phrases, the font for that script, what the visited-places book is called and how it looks,
   and where the map starts. Japan is the original and stays exactly as it was. */

// currencies: how to write them, and how they appear in booking text
const CUR = {
  JPY: { name: 'Yen', pre: '¥', dec: 0, re: ['¥', '￥', 'JPY', '円', 'yen'] },
  KRW: { name: 'Won', pre: '₩', dec: 0, re: ['₩', 'KRW', '원'] },
  TWD: { name: 'NT dollars', pre: 'NT$', dec: 0, re: ['NT$', 'NTD', 'TWD', '元'] },
  THB: { name: 'Baht', pre: '฿', dec: 0, re: ['฿', 'THB', 'baht', 'บาท'] },
  VND: { name: 'Dong', pre: '₫', dec: 0, re: ['₫', 'VND', 'đ'] },
  IDR: { name: 'Rupiah', pre: 'Rp ', dec: 0, re: ['Rp', 'IDR'] },
  EUR: { name: 'Euro', pre: '€', dec: 2, re: ['€', 'EUR'] },
  GBP: { name: 'Pounds', pre: '£', dec: 2, re: ['£', 'GBP'] },
  USD: { name: 'US dollars', pre: 'US$', dec: 2, re: ['US$', 'USD', '$'] },
  NZD: { name: 'NZ dollars', pre: 'NZ$', dec: 2, re: ['NZ$', 'NZD', '$'] },
  AUD: { name: 'Australian dollars', pre: 'A$', dec: 2, re: ['A$', 'AU$', 'AUD', '$'] },
  CAD: { name: 'Canadian dollars', pre: 'C$', dec: 2, re: ['C$', 'CAD', '$'] },
  SGD: { name: 'Singapore dollars', pre: 'S$', dec: 2, re: ['S$', 'SGD', '$'] }
};
// where the travellers come from: the currency they think in
const HOMES = ['AUD', 'NZD', 'USD', 'GBP', 'EUR', 'CAD', 'SGD'];

// the visited-places book: East Asia keeps ink stamps at stations and sights, Europe and Southeast Asia send
// postcards, and national parks in the US and New Zealand sell embroidered patches
const BOOKS = {
  stamps: { title: 'Stamps', one: 'stamp', done: 'Stamped', count: 'stamped' },
  postcards: { title: 'Postcards', one: 'postcard', done: 'Postcard kept', count: 'postcards' },
  patches: { title: 'Patches', one: 'patch', done: 'Patch earned', count: 'patches' }
};

const BASIC = (hello, thanks, sorry, noSpeak) => ['Basics', [hello, thanks, sorry, noSpeak]];
const COUNTRIES = {
  JP: {
    name: 'Japan', cur: 'JPY', lang: 'ja', langName: 'Japanese', font: 'Noto Sans JP', book: 'stamps', bbox: [129.4, 31.0, 145.9, 45.5],
    sample: { local: '直島', addr: '香川県香川郡直島町琴弾地', price: '27660', title: 'Japan 2026' },
    bookNote: 'Stations in Japan keep an ink stamp for travellers to collect.',
    driver: ['Please take us here', 'この住所までお願いします'],
    phrases: [
      BASIC(['Hello', 'こんにちは', 'konnichiwa'], ['Thank you very much', 'ありがとうございます', 'arigatō gozaimasu'], ['Excuse me, sorry', 'すみません', 'sumimasen'], ["I don't understand Japanese", '日本語がわかりません', 'nihongo ga wakarimasen']),
      ['Getting around', [['Where is the station?', '駅はどこですか？', 'eki wa doko desu ka?'], ['Please take me to this address', 'この住所までお願いします', 'kono jūsho made onegai shimasu'], ['Does this train stop at this station?', 'この電車はこの駅に止まりますか？', 'kono densha wa kono eki ni tomarimasu ka?'], ['Two adults, please', '大人二人お願いします', 'otona futari onegai shimasu']]],
      ['Eating', [['A table for two, please', '二人です', 'futari desu'], ['This one, please', 'これをください', 'kore o kudasai'], ['The bill, please', 'お会計お願いします', 'okaikei onegai shimasu'], ['Can I pay by card?', 'カードで払えますか？', 'kādo de haraemasu ka?'], ['That was delicious, thank you', 'ごちそうさまでした', 'gochisōsama deshita']]],
      ['Staying', [['We have a reservation', '予約しています', 'yoyaku shite imasu'], ['Could you keep our luggage?', '荷物を預かってもらえますか？', 'nimotsu o azukatte moraemasu ka?'], ['What time is check-out?', 'チェックアウトは何時ですか？', 'chekkuauto wa nanji desu ka?']]],
      ['Craft and art', [['Is it OK to sketch here?', 'ここでスケッチしてもいいですか？', 'koko de suketchi shite mo ii desu ka?'], ['Is there a yarn shop nearby?', 'この近くに毛糸屋さんはありますか？', 'kono chikaku ni keitoya-san wa arimasu ka?'], ['May I take a photo?', '写真を撮ってもいいですか？', 'shashin o totte mo ii desu ka?'], ['Is this handmade?', 'これは手作りですか？', 'kore wa tezukuri desu ka?']]]
    ]
  },
  KR: {
    name: 'South Korea', cur: 'KRW', lang: 'ko', langName: 'Korean', font: 'Noto Sans KR', book: 'stamps', bbox: [124.6, 33.1, 131.0, 38.6],
    sample: { local: '경복궁', addr: '서울특별시 종로구 사직로 161', price: '120000', title: 'Korea 2027' },
    bookNote: "Korea's stamp tours leave an ink stamp at sights, markets and stations for travellers to collect.",
    driver: ['Please take us here', '이 주소로 가 주세요'],
    phrases: [
      BASIC(['Hello', '안녕하세요', 'annyeonghaseyo'], ['Thank you', '감사합니다', 'gamsahamnida'], ['Excuse me (to get attention)', '저기요', 'jeogiyo'], ["I don't speak Korean", '한국어를 못해요', 'hangugeoreul mothaeyo']),
      ['Getting around', [['Where is the station?', '역이 어디예요?', 'yeogi eodiyeyo?'], ['Please take me to this address', '이 주소로 가 주세요', 'i jusoro ga juseyo'], ['Two adults, please', '어른 두 명이요', 'eoreun du myeongiyo'], ['How much is it?', '얼마예요?', 'eolmayeyo?']]],
      ['Eating', [['A table for two, please', '두 명이요', 'du myeongiyo'], ['This one, please', '이거 주세요', 'igeo juseyo'], ['The bill, please', '계산해 주세요', 'gyesanhae juseyo'], ['Can I pay by card?', '카드 돼요?', 'kadeu dwaeyo?'], ['That was delicious, thank you', '잘 먹었습니다', 'jal meogeotseumnida']]],
      ['Staying', [['We have a reservation', '예약했어요', 'yeyakhaesseoyo'], ['Could you keep our luggage?', '짐 좀 맡아 주시겠어요?', 'jim jom mata jusigesseoyo?'], ['What time is check-out?', '체크아웃은 몇 시예요?', 'chekeuauseun myeot siyeyo?']]]
    ]
  },
  TW: {
    name: 'Taiwan', cur: 'TWD', lang: 'zh-Hant', langName: 'Chinese', font: 'Noto Sans TC', book: 'stamps', bbox: [119.3, 21.8, 122.1, 25.4],
    sample: { local: '九份', addr: '新北市瑞芳區基山街', price: '3200', title: 'Taiwan 2027' },
    bookNote: 'Stations and sights across Taiwan keep commemorative stamps for travellers to collect.',
    driver: ['Please take us here', '請帶我到這個地址'],
    phrases: [
      BASIC(['Hello', '你好', 'nǐ hǎo'], ['Thank you', '謝謝', 'xièxie'], ['Excuse me, sorry', '不好意思', 'bù hǎo yìsi'], ["I don't speak Chinese", '我不會說中文', 'wǒ bú huì shuō zhōngwén']),
      ['Getting around', [['Where is the station?', '車站在哪裡？', 'chēzhàn zài nǎlǐ?'], ['Please take me to this address', '請帶我到這個地址', 'qǐng dài wǒ dào zhège dìzhǐ'], ['Two tickets, please', '兩張票，謝謝', 'liǎng zhāng piào, xièxie'], ['How much is it?', '多少錢？', 'duōshǎo qián?']]],
      ['Eating', [['A table for two, please', '兩位', 'liǎng wèi'], ['This one, please', '我要這個', 'wǒ yào zhège'], ['The bill, please', '請幫我結帳', 'qǐng bāng wǒ jiézhàng'], ['Can I pay by card?', '可以刷卡嗎？', 'kěyǐ shuākǎ ma?'], ['Delicious!', '很好吃', 'hěn hǎochī']]],
      ['Staying', [['We have a reservation', '我們有訂房', 'wǒmen yǒu dìngfáng'], ['Could you keep our luggage?', '可以寄放行李嗎？', 'kěyǐ jìfàng xínglǐ ma?'], ['What time is check-out?', '幾點退房？', 'jǐ diǎn tuìfáng?']]]
    ]
  },
  TH: {
    name: 'Thailand', cur: 'THB', lang: 'th', langName: 'Thai', font: 'Noto Sans Thai', book: 'postcards', bbox: [97.3, 5.6, 105.7, 20.5],
    sample: { local: 'วัดอรุณ', addr: 'ถนนอรุณอมรินทร์ บางกอกใหญ่ กรุงเทพฯ', price: '2400', title: 'Thailand 2027' },
    bookNote: 'Every place you visit becomes a postcard in this stack.',
    driver: ['Please take us here', 'ช่วยไปที่อยู่นี้ด้วย'],
    phrases: [
      BASIC(['Hello (men say khrap, women kha)', 'สวัสดีครับ/ค่ะ', 'sawatdee khrap / kha'], ['Thank you', 'ขอบคุณครับ/ค่ะ', 'khop khun khrap / kha'], ['Excuse me, sorry', 'ขอโทษครับ/ค่ะ', 'kho thot khrap / kha'], ["I can't speak Thai", 'พูดภาษาไทยไม่ได้', 'phut phasa thai mai dai']),
      ['Getting around', [['Where is the station?', 'สถานีอยู่ที่ไหน', 'sathani yu thi nai?'], ['Please take me to this address', 'ช่วยไปที่อยู่นี้ด้วย', 'chuai pai thi yu ni duai'], ['Two tickets, please', 'ขอตั๋วสองใบ', 'kho tua song bai'], ['How much is it?', 'เท่าไหร่', 'thao rai?']]],
      ['Eating', [['A table for two, please', 'สองคน', 'song khon'], ['This one, please', 'เอาอันนี้', 'ao an ni'], ['Not spicy, please', 'ไม่เผ็ด', 'mai phet'], ['The bill, please', 'เช็คบิลด้วย', 'chek bin duai'], ['Can I pay by card?', 'จ่ายบัตรได้ไหม', 'jai bat dai mai?'], ['Delicious!', 'อร่อยมาก', 'aroi mak']]],
      ['Staying', [['We have a reservation', 'จองไว้แล้ว', 'jong wai laeo'], ['Could you keep our luggage?', 'ฝากกระเป๋าได้ไหม', 'fak krapao dai mai?'], ['What time is check-out?', 'เช็คเอาท์กี่โมง', 'chek ao ki mong?']]]
    ]
  },
  VN: {
    name: 'Vietnam', cur: 'VND', lang: 'vi', langName: 'Vietnamese', font: '', book: 'postcards', bbox: [102.1, 8.4, 109.5, 23.4],
    sample: { local: 'Phố cổ Hội An', addr: 'Trần Phú, Minh An, Hội An', price: '1200000', title: 'Vietnam 2027' },
    bookNote: 'Every place you visit becomes a postcard in this stack.',
    driver: ['Please take us here', 'Làm ơn đưa tôi đến địa chỉ này'],
    phrases: [
      BASIC(['Hello', 'Xin chào', 'sin chow'], ['Thank you', 'Cảm ơn', 'gahm uhn'], ['Excuse me, sorry', 'Xin lỗi', 'sin loy'], ["I don't speak Vietnamese", 'Tôi không nói được tiếng Việt', 'toy khom noy duoc tieng viet']),
      ['Getting around', [['Where is the station?', 'Ga ở đâu?', 'gah uh dow?'], ['Please take me to this address', 'Làm ơn đưa tôi đến địa chỉ này', 'lahm uhn doo-uh toy den dee-uh chee nay'], ['Two tickets, please', 'Cho tôi hai vé', 'chaw toy hai veh'], ['How much is it?', 'Bao nhiêu tiền?', 'bow nyew tien?']]],
      ['Eating', [['A table for two, please', 'Bàn cho hai người', 'bahn chaw hai ngoo-oi'], ['This one, please', 'Cho tôi cái này', 'chaw toy kai nay'], ['The bill, please', 'Tính tiền', 'tin tien'], ['Can I pay by card?', 'Tôi trả bằng thẻ được không?', 'toy cha bang teh duoc khom?'], ['Delicious!', 'Ngon quá', 'ngon kwah']]],
      ['Staying', [['We have a reservation', 'Chúng tôi đã đặt phòng', 'choong toy dah dat fong'], ['Could you keep our luggage?', 'Gửi hành lý được không?', 'goo-ee hahn lee duoc khom?'], ['What time is check-out?', 'Mấy giờ trả phòng?', 'may zuh cha fong?']]]
    ]
  },
  ID: {
    name: 'Indonesia', cur: 'IDR', lang: 'id', langName: 'Indonesian', font: '', book: 'postcards', bbox: [95.0, -11.0, 141.0, 6.1],
    sample: { local: 'Pura Tanah Lot', addr: 'Jl. Raya Tanah Lot, Tabanan, Bali', price: '1500000', title: 'Bali 2027' },
    bookNote: 'Every place you visit becomes a postcard in this stack.',
    driver: ['Please take us here', 'Tolong antar saya ke alamat ini'],
    phrases: [
      BASIC(['Hello', 'Halo', 'HAH-loh'], ['Thank you', 'Terima kasih', 'tuh-REE-mah KAH-see'], ['Excuse me', 'Permisi', 'per-MEE-see'], ["I don't speak Indonesian", 'Saya tidak bisa bahasa Indonesia', 'SAH-yah TEE-dahk BEE-sah bah-HAH-sah']),
      ['Getting around', [['Where is the station?', 'Stasiun di mana?', 'STAH-see-oon dee MAH-nah?'], ['Please take me to this address', 'Tolong antar saya ke alamat ini', 'TOH-long AHN-tar SAH-yah kuh ah-LAH-mat EE-nee'], ['Two tickets, please', 'Dua tiket, ya', 'DOO-ah TEE-ket, yah'], ['How much is it?', 'Berapa harganya?', 'buh-RAH-pah har-GAH-nyah?']]],
      ['Eating', [['A table for two, please', 'Meja untuk dua orang', 'MEH-jah OON-took DOO-ah OH-rahng'], ['This one, please', 'Yang ini, ya', 'yahng EE-nee, yah'], ['Not spicy, please', 'Tidak pedas', 'TEE-dahk puh-DAHS'], ['The bill, please', 'Minta bon, ya', 'MIN-tah bon, yah'], ['Can I pay by card?', 'Bisa bayar pakai kartu?', 'BEE-sah BAH-yar PAH-kai KAR-too?'], ['Delicious!', 'Enak sekali', 'EH-nahk suh-KAH-lee']]],
      ['Staying', [['We have a reservation', 'Kami sudah reservasi', 'KAH-mee SOO-dah reh-ser-VAH-see'], ['Could you keep our luggage?', 'Bisa titip tas?', 'BEE-sah TEE-tip tahs?'], ['What time is check-out?', 'Check-out jam berapa?', 'check-out jahm buh-RAH-pah?']]]
    ]
  },
  IT: {
    name: 'Italy', cur: 'EUR', lang: 'it', langName: 'Italian', font: '', book: 'postcards', bbox: [6.6, 36.6, 18.5, 47.1],
    sample: { local: 'Ponte Vecchio', addr: 'Ponte Vecchio, 50125 Firenze FI', price: '180', title: 'Italy 2027' },
    bookNote: 'Every place you visit becomes a postcard in this stack.',
    driver: ['Please take us here', 'Mi porti a questo indirizzo, per favore'],
    phrases: [
      BASIC(['Hello, good morning', 'Buongiorno', 'bwon-JOR-noh'], ['Thank you', 'Grazie', 'GRAHT-see-eh'], ['Excuse me, sorry', 'Scusi', 'SKOO-zee'], ["I don't speak Italian", 'Non parlo italiano', 'non PAR-loh ee-tah-lee-AH-noh']),
      ['Getting around', [['Where is the station?', "Dov'è la stazione?", 'doh-VEH lah staht-see-OH-neh?'], ['Please take me to this address', 'Mi porti a questo indirizzo, per favore', 'mee POR-tee ah KWEH-stoh een-dee-REET-soh, pehr fah-VOH-reh'], ['Two tickets, please', 'Due biglietti, per favore', 'DOO-eh beel-YET-tee, pehr fah-VOH-reh'], ['How much is it?', 'Quanto costa?', 'KWAN-toh KOH-stah?']]],
      ['Eating', [['A table for two, please', 'Un tavolo per due, per favore', 'oon TAH-voh-loh pehr DOO-eh'], ['This one, please', 'Questo, per favore', 'KWEH-stoh, pehr fah-VOH-reh'], ['The bill, please', 'Il conto, per favore', 'eel KON-toh, pehr fah-VOH-reh'], ['Can I pay by card?', 'Posso pagare con la carta?', 'POS-soh pah-GAH-reh kon lah KAR-tah?'], ['Delicious!', 'Buonissimo!', 'bwoh-NEES-see-moh']]],
      ['Staying', [['We have a reservation', 'Abbiamo una prenotazione', 'ab-BYAH-moh OO-nah preh-noh-taht-see-OH-neh'], ['Could you keep our luggage?', 'Possiamo lasciare i bagagli?', 'pos-SYAH-moh lah-SHAH-reh ee bah-GAHL-yee?'], ['What time is check-out?', "A che ora è il check-out?", 'ah keh OH-rah eh eel check-out?']]]
    ]
  },
  FR: {
    name: 'France', cur: 'EUR', lang: 'fr', langName: 'French', font: '', book: 'postcards', bbox: [-5.2, 41.3, 9.6, 51.1],
    sample: { local: 'Musée d’Orsay', addr: "1 Rue de la Légion d'Honneur, 75007 Paris", price: '160', title: 'France 2027' },
    bookNote: 'Every place you visit becomes a postcard in this stack.',
    driver: ['Please take us here', "À cette adresse, s'il vous plaît"],
    phrases: [
      BASIC(['Hello', 'Bonjour', 'bon-ZHOOR'], ['Thank you very much', 'Merci beaucoup', 'mair-SEE boh-KOO'], ['Excuse me, sorry', 'Excusez-moi', 'ex-koo-zay MWAH'], ["I don't speak French", 'Je ne parle pas français', 'zhuh nuh parl pah frahn-SAY']),
      ['Getting around', [['Where is the station?', 'Où est la gare ?', 'oo ay lah GAR?'], ['Please take me to this address', "À cette adresse, s'il vous plaît", 'ah set ah-DRESS, seel voo PLAY'], ['Two tickets, please', "Deux billets, s'il vous plaît", 'duh bee-YAY, seel voo PLAY'], ['How much is it?', "C'est combien ?", 'say kom-BYAN?']]],
      ['Eating', [['A table for two, please', "Une table pour deux, s'il vous plaît", 'oon TAH-bluh poor DUH'], ['This one, please', "Celui-ci, s'il vous plaît", 'suh-lwee-SEE, seel voo PLAY'], ['The bill, please', "L'addition, s'il vous plaît", 'lah-dee-SYON, seel voo PLAY'], ['Can I pay by card?', 'Je peux payer par carte ?', 'zhuh puh pay-YAY par KART?'], ['That was delicious', "C'était délicieux", 'say-tay day-lee-SYUH']]],
      ['Staying', [['We have a reservation', 'Nous avons une réservation', 'noo zah-VON oon ray-zair-vah-SYON'], ['Could you keep our luggage?', 'Pouvez-vous garder nos bagages ?', 'poo-vay VOO gar-DAY noh bah-GAZH?'], ['What time is check-out?', 'À quelle heure faut-il libérer la chambre ?', 'ah kel UR foh-TEEL lee-bay-RAY lah SHAHM-bruh?']]]
    ]
  },
  ES: {
    name: 'Spain', cur: 'EUR', lang: 'es', langName: 'Spanish', font: '', book: 'postcards', bbox: [-9.4, 36.0, 3.4, 43.8],
    sample: { local: 'Sagrada Família', addr: 'Carrer de Mallorca, 401, 08013 Barcelona', price: '150', title: 'Spain 2027' },
    bookNote: 'Every place you visit becomes a postcard in this stack.',
    driver: ['Please take us here', 'A esta dirección, por favor'],
    phrases: [
      BASIC(['Hello', 'Hola', 'OH-lah'], ['Thank you very much', 'Muchas gracias', 'MOO-chas GRAH-thyahs'], ['Excuse me, sorry', 'Perdón', 'pehr-DON'], ["I don't speak Spanish", 'No hablo español', 'noh AH-bloh es-pahn-YOL']),
      ['Getting around', [['Where is the station?', '¿Dónde está la estación?', 'DON-deh es-TAH lah es-tah-THYON?'], ['Please take me to this address', 'A esta dirección, por favor', 'ah ES-tah dee-rek-THYON, por fah-VOR'], ['Two tickets, please', 'Dos billetes, por favor', 'dos bee-YEH-tes, por fah-VOR'], ['How much is it?', '¿Cuánto cuesta?', 'KWAN-toh KWES-tah?']]],
      ['Eating', [['A table for two, please', 'Una mesa para dos, por favor', 'OO-nah MEH-sah PAH-rah dos'], ['This one, please', 'Este, por favor', 'ES-teh, por fah-VOR'], ['The bill, please', 'La cuenta, por favor', 'lah KWEN-tah, por fah-VOR'], ['Can I pay by card?', '¿Puedo pagar con tarjeta?', 'PWEH-doh pah-GAR kon tar-HEH-tah?'], ['Delicious!', '¡Muy rico!', 'mwee REE-koh']]],
      ['Staying', [['We have a reservation', 'Tenemos una reserva', 'teh-NEH-mos OO-nah reh-SER-vah'], ['Could you keep our luggage?', '¿Nos puede guardar el equipaje?', 'nos PWEH-deh gwar-DAR el eh-kee-PAH-heh?'], ['What time is check-out?', '¿A qué hora hay que dejar la habitación?', 'ah keh OH-rah ai keh deh-HAR lah ah-bee-tah-THYON?']]]
    ]
  },
  PT: {
    name: 'Portugal', cur: 'EUR', lang: 'pt', langName: 'Portuguese', font: '', book: 'postcards', bbox: [-9.6, 36.9, -6.1, 42.2],
    sample: { local: 'Torre de Belém', addr: 'Av. Brasília, 1400-038 Lisboa', price: '130', title: 'Portugal 2027' },
    bookNote: 'Every place you visit becomes a postcard in this stack.',
    driver: ['Please take us here', 'Para esta morada, por favor'],
    phrases: [
      BASIC(['Hello', 'Olá', 'oh-LAH'], ['Thank you (said by a man / a woman)', 'Obrigado / Obrigada', 'oh-bree-GAH-doo / oh-bree-GAH-dah'], ['Excuse me, sorry', 'Desculpe', 'desh-KOOLP'], ["I don't speak Portuguese", 'Não falo português', 'nown FAH-loo poor-too-GAYSH']),
      ['Getting around', [['Where is the station?', 'Onde é a estação?', 'OND eh ah shtah-SOWN?'], ['Please take me to this address', 'Para esta morada, por favor', 'PAH-rah ESH-tah moo-RAH-dah, poor fah-VOR'], ['Two tickets, please', 'Dois bilhetes, por favor', 'doysh beel-YETSH, poor fah-VOR'], ['How much is it?', 'Quanto custa?', 'KWAN-too KOOSH-tah?']]],
      ['Eating', [['A table for two, please', 'Uma mesa para dois, por favor', 'OO-mah MAY-zah PAH-rah doysh'], ['This one, please', 'Este, por favor', 'ESHT, poor fah-VOR'], ['The bill, please', 'A conta, por favor', 'ah KON-tah, poor fah-VOR'], ['Can I pay by card?', 'Posso pagar com cartão?', 'POS-soo pah-GAR kom kar-TOWN?'], ['That was delicious', 'Estava delicioso', 'shtah-vah deh-lee-see-OH-zoo']]],
      ['Staying', [['We have a reservation', 'Temos uma reserva', 'TAY-moosh OO-mah reh-ZER-vah'], ['Could you keep our luggage?', 'Pode guardar a nossa bagagem?', 'POD gwar-DAR ah NOS-sah bah-GAH-zhaym?'], ['What time is check-out?', 'A que horas é o check-out?', 'ah kee OR-ash eh oo check-out?']]]
    ]
  },
  GR: {
    name: 'Greece', cur: 'EUR', lang: 'el', langName: 'Greek', font: 'Noto Sans', book: 'postcards', bbox: [19.3, 34.8, 29.7, 41.8],
    sample: { local: 'Οία', addr: 'Οία 847 02, Σαντορίνη', price: '220', title: 'Greece 2027' },
    bookNote: 'Every place you visit becomes a postcard in this stack.',
    driver: ['Please take us here', 'Σε αυτή τη διεύθυνση, παρακαλώ'],
    phrases: [
      BASIC(['Hello', 'Γεια σας', 'YAH sas'], ['Thank you very much', 'Ευχαριστώ πολύ', 'ef-ha-ree-STO po-LEE'], ['Excuse me, sorry', 'Συγγνώμη', 'seeg-NO-mee'], ["I don't speak Greek", 'Δεν μιλάω ελληνικά', 'then mee-LAO e-lee-nee-KA']),
      ['Getting around', [['Where is the port?', 'Πού είναι το λιμάνι;', 'poo EE-ne to lee-MA-nee?'], ['Please take me to this address', 'Σε αυτή τη διεύθυνση, παρακαλώ', 'se af-TEE tee thee-EF-theen-see, pa-ra-ka-LO'], ['Two tickets, please', 'Δύο εισιτήρια, παρακαλώ', 'THEE-o ee-see-TEE-ree-a, pa-ra-ka-LO'], ['How much is it?', 'Πόσο κάνει;', 'PO-so KA-nee?']]],
      ['Eating', [['A table for two, please', 'Ένα τραπέζι για δύο, παρακαλώ', 'E-na tra-PE-zee ya THEE-o'], ['This one, please', 'Αυτό, παρακαλώ', 'af-TO, pa-ra-ka-LO'], ['The bill, please', 'Τον λογαριασμό, παρακαλώ', 'ton lo-gar-ya-ZMO, pa-ra-ka-LO'], ['Can I pay by card?', 'Μπορώ να πληρώσω με κάρτα;', 'bo-RO na plee-RO-so me KAR-ta?'], ['Delicious!', 'Πολύ νόστιμο!', 'po-LEE NO-stee-mo']]],
      ['Staying', [['We have a reservation', 'Έχουμε κράτηση', 'E-hoo-me KRA-tee-see'], ['Could you keep our luggage?', 'Μπορείτε να κρατήσετε τις βαλίτσες μας;', 'bo-REE-te na kra-TEE-se-te tees va-LEE-tses mas?'], ['What time is check-out?', 'Τι ώρα είναι το check-out;', 'tee O-ra EE-ne to check-out?']]]
    ]
  },
  DE: {
    name: 'Germany', cur: 'EUR', lang: 'de', langName: 'German', font: '', book: 'postcards', bbox: [5.9, 47.3, 15.0, 55.1],
    sample: { local: 'Schloss Neuschwanstein', addr: 'Neuschwansteinstraße 20, 87645 Schwangau', price: '140', title: 'Germany 2027' },
    bookNote: 'Every place you visit becomes a postcard in this stack.',
    driver: ['Please take us here', 'Zu dieser Adresse, bitte'],
    phrases: [
      BASIC(['Hello', 'Guten Tag', 'GOO-ten tahk'], ['Thank you very much', 'Danke schön', 'DAHN-keh shurn'], ['Excuse me, sorry', 'Entschuldigung', 'ent-SHOOL-dee-goong'], ["I don't speak German", 'Ich spreche kein Deutsch', 'ikh SHPREH-kheh kine doytch']),
      ['Getting around', [['Where is the station?', 'Wo ist der Bahnhof?', 'voh ist dair BAHN-hohf?'], ['Please take me to this address', 'Zu dieser Adresse, bitte', 'tsoo DEE-zer ah-DRESS-eh, BIT-teh'], ['Two tickets, please', 'Zwei Fahrkarten, bitte', 'tsvai FAR-kar-ten, BIT-teh'], ['How much is it?', 'Wie viel kostet das?', 'vee feel KOS-tet dahs?']]],
      ['Eating', [['A table for two, please', 'Einen Tisch für zwei, bitte', 'EYE-nen tish fuer tsvai, BIT-teh'], ['This one, please', 'Das hier, bitte', 'dahs heer, BIT-teh'], ['The bill, please', 'Die Rechnung, bitte', 'dee REKH-noong, BIT-teh'], ['Can I pay by card?', 'Kann ich mit Karte zahlen?', 'kahn ikh mit KAR-teh TSAH-len?'], ['Delicious!', 'Sehr lecker!', 'zair LEK-er']]],
      ['Staying', [['We have a reservation', 'Wir haben reserviert', 'veer HAH-ben reh-zer-VEERT'], ['Could you keep our luggage?', 'Können Sie unser Gepäck aufbewahren?', 'KUR-nen zee OON-zer geh-PECK OWF-beh-vah-ren?'], ['What time is check-out?', 'Wann ist der Check-out?', 'vahn ist dair check-out?']]]
    ]
  },
  GB: {
    name: 'United Kingdom', cur: 'GBP', lang: 'en', langName: '', font: '', book: 'postcards', bbox: [-8.2, 49.9, 1.8, 58.7], words: true,
    sample: { local: '', addr: '', price: '140', title: 'UK 2027' },
    bookNote: 'Every place you visit becomes a postcard in this stack.',
    driver: ['Please take us here', 'Please take us to this address'],
    phrases: [
      ['Words that differ', [['Toilet', 'Loo', 'Toilets are often signed WC'], ['Bottle shop', 'Off-licence', 'Or just "the offie"'], ['Potato chips', 'Crisps', 'Hot chips are just "chips"'], ['A line of people', 'Queue', 'Queuing is taken seriously']]],
      ['Getting around', [['Return ticket', 'Return', 'A one-way ticket is a "single"'], ['Tap on and off', 'Contactless', 'Tap the same card at both ends of a Tube trip'], ['Mind the gap', 'Mind the gap', 'Between the train and the platform'], ['Ground floor', 'Ground floor', 'Then the first floor is one up, as at home']]],
      ['Eating and drinking', [['Can we get the bill, please?', 'Could we have the bill, please?', 'Service is often added; check before tipping'], ['A round', "It's my round", 'Taking turns buying drinks at the pub'], ['Takeaway', 'Takeaway', 'Same as at home']]]
    ]
  },
  US: {
    name: 'United States', cur: 'USD', lang: 'en', langName: '', font: '', book: 'patches', bbox: [-124.8, 24.4, -66.9, 49.4], words: true,
    sample: { local: '', addr: '', price: '220', title: 'USA 2027' },
    bookNote: 'Like the embroidered patches sold at every national park, each place you visit earns one.',
    driver: ['Please take us here', 'Please take us to this address'],
    phrases: [
      ['Words that differ', [['The bill', 'The check', '"Can we get the check?"'], ['Toilet', 'Restroom', '"Where\'s the restroom?"'], ['Petrol', 'Gas', 'Pumps are often pay-first'], ['Lift', 'Elevator', 'The first floor is the ground floor']]],
      ['Eating', [['Tipping', '18 to 20 percent', 'Expected at sit-down restaurants and bars'], ['Takeaway', 'To go', '"For here or to go?"'], ['Hot chips', 'Fries', 'Chips are potato chips'], ['Entrée', 'Main course', 'An entrée is the main, not a starter']]],
      ['Getting around', [['Sales tax', 'Added at the till', 'Shelf prices usually leave it out'], ['Footpath', 'Sidewalk', 'Cross at the crosswalk']]]
    ]
  },
  NZ: {
    name: 'New Zealand', cur: 'NZD', lang: 'en', langName: '', font: '', book: 'patches', bbox: [166.3, -47.4, 178.6, -34.3], words: true,
    sample: { local: '', addr: '', price: '220', title: 'New Zealand 2027' },
    bookNote: 'Like the embroidered patches sold at every national park, each place you visit earns one.',
    driver: ['Please take us here', 'Please take us to this address'],
    phrases: [
      ['Māori greetings', [['Hello', 'Kia ora', 'KEE-ah OR-ah'], ['Thank you', 'Kia ora / Ngā mihi', 'NGAH MEE-hee'], ['Good, well done', 'Ka pai', 'kah PIE']]],
      ['Words that differ', [['Corner shop', 'Dairy', 'Open late, sells most things'], ['Thongs', 'Jandals', 'Same thing'], ['Esky', 'Chilly bin', 'Same thing'], ['Swimmers', 'Togs', 'Same thing'], ['Bushwalking', 'Tramping', 'Huts book out in summer'], ['Holiday house', 'Bach', 'Said "batch"; a crib in the south']]]
    ]
  }
};
const COUNTRY_LIST = Object.entries(COUNTRIES).map(([code, c]) => ({ code, name: c.name })).sort((a, b) => a.name.localeCompare(b.name));

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const icon = n => `<svg class="i" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const PWA = !!window.TABI_PWA;
const DEFAULTS = null;
const isPhone = () => innerWidth <= 820;
const CLIP_PAGE = 'https://zyfb4jn58y-arch.github.io/tabi/clip.html';
const TRIP_COUNTRY = () => (typeof TRIP !== 'undefined' && COUNTRIES[TRIP.country] && TRIP.country) || 'JP';
const COUNTRY = () => COUNTRIES[TRIP_COUNTRY()];
const BOOK = () => BOOKS[COUNTRY().book] || BOOKS.stamps;
// the name of a place in the local language, as the map tiles store it (name:ja, name:ko, name:zh-Hant…)
// map labels: Japanese for Japan (as it always was), elsewhere each place's own local name
const LOCAL_NAME_KEY = () => TRIP_COUNTRY() === 'JP' ? 'name:ja' : 'name';
const LANG = () => COUNTRY().langName;

/* ---------- dates ---------- */
const pad = n => String(n).padStart(2, '0');
const isoOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isIso = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
const parseD = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return isoOf(d); };
const diffDays = (a, b) => Math.round((parseD(b) - parseD(a)) / 864e5);
const today = () => isoOf(new Date());
let TRIP = { start: '', end: '', country: 'JP' }, TRIP_DAYS = [], NIGHTS = [];
function setTrip(start, end) {
  if (!isIso(start) || !isIso(end) || end <= start || diffDays(start, end) > 120) { const t = today(); start = t; end = addDays(t, 14); }
  TRIP = { start, end, country: TRIP.country || 'JP' }; TRIP_DAYS = []; for (let s = start; s <= end; s = addDays(s, 1)) TRIP_DAYS.push(s); NIGHTS = TRIP_DAYS.slice(0, -1);
}
const fmtDay = s => parseD(s).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtShort = s => parseD(s).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
const fmtLong = s => parseD(s).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtTime = t => t ? t.replace(/^0(\d)/, '$1') : '';
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const ago = ms => { const s = (ms - Date.now()) / 1000, a = Math.abs(s);
  if (a < 60) return 'just now'; if (a < 3600) return rtf.format(Math.round(s / 60), 'minute');
  if (a < 86400) return rtf.format(Math.round(s / 3600), 'hour'); return rtf.format(Math.round(s / 86400), 'day'); };
const minsOf = t => { const m = /^(\d{2}):(\d{2})$/.exec(t || ''); return m ? +m[1] * 60 + +m[2] : null; };
const nowMins = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const untilText = mins => mins < 1 ? 'now' : mins < 60 ? `in ${mins} min` : `in ${Math.floor(mins / 60)} h${mins % 60 ? ' ' + (mins % 60) + ' min' : ''}`;

/* ---------- vocabulary ---------- */
const KINDS = {
  stay: { label: 'Stay', color: 'red', shape: 'square' },
  move: { label: 'Travel', color: 'ink', shape: 'bar' },
  see: { label: 'See', color: 'blue', shape: 'circle' },
  craft: { label: 'Craft & art', color: 'blue', shape: 'half' },
  food: { label: 'Eat & drink', color: 'yellow', shape: 'tri' },
  walk: { label: 'Walk', color: 'ink', shape: 'quarter' },
  note: { label: 'Note', color: 'ink', shape: 'note' }
};
const KC = { red: 'var(--red)', blue: 'var(--blue)', yellow: 'var(--yellow)', ink: 'var(--ink)' };
const statusLabel = p => p.status === 'booked' ? 'Booked' : p.status === 'maybe' ? 'Maybe' : (p.kind === 'stay' ? 'Shortlist' : 'Planned');
function glyph(kind, { status = 'planned', n = null, cls = 'g' } = {}) {
  const k = KINDS[kind] || KINDS.see, c = k.color;
  const hollow = status === 'maybe' || (kind === 'stay' && status === 'planned');
  const fill = hollow ? 'g-paper' : 'g-' + c;
  const stroke = c === 'yellow' ? 'g-syellow' : 'g-s' + c;
  const sw = hollow ? 2.4 : (c === 'yellow' ? 1.2 : 0);
  const st = sw ? ` class="${fill} ${stroke}" stroke-width="${sw}"${status === 'maybe' ? ' stroke-dasharray="3.2 2.4"' : ''}` : ` class="${fill}"`;
  let s;
  switch (k.shape) {
    case 'square': s = `<rect x="2" y="2" width="20" height="20"${st}/>`; break;
    case 'circle': s = `<circle cx="12" cy="12" r="10"${st}/>`; break;
    case 'tri': s = `<path d="M12 2.2 22.6 21.6H1.4z"${st}/>`; break;
    case 'half': s = `<path d="M1.5 18.5a10.5 10.5 0 0 1 21 0z"${st}/>`; break;
    case 'quarter': s = `<path d="M3 21V3a18 18 0 0 1 18 18z"${st}/>`; break;
    case 'bar': s = `<rect x="1" y="8" width="22" height="8"${st}/>`; break;
    default: s = `<rect x="3" y="3" width="18" height="18" class="g-paper g-sink" stroke-width="2"/><rect x="13" y="3" width="8" height="8" class="g-yellow"/>`;
  }
  const num = n != null ? `<text x="12" y="16.3" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-weight="800" font-size="${n > 9 ? 10 : 12}" fill="${hollow ? 'var(--red-ink)' : 'var(--on-red)'}">${n}</text>` : '';
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${s}${num}</svg>`;
}
const CATS = {
  food: { label: 'Food', color: 'var(--yellow)', kind: 'food' }, transport: { label: 'Transport', color: 'var(--ink)', kind: 'move' },
  stay: { label: 'Stays', color: 'var(--red)', kind: 'stay' }, tickets: { label: 'Tickets', color: 'var(--blue)', kind: 'see' },
  shopping: { label: 'Shopping', color: 'var(--ink-2)', kind: 'craft' }, other: { label: 'Other', color: 'var(--ink-3)', kind: 'walk' }
};

/* ---------- reference geography ---------- */
const POIS = [
 ['Koenji','高円寺',35.7053,139.6496,'see'],['Shimokitazawa','下北沢',35.6613,139.668,'see'],['Kichijoji','吉祥寺',35.7031,139.5797,'see'],
 ['Yanaka Ginza','谷中銀座',35.7276,139.7652,'walk'],['Sensō-ji, Asakusa','浅草寺',35.7148,139.7967,'see'],['Kappabashi Dougu Street','かっぱ橋道具街',35.7136,139.788,'craft'],
 ['Nippori Fabric Town','日暮里繊維街',35.729,139.7745,'craft'],['Okadaya Shinjuku','オカダヤ新宿本店',35.6919,139.7039,'craft'],['Sekaido Shinjuku (art supplies)','世界堂 新宿本店',35.6908,139.7083,'craft'],
 ['Ueno Park','上野公園',35.7156,139.7745,'walk'],['Tokyo National Museum','東京国立博物館',35.7189,139.7765,'see'],['Mori Art Museum','森美術館',35.6604,139.7292,'craft'],
 ['Shibuya','渋谷',35.658,139.7016,'see'],['Shinjuku','新宿',35.6896,139.7006,'see'],['Nakameguro','中目黒',35.644,139.699,'food'],
 ['Tokyo Station','東京駅',35.6812,139.7671,'see'],['Haneda Airport','羽田空港',35.5494,139.7798,'see'],['Narita Airport','成田空港',35.772,140.3929,'see'],
 ['Kamakura','鎌倉',35.3192,139.5467,'see'],['Hakone','箱根',35.2324,139.1069,'see'],['Lake Kawaguchi','河口湖',35.5,138.768,'walk'],['Mt Fuji','富士山',35.3606,138.7274,'walk'],
 ['Nikkō Tōshō-gū','日光東照宮',36.758,139.5988,'see'],['Matsumoto Castle','松本城',36.2381,137.969,'see'],['Kamikōchi','上高地',36.2496,137.6375,'walk'],
 ['Takayama old town','高山 古い町並',36.1405,137.26,'walk'],['Takayama Station','高山駅',36.1408,137.2522,'see'],['Miyagawa Morning Market','宮川朝市',36.144,137.259,'food'],
 ['Hida Folk Village','飛騨の里',36.134,137.239,'see'],['Shirakawa-gō','白川郷',36.2577,136.9063,'see'],['Magome-juku','馬籠宿',35.5266,137.5661,'walk'],
 ['Tsumago-juku','妻籠宿',35.5767,137.5953,'walk'],['Kenroku-en, Kanazawa','兼六園',36.5621,136.6625,'walk'],['21st Century Museum, Kanazawa','金沢21世紀美術館',36.5609,136.6582,'craft'],
 ['Kyoto Station','京都駅',34.9858,135.7588,'see'],['Fushimi Inari Taisha','伏見稲荷大社',34.9671,135.7727,'walk'],['Arashiyama Bamboo Grove','嵐山 竹林の小径',35.017,135.6713,'walk'],
 ['Kinkaku-ji','金閣寺',35.0394,135.7292,'see'],["Philosopher's Path",'哲学の道',35.0236,135.7944,'walk'],['Nishiki Market','錦市場',35.005,135.7649,'food'],
 ['Gion','祇園',35.0037,135.7751,'walk'],['Kiyomizu-dera','清水寺',34.9949,135.785,'see'],['Ōhara, Sanzen-in','大原 三千院',35.1197,135.8343,'see'],
 ['Kibune Shrine','貴船神社',35.1219,135.7629,'see'],['Kurama-dera','鞍馬寺',35.118,135.7714,'walk'],['Demachiyanagi','出町柳',35.0302,135.7728,'see'],
 ['Nishijin Textile Center','西陣織会館',35.0287,135.7487,'craft'],['Ōtsu','大津',35.0045,135.8686,'see'],['Ōmi-Hachiman canal','近江八幡 八幡堀',35.1381,136.0896,'walk'],
 ['Miho Museum','ミホミュージアム',34.901,136.116,'craft'],['Nara Park','奈良公園',34.6851,135.843,'walk'],['Tōdai-ji','東大寺',34.689,135.8398,'see'],
 ['Ōmiwa Shrine','大神神社',34.529,135.853,'see'],['Miwa','三輪',34.5285,135.846,'food'],['Yamanobe-no-michi','山の辺の道',34.545,135.85,'walk'],
 ['Dōtonbori, Osaka','道頓堀',34.6687,135.5013,'food'],['Himeji Castle','姫路城',34.8394,134.6939,'see'],
 ['Naoshima, Miyanoura Port','直島 宮浦港',34.4593,133.9748,'see'],['Naoshima, Honmura','直島 本村',34.4573,134.0003,'craft'],['Benesse House','ベネッセハウス',34.4478,133.9929,'stay'],
 ['Chichu Art Museum','地中美術館',34.4497,133.9965,'craft'],['Yellow Pumpkin, Naoshima','南瓜',34.4467,133.9946,'craft'],['Teshima Art Museum','豊島美術館',34.4916,134.0632,'craft'],
 ['Inujima','犬島',34.5728,134.0442,'craft'],['Uno Port','宇野港',34.4917,133.953,'see'],['Takamatsu','高松',34.3503,134.0466,'see'],['Ritsurin Garden','栗林公園',34.3297,134.0447,'walk'],
 ['Kōraku-en, Okayama','後楽園',34.6672,133.9356,'walk'],['Kurashiki Bikan','倉敷美観地区',34.5955,133.7717,'walk'],['Onomichi','尾道',34.409,133.205,'walk'],
 ['Hiroshima Peace Park','平和記念公園',34.3955,132.4536,'see'],['Itsukushima Shrine, Miyajima','厳島神社',34.2959,132.3199,'see']
];
// [name, ja, lat, lng, rank]
const CITIES = [
 ['Tokyo','東京',35.6812,139.7671,1],['Osaka','大阪',34.7025,135.4959,1],['Kyoto','京都',35.0116,135.7681,1],['Nagoya','名古屋',35.1709,136.8815,1],
 ['Sapporo','札幌',43.0687,141.3508,1],['Fukuoka','福岡',33.5902,130.4017,1],['Hiroshima','広島',34.3853,132.4553,1],['Sendai','仙台',38.2682,140.8694,1],
 ['Yokohama','横浜',35.4437,139.638,2],['Kobe','神戸',34.6901,135.1955,2],['Nara','奈良',34.6851,135.8048,2],['Kanazawa','金沢',36.5613,136.6562,2],
 ['Takayama','高山',36.1461,137.2522,2],['Matsumoto','松本',36.238,137.972,2],['Nagano','長野',36.6486,138.1948,2],['Okayama','岡山',34.6551,133.9195,2],
 ['Takamatsu','高松',34.3428,134.0466,2],['Niigata','新潟',37.9161,139.0364,2],['Kagoshima','鹿児島',31.5966,130.5571,2],['Nagasaki','長崎',32.7503,129.8779,2],
 ['Hakodate','函館',41.7687,140.7288,2],['Aomori','青森',40.8244,140.74,2],['Shizuoka','静岡',34.9756,138.3828,2],['Kumamoto','熊本',32.8031,130.7079,2],
 ['Matsuyama','松山',33.8392,132.7657,2],['Kōchi','高知',33.5597,133.5311,2],['Naha','那覇',26.2124,127.6809,2],
 ['Himeji','姫路',34.8151,134.6853,3],['Ōtsu','大津',35.0045,135.8686,3],['Naoshima','直島',34.4608,133.9895,3],['Uno','宇野',34.4917,133.953,3],
 ['Magome','馬籠',35.5266,137.5661,3],['Kibune','貴船',35.1219,135.7629,3],['Kurama','鞍馬',35.1167,135.7722,3],['Nikkō','日光',36.7199,139.6982,3],
 ['Hakone','箱根',35.2324,139.1069,3],['Kamakura','鎌倉',35.3192,139.5467,3],['Sakurai','桜井',34.5186,135.8432,3],['Kurashiki','倉敷',34.585,133.772,3],
 ['Onomichi','尾道',34.409,133.205,3],['Shirakawa-gō','白川郷',36.2577,136.9063,3],['Tsumago','妻籠',35.5767,137.5953,3],['Teshima','豊島',34.4916,134.0632,3],['Ogijima','男木島',34.4229,134.0554,3]
];
const SEAS = [['Sea of Japan','日本海',39.4,134.6,0.6],['Pacific Ocean','太平洋',32.6,141.2,0.6],['Seto Inland Sea','瀬戸内海',34.1,133.0,3.2],['Lake Biwa','琵琶湖',35.27,136.07,7]];
// Shinkansen, approximate station positions [lat, lng]
const RAIL = [
 [[35.6812,139.7671],[35.6285,139.7387],[35.5075,139.6176],[35.2564,139.1553],[35.1038,139.0779],[35.1263,138.911],[35.1424,138.6634],[34.9716,138.389],[34.769,138.0146],[34.7038,137.735],[34.7627,137.382],[35.1709,136.8815],[35.3155,136.6857],[35.3143,136.2903],[34.9858,135.7588],[34.7335,135.5003]],
 [[34.7335,135.5003],[34.7068,135.1955],[34.6672,134.9622],[34.8268,134.6907],[34.8076,134.4687],[34.6664,133.918],[34.577,133.668],[34.4893,133.3621],[34.43,133.196],[34.4005,133.0808],[34.4007,132.755],[34.3972,132.4753],[34.166,132.155],[34.0526,131.8061],[34.0938,131.3961],[34.005,130.948],[33.8869,130.8826],[33.5897,130.4207]],
 [[33.5897,130.4207],[33.3745,130.5126],[33.3195,130.5103],[32.7896,130.6886],[32.525,130.628],[32.214,130.418],[31.814,130.305],[31.5838,130.5413]],
 [[33.194,130.019],[33.1,129.99],[32.93,129.96],[32.85,130.05],[32.7519,129.8695]],
 [[35.6812,139.7671],[35.7138,139.7773],[35.9064,139.6237],[36.559,139.8986],[37.3977,140.3884],[37.7546,140.4594],[38.2601,140.8823],[38.9268,141.136],[39.7016,141.1365],[40.5094,141.4313],[40.827,140.694],[41.144,140.515],[41.9045,140.6487]],
 [[35.9064,139.6237],[36.3225,139.0126],[36.9358,138.8095],[37.4473,138.8516],[37.9121,139.061]],
 [[36.3225,139.0126],[36.3428,138.6352],[36.3966,138.2492],[36.6431,138.189],[37.088,138.248],[37.043,137.862],[36.7014,137.2133],[36.728,137.014],[36.578,136.648],[36.406,136.453],[36.062,136.223],[35.645,136.076]]
];


/* ---------- phrases: from the trip's country (countries.js) ---------- */
const PHRASES_NOW = () => COUNTRY().phrases;

/* ---------- state ---------- */
const S = {
  mode: 'loading', places: new Map(), spend: new Map(), photos: new Map(), rawSettings: {},
  settings: { rate: 113, budget: 0, names: ['Me', 'Partner'], title: 'Our trip', start: '', end: '', country: 'JP', home: 'AUD' },
  sel: null, tab: 'today', view: 'map', filter: 'week', day: null, cur: 'jpy', here: null,
  meId: null, me: null, canWrite: true, profiles: {}, peers: [], follow: null,
  ideas: null, picking: null, playing: false, playDay: null, ready: false, xpend: null
};
let db = null, room = null, user = null, assets = null, sample = null;
const pref = (k, v) => { try { if (v === undefined) return localStorage.getItem('tabi.' + k); localStorage.setItem('tabi.' + k, v); } catch (e) { return null; } };
S.cur = pref('cur') === 'aud' ? 'aud' : 'jpy';
{ const f = pref('filter'); S.filter = ['week', 'all', 'stay', 'move', 'see', 'craft', 'food', 'walk'].includes(f) ? f : 'week'; }
{ const t = pref('tab'); S.tab = ['today', 'plan', 'stays', 'spend', 'notes', 'stamps', 'phrases'].includes(t) ? t : 'today'; }
let railOn = pref('rail') !== 'off';

const nightsOf = p => p.start && p.end ? Math.max(0, diffDays(p.start, p.end)) : 0;
const hasLoc = p => typeof p.lat === 'number' && typeof p.lng === 'number' && isFinite(p.lat) && isFinite(p.lng);
/* money: amounts are kept in the trip's local currency. `yen` writes the local currency and `aud` the travellers'
   home currency (their original names, from the first trip). The rate is local units for one home unit. */
const CL = () => CUR[COUNTRY().cur] || CUR.JPY, CH = () => CUR[S.settings.home] || CUR.AUD;
const roundL = v => { const f = 10 ** CL().dec; return Math.round(v * f) / f; };
const fmtCur = (v, c, whole) => { const r = whole ? Math.round(v) : Math.round(v * 10 ** c.dec) / 10 ** c.dec; const frac = !whole && c.dec && !Number.isInteger(r); return c.pre + r.toLocaleString('en-AU', { minimumFractionDigits: frac ? c.dec : 0, maximumFractionDigits: frac ? c.dec : 0 }); };
const yen = n => fmtCur(n, CL());
const aud = n => fmtCur(n / (S.settings.rate || 1), CH(), true);
const money = n => S.cur === 'aud' ? aud(n) : yen(n);
const other = n => S.cur === 'aud' ? yen(n) : aud(n);
const totalOf = p => p.price == null ? null : (p.kind === 'stay' ? p.price * Math.max(1, nightsOf(p)) : p.price);
const safeUrl = u => /^https?:\/\/[^\s]+$/i.test(u || '') ? u : '';
const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return 'Link'; } };
const timeKey = p => p.time || (p.kind === 'stay' ? '15:00' : p.kind === 'move' ? '08:00' : '12:00');
const str = v => typeof v === 'string' ? v : '';
const numv = v => typeof v === 'number' && isFinite(v) ? v : null;
const hhmm = v => /^\d{2}:\d{2}$/.test(v || '') ? v : '';

function norm(id, d) {
  d = d || {};
  const kind = KINDS[d.kind] ? d.kind : 'see', title = str(d.name).trim();
  const photos = [];
  if (d.photos && typeof d.photos === 'object') for (const [k, v] of Object.entries(d.photos)) {
    if (v && typeof v === 'object' && (typeof v.a === 'string' || typeof v.d === 'string')) photos.push({ key: k, a: v.a || '', d: v.d || '', t: v.t === 1 || v.t === true, by: str(v.by), at: numv(v.at) || 0 });
  }
  photos.sort((a, b) => a.at - b.at);
  const likes = {}; if (d.likes && typeof d.likes === 'object') for (const [k, v] of Object.entries(d.likes)) if (v === true) likes[k] = true;
  const links = [];
  if (Array.isArray(d.links)) for (const l of d.links.slice(0, 12)) { if (l && typeof l === 'object') { const u = safeUrl(str(l.url)); if (u) links.push({ label: str(l.label).trim().slice(0, 40) || hostOf(u), url: u }); } }
  const legacy = safeUrl(str(d.link)); if (legacy && !links.some(l => l.url === legacy)) links.unshift({ label: 'Link', url: legacy });
  return {
    id, title, name: title || (kind === 'note' ? 'Note' : 'Untitled place'), ja: str(d.ja).trim(), kind,
    status: ['booked', 'planned', 'maybe'].includes(d.status) ? d.status : 'planned',
    start: isIso(d.start) ? d.start : '', end: isIso(d.end) ? d.end : '', time: hhmm(d.time),
    lat: numv(d.lat), lng: numv(d.lng), price: numv(d.price), priceNote: str(d.priceNote), links, notes: str(d.notes),
    conf: str(d.conf).slice(0, 60), checkin: hhmm(d.checkin), checkout: hhmm(d.checkout), address: str(d.address).slice(0, 200), addressJa: str(d.addressJa).slice(0, 200), phone: str(d.phone).slice(0, 40),
    todo: d.todo === true, done: d.done === true,
    photos, likes, visited: isIso(d.visited) ? d.visited : '', by: str(d.by), created: numv(d.created) || 0,
    last: d.last && typeof d.last === 'object' ? { by: str(d.last.by), at: numv(d.last.at) || 0, what: str(d.last.what) } : null
  };
}
function normSpend(id, d) {
  d = d || {};
  return { id, amount: numv(d.amount) > 0 ? roundL(d.amount) : 0, cat: CATS[d.cat] ? d.cat : 'other', payer: d.payer === 1 ? 1 : 0,
    date: isIso(d.date) ? d.date : today(), note: str(d.note).slice(0, 120), by: str(d.by), at: numv(d.at) || 0 };
}
function applySettings(st) {
  st = st && typeof st === 'object' ? st : {}; const d = DEFAULTS || {};
  const nm = Array.isArray(st.names) ? st.names : [];
  const country = COUNTRIES[st.country] ? st.country : d.country || 'JP', home = HOMES.includes(st.home) ? st.home : d.home || 'AUD';
  S.settings = {
    country, home,
    rate: numv(st.rate) > 0 && st.rate < 1e6 ? st.rate : country === 'JP' ? d.rate || 113 : 0, budget: numv(st.budget) >= 0 && st.budget ? st.budget : d.budget || 0,
    names: [str(nm[0]).trim() || (d.names && d.names[0]) || 'Me', str(nm[1]).trim() || (d.names && d.names[1]) || 'Partner'],
    title: str(st.title).trim() || d.title || 'Our trip', start: isIso(st.start) ? st.start : d.start || '', end: isIso(st.end) ? st.end : d.end || ''
  };
  TRIP.country = S.settings.country; applyCountry();
  setTrip(S.settings.start, S.settings.end);
}
// the script, font and words for the trip's country
let fontLoaded = 'Noto Sans JP'; // already in the page
function applyCountry() {
  const c = COUNTRY(), root = document.documentElement;
  if (c.font && fontLoaded !== c.font) { fontLoaded = c.font; const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(c.font)}:wght@500;700;900&display=swap`; document.head.appendChild(l); }
  root.style.setProperty('--font-ja', `${c.font ? `"${c.font}",` : ''}"Noto Sans JP","Hiragino Kaku Gothic ProN",system-ui,sans-serif`);
  root.lang = 'en-AU';
  if (typeof onCountry === 'function') onCountry();
}
applySettings({});

/* ordering */
function itinerary() {
  return [...S.places.values()].sort((a, b) =>
    (a.start || '9999').localeCompare(b.start || '9999') || (a.start ? timeKey(a).localeCompare(timeKey(b)) : 0) || (a.kind === 'stay' ? -1 : 0) - (b.kind === 'stay' ? -1 : 0) || a.name.localeCompare(b.name));
}
function codes() { const m = new Map(); let n = 0; for (const p of itinerary()) if (p.start && p.kind !== 'note' && p.kind !== 'move') m.set(p.id, ++n); return m; }
function routeStays() {
  const seen = new Set(), out = [];
  const st = [...S.places.values()].filter(p => p.kind === 'stay' && p.status !== 'maybe' && p.start && hasLoc(p)).sort((a, b) => a.start.localeCompare(b.start) || (a.status === 'booked' ? -1 : 1));
  for (const p of st) { if (seen.has(p.start)) continue; seen.add(p.start); out.push(p); }
  return out;
}
function nightState(n) {
  let best = null;
  for (const p of S.places.values()) {
    if (p.kind !== 'stay' || p.status === 'maybe' || !p.start) continue;
    const end = p.end || addDays(p.start, 1);
    if (p.start <= n && n < end && (!best || (p.status === 'booked' && best.status !== 'booked'))) best = p;
  }
  return best;
}
function onDay(p, d) { if (!p.start) return false; if (p.kind === 'stay') return p.start <= d && d <= (p.end || addDays(p.start, 1)); return p.start === d; }
const FILTER_KEYS = [['week', 'Next 7 days'], ['all', 'All'], ['stay', 'Stays'], ['move', 'Travel'], ['see', 'See'], ['craft', 'Craft'], ['food', 'Eat'], ['walk', 'Walk']];
const inWeek = p => { const t = today(), w = addDays(t, 7); if (!p.start || p.start > w) return false; return p.kind === 'stay' ? (p.end || addDays(p.start, 1)) > t : p.start >= t; };

/* ---------- people ---------- */
const PAL = ['#2b3b8f', '#c43d22', '#6e5518', '#1b1d2e', '#4b5a6b', '#6d482e'];
const initialAv = (name, col) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" fill="${col}"/><text x="12" y="16.5" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="12" fill="#fff">${(name || '?').trim().charAt(0).toUpperCase().replace(/[<&]/g, '')}</text></svg>`);
const CLAUDE_AV = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" fill="#c43d22"/><path d="M12 4.5 13.4 10.6 19.5 12 13.4 13.4 12 19.5 10.6 13.4 4.5 12 10.6 10.6z" fill="#fff"/></svg>');
function who(id) {
  if (id === 'claude') return { name: 'Claude', avatarUrl: CLAUDE_AV, color: '#c43d22' };
  if (id === 'local') return { name: 'You', avatarUrl: initialAv('Y', '#1b1d2e'), color: '#1b1d2e' };
  if (!id) return { name: 'Someone', avatarUrl: initialAv('?', '#7d786c'), color: '#7d786c' };
  if (id.startsWith('n:')) { const nm = id.slice(2) || 'Someone'; const col = PAL[hash(nm) % PAL.length]; return { name: id === S.meId ? 'You' : nm, avatarUrl: initialAv(nm, col), color: col }; }
  const p = S.profiles[id], isMe = id === S.meId;
  return { name: isMe ? 'You' : (p && p.name) || 'Someone', avatarUrl: (p && p.avatarUrl) || (isMe && S.me && S.me.avatarUrl) || initialAv('?', '#7d786c'), color: (p && p.color) || '#7d786c' };
}
function firstName(id) { const n = who(id).name; return n === 'You' ? 'You' : n.split(' ')[0]; }
let profBusy = false;
async function refreshProfiles() {
  if (!user || profBusy) return;
  const ids = new Set();
  for (const p of S.places.values()) { if (p.by) ids.add(p.by); if (p.last && p.last.by) ids.add(p.last.by); Object.keys(p.likes).forEach(k => ids.add(k)); p.photos.forEach(f => f.by && ids.add(f.by)); }
  for (const x of S.spend.values()) if (x.by) ids.add(x.by);
  S.peers.forEach(pe => pe.by && ids.add(pe.by)); if (S.meId) ids.add(S.meId);
  for (const x of [...ids]) if (!x || x === 'claude' || x === 'local' || x.startsWith('n:')) ids.delete(x);
  if (!ids.size) return;
  profBusy = true;
  try {
    const ps = await user.profiles([...ids]); let changed = false;
    for (const id of ids) { const a = S.profiles[id], b = ps[id]; if (b && (!a || a.name !== b.name || a.avatarUrl !== b.avatarUrl)) changed = true; }
    S.profiles = { ...S.profiles, ...ps };
    if (changed) renderAll(true);
  } catch (e) {} finally { profBusy = false; }
}

/* ---------- storage ---------- */
const LKEY = PWA ? 'tabi.trip.v1' : 'tabi.local.v1';
let local = { places: {}, spend: {}, deleted: {}, settings: {} };
function loadLocal() { try { const v = JSON.parse(localStorage.getItem(LKEY) || 'null'); if (v && v.places) local = { spend: {}, deleted: {}, settings: {}, ...v }; } catch (e) {} }
function saveLocal() { try { localStorage.setItem(LKEY, JSON.stringify(local)); } catch (e) { toast('This device could not save that change. It may be out of space.'); } }
function applyLocal() {
  S.places = new Map(Object.entries(local.places).map(([k, v]) => [k, norm(k, v)]));
  S.spend = new Map(Object.entries(local.spend || {}).map(([k, v]) => [k, normSpend(k, v)]));
  applySettings(local.settings); renderAll();
}
const idb = (() => {
  let dbp = null;
  const open = () => dbp || (dbp = new Promise((res, rej) => { const r = indexedDB.open('tabi', 1); r.onupgradeneeded = () => r.result.createObjectStore('photos'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
  const run = (mode, fn) => open().then(d => new Promise((res, rej) => { const t = d.transaction('photos', mode); const req = fn(t.objectStore('photos')); t.oncomplete = () => res(req && req.result); t.onerror = () => rej(t.error); }));
  return {
    set: (k, v) => run('readwrite', s => s.put(v, k)), del: k => run('readwrite', s => s.delete(k)),
    all: () => open().then(d => new Promise((res, rej) => { const out = {}; const c = d.transaction('photos').objectStore('photos').openCursor(); c.onsuccess = () => { const cur = c.result; if (cur) { out[cur.key] = cur.value; cur.continue(); } else res(out); }; c.onerror = () => rej(c.error); }))
  };
})();
const deepMerge = (a, b) => { const o = { ...(a || {}) }; for (const [k, v] of Object.entries(b)) o[k] = v && typeof v === 'object' && !Array.isArray(v) && o[k] && typeof o[k] === 'object' ? deepMerge(o[k], v) : v; return o; };
const queues = new Map();
function enqueue(path, task) {
  const prev = queues.get(path) || Promise.resolve();
  const run = async () => { try { return await task(); } catch (e) { if (e && e.code === 'unavailable') { await sleep(400 + Math.random() * 800); return task(); } throw e; } };
  const next = prev.catch(() => {}).then(run);
  queues.set(path, next); next.finally(() => { if (queues.get(path) === next) queues.delete(path); }).catch(() => {});
  return next;
}
function writeErr(e) {
  const code = e && e.code;
  if (code === 'invalid_argument' && S.canWrite !== true) { S.canWrite = false; renderAll(); toast('You can look around, but changes are turned off for you.'); return; }
  if (code === 'quota_exceeded') { toast('The shared map is full. Delete some photos or old entries, then try again.'); return; }
  if (code === 'revoked') { toast('Your access changed. Reload to see the latest.'); return; }
  toast("That change didn't save. Check your connection and try again.");
}
const lastStamp = what => ({ last: { by: S.meId || 'local', at: Date.now(), what } });
async function put(col, id, data, what) {
  if (col === 'places') data = { ...data, ...lastStamp(what) };
  if (S.mode === 'local') { local[col][id] = data; delete local.deleted[id]; saveLocal(); applyLocal(); return true; }
  try { await enqueue(col + '/' + id, () => db.doc(col + '/' + id).set(data)); return true; } catch (e) { writeErr(e); return false; }
}
async function patch(col, id, data, what) {
  if (col === 'places') data = { ...data, ...lastStamp(what) };
  if (S.mode === 'local') { local[col][id] = deepMerge(local[col][id], data); saveLocal(); applyLocal(); return true; }
  try { await enqueue(col + '/' + id, () => db.doc(col + '/' + id).update(data)); return true; } catch (e) { writeErr(e); return false; }
}
async function remove(col, id) {
  if (S.mode === 'local') { delete local[col][id]; local.deleted[id] = Date.now(); saveLocal(); applyLocal(); return true; }
  try { await enqueue(col + '/' + id, () => db.doc(col + '/' + id).delete()); return true; } catch (e) { writeErr(e); return false; }
}
async function removePlace(id) {
  const p = S.places.get(id); const ok = await remove('places', id); if (!ok || !p) return;
  for (const f of p.photos) {
    if (f.d) { if (S.mode === 'local') { idb.del(f.d).catch(() => {}); S.photos.delete(f.d); } else enqueue('photos/' + f.d, () => db.doc('photos/' + f.d).delete()).catch(() => {}); }
    if (f.a && assets) assets.delete(f.a).catch(() => {});
  }
}
async function saveSettings(partial) {
  const next = { ...S.rawSettings, ...partial };
  if (S.mode === 'local') { local.settings = { ...local.settings, ...partial, at: Date.now() }; saveLocal(); applyLocal(); return true; }
  S.rawSettings = next; applySettings(next); renderAll(true);
  try { await enqueue('trip/settings', () => db.doc('trip/settings').set(next)); return true; } catch (e) { writeErr(e); return false; }
}
const newId = (p = 'p') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const ticketsOf = p => p ? p.photos.filter(f => f.t) : [];
const picsOf = p => p ? p.photos.filter(f => !f.t) : [];
function canEdit() { return S.mode !== 'loading' && S.canWrite !== false; }
let toastT = null;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 3400); }

/* ---------- map ---------- */
const mapEl = $('#map'), mapSel = d3.select(mapEl);
const prefsObj = GEO.prefs.objects.prefs;
const MAIN = { type: 'MultiPoint', coordinates: [[129.4, 31.0], [145.9, 45.5]] };
// Japan keeps its own projection and prefecture outlines. Other countries use a Mercator view of the
// country's box over world outlines, which load once (a file in the phone app, the web otherwise).
let base = d3.geoConicConformal().parallels([33, 44]).rotate([-137, 0]).fitSize([1000, 1000], MAIN);
let gpath = d3.geoPath(base);
let T = d3.zoomIdentity, W = 800, H = 600;
// GL is the detailed street map (mapgl.js) once it's running; until then, and as the offline fallback, it's the simple map.
// The simple map's scale k=1 is about zoom 5.4 on the detailed one.
let GL = null, K0 = 5.4;
const zk = () => GL ? 2 ** (GL.getZoom() - K0) : T.k;
const P = (lng, lat) => { if (GL) { const p = GL.project([lng, lat]); return [p.x, p.y]; } const xy = base([lng, lat]); return xy ? [T.applyX(xy[0]), T.applyY(xy[1])] : [-9999, -9999]; };
const unP = (x, y) => { if (GL) { const ll = GL.unproject([x, y]); return [ll.lng, ll.lat]; } return base.invert(T.invert([x, y])); };
let baseFor = '', WORLD = null, worldP = null;
const WORLD_URL = PWA ? 'vendor/world-50m.json' : 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json';
function loadWorld() { return worldP || (worldP = fetch(WORLD_URL).then(r => { if (!r.ok) throw 0; return r.json(); }).then(j => (WORLD = j)).catch(() => { worldP = null; return null; })); }
function drawBase() {
  const cc = TRIP_COUNTRY(); if (baseFor === cc && cc === 'JP') return;
  if (cc === 'JP') {
    base = d3.geoConicConformal().parallels([33, 44]).rotate([-137, 0]).fitSize([1000, 1000], MAIN); gpath = d3.geoPath(base); K0 = 5.4; baseFor = 'JP';
    d3.select('#land').attr('d', gpath(topojson.feature(GEO.prefs, prefsObj)));
    d3.select('#borders').attr('d', gpath(topojson.mesh(GEO.prefs, prefsObj, (a, b) => a !== b)));
    d3.select('#coast').attr('d', gpath(topojson.mesh(GEO.prefs, prefsObj, (a, b) => a === b)));
    d3.select('#lake').attr('d', gpath(topojson.feature(GEO.lake, GEO.lake.objects.lakes)));
    d3.select('#rail path').attr('d', gpath({ type: 'MultiLineString', coordinates: RAIL.map(l => l.map(([a, b]) => [b, a])) }));
    mapEl.classList.toggle('no-rail', !railOn); mapEl.classList.remove('world');
    return;
  }
  const b = COUNTRY().bbox, box = { type: 'MultiPoint', coordinates: [[b[0], b[1]], [b[2], b[3]]] };
  base = d3.geoMercator().rotate([-(b[0] + b[2]) / 2, 0]).fitSize([1000, 1000], box); gpath = d3.geoPath(base);
  K0 = Math.log2(2 * Math.PI * base.scale() / 512); baseFor = cc;
  mapEl.classList.add('no-rail', 'world'); d3.select('#rail path').attr('d', null); d3.select('#lake').attr('d', null);
  const paint = w => {
    if (!w || baseFor !== cc) return;
    const o = w.objects.countries, pad = 18, near = g => { const bb = d3.geoBounds(topojson.feature(w, g)); return bb[1][0] >= b[0] - pad && bb[0][0] <= b[2] + pad && bb[1][1] >= b[1] - pad && bb[0][1] <= b[3] + pad; };
    const keep = { type: 'GeometryCollection', geometries: o.geometries.filter(near) };
    d3.select('#land').attr('d', gpath(topojson.feature(w, keep)));
    d3.select('#borders').attr('d', gpath(topojson.mesh(w, keep, (x, y) => x !== y)));
    d3.select('#coast').attr('d', gpath(topojson.mesh(w, keep, (x, y) => x === y)));
    if (S.ready) positionAll();
  };
  d3.select('#land').attr('d', null); d3.select('#borders').attr('d', null); d3.select('#coast').attr('d', null);
  if (WORLD) paint(WORLD); else loadWorld().then(paint);
}
drawBase();
const zoomer = d3.zoom().scaleExtent([0.45, 110])
  .filter(e => !e.target.closest('.ctl,.pop,.card,.banner') && (!e.ctrlKey || e.type === 'wheel') && !e.button)
  .on('zoom', e => { T = e.transform; d3.select('#world').attr('transform', T); positionAll(); onViewChange(); });
mapSel.call(zoomer).on('dblclick.zoom', null);
function measure() { W = mapEl.clientWidth || 800; H = mapEl.clientHeight || 600; }
function fitTransform(pts, { pad = 70, maxK = 16 } = {}) {
  measure();
  if (GL) {
    const ok = pts.filter(p => p && isFinite(p.lng) && isFinite(p.lat)); if (!ok.length) return null;
    const lo = ok.map(p => p.lng), la = ok.map(p => p.lat);
    return { gl: 'fit', b: [[Math.min(...lo), Math.min(...la)], [Math.max(...lo), Math.max(...la)]], pad: Math.min(pad, W / 4, H / 4), maxZoom: maxK >= 12 ? 15.5 : Math.min(15.5, K0 + Math.log2(maxK) + 2) };
  }
  const xy = pts.map(p => base([p.lng, p.lat])).filter(Boolean);
  if (!xy.length) return T;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  xy.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
  const px = Math.min(pad, W / 4), py = Math.min(pad, H / 4);
  const k = Math.max(0.45, Math.min(maxK, (W - px * 2) / Math.max(x1 - x0, 1), (H - py * 2) / Math.max(y1 - y0, 1)));
  return d3.zoomIdentity.translate(W / 2, H / 2).scale(k).translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
}
function zoomTo(t, dur = 750) {
  if (t && t.gl) return glGo(t, dur);
  if (GL || !t) return Promise.resolve();
  return new Promise(res => {
    if (REDUCE || dur <= 0) { mapSel.interrupt().call(zoomer.transform, t); res(); return; }
    mapSel.transition().duration(dur).ease(d3.easeCubicInOut).call(zoomer.transform, t).on('end', res).on('interrupt', res);
  });
}
// the whole trip country
function countryView() {
  if (TRIP_COUNTRY() === 'JP') return fitTransform([{ lng: 129.6, lat: 31.2 }, { lng: 145.6, lat: 45.4 }], { pad: 20 });
  const b = COUNTRY().bbox; return fitTransform([{ lng: b[0], lat: b[1] }, { lng: b[2], lat: b[3] }], { pad: 20, maxK: 1.5 });
}
const japanView = countryView;
function fitPlaces(dur = 750) { const pts = [...S.places.values()].filter(hasLoc); return zoomTo(pts.length ? fitTransform(pts, { maxK: 10 }) : countryView(), dur); }
function flyToPlace(p, dur = 750, k, cyf) {
  if (!hasLoc(p)) return Promise.resolve();
  measure();
  const open = !$('#card').hidden, ph = isPhone();
  const cx = open && !ph ? W * 0.64 : W / 2, cy = cyf != null ? H * cyf : open ? (ph ? H * 0.22 : H * 0.36) : H / 2;
  if (GL) return glGo({ gl: 'at', c: [p.lng, p.lat], z: k ? K0 + Math.log2(k) : Math.max(GL.getZoom(), 15), off: [cx - W / 2, cy - H / 2] }, dur);
  const kk = k || Math.max(T.k, 14); const [x, y] = base([p.lng, p.lat]);
  return zoomTo(d3.zoomIdentity.translate(cx, cy).scale(kk).translate(-x, -y), dur);
}
$('#zin').onclick = () => GL ? GL.zoomIn({ duration: REDUCE ? 0 : 300 }) : mapSel.transition().duration(REDUCE ? 0 : 300).call(zoomer.scaleBy, 1.8);
$('#zout').onclick = () => GL ? GL.zoomOut({ duration: REDUCE ? 0 : 300 }) : mapSel.transition().duration(REDUCE ? 0 : 300).call(zoomer.scaleBy, 1 / 1.8);
// a view centred on a point at the simple map's scale k, for following someone else's view
function viewAt(c, k) { k = Math.max(0.45, Math.min(110, k)); if (GL) return { gl: 'at', c, z: K0 + Math.log2(k) }; measure(); const [x, y] = base(c); return d3.zoomIdentity.translate(W / 2, H / 2).scale(k).translate(-x, -y); }
$('#zfit').onclick = () => fitPlaces();
new ResizeObserver(() => { const ow = W, oh = H; measure(); if (GL) { GL.resize(); positionAll(); return; } if (S.ready && ow && oh && W && H && (ow !== W || oh !== H)) mapSel.call(zoomer.translateBy, (W - ow) / 2 / T.k, (H - oh) / 2 / T.k); positionAll(); }).observe(mapEl);

/* labels */
const labelsEl = $('#labels'), LABELS = [];
(function buildLabels() {
  const add = (cls, html, lng, lat, test) => { const el = document.createElement('div'); el.className = 'lab ' + cls; el.innerHTML = `<span class="in">${html}</span>`; labelsEl.appendChild(el); LABELS.push({ el, lng, lat, test }); };
  topojson.feature(GEO.prefs, prefsObj).features.forEach(f => {
    const ja = f.properties.ja; if (['東京都', '大阪府', '京都府', '沖縄県'].includes(ja)) return;
    const c = d3.geoCentroid(f); add('pref', esc(ja), c[0], c[1], k => k >= 2.4 && k < 9);
  });
  SEAS.forEach(([en, ja, lat, lng, min]) => add('sea', `<span class="ja">${esc(ja)}</span>${esc(en)}`, lng, lat, k => k >= min && k < min * 9));
  CITIES.forEach(([en, ja, lat, lng, r]) => add('city r' + r, `${esc(en)}<span class="ja">${esc(ja)}</span>`, lng, lat, k => r === 1 ? k >= 0.6 : r === 2 ? k >= 2.2 : k >= 9));
  add('fuji', `<svg viewBox="0 0 16 12"><path d="M0 12 6 2h4l6 10z" fill="var(--ink-3)"/></svg>富士山`, 138.7274, 35.3606, k => k >= 1.6);
})();

/* pins */
const pinsEl = $('#pins');
let pinEls = new Map(), clusterEls = [], ghostEls = [], cursorEls = new Map(), trainEl = null, popEl = null, spotEl = null, hereEl = null;
function photoSrc(f) { if (f.a) return '/_blob/' + f.a; if (f.d) { const d = S.photos.get(f.d); return d && typeof d.data === 'string' && d.data.startsWith('data:image/') ? d.data : ''; } return ''; }
function currentStay() { const t = today(); let cur = null; for (const p of routeStays()) if (p.start <= t) cur = p; return t >= TRIP.start && t <= TRIP.end ? cur : null; }
function renderPins() {
  const keep = new Set(), cs = codes(), cur = currentStay();
  for (const p of S.places.values()) {
    if (!hasLoc(p)) continue;
    keep.add(p.id);
    let el = pinEls.get(p.id);
    const f0 = picsOf(p)[0], src = f0 ? photoSrc(f0) : '';
    const n = p.kind === 'stay' ? cs.get(p.id) : null;
    const sig = JSON.stringify([p.name, p.kind, p.status, n, src.length, src.slice(0, 40)]);
    if (!el) { el = document.createElement('button'); el.type = 'button'; el.dataset.id = p.id; pinsEl.appendChild(el); pinEls.set(p.id, el); }
    if (el._sig !== sig) { el.innerHTML = `${src ? `<span class="pp"><img src="${esc(src)}" alt="" loading="lazy" decoding="async"></span>` : ''}<span class="pm">${glyph(p.kind, { status: p.status, n })}</span><span class="pl">${esc(p.name)}</span>`; el._sig = sig; }
    el.className = `pin ${p.kind} ${p.status}` + (p.id === S.sel ? ' sel' : '') + (S.day && !onDay(p, S.day) ? ' dim' : '');
    el.setAttribute('aria-label', `${p.name}, ${KINDS[p.kind].label}`);
    el._p = p;
    const peer = S.peers.find(pe => pe.presence && pe.presence.sel === p.id);
    let ring = el.querySelector('.peerring');
    if (peer && !ring) { ring = document.createElement('span'); ring.className = 'peerring'; el.appendChild(ring); }
    if (ring) { if (peer) ring.style.setProperty('--pc', who(peer.by).color); else ring.remove(); }
    let tg = el.querySelector('.today');
    if (cur && cur.id === p.id) { if (!tg) { tg = document.createElement('span'); tg.className = 'today'; el.appendChild(tg); } const t = today(); tg.textContent = cur.start <= t && t < (cur.end || addDays(cur.start, 1)) ? 'TONIGHT' : 'LAST STOP'; }
    else if (tg) tg.remove();
  }
  for (const [id, el] of pinEls) if (!keep.has(id)) { el.remove(); pinEls.delete(id); }
  renderGhosts(); positionAll();
}
function renderGhosts() {
  ghostEls.forEach(g => g.remove()); ghostEls = [];
  if (!S.ideas || !S.ideas.items) return;
  S.ideas.items.forEach((it, i) => {
    if (it.added || !isFinite(it.lat) || !isFinite(it.lng)) return;
    const el = document.createElement('button'); el.type = 'button'; el.className = 'ghost'; el.dataset.idea = i;
    el.innerHTML = `<span>${icon('plus')}</span><em>${esc(it.name)}</em>`; el._ll = [it.lng, it.lat];
    pinsEl.appendChild(el); ghostEls.push(el);
  });
}
const place = (el, x, y) => { el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`; };
function positionAll() {
  if (!S.ready) return;
  const k = zk();
  for (const L of LABELS) { if (GL || baseFor !== 'JP') { L.el.hidden = true; continue; } if (L.test(k)) { const [x, y] = P(L.lng, L.lat); const on = x > -80 && y > -40 && x < W + 80 && y < H + 40; L.el.hidden = !on; if (on) place(L.el, x, y); } else L.el.hidden = true; }
  clusterEls.forEach(c => c.remove()); clusterEls = [];
  const items = [];
  for (const el of pinEls.values()) { const p = el._p; const [x, y] = P(p.lng, p.lat); el._x = x; el._y = y; el._c = false; items.push(el); }
  const pri = el => (el._p.id === S.sel ? 0 : el._p.kind === 'stay' ? 1 : 2);
  items.sort((a, b) => pri(a) - pri(b));
  const R = 24, used = new Set();
  for (const a of items) {
    if (used.has(a)) continue; used.add(a);
    if (a._p.id === S.sel || k >= 60) continue;
    const grp = [a];
    for (const b of items) { if (used.has(b) || b._p.id === S.sel) continue; if (Math.abs(a._x - b._x) < R && Math.abs(a._y - b._y) < R) { grp.push(b); used.add(b); } }
    if (grp.length > 1) {
      grp.forEach(g => g._c = true);
      const c = document.createElement('button'); c.type = 'button';
      c.className = 'cluster' + (grp.some(g => g._p.kind === 'stay') ? ' hasstay' : '');
      c.innerHTML = `<span class="num">${grp.length}</span>`; c.setAttribute('aria-label', `${grp.length} places here, zoom in`);
      c._ids = grp.map(g => g._p.id); pinsEl.appendChild(c); clusterEls.push(c); place(c, a._x, a._y);
    }
  }
  const showLabels = k >= 10;
  for (const el of pinEls.values()) {
    const off = el._c || el._x < -60 || el._y < -80 || el._x > W + 60 || el._y > H + 60;
    el.style.display = off ? 'none' : '';
    if (!off) { place(el, el._x, el._y); el.classList.toggle('showlabel', showLabels); }
    const pp = el.querySelector('.pp'); if (pp) pp.style.display = (el._p.kind === 'stay' || k >= 5 || el._p.id === S.sel) ? '' : 'none';
  }
  for (const g of ghostEls) { const [x, y] = P(g._ll[0], g._ll[1]); place(g, x, y); }
  for (const el of cursorEls.values()) if (el._ll) { const [x, y] = P(el._ll[0], el._ll[1]); place(el, x, y); }
  if (trainEl && trainEl._ll) { const [x, y] = P(trainEl._ll[0], trainEl._ll[1]); place(trainEl, x, y); }
  if (popEl && popEl._ll) { const [x, y] = P(popEl._ll[0], popEl._ll[1]); placePop(x, y); }
  if (spotEl) { const [x, y] = P(spotEl._ll[0], spotEl._ll[1]); place(spotEl, x, y); }
  if (hereEl && hereEl._ll) { const [x, y] = P(hereEl._ll[0], hereEl._ll[1]); place(hereEl, x, y); }
}
function renderRoute() {
  const r = d3.select('#route'); r.selectAll('*').remove();
  const st = routeStays(), t = today(), done = [], todo = [];
  for (let i = 1; i < st.length; i++) (st[i].start <= t ? done : todo).push([[st[i - 1].lng, st[i - 1].lat], [st[i].lng, st[i].lat]]);
  glRoute(done, todo);
  if (GL || st.length < 2) return;
  const ml = c => gpath({ type: 'MultiLineString', coordinates: c });
  r.append('path').attr('class', 'halo').attr('d', ml(done.concat(todo)));
  if (done.length) r.append('path').attr('class', 'done').attr('d', ml(done));
  if (todo.length) r.append('path').attr('class', 'todo').attr('d', ml(todo));
}
function renderLegend() {
  $('#legend').innerHTML = ['stay', 'see', 'craft', 'food', 'walk', 'move'].map(k => `<span>${glyph(k, { status: 'booked' })}${esc(KINDS[k].label)}</span>`).join('');
}

/* map clicks */
mapEl.addEventListener('click', e => {
  if (e.target.closest('.ctl,.card,.banner,.pop')) return;
  const pin = e.target.closest('.pin'); if (pin) { closePop(); select(pin.dataset.id, { fly: false }); return; }
  const cl = e.target.closest('.cluster'); if (cl) { closePop(); zoomTo(fitTransform(cl._ids.map(id => S.places.get(id)), { maxK: Math.max(T.k * 3, 12) })); return; }
  const gh = e.target.closest('.ghost'); if (gh) { const it = S.ideas.items[+gh.dataset.idea]; toast(it.name + (it.why ? ': ' + it.why : '')); return; }
  if (GL) return; // the detailed map reports its own clicks, so a drag never counts as a tap
  const r = mapEl.getBoundingClientRect(); bgClick(e.clientX - r.left, e.clientY - r.top);
});
function bgClick(x, y) {
  const ll = unP(x, y); if (!ll) return;
  if (S.picking) { const cb = S.picking.cb; S.picking = null; mapEl.classList.remove('picking'); hideBanner(); cb(ll); return; }
  if (!canEdit()) return;
  openPop(ll, x, y);
}
// the drop-a-pin popup; a search result (hit) gets its name, a marker and a Google Maps link
function openPop(ll, x, y, hit) {
  closePop();
  const near = hit ? '' : nearestPlaceName(ll[1], ll[0]), edit = canEdit();
  popEl = document.createElement('div'); popEl.className = 'pop'; popEl._ll = ll;
  const sub = hit ? [hit.ja && hit.ja !== hit.n ? hit.ja : '', hit.sub].filter(Boolean).map(esc).join(' · ') : near ? 'Near ' + esc(near) : `${ll[1].toFixed(3)}, ${ll[0].toFixed(3)}`;
  popEl.innerHTML = `<button class="pop-x" type="button" data-px aria-label="Close">${icon('x')}</button><h4>${hit ? esc(hit.n) : 'Drop a pin here'}</h4><p>${sub}</p>
    ${edit ? `${hit ? '<span class="label">Add it as</span>' : ''}<div class="grid">${Object.entries(KINDS).map(([k, v]) => `<button class="btn" type="button" data-k="${k}">${glyph(k)}${esc(v.label)}</button>`).join('')}</div>` : ''}
    ${hit ? `<a class="btn btn-sm gm" href="${esc(gmaps(hit.coords ? { kind: 'note', lat: ll[1], lng: ll[0] } : { name: hit.n, ja: hit.ja, lat: ll[1], lng: ll[0] }))}" target="_blank" rel="noopener">${icon('map')}Open in Google Maps</a>` : ''}`;
  mapEl.appendChild(popEl); placePop(x, y);
  if (hit) { spotEl = document.createElement('div'); spotEl.className = 'spot'; spotEl.innerHTML = '<i></i>'; spotEl._ll = ll; mapEl.appendChild(spotEl); place(spotEl, x, y); }
  popEl.addEventListener('click', ev => {
    if (ev.target.closest('[data-px]')) { closePop(); return; }
    const b = ev.target.closest('[data-k]'); if (!b) return; const k = b.dataset.k; closePop();
    openDialog({ kind: k, lat: +ll[1].toFixed(6), lng: +ll[0].toFixed(6), name: k === 'note' ? '' : hit && !hit.coords ? hit.n : (near || ''), ja: hit && !hit.coords ? hit.ja || '' : '', status: 'planned', start: S.day || '' });
  });
  (popEl.querySelector('[data-k]') || popEl.querySelector('button')).focus({ preventScroll: true });
}
// beside the point on a wide map; on a phone, centred under it (or over it when there's no room) so the marker stays in view
function placePop(x, y) {
  if (!popEl) return; const w = 252, h = popEl.offsetHeight || 220;
  let px, py;
  if (W < 560) { px = (W - w) / 2; py = y + 26; if (py + h > H - 8) py = y - h - 26; }
  else { px = x + 12; py = y - h / 2; if (px + w > W - 8) px = x - w - 12; }
  px = Math.max(8, Math.min(W - w - 8, px)); py = Math.max(8, Math.min(H - h - 8, py)); popEl.style.left = px + 'px'; popEl.style.top = py + 'px';
}
function closePop() { if (popEl) { popEl.remove(); popEl = null; } if (spotEl) { spotEl.remove(); spotEl = null; } }

/* gazetteer */
const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9぀-ヿ㐀-鿿]+/g, ' ').trim();
const GAZ = [
  ...POIS.map(([n, ja, lat, lng, k]) => ({ n, ja, lat, lng, k, sub: 'Sight', f: fold(n + ' ' + ja) })),
  ...CITIES.map(([n, ja, lat, lng]) => ({ n, ja, lat, lng, sub: 'City', f: fold(n + ' ' + ja) })),
  ...GEO.towns.map(([n, lat, lng, pi]) => ({ n, ja: '', lat, lng, sub: GEO.prefNames[pi] || '', f: fold(n) }))
];
function searchGaz(q) {
  const f = fold(q); if (!f || TRIP_COUNTRY() !== 'JP') return [];
  const out = [], seen = new Set();
  for (const pass of [g => g.f.startsWith(f), g => g.f.includes(f)]) for (const g of GAZ) {
    if (out.length >= 8) break; const key = g.n + g.lat; if (seen.has(key)) continue; if (pass(g)) { seen.add(key); out.push(g); }
  }
  return out;
}
function nearestPlaceName(lat, lng) {
  if (TRIP_COUNTRY() !== 'JP') return glNearName(lat, lng);
  let best = null, bd = Infinity; const c = Math.cos(lat * Math.PI / 180);
  for (const g of GAZ) { const d = (g.lat - lat) ** 2 + ((g.lng - lng) * c) ** 2; if (d < bd) { bd = d; best = g; } }
  return best && Math.sqrt(bd) * 111 < 5 ? best.n : glNearName(lat, lng); // islands sit close together, so only name somewhere really nearby
}
// places by name from OpenStreetMap (Photon), inside the trip's country, in English and the local language
async function searchOnline(q, near) {
  if (!q || q.length < 3 || navigator.onLine === false) return [];
  const b = COUNTRY().bbox, box = [b[0] - 1, b[1] - 1, b[2] + 1, b[3] + 1].map(v => v.toFixed(2)).join(',');
  const bias = near ? `&lat=${near.lat.toFixed(4)}&lon=${near.lng.toFixed(4)}&zoom=${Math.round(Math.max(4, Math.min(16, near.z || 10)))}` : '';
  const url = l => `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8&bbox=${box}${bias}${l ? '&lang=' + l : ''}`;
  const get = async u => { const c = new AbortController(), t = setTimeout(() => c.abort(), 6000); try { const r = await fetch(u, { signal: c.signal }); return r.ok ? await r.json() : null; } catch (e) { return null; } finally { clearTimeout(t); } };
  const [en, loc] = await Promise.all([get(url('en')), COUNTRY().lang === 'en' ? null : get(url(''))]);
  if (!en || !Array.isArray(en.features)) return [];
  const local = new Map(((loc && loc.features) || []).map(f => [(f.properties || {}).osm_type + (f.properties || {}).osm_id, (f.properties || {}).name]));
  return en.features.map(f => {
    const p = f.properties || {}, c = (f.geometry || {}).coordinates || [], n = p.name || [p.housenumber, p.street].filter(Boolean).join(' ');
    const ja = local.get(p.osm_type + p.osm_id) || '';
    return { n, ja: ja && ja !== n ? ja : '', lat: +c[1], lng: +c[0], sub: [p.city || p.county || p.state, p.osm_value && p.osm_value !== 'yes' ? p.osm_value.replace(/_/g, ' ') : ''].filter(x => x && x !== n).join(' · '), type: p.osm_key === 'place' || p.osm_key === 'boundary' ? p.osm_value : 'spot', online: true };
  }).filter(g => g.n && isFinite(g.lat) && isFinite(g.lng));
}
function parseCoords(s) {
  const m = s.match(/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/) || s.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || s.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/) || s.match(/^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/);
  if (!m) return null; const lat = +m[1], lng = +m[2];
  return Math.abs(lat) <= 85 && Math.abs(lng) <= 180 && (lat || lng) ? { lat, lng } : null;
}

/* ---------- detailed map: streets, stations, buildings and places, in Tabi's colours ----------
   MapLibre draws OpenStreetMap data (vector tiles from OpenFreeMap, free and keyless) underneath Tabi's own
   pins, route and controls. It starts after the simple map is up. If it can't load (offline with nothing saved,
   or blocked), the simple map stays, so the map always works. */
const GLJS = PWA ? 'vendor/maplibre-gl.js' : 'https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.js';
const GL_SRC = 'https://tiles.openfreemap.org/planet', GL_FONTS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';
let glOn = pref('detail') !== 'off', glTried = false, glP = null;
let GL_ROUTE = { type: 'FeatureCollection', features: [] };

function loadGLJS() {
  if (window.maplibregl) return Promise.resolve(window.maplibregl);
  if (!glP) glP = new Promise((res, rej) => {
    const sc = document.createElement('script'); sc.src = GLJS; sc.async = true;
    sc.onload = () => window.maplibregl ? res(window.maplibregl) : rej(new Error('maplibre'));
    sc.onerror = () => { glP = null; sc.remove(); rej(new Error('maplibre')); };
    document.head.appendChild(sc);
  });
  return glP;
}
const isDark = () => document.documentElement.dataset.theme === 'dark' || (document.documentElement.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);

// the map style: colours come from Tabi's tokens, so it follows light and dark
function glStyle() {
  const cs = getComputedStyle(document.documentElement), v = n => cs.getPropertyValue(n).trim(), dark = isDark();
  const C = {
    land: v('--land'), sea: v('--sea'), ink: v('--ink'), ink2: v('--ink-2'), ink3: v('--ink-3'), surface: v('--surface'),
    blue: v('--blue'), blueInk: v('--blue-ink'), route: v('--route'), yellow: v('--yellow'), yink: v('--yellow-ink'), seaInk: v('--sea-ink'),
    park: dark ? '#2b3252' : '#e1d4a3', wood: dark ? '#283049' : '#dacd98', build: dark ? '#30375a' : '#e7dab2', buildLine: dark ? '#3d456d' : '#d2c291',
    road: dark ? '#3a4167' : '#fbf6e8', major: dark ? '#4c5582' : '#ffffff', casing: dark ? '#12152a' : 'rgba(27,29,46,0.30)', rail: dark ? '#a39d8a' : '#4c4a52'
  };
  const EN = ['coalesce', ['get', 'name:en'], ['get', 'name:latin'], ['get', 'name']];
  const LOCAL = ['coalesce', ['get', LOCAL_NAME_KEY()], ['get', 'name']];
  // English first, with the local script underneath when it differs (Kyoto / 京都)
  const NAME = ['case', ['!=', LOCAL, EN], ['format', EN, {}, '\n', {}, LOCAL, { 'font-scale': 0.8 }], EN];
  const R = ['Noto Sans Regular'], Bd = ['Noto Sans Bold'], It = ['Noto Sans Italic'];
  const halo = { 'text-halo-color': C.land, 'text-halo-width': 1.4, 'text-halo-blur': 0.4 };
  const zi = (...s) => ['interpolate', ['linear'], ['zoom'], ...s];
  const cls = (...c) => ['in', ['get', 'class'], ['literal', c]];
  const omt = (id, type, layer, o) => ({ id, type, source: 'omt', 'source-layer': layer, ...o });
  const SEE = cls('museum', 'attraction', 'art_gallery', 'castle', 'monument', 'place_of_worship', 'zoo', 'theatre', 'aquarium');
  const FOOD = cls('restaurant', 'fast_food', 'cafe', 'bar', 'beer', 'ice_cream', 'bakery');
  const SHOP = cls('grocery', 'shop', 'convenience', 'clothing_store', 'alcohol_shop');
  const minor = cls('minor', 'service', 'track'), mid = cls('secondary', 'tertiary'), major = cls('motorway', 'trunk', 'primary');
  const notTunnel = ['!=', ['get', 'brunnel'], 'tunnel'];
  return {
    version: 8, glyphs: GL_FONTS,
    sources: {
      omt: { type: 'vector', url: GL_SRC, attribution: '© OpenStreetMap contributors · OpenFreeMap · OpenMapTiles' },
      tabiRail: { type: 'geojson', data: RAIL_GEO() },
      tabiRoute: { type: 'geojson', data: GL_ROUTE }
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': C.land } },
      omt('wood', 'fill', 'landcover', { filter: cls('wood', 'forest'), paint: { 'fill-color': C.wood, 'fill-opacity': zi(6, 0.35, 12, 0.8) } }),
      omt('grass', 'fill', 'landcover', { minzoom: 10, filter: cls('grass'), paint: { 'fill-color': C.park, 'fill-opacity': 0.5 } }),
      omt('landuse', 'fill', 'landuse', { minzoom: 12, filter: cls('cemetery', 'hospital', 'school', 'university', 'college', 'stadium', 'pitch', 'playground'), paint: { 'fill-color': C.park, 'fill-opacity': 0.45 } }),
      omt('park', 'fill', 'park', { paint: { 'fill-color': C.park, 'fill-opacity': zi(8, 0.5, 13, 0.9) } }),
      omt('water', 'fill', 'water', { filter: notTunnel, paint: { 'fill-color': C.sea } }),
      omt('river', 'line', 'waterway', { minzoom: 8, filter: notTunnel, paint: { 'line-color': C.sea, 'line-width': zi(8, 0.6, 14, 2, 18, 6) } }),
      omt('pref', 'line', 'boundary', { minzoom: 5, filter: ['all', ['==', ['get', 'admin_level'], 4], ['!=', ['get', 'maritime'], 1]], paint: { 'line-color': C.ink3, 'line-opacity': 0.55, 'line-width': 1, 'line-dasharray': [2, 3] } }),
      omt('country', 'line', 'boundary', { filter: ['all', ['==', ['get', 'admin_level'], 2], ['!=', ['get', 'maritime'], 1]], paint: { 'line-color': C.ink2, 'line-width': 1.2 } }),
      omt('building', 'fill', 'building', { minzoom: 14, paint: { 'fill-color': C.build, 'fill-outline-color': C.buildLine, 'fill-opacity': zi(14, 0, 15, 1) } }),
      omt('path', 'line', 'transportation', { minzoom: 15, filter: cls('path', 'pedestrian'), paint: { 'line-color': C.ink3, 'line-width': 1, 'line-dasharray': [2, 2], 'line-opacity': 0.7 } }),
      omt('road-minor', 'line', 'transportation', { minzoom: 13, filter: minor, layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': C.road, 'line-width': zi(13, 0.8, 16, 4, 18, 10) } }),
      omt('road-mid-case', 'line', 'transportation', { minzoom: 10, filter: mid, layout: { 'line-join': 'round' }, paint: { 'line-color': C.casing, 'line-width': zi(10, 1.2, 14, 4.5, 18, 16) } }),
      omt('road-mid', 'line', 'transportation', { minzoom: 10, filter: mid, layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': C.road, 'line-width': zi(10, 0.6, 14, 3, 18, 13) } }),
      omt('road-major-case', 'line', 'transportation', { minzoom: 6, filter: major, layout: { 'line-join': 'round' }, paint: { 'line-color': C.casing, 'line-width': zi(6, 0.8, 10, 2, 14, 6, 18, 20) } }),
      omt('road-major', 'line', 'transportation', { minzoom: 6, filter: major, layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': C.major, 'line-width': zi(6, 0.4, 10, 1.2, 14, 4.5, 18, 17) } }),
      // railways read like a paper map: an ink line, broken with paper at street level
      omt('rail', 'line', 'transportation', { minzoom: 8, filter: ['all', cls('rail', 'transit'), notTunnel], paint: { 'line-color': C.rail, 'line-width': zi(8, 0.8, 14, 1.8, 18, 3.2) } }),
      omt('rail-hatch', 'line', 'transportation', { minzoom: 14, filter: ['all', cls('rail', 'transit'), notTunnel], paint: { 'line-color': C.land, 'line-width': zi(14, 0.8, 18, 1.8), 'line-dasharray': [3, 3] } }),
      omt('subway', 'line', 'transportation', { minzoom: 11, filter: ['all', cls('rail', 'transit'), ['==', ['get', 'brunnel'], 'tunnel']], paint: { 'line-color': C.blue, 'line-opacity': 0.5, 'line-width': zi(11, 0.8, 16, 2), 'line-dasharray': [2, 1.5] } }),
      omt('ferry', 'line', 'transportation', { minzoom: 7, filter: cls('ferry'), paint: { 'line-color': C.seaInk, 'line-width': zi(7, 0.8, 14, 1.6), 'line-dasharray': [3, 2] } }),
      { id: 'tabi-rail', type: 'line', source: 'tabiRail', maxzoom: 11, layout: { visibility: railOn && RAIL_GEO().features.length ? 'visible' : 'none', 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': C.ink, 'line-opacity': 0.7, 'line-width': zi(4, 1.2, 10, 2.6) } },
      { id: 'route-halo', type: 'line', source: 'tabiRoute', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': C.land, 'line-width': 7, 'line-opacity': 0.9 } },
      { id: 'route-done', type: 'line', source: 'tabiRoute', filter: ['==', ['get', 's'], 'done'], layout: { 'line-cap': 'round' }, paint: { 'line-color': C.route, 'line-width': 3 } },
      { id: 'route-todo', type: 'line', source: 'tabiRoute', filter: ['==', ['get', 's'], 'todo'], paint: { 'line-color': C.route, 'line-width': 3, 'line-dasharray': [1.6, 1.2] } },
      omt('road-label', 'symbol', 'transportation_name', { minzoom: 14, filter: cls('primary', 'secondary', 'tertiary', 'trunk', 'minor'), layout: { 'symbol-placement': 'line', 'text-field': EN, 'text-font': R, 'text-size': zi(14, 10, 18, 13), 'text-max-angle': 30 }, paint: { 'text-color': C.ink2, ...halo } }),
      omt('water-label', 'symbol', 'water_name', { layout: { 'text-field': EN, 'text-font': It, 'text-size': zi(4, 11, 10, 14), 'text-letter-spacing': 0.12, 'text-max-width': 8 }, paint: { 'text-color': C.seaInk } }),
      // places to go: ultramarine for sights, ochre for food, quiet ink for shops
      omt('poi-see', 'circle', 'poi', { minzoom: 14, filter: SEE, paint: { 'circle-color': C.blue, 'circle-radius': zi(14, 2.5, 17, 4.5), 'circle-stroke-color': C.land, 'circle-stroke-width': 1 } }),
      omt('poi-food', 'circle', 'poi', { minzoom: 15, filter: FOOD, paint: { 'circle-color': C.yellow, 'circle-radius': zi(15, 2.2, 17, 4), 'circle-stroke-color': C.yink, 'circle-stroke-width': 1 } }),
      omt('poi-shop', 'circle', 'poi', { minzoom: 16, filter: SHOP, paint: { 'circle-color': C.ink3, 'circle-radius': 2.5 } }),
      omt('poi-label', 'symbol', 'poi', { minzoom: 15, filter: ['any', SEE, FOOD, SHOP, cls('park')], layout: { 'text-field': EN, 'text-font': R, 'text-size': 11, 'text-anchor': 'top', 'text-offset': [0, 0.6], 'text-max-width': 8, 'text-optional': true }, paint: { 'text-color': ['case', SEE, C.blueInk, FOOD, C.yink, C.ink2], ...halo } }),
      // stations and ferry ports: a paper dot ringed in ink, like a transit map
      omt('station', 'circle', 'poi', { minzoom: 11, filter: cls('railway', 'harbor', 'ferry_terminal'), paint: { 'circle-color': C.surface, 'circle-stroke-color': C.ink, 'circle-stroke-width': zi(11, 1.2, 16, 2), 'circle-radius': zi(11, 2.5, 16, 5) } }),
      omt('station-label', 'symbol', 'poi', { minzoom: 12, filter: cls('railway', 'harbor', 'ferry_terminal'), layout: { 'text-field': NAME, 'text-font': Bd, 'text-size': zi(12, 10.5, 16, 13), 'text-anchor': 'top', 'text-offset': [0, 0.7], 'text-max-width': 9 }, paint: { 'text-color': C.ink, ...halo } }),
      omt('suburb', 'symbol', 'place', { minzoom: 12, maxzoom: 17, filter: cls('suburb', 'quarter', 'neighbourhood'), layout: { 'text-field': EN, 'text-font': R, 'text-size': zi(12, 10, 16, 12), 'text-transform': 'uppercase', 'text-letter-spacing': 0.08, 'text-max-width': 7 }, paint: { 'text-color': C.ink2, ...halo } }),
      omt('village', 'symbol', 'place', { minzoom: 10, filter: cls('village', 'hamlet', 'island'), layout: { 'text-field': NAME, 'text-font': R, 'text-size': zi(10, 11, 14, 13), 'text-max-width': 8 }, paint: { 'text-color': C.ink, ...halo } }),
      omt('town', 'symbol', 'place', { minzoom: 8, filter: cls('town'), layout: { 'text-field': NAME, 'text-font': Bd, 'text-size': zi(8, 11, 14, 15), 'text-max-width': 8 }, paint: { 'text-color': C.ink, ...halo } }),
      omt('city', 'symbol', 'place', { minzoom: 4, filter: cls('city'), layout: { 'text-field': NAME, 'text-font': Bd, 'text-size': zi(4, 11, 8, 14, 14, 18), 'text-max-width': 8, 'symbol-sort-key': ['get', 'rank'] }, paint: { 'text-color': C.ink, ...halo } })
    ]
  };
}
function RAIL_GEO() { return { type: 'FeatureCollection', features: TRIP_COUNTRY() === 'JP' ? [{ type: 'Feature', properties: {}, geometry: { type: 'MultiLineString', coordinates: RAIL.map(l => l.map(([a, b]) => [b, a])) } }] : [] }; }
function glRoute(done, todo) {
  const f = (legs, s) => legs.map(c => ({ type: 'Feature', properties: { s }, geometry: { type: 'LineString', coordinates: c } }));
  GL_ROUTE = { type: 'FeatureCollection', features: [...f(done, 'done'), ...f(todo, 'todo')] };
  const src = GL && GL.getSource('tabiRoute'); if (src) src.setData(GL_ROUTE);
}
function glGo(t, dur) {
  return new Promise(res => {
    if (!GL) { res(); return; }
    const d = REDUCE ? 0 : dur; let done = false; const fin = () => { if (!done) { done = true; res(); } };
    GL.once('moveend', fin); setTimeout(fin, d + 500);
    if (t.gl === 'fit') {
      const [a, b] = t.b;
      if (Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6) GL.easeTo({ center: a, zoom: Math.min(t.maxZoom, 15), duration: d });
      else GL.fitBounds(t.b, { padding: t.pad, maxZoom: t.maxZoom, duration: d });
    } else GL.easeTo({ center: t.c, zoom: Math.max(2, Math.min(18, t.z)), offset: t.off || [0, 0], duration: d });
  });
}
// start the detailed map; `loud` says so if it can't
async function startGL(loud) {
  if (GL || glTried || !glOn) return; glTried = true;
  let m = null;
  try {
    const ml = await loadGLJS();
    const el = $('#gl'); measure();
    const c = unP(W / 2, H / 2) || [137, 36], z = K0 + Math.log2(T.k);
    m = new ml.Map({ container: el, style: glStyle(), center: c, zoom: z, minZoom: 2, maxZoom: 18.5, attributionControl: false, dragRotate: false, pitchWithRotate: false, touchPitch: false, renderWorldCopies: false,
      localIdeographFontFamily: "'Hiragino Sans','Hiragino Kaku Gothic ProN','Noto Sans JP','Apple SD Gothic Neo','Noto Sans KR','PingFang TC','Noto Sans TC',sans-serif", fadeDuration: 120 });
    m.touchZoomRotate.disableRotation();
    await new Promise((res, rej) => { const to = setTimeout(() => rej(new Error('timeout')), 15000); m.once('idle', () => { clearTimeout(to); res(); }); });
    // only swap if real map data arrived (offline with nothing saved leaves an empty map)
    const got = ['water', 'transportation', 'place', 'landcover', 'building'].reduce((n, l) => n + m.querySourceFeatures('omt', { sourceLayer: l }).length, 0);
    if (!got) throw new Error('no tiles');
    // carry over wherever the simple map is now
    const c2 = unP(W / 2, H / 2); if (c2) m.jumpTo({ center: c2, zoom: K0 + Math.log2(T.k) });
    GL = m;
    mapSel.on('.zoom', null); // the detailed map pans and zooms now
    m.on('move', positionAll); m.on('moveend', onViewChange);
    m.on('click', e => bgClick(e.point.x, e.point.y));
    mapEl.classList.add('gl');
    renderRoute(); positionAll();
  } catch (e) {
    if (m) try { m.remove(); } catch (er) {}
    GL = null; $('#gl').innerHTML = '';
    if (loud) toast(navigator.onLine === false ? "The detailed map needs the internet the first time you look at an area. Using the simple map for now." : "The detailed map couldn't load. Using the simple map.");
  }
}
function stopGL() {
  if (!GL) return;
  const c = GL.getCenter(), z = GL.getZoom();
  GL.remove(); GL = null; $('#gl').innerHTML = ''; mapEl.classList.remove('gl');
  mapSel.call(zoomer).on('dblclick.zoom', null);
  mapSel.call(zoomer.transform, viewAt([c.lng, c.lat], 2 ** (z - K0)));
  renderRoute(); positionAll();
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (GL) GL.setStyle(glStyle()); });
addEventListener('online', () => { if (glOn && !GL) { glTried = false; startGL(); } });

/* save the map around every place on the trip, so the detailed map works without signal (iPhone app only) */
async function saveMapsOffline() {
  if (!PWA) return;
  if (navigator.onLine === false) { toast('Connect to the internet to save maps.'); return; }
  let tpl;
  try { const tj = await (await fetch(GL_SRC)).json(); tpl = tj.tiles[0]; } catch (e) { toast("Couldn't reach the map server. Try again later."); return; }
  const pts = [...S.places.values()].filter(hasLoc); if (!pts.length) { toast('Add some places first.'); return; }
  const tile = (lng, lat, z) => { const n = 2 ** z, r = lat * Math.PI / 180; return [Math.floor((lng + 180) / 360 * n), Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n)]; };
  const want = new Set();
  const add = (z, x, y) => want.add(`${z}/${x}/${y}`);
  // the whole trip at overview zooms, then each place close up (tiles stop at zoom 14 and are drawn larger beyond)
  const lo = pts.map(p => p.lng), la = pts.map(p => p.lat);
  for (let z = 4; z <= 9; z++) { const [x0, y0] = tile(Math.min(...lo), Math.max(...la), z), [x1, y1] = tile(Math.max(...lo), Math.min(...la), z); for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) add(z, x, y); }
  for (const p of pts) for (const [z, r] of [[10, 0], [11, 0], [12, 1], [13, 1], [14, 1]]) { const [x, y] = tile(p.lng, p.lat, z); for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) add(z, x + dx, y + dy); }
  const urls = [...want].map(k => { const [z, x, y] = k.split('/'); return tpl.replace('{z}', z).replace('{x}', x).replace('{y}', y); });
  for (const f of ['Noto Sans Regular', 'Noto Sans Bold', 'Noto Sans Italic']) for (const r of ['0-255', '256-511', '8192-8447', ...({ TH: ['3584-3839'], GR: ['768-1023', '7936-8191'], VN: ['768-1023', '7680-7935'] }[TRIP_COUNTRY()] || [])]) urls.push(GL_FONTS.replace('{fontstack}', encodeURIComponent(f)).replace('{range}', r));
  let n = 0, bad = 0; toast(`Saving maps: 0 of ${urls.length}`);
  const next = async () => { while (urls.length) { const u = urls.shift(); try { const r = await fetch(u); if (!r.ok) bad++; } catch (e) { bad++; } n++; if (n % 40 === 0) toast(`Saving maps: ${n} of ${n + urls.length}`); } };
  await Promise.all([next(), next(), next(), next()]);
  toast(bad ? `Saved most of the maps. ${bad} parts didn't download; try again on better Wi-Fi.` : 'Maps saved. The detailed map now works offline around your places.');
}
// the nearest named place on the detailed map, for a dropped pin
function glNearName(lat, lng) {
  if (!GL) return '';
  try {
    const p = GL.project([lng, lat]); if (p.x < 0 || p.y < 0 || p.x > W || p.y > H) return '';
    const layers = ['poi-label', 'station-label', 'suburb', 'village', 'town', 'city'].filter(id => GL.getLayer(id));
    let best = '', bd = Infinity;
    for (const f of GL.queryRenderedFeatures([[p.x - 60, p.y - 60], [p.x + 60, p.y + 60]], { layers })) {
      const pr = f.properties || {}, nm = pr['name:en'] || pr.name_en || pr.name; if (!nm || !f.geometry || f.geometry.type !== 'Point') continue;
      const q = GL.project(f.geometry.coordinates), d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2; if (d < bd) { bd = d; best = nm; }
    }
    return best;
  } catch (e) { return ''; }
}

/* ---------- navigation ---------- */
// the money icon and the names of the book and phrases follow the trip's country
const moneyIcon = () => COUNTRY().cur === 'JPY' ? 'yen' : 'wallet';
const phrasesTitle = () => COUNTRY().words ? 'Local words' : 'Phrases';
let VIEWS = [], NAV = [];
function renderNav() {
  VIEWS = [['today', 'Today', 'today'], ['plan', 'Plan', 'plan'], ['stays', 'Stays', 'stay'], ['spend', 'Spend', moneyIcon()], ['notes', 'Notes', 'note'], ['stamps', BOOK().title, 'stamp'], ['phrases', phrasesTitle(), 'chat']];
  NAV = [['today', 'Today', 'today'], ['map', 'Map', 'mapnav'], ['plan', 'Plan', 'plan'], ['spend', 'Spend', moneyIcon()], ['more', 'More', 'more']];
  $('#rail').innerHTML = VIEWS.map(([k, l, ic]) => `<button type="button" data-nav="${k}" aria-current="${S.tab === k}">${icon(ic)}${l}</button>`).join('');
  const cur = S.view === 'map' ? 'map' : ['stays', 'notes', 'stamps', 'phrases', 'more'].includes(S.tab) ? 'more' : S.tab;
  $('#appnav').innerHTML = NAV.map(([k, l, ic]) => `<button type="button" data-nav="${k}" aria-current="${cur === k}">${icon(ic)}${l}</button>`).join('');
}
function setView(v) {
  S.view = v;
  document.body.className = document.body.className.replace(/\bv-\S+/g, '').trim() + ' v-' + v;
  renderNav();
  if (v === 'map') requestAnimationFrame(() => { measure(); positionAll(); });
  if (v === 'map' || v === 'plan') requestAnimationFrame(scrollDaysToToday);
}
function go(tab) {
  if (tab === 'map') { setView('map'); return; }
  S.tab = tab; if (tab !== 'more') pref('tab', tab);
  if (isPhone()) setView(tab); else renderNav();
  $('#pbody').scrollTop = 0; renderPanel();
}
document.addEventListener('click', e => { const b = e.target.closest('[data-nav]'); if (b) go(b.dataset.nav); });

/* ---------- header and days ---------- */
function renderHeader() {
  const t = today(), dn = TRIP_DAYS.indexOf(t) + 1;
  $('#brandTitle').textContent = S.settings.title;
  $('#brandSub').textContent = `Tabi · ${fmtShort(TRIP.start)} to ${fmtShort(TRIP.end)}`;
  $('#daycount').innerHTML = dn > 0 ? `<b>DAY</b><span class="num">${dn}/${TRIP_DAYS.length}</span>` : t < TRIP.start ? `<b>IN</b><span class="num">${diffDays(t, TRIP.start)} days</span>` : `<b>HOME</b><span>Welcome back</span>`;
  const live = $('#live'); live.classList.toggle('ok', S.mode === 'shared');
  const names = [...new Set(S.peers.map(p => firstName(p.by)))];
  $('#liveText').textContent = S.mode === 'shared' ? (names.length ? `Live with ${names.join(' and ')}` : 'Shared map') : S.mode === 'local' ? (PWA ? 'Saved on this phone' : 'On this device only') : S.mode === 'slow' ? 'Still connecting…' : 'Connecting…';
  $('#roTag').hidden = canEdit() || S.mode === 'loading';
  $('#addBtn').hidden = !canEdit();
  const seen = new Set(); let h = '';
  if (S.mode === 'shared' && S.me) h += `<span class="peer me" style="--pc:${esc(S.me.color || 'var(--ink)')}" title="You"><img src="${esc(S.me.avatarUrl)}" alt="You"></span>`;
  for (const p of S.peers) { const key = p.by || p.peer; if (seen.has(key)) continue; seen.add(key); const w = who(p.by);
    h += `<button class="peer" type="button" data-peer="${esc(p.peer)}" style="--pc:${esc(w.color)}" title="${esc(w.name)} is here. Tap to go where they are."><img src="${esc(w.avatarUrl)}" alt="${esc(w.name)}"></button>`; }
  $('#peers').innerHTML = h;
}
function renderDays() {
  const t = today(); let h = '';
  $('#days').style.gridTemplateColumns = `repeat(${TRIP_DAYS.length}, minmax(44px, 1fr))`;
  TRIP_DAYS.forEach((d, i) => {
    const last = i === TRIP_DAYS.length - 1, st = last ? null : nightState(d), dt = parseD(d);
    const lbl = last ? 'Fly home' : st ? st.name.split(/[,(]/)[0] : i === 0 ? 'We leave' : '';
    const cls = ['day', st ? st.status : '', d === t ? 'today' : '', d < t ? 'past' : '', S.day === d ? 'sel' : '', S.playDay === d ? 'play' : ''].join(' ');
    h += `<button class="${cls}" type="button" data-day="${d}" title="${esc(fmtDay(d))}${st ? ' · ' + esc(st.name) : ''}"><span>${dt.toLocaleDateString('en-AU', { weekday: 'short' })}</span><b class="num">${dt.getDate()}</b><span class="lbl">${esc(lbl)}</span></button>`;
  });
  $('#days').innerHTML = h;
}
$('#days').addEventListener('click', e => {
  const b = e.target.closest('[data-day]'); if (!b) return; const d = b.dataset.day;
  S.day = S.day === d ? null : d; renderAll();
  if (S.day) {
    const on = [...S.places.values()].filter(p => onDay(p, d) && hasLoc(p));
    if (on.length) zoomTo(fitTransform(on, { maxK: 13 }));
    if (!isPhone() || S.view !== 'map') { if (S.tab !== 'plan') { S.tab = 'plan'; if (isPhone()) setView('plan'); renderNav(); } if (S.filter === 'week' && !inWeekDate(d)) S.filter = 'all'; renderPanel(); const hd = $(`[data-dayhead="${d}"]`); if (hd) hd.scrollIntoView({ block: 'start' }); }
  }
});
const inWeekDate = d => d >= today() && d <= addDays(today(), 7);
function scrollDaysToToday() { const el = $('.day.today'); if (el) { const c = $('#days'); c.scrollLeft = Math.max(0, el.offsetLeft - c.clientWidth / 3); } }

/* ---------- panel ---------- */
function renderPanel() {
  const body = $('#pbody'); const keep = body.scrollTop;
  if ((S.mode === 'loading' || S.mode === 'slow') && !S.places.size) {
    body.innerHTML = `<div class="empty"><b>${S.mode === 'slow' ? 'Still connecting to your shared map' : 'Opening your trip…'}</b>Your stays, plans, spending and photos will appear here.</div>`; return;
  }
  let tab = S.tab; if (tab === 'more' && !isPhone()) tab = 'today';
  body.innerHTML = ({ today: todayHTML, plan: planHTML, stays: staysHTML, spend: spendHTML, notes: notesHTML, stamps: stampsHTML, phrases: phrasesHTML, more: moreHTML }[tab] || todayHTML)();
  body.scrollTop = keep;
}
function thumbHTML(p, n) {
  const f = picsOf(p)[0]; const src = f ? photoSrc(f) : '';
  return `<span class="thumb">${src ? `<img src="${esc(src)}" alt="" loading="lazy">` : glyph(p.kind, { status: p.status })}${n ? `<span class="n num">${n}</span>` : ''}</span>`;
}
function rowHTML(p, cs, far) {
  const n = cs.get(p.id); const bits = [KINDS[p.kind].label, statusLabel(p)];
  if (far && hereNow() && hasLoc(p) && km(hereNow(), p) < 60) bits.push(distText(km(hereNow(), p)) + ' away');
  if (p.time && p.start) bits.unshift(fmtTime(p.time));
  if (p.kind === 'stay' && p.end) bits.push(`${nightsOf(p)} night${nightsOf(p) === 1 ? '' : 's'}`);
  if (p.price != null) bits.push(money(p.price) + (p.kind === 'stay' ? '/night' : ''));
  const likes = Object.keys(p.likes).length, dim = S.day && !onDay(p, S.day);
  return `<button class="row ${p.id === S.sel ? 'sel' : ''} ${dim ? 'dim' : ''}" type="button" data-id="${esc(p.id)}">${thumbHTML(p, n)}
    <span style="min-width:0"><span class="rname">${esc(p.name)}${p.ja ? `<span class="ja">${esc(p.ja)}</span>` : ''}</span><span class="rmeta num">${esc(bits.join(' · '))}</span></span>
    <span class="rside">${likes ? `<span class="hearts">${icon('heart')}${likes > 1 ? likes : ''}</span>` : ''}${p.visited ? stampSVG(p, 'mini') : ''}</span></button>${p.links.length ? `<div class="rlinks ${dim ? 'dim' : ''}">${p.links.map(l => `<a class="lchip" href="${esc(l.url)}" target="_blank" rel="noopener">${icon('link')}${esc(l.label)}</a>`).join('')}</div>` : ''}`;
}
function viewHead(title, sub) { return `<div class="vh"><span class="label">${esc(sub || '')}</span><div class="h-title">${esc(title)}</div></div>`; }
function dayItems(d) { return itinerary().filter(p => p.kind !== 'note' && p.status !== 'maybe' && p.start === d); }

/* today */
function todayHTML() {
  const t = today(), dn = TRIP_DAYS.indexOf(t) + 1, tm = addDays(t, 1);
  const during = dn > 0;
  const hero = `<div class="today-hero"><div><span class="label">${during ? `Day ${dn} of ${TRIP_DAYS.length}` : t < TRIP.start ? `Trip starts in ${diffDays(t, TRIP.start)} days` : 'Trip finished'}</span><div class="h-display" style="margin-top:6px">${esc(fmtLong(t))}</div></div>
    <svg class="comp" viewBox="0 0 84 84" aria-hidden="true"><rect x="0" y="0" width="40" height="40" fill="var(--red)"/><circle cx="64" cy="20" r="20" fill="var(--blue)"/><path d="M0 84 20 44l20 40z" fill="var(--yellow)"/><rect x="44" y="44" width="40" height="40" fill="var(--ink)"/><text x="64" y="71" text-anchor="middle" font-family="Plus Jakarta Sans,sans-serif" font-weight="800" font-size="22" fill="var(--paper)">${during ? dn : '·'}</text></svg></div>`;
  // tonight
  const night = t < TRIP.end ? nightState(t) : null;
  let tonight;
  if (night) {
    const ni = diffDays(night.start, t) + 1, nn = Math.max(1, nightsOf(night));
    const out = night.end ? `check-out ${fmtDay(night.end)}${night.checkout ? ' by ' + fmtTime(night.checkout) : ''}` : '';
    tonight = `<div class="block red"><div class="sec-h"><span class="label">Tonight</span><span class="chip ${night.status}">${statusLabel(night)}</span></div>
      <div class="h-head">${esc(night.name)}</div><div class="muted" style="font-size:13px">Night ${ni} of ${nn}${out ? ' · ' + out : ''}${night.start === t && night.checkin ? ` · check-in from ${fmtTime(night.checkin)}` : ''}</div>
      ${night.address ? `<div style="font-size:13px">${esc(night.address)}</div>` : ''}
      <div class="acts">${night.addressJa || night.address ? `<button class="btn btn-sm" type="button" data-showaddr="${esc(night.id)}">${icon('car')}Show to driver</button>` : ''}${ticketsOf(night).length ? `<button class="btn btn-sm" type="button" data-ticket="${esc(night.id)}">${icon('ticket')}Ticket</button>` : ''}${hasLoc(night) ? `<a class="btn btn-sm" href="${esc(gmaps(night))}" target="_blank" rel="noopener">${icon('map')}Directions</a>` : ''}<button class="btn btn-sm btn-ghost" type="button" data-id="${esc(night.id)}">Details</button></div></div>`;
  } else if (during && t < TRIP.end) {
    tonight = `<div class="block red"><span class="label">Tonight</span><div class="h-head">Nowhere to sleep yet</div>${canEdit() ? `<div class="acts"><button class="btn btn-sm btn-red" type="button" data-gap="${t}|${tm}">${icon('plus')}Add tonight's stay</button></div>` : ''}</div>`;
  } else tonight = '';
  // next up
  const now = nowMins();
  const upcoming = itinerary().filter(p => p.kind !== 'note' && p.status !== 'maybe' && p.start && (p.start > t || (p.start === t && (minsOf(p.time) ?? 24 * 60) >= now)));
  const nx = upcoming.find(p => !(p.kind === 'stay' && p.start <= t));
  let next = '';
  if (nx) {
    const sameDay = nx.start === t, m = minsOf(nx.time);
    const dd = diffDays(t, nx.start);
    const when = sameDay ? (m != null ? untilText(m - now) : 'later today') : dd === 1 ? 'tomorrow' : `in ${dd} days`;
    next = `<div class="block blue" data-id="${esc(nx.id)}" style="cursor:pointer"><div class="sec-h"><span class="label">Next up</span><span class="label" style="color:var(--blue-ink)">${esc(when)}</span></div>
      <div style="display:flex;gap:12px;align-items:center">${glyph(nx.kind, { status: nx.status, cls: 'g' }).replace('class="g"', 'class="g" style="width:28px;height:28px"')}<div style="min-width:0"><div class="next-time num">${nx.time ? fmtTime(nx.time) : sameDay ? 'Today' : fmtDay(nx.start)}</div><div class="h-head" style="margin-top:4px">${esc(nx.name)}</div></div></div>
      ${nx.notes ? `<div class="muted" style="font-size:13px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(nx.notes)}</div>` : ''}${ticketsOf(nx).length ? `<div class="acts"><button class="btn btn-sm" type="button" data-ticket="${esc(nx.id)}">${icon('ticket')}Show ticket</button>${nx.conf ? `<span class="fine" style="align-self:center">Ref ${esc(nx.conf)}</span>` : ''}</div>` : ''}</div>`;
  }
  const tl = (list) => list.length ? `<div class="timeline">${list.map(p => `<button class="tl" type="button" data-id="${esc(p.id)}"><span class="tt">${p.time ? fmtTime(p.time) : p.kind === 'stay' ? 'Stay' : 'Any time'}</span>${glyph(p.kind, { status: p.status })}<span><span class="tn">${esc(p.name)}</span><span class="tm">${esc(KINDS[p.kind].label)}${p.kind === 'stay' && p.checkin ? ' · check-in from ' + fmtTime(p.checkin) : ''}</span></span></button>`).join('')}</div>` : '';
  const todayList = dayItems(t), tmList = dayItems(tm);
  const spentToday = [...S.spend.values()].filter(x => x.date === t).reduce((s, x) => s + x.amount, 0);
  const b = S.settings.budget, pct = b ? Math.min(100, spentToday / b * 100) : 0;
  return hero + `<div class="sec">${tonight}${next}</div>
    <div class="sec"><div class="sec-h"><span class="label">Today's plan</span>${canEdit() ? `<button class="btn btn-sm btn-ghost" type="button" data-addday="${t}">${icon('plus')}Add</button>` : ''}</div>${tl(todayList) || '<div class="muted" style="font-size:14px">Nothing planned. Tap the map to add something, or keep the day free for drawing.</div>'}</div>
    ${tmList.length ? `<div class="sec"><span class="label">Tomorrow · ${esc(fmtDay(tm))}</span>${tl(tmList)}</div>` : ''}
    <div class="sec"><div class="sec-h"><span class="label">Spent today</span><button class="btn btn-sm btn-ghost" type="button" data-nav="spend">${icon('plus')}Add expense</button></div>
      <div class="big-num">${money(spentToday)}${b ? `<span class="muted" style="font-size:14px;font-weight:600;letter-spacing:0"> of ${money(b)}</span>` : ''}</div>
      ${b ? `<div class="meter ${spentToday > b ? 'over' : ''}"><i style="width:${pct}%"></i></div>` : '<div class="muted" style="font-size:13px">Set a daily budget on the Spend tab to track it here.</div>'}</div>
    ${nearHTML()}
    <div class="sec"><span class="label">Quick</span><div class="quick"><button class="btn" type="button" data-nav="phrases">${icon('chat')}${phrasesTitle()}</button><button class="btn" type="button" data-nav="spend">${icon(moneyIcon())}Convert</button><button class="btn" type="button" data-nav="map">${icon('mapnav')}Map</button></div></div>`;
}
const gmaps = p => `https://www.google.com/maps/search/?api=1&query=${p.kind === 'note' || !p.name ? `${p.lat},${p.lng}` : encodeURIComponent(p.name + (p.ja ? ' ' + p.ja : ''))}`;

/* plan */
function planHTML() {
  const cs = codes(); const all = itinerary().filter(p => p.kind !== 'note');
  const week = S.filter === 'week';
  const list = all.filter(p => S.filter === 'all' || (week ? inWeek(p) : p.kind === S.filter));
  const t = today();
  let h = viewHead('Plan', `${S.places.size} places`) + `<div class="sec" style="border-bottom:0;padding-top:8px"><div class="filters">${FILTER_KEYS.map(([k, l]) => `<button class="fchip" type="button" data-filter="${k}" aria-pressed="${S.filter === k}">${KINDS[k] ? glyph(k) : ''}${l}</button>`).join('')}</div>${latelyHTML()}</div>`;
  if (!S.places.size) return h + `<div class="empty"><b>Start your trip</b>Tap anywhere on the map to drop your first pin, or use Add a place.</div>`;
  const groups = new Map();
  if (week) for (let d = t; d <= addDays(t, 7); d = addDays(d, 1)) groups.set(d, []);
  for (const p of list) { const k = !p.start ? 'none' : week && p.start < t ? t : p.start; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(p); }
  if (t >= TRIP.start && t <= TRIP.end && !groups.has(t) && S.filter === 'all') groups.set(t, []);
  const keys = [...groups.keys()].sort((a, b) => a === 'none' ? 1 : b === 'none' ? -1 : a.localeCompare(b));
  for (const k of keys) {
    const items = groups.get(k);
    if (k === 'none') h += `<div class="dayhead">Any time <small>no date yet</small></div>`;
    else { const dn = TRIP_DAYS.indexOf(k) + 1; h += `<div class="dayhead ${k === t ? 'today' : ''}" data-dayhead="${k}">${fmtDay(k)} <small>${dn > 0 ? 'Day ' + dn : ''}${k === t ? ' · today' : ''}</small></div>`; }
    if (week && k !== 'none' && !items.some(p => p.kind === 'stay') && k < TRIP.end) {
      const st = nightState(k);
      h += st ? `<div class="sleep">${glyph('stay', { status: st.status })}Sleeping at <b>${esc(st.name)}</b></div>` : `<div class="sleep none">${glyph('stay', { status: 'maybe' })}Nowhere to sleep yet${canEdit() ? ` <button class="btn btn-sm" type="button" data-gap="${k}|${addDays(k, 1)}">${icon('plus')}Add a stay</button>` : ''}</div>`;
    }
    h += items.length ? items.map(p => rowHTML(p, cs)).join('') : `<div class="empty" style="padding:10px 18px">Nothing planned${k === t ? ' today' : ' yet'}.</div>`;
  }
  if (!list.length && !week) h += `<div class="empty">Nothing here yet.</div>`;
  return h;
}
function latelyHTML() {
  const rec = [...S.places.values()].filter(p => p.last && p.last.at).sort((a, b) => b.last.at - a.last.at).slice(0, 3);
  if (!rec.length) return '';
  return `<span class="label" style="margin-top:6px">Lately</span><div class="lately">${rec.map(p => `<div><img src="${esc(who(p.last.by).avatarUrl)}" alt=""><span><b>${esc(firstName(p.last.by))}</b> ${esc(p.last.what || 'edited')} <b>${esc(p.name)}</b> · ${esc(ago(p.last.at))}</span></div>`).join('')}</div>`;
}

/* stays */
function curBar() {
  return `<div class="inline"><div class="seg" role="group" aria-label="Currency"><button type="button" data-cur="jpy" aria-pressed="${S.cur === 'jpy'}">${esc(CL().pre.trim())} ${esc(CL().name)}</button><button type="button" data-cur="aud" aria-pressed="${S.cur === 'aud'}">${esc(CH().pre.trim())} ${esc(CH().name.replace(/^(Australian|NZ|US|Canadian|Singapore) d/, 'D'))}</button></div><label for="rateIn">${esc(CH().pre.trim())}1 = ${esc(CL().pre.trim())}</label><input id="rateIn" class="input num" inputmode="decimal" value="${esc(S.settings.rate || '')}" placeholder="${COUNTRY().cur === 'JPY' ? '113' : 'rate'}" ${canEdit() ? '' : 'disabled'}></div>`;
}
function staysHTML() {
  const stays = [...S.places.values()].filter(p => p.kind === 'stay').sort((a, b) => (a.start || '9999').localeCompare(b.start || '9999'));
  const booked = stays.filter(p => p.status === 'booked'), short = stays.filter(p => p.status === 'planned');
  const sum = a => a.reduce((s, p) => s + (totalOf(p) || 0), 0), nn = a => a.reduce((s, p) => s + nightsOf(p), 0);
  const B = sum(booked), Sh = sum(short);
  const t = today();
  let h = viewHead('Stays', `${NIGHTS.length} nights`) + `<div class="sec">${curBar()}
    <div class="tiles"><div class="tile red"><span class="label">Booked</span><b>${booked.some(p => p.price != null) || !booked.length ? money(B) : 'Unpriced'}</b><span>${nn(booked)} nights</span></div><div class="tile"><span class="label">Shortlist</span><b>${money(Sh)}</b><span>${nn(short)} nights</span></div><div class="tile"><span class="label">Each</span><b>${money((B + Sh) / 2)}</b><span>if all goes ahead</span></div></div></div>`;
  const cells = NIGHTS.map(n => { const s = nightState(n); return `<i class="${s ? s.status : ''} ${n === t ? 'today' : ''}" title="${esc(fmtDay(n))}${s ? ' · ' + esc(s.name) : ' · nowhere yet'}"></i>`; }).join('');
  const gaps = []; let run = null;
  NIGHTS.forEach(n => { if (!nightState(n)) { if (run && addDays(run[1], 1) === n) run[1] = n; else { run = [n, n]; gaps.push(run); } } });
  const overlaps = []; const active = stays.filter(p => p.status !== 'maybe' && p.start);
  for (let i = 0; i < active.length; i++) for (let j = i + 1; j < active.length; j++) { const a = active[i], b = active[j]; if (a.start < (b.end || addDays(b.start, 1)) && b.start < (a.end || addDays(a.start, 1))) overlaps.push([a, b]); }
  const sorted = NIGHTS.length - gaps.reduce((s, g) => s + diffDays(g[0], g[1]) + 1, 0);
  h += `<div class="sec"><div class="sec-h"><span class="label">Where we sleep</span><span class="label num">${sorted} of ${NIGHTS.length} sorted</span></div>
    <div class="nights" style="grid-template-columns:repeat(${NIGHTS.length},minmax(0,1fr))" aria-hidden="true">${cells}</div>
    <div class="legend"><span><i style="background:var(--red)"></i>Booked</span><span><i style="box-shadow:inset 0 0 0 2px var(--red)"></i>Shortlist</span><span><i style="background:var(--sunk)"></i>Nowhere yet</span></div>
    ${overlaps.map(([a, b]) => `<div class="warn">${esc(a.name)} and ${esc(b.name)} overlap. Pick one, or mark the other as a maybe.</div>`).join('')}
    ${gaps.map(g => { const n = diffDays(g[0], g[1]) + 1; return `<div class="gap"><span><b>${fmtShort(g[0])}${n > 1 ? ' to ' + fmtShort(g[1]) : ''}</b> · ${n} night${n > 1 ? 's' : ''}</span>${canEdit() ? `<button class="btn btn-sm" type="button" data-gap="${g[0]}|${addDays(g[1], 1)}">${icon('plus')}Add a stay</button>` : ''}</div>`; }).join('')}</div>`;
  const srow = p => { const tot = totalOf(p), n = nightsOf(p); return `<div class="srow" data-id="${esc(p.id)}" role="button" tabindex="0"><div><div class="sn">${glyph('stay', { status: p.status }).replace('class="g"', 'class="g" style="width:14px;height:14px"')}${esc(p.name)}</div><div class="sd num">${p.start ? fmtShort(p.start) + (p.end ? ' to ' + fmtShort(p.end) + ` · ${n} night${n === 1 ? '' : 's'}` : '') : 'No dates yet'}${p.price != null ? ' · ' + money(p.price) + ' a night' : ''}${p.conf ? ' · ref ' + esc(p.conf) : ''}</div>${p.priceNote ? `<div class="sd">${esc(p.priceNote)}</div>` : ''}</div><div class="sp">${tot != null ? money(tot) + `<small>${other(tot)}</small>` : '<small>no price</small>'}</div></div>`; };
  const main = stays.filter(p => p.status !== 'maybe'), alt = stays.filter(p => p.status === 'maybe');
  h += `<div class="sec"><span class="label">Stays · ${main.length}</span>${main.length ? main.map(srow).join('') : '<div class="sd">No stays yet. Drop a pin and choose Stay.</div>'}</div>`;
  if (alt.length) h += `<div class="sec"><span class="label">Other options · ${alt.length}</span>${alt.map(srow).join('')}</div>`;
  return h;
}

/* spend */
function balance() {
  let paid = [0, 0], total = 0;
  for (const x of S.spend.values()) { paid[x.payer] += x.amount; total += x.amount; }
  const net0 = paid[0] - total / 2; return { paid, total, net0 };
}
function spendHTML() {
  const t = today(), list = [...S.spend.values()].sort((a, b) => b.date.localeCompare(a.date) || b.at - a.at);
  const { paid, total, net0 } = balance(), [n0, n1] = S.settings.names;
  const todaySum = list.filter(x => x.date === t).reduce((s, x) => s + x.amount, 0), b = S.settings.budget;
  const days = Math.max(1, Math.min(TRIP_DAYS.indexOf(t) + 1 || TRIP_DAYS.length, TRIP_DAYS.length));
  const bal = Math.abs(net0) < 1 ? "You're square" : net0 > 0 ? `${n1} owes ${n0} ${money(net0)}` : `${n0} owes ${n1} ${money(-net0)}`;
  const byCat = Object.keys(CATS).map(k => [k, list.filter(x => x.cat === k).reduce((s, x) => s + x.amount, 0)]).filter(c => c[1] > 0).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...byCat.map(c => c[1]));
  const sel = S.xpend || { cat: 'food', payer: 0 };
  let h = viewHead('Spend', 'Shared costs') + `<div class="sec">${curBar()}
    <div class="tiles"><div class="tile red"><span class="label">Spent so far</span><b>${money(total)}</b><span>${other(total)}</span></div><div class="tile"><span class="label">Each</span><b>${money(total / 2)}</b><span>${money(total / days)} a day</span></div><div class="tile"><span class="label">Today</span><b>${money(todaySum)}</b><span>${b ? 'of ' + money(b) : 'no budget set'}</span></div></div>
    ${b ? `<div class="meter ${todaySum > b ? 'over' : ''}"><i style="width:${Math.min(100, todaySum / b * 100)}%"></i></div>` : ''}
    <div class="block yellow"><span class="label">Settle up</span><div class="h-head">${esc(bal)}</div><div class="muted" style="font-size:12px">${esc(n0)} paid ${money(paid[0])} · ${esc(n1)} paid ${money(paid[1])}. Everything is split evenly.</div></div></div>`;
  if (canEdit()) h += `<div class="sec"><span class="label">Add an expense</span><form class="addx" id="addx" novalidate>
      <div class="r"><input class="input num" id="xAmt" inputmode="decimal" autocomplete="off" placeholder="Amount" aria-label="Amount"><select class="input" id="xCur" aria-label="Currency"><option value="jpy">${esc(CL().pre.trim())}</option><option value="aud">${esc(CH().pre.trim())}</option></select></div>
      <div class="cats-pick" role="radiogroup" aria-label="Category">${Object.entries(CATS).map(([k, c]) => `<label><input type="radio" name="xcat" value="${k}" ${sel.cat === k ? 'checked' : ''}>${glyph(c.kind)}${c.label}</label>`).join('')}</div>
      <div class="payer" role="radiogroup" aria-label="Who paid"><span class="label" style="align-self:center;margin-right:4px">Paid by</span>${[n0, n1].map((n, i) => `<label><input type="radio" name="xpay" value="${i}" ${sel.payer === i ? 'checked' : ''}>${esc(n)}</label>`).join('')}</div>
      <div class="r"><input class="input" id="xNote" autocomplete="off" placeholder="What was it? (optional)" aria-label="Note"><input class="input" type="date" id="xDate" value="${t}" aria-label="Date"></div>
      <button class="btn btn-primary" type="submit">${icon('plus')}Add expense</button></form></div>`;
  if (byCat.length) h += `<div class="sec"><span class="label">By category</span><div class="cats">${byCat.map(([k, v]) => `<div class="cat"><span>${CATS[k].label}</span><span class="bar"><i style="width:${v / max * 100}%;background:${CATS[k].color}"></i></span><b>${money(v)}</b></div>`).join('')}</div></div>`;
  h += `<div class="sec"><span class="label">Convert</span><div class="convert"><input class="input num" id="cvJ" inputmode="decimal" placeholder="${esc(CL().pre.trim())}" aria-label="${esc(CL().name)}"><span>=</span><input class="input num" id="cvA" inputmode="decimal" placeholder="${esc(CH().pre.trim())}" aria-label="${esc(CH().name)}"></div></div>`;
  if (canEdit()) h += `<div class="sec"><span class="label">Settings</span><div class="g2"><div class="field"><label for="sBudget">Daily budget for both (${esc(CL().pre.trim())})</label><input class="input num" id="sBudget" inputmode="decimal" value="${b || ''}" placeholder="${COUNTRY().cur === 'JPY' ? '15000' : ''}"></div><div class="field"><label for="sN0">Names</label><div style="display:flex;gap:6px"><input class="input" id="sN0" value="${esc(n0)}" aria-label="First traveller"><input class="input" id="sN1" value="${esc(n1)}" aria-label="Second traveller"></div></div></div></div>`;
  if (list.length) {
    let cur = '';
    h += `<div style="padding-bottom:12px">`;
    for (const x of list) {
      if (x.date !== cur) { cur = x.date; h += `<div class="xhead"><span>${fmtDay(cur)}</span><span>${money(list.filter(y => y.date === cur).reduce((s, y) => s + y.amount, 0))}</span></div>`; }
      h += `<div class="xrow">${glyph(CATS[x.cat].kind)}<span class="xn">${esc(x.note || CATS[x.cat].label)}<small>${esc(CATS[x.cat].label)} · paid by ${esc(S.settings.names[x.payer])}</small></span><span class="xa">${money(x.amount)}</span>${canEdit() ? `<button class="x" type="button" data-delx="${esc(x.id)}" aria-label="Delete expense">${icon('x')}</button>` : ''}</div>`;
    }
    h += `</div>`;
  } else h += `<div class="empty"><b>No spending yet</b>Add what you spend as you go. It's split evenly between you two and works out who owes who.</div>`;
  return h;
}

/* notes */
function notesHTML() {
  const notes = [...S.places.values()].filter(p => p.kind === 'note').sort((a, b) => (a.todo && a.done) - (b.todo && b.done) || (b.created || 0) - (a.created || 0));
  const maybes = itinerary().filter(p => p.kind !== 'note' && p.status === 'maybe'), cs = codes();
  const todos = notes.filter(n => n.todo), open = todos.filter(n => !n.done).length;
  let h = viewHead('Notes', todos.length ? `${open} to-do${open === 1 ? '' : 's'} left` : 'Notes and maybes');
  if (canEdit()) h += `<div class="sec"><form class="qn" id="quickNote"><textarea class="input" id="qnText" placeholder="Something to remember, a question for each other, a shop to find"></textarea><div class="r"><label class="check"><input type="checkbox" id="qnTodo">To-do</label><span class="spacer"></span><button class="btn btn-sm" type="button" id="qnPin">${icon('map')}Add and pin</button><button class="btn btn-sm btn-primary" type="submit">${icon('plus')}Add note</button></div></form></div>`;
  h += `<div class="sec">${notes.length ? `<div class="stickies">${notes.map(p => `<div class="sticky ${p.todo ? 'todo' : ''} ${p.done ? 'done' : ''}" data-id="${esc(p.id)}" role="button" tabindex="0">${p.todo ? `<button class="tick" type="button" data-tick="${esc(p.id)}" aria-label="${p.done ? 'Mark not done' : 'Mark done'}">${p.done ? '✓' : ''}</button>` : ''}${p.title ? `<b>${esc(p.title)}</b>` : ''}<span class="t">${esc(p.notes)}</span><small>${esc(firstName(p.by))}${hasLoc(p) ? ' · on the map' : ''}</small></div>`).join('')}</div>` : '<div class="muted" style="font-size:14px">No notes yet.</div>'}</div>`;
  const groups = maybeGroups(maybes);
  h += `<div class="sec" id="maybesHead" style="padding:18px 0 0;gap:0"><div class="sec-h" style="padding:0 18px 10px"><span class="label">Maybes · ${maybes.length}</span>${canEdit() ? `<button class="btn btn-sm btn-ghost" type="button" data-gmimport>${icon('download')}Import from Google Maps</button>` : ''}</div>${maybes.length ? groups.map(([name, list]) => (groups.length > 1 ? `<div class="areahead">${esc(name)} <small>${list.length}</small></div>` : '') + list.map(p => rowHTML(p, cs, true)).join('')).join('') : '<div class="muted" style="padding:0 18px 18px;font-size:14px">Mark anything as Maybe to keep it here, or bring in a Saved list from Google Maps.</div>'}</div>`;
  return h;
}
function stampsHTML() {
  const v = [...S.places.values()].filter(p => p.visited).sort((a, b) => a.visited.localeCompare(b.visited) || a.name.localeCompare(b.name));
  const total = [...S.places.values()].filter(p => p.kind !== 'note').length, bk = BOOK(), kind = COUNTRY().book;
  return viewHead(bk.title, `${v.length} of ${total} places`) + `<div class="sec">${v.length ? `<div class="stampbook ${kind}">${v.map(p => `<button class="stampcell" type="button" data-id="${esc(p.id)}">${stampSVG(p)}<span>${esc(fmtShort(p.visited))}</span></button>`).join('')}</div>`
    : `<div class="empty" style="padding:0"><b>No ${esc(bk.count)} yet</b>${esc(COUNTRY().bookNote)} Open a place and tap "We've been here" to add it to this book.</div>`}</div>`;
}
function phrasesHTML() {
  let i = 0;
  return viewHead(phrasesTitle(), 'Tap one to show it full screen') + PHRASES_NOW().map(([group, list]) => `<div class="sec"><span class="label">${esc(group)}</span><div class="phrases">${list.map(([en, jp, ro]) => `<button class="phrase" type="button" data-phrase="${i++}"><span class="en">${esc(en)}</span><span class="jp">${esc(jp)}</span><span class="ro">${esc(ro)}</span></button>`).join('')}</div></div>`).join('');
}
function moreHTML() {
  const item = (k, l, ic, sub) => `<button class="row" type="button" data-nav="${k}" style="grid-template-columns:44px minmax(0,1fr)"><span class="thumb">${ic}</span><span><span class="rname">${l}</span><span class="rmeta">${sub}</span></span></button>`;
  const n = [...S.places.values()];
  return viewHead('More', S.settings.title) +
    item('stays', 'Stays', glyph('stay', { status: 'booked' }), `${n.filter(p => p.kind === 'stay').length} stays and the nights still to sort`) +
    item('notes', 'Notes and maybes', glyph('note'), `${n.filter(p => p.kind === 'note').length} notes`) +
    item('stamps', BOOK().title, glyph('see'), `${n.filter(p => p.visited).length} ${BOOK().count}`) +
    item('phrases', phrasesTitle(), glyph('food'), COUNTRY().words ? `Words and customs that differ in ${esc(COUNTRY().name)}` : `${esc(LANG())} to show staff and drivers`) +
    (canEdit() ? `<div class="sec"><span class="label">Add from websites</span><div class="acts"><button class="btn" type="button" data-paste>${icon('clip')}Paste from a site or email</button><button class="btn" type="button" data-pdf>${icon('doc')}Import a booking PDF</button><button class="btn" type="button" data-gmimport>${icon('download')}Import a Google Maps list</button><a class="btn" href="${PWA ? 'clip.html' : CLIP_PAGE}" target="_blank" rel="noopener">${icon('link')}Set up the Add to Tabi button</a></div><div class="fine">On a booking or ticket page in Safari or Brave, tap your Add to Tabi bookmark, then come back here and paste. Booking PDFs saved in Files can be imported too. A Saved or shared Google Maps list comes in as maybes. Add ticket screenshots from a place's card.</div></div>` : '') +
    (PWA ? `<div class="sec"><span class="label">This phone</span><div class="acts"><button class="btn" type="button" data-act="share">${icon('share')}Share trip file</button><label class="btn">${icon('upload')}Import trip file<input type="file" class="tripImport" accept=".json,application/json" hidden></label><button class="btn" type="button" data-act="settings">${icon('settings')}Trip settings</button><button class="btn" type="button" data-act="trips">${icon('route')}Trips and next country</button></div><div class="fine">Each phone keeps its own copy. To sync, share your trip file and import it on the other phone. The newest change wins.</div></div>` : '');
}

/* panel events */
const PH_FLAT = () => PHRASES_NOW().flatMap(([, l]) => l);
$('#pbody').addEventListener('click', async e => {
  const t = e.target;
  if (t.closest('a[href]')) return;
  const f = t.closest('[data-filter]'); if (f) { S.filter = f.dataset.filter; pref('filter', S.filter); renderPanel(); return; }
  const c = t.closest('[data-cur]'); if (c) { S.cur = c.dataset.cur; pref('cur', S.cur); renderAll(); return; }
  const g = t.closest('[data-gap]'); if (g) { const [a, b] = g.dataset.gap.split('|'); openDialog({ kind: 'stay', status: 'planned', start: a, end: b }); return; }
  const ad = t.closest('[data-addday]'); if (ad) { openDialog({ kind: 'see', status: 'planned', start: ad.dataset.addday }); return; }
  const sa = t.closest('[data-showaddr]'); if (sa) { showAddress(S.places.get(sa.dataset.showaddr)); return; }
  const tkt = t.closest('[data-ticket]'); if (tkt) { const p = S.places.get(tkt.dataset.ticket); if (p) openTicket(p, 0); return; }
  if (t.closest('[data-paste]')) { addFromSite(); return; }
  if (t.closest('[data-pdf]')) { addFromPdf(); return; }
  const ph = t.closest('[data-phrase]'); if (ph) { const [en, jp, ro] = PH_FLAT()[+ph.dataset.phrase]; openShow({ label: en, jp, sub: ro, kc: 'var(--blue)' }); return; }
  const tk = t.closest('[data-tick]'); if (tk) { const p = S.places.get(tk.dataset.tick); if (p) await patch('places', p.id, { done: !p.done }, p.done ? 'reopened' : 'ticked off'); return; }
  const dx = t.closest('[data-delx]'); if (dx) {
    if (dx.dataset.armed) { await remove('spend', dx.dataset.delx); toast('Expense deleted'); }
    else { dx.dataset.armed = '1'; dx.innerHTML = '<span style="font:700 12px var(--font);color:var(--red-ink)">Delete?</span>'; setTimeout(() => { if (dx.isConnected) { delete dx.dataset.armed; dx.innerHTML = icon('x'); } }, 3000); }
    return;
  }
  const act = t.closest('[data-act]'); if (act && PWA) { if (act.dataset.act === 'share') exportTrip(); if (act.dataset.act === 'settings') openSettings(false); if (act.dataset.act === 'trips') openTrips(); return; }
  if (t.closest('#qnPin')) { quickNote(true); return; }
  if (t.closest('[data-nav]')) return;
  const r = t.closest('[data-id]'); if (r) select(r.dataset.id);
});
$('#pbody').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('.srow,.sticky')) select(e.target.dataset.id); });
$('#pbody').addEventListener('submit', async e => {
  e.preventDefault();
  if (e.target.id === 'quickNote') { quickNote(false); return; }
  if (e.target.id === 'addx') {
    const raw = parseFloat(String($('#xAmt').value).replace(/[^0-9.]/g, ''));
    if (!(raw > 0)) { $('#xAmt').focus(); toast('Enter how much it cost.'); return; }
    if ($('#xCur').value === 'aud' && !(S.settings.rate > 0)) { toast('Set the exchange rate first, under Stays or Spend.'); return; }
    const amount = roundL($('#xCur').value === 'aud' ? raw * S.settings.rate : raw);
    const cat = ($('input[name="xcat"]:checked') || {}).value || 'other', payer = +(($('input[name="xpay"]:checked') || {}).value || 0);
    S.xpend = { cat, payer };
    const ok = await put('spend', newId('x'), { amount, cat, payer, date: isIso($('#xDate').value) ? $('#xDate').value : today(), note: $('#xNote').value.trim().slice(0, 120), by: S.meId || 'local', at: Date.now() });
    if (ok) toast(`${yen(amount)} added`);
  }
});
$('#pbody').addEventListener('input', e => {
  const r = S.settings.rate;
  if (e.target.id === 'cvJ') { const v = parseFloat(e.target.value.replace(/[^0-9.]/g, '')); $('#cvA').value = v > 0 ? (v / r).toFixed(2) : ''; }
  if (e.target.id === 'cvA') { const v = parseFloat(e.target.value.replace(/[^0-9.]/g, '')); $('#cvJ').value = v > 0 ? roundL(v * r) : ''; }
});
$('#pbody').addEventListener('change', async e => {
  const id = e.target.id;
  if (id === 'rateIn') { const v = parseFloat(e.target.value); if (!(v > 0 && v < 1e6)) { toast(`Enter how many ${CL().name.toLowerCase()} one ${CH().pre.trim()} buys${COUNTRY().cur === 'JPY' && S.settings.home === 'AUD' ? ', like 113' : ''}.`); e.target.value = S.settings.rate || ''; return; } await saveSettings({ rate: v }); }
  if (id === 'sBudget') { const v = roundL(parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0); await saveSettings({ budget: v }); toast(v ? `Daily budget set to ${yen(v)}` : 'Daily budget cleared'); }
  if (id === 'sN0' || id === 'sN1') { const n = [$('#sN0').value.trim().slice(0, 24) || 'Me', $('#sN1').value.trim().slice(0, 24) || 'Partner']; await saveSettings({ names: n }); }
  if (e.target.classList.contains('tripImport') && PWA) importTripFile(e.target);
});
async function quickNote(pin) {
  const ta = $('#qnText'); const text = ta.value.trim(); if (!text) { ta.focus(); return; }
  const todo = $('#qnTodo') && $('#qnTodo').checked;
  const make = async ll => { const ok = await put('places', newId(), { name: '', kind: 'note', status: 'planned', notes: text, todo, done: false, by: S.meId || 'local', created: Date.now(), ...(ll ? { lat: +ll[1].toFixed(5), lng: +ll[0].toFixed(5) } : {}) }, 'added'); if (ok) { const el = $('#qnText'); if (el) el.value = ''; toast(ll ? 'Note pinned to the map' : todo ? 'To-do added' : 'Note added'); } };
  if (pin) { if (isPhone()) setView('map'); startPick('Tap the map where this note belongs', ll => make(ll)); } else make(null);
}

/* show to someone */
function openShow({ label, jp, sub, kc }) {
  const el = $('#show'); el.classList.remove('ticket');
  el.innerHTML = `<div class="bar"><span class="label">${esc(label)}</span><button class="iconbtn" type="button" id="showX" aria-label="Close">${icon('x')}</button></div><div class="main"><div class="accent" style="--kc:${kc || 'var(--red)'}"></div><div class="jp" lang="${esc(COUNTRY().lang)}">${esc(jp)}</div>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</div>`;
  el.hidden = false; $('#showX').focus();
  try { navigator.wakeLock && navigator.wakeLock.request('screen').then(l => { el._lock = l; }).catch(() => {}); } catch (e) {}
}
function closeShow() { const el = $('#show'); el.hidden = true; el.classList.remove('ticket'); if (el._lock) { el._lock.release().catch(() => {}); el._lock = null; } }
$('#show').addEventListener('click', e => { if (e.target.closest('#showX')) closeShow(); });
function showAddress(p) {
  if (!p) return;
  const jp = p.addressJa || p.address || p.ja || p.name;
  const [say, lc] = COUNTRY().driver || ['Please take us here', ''], local = COUNTRY().lang === 'en' ? '' : lc;
  openShow({ label: say, jp: (p.ja ? p.ja + '\n' : '') + jp, sub: `${local ? local + ' · ' : ''}${p.name}${p.address && p.addressJa ? ' · ' + p.address : ''}${p.phone ? ' · ' + p.phone : ''}`, kc: KC[KINDS[p.kind].color] });
  $('#show .jp').style.whiteSpace = 'pre-line';
}

/* ---------- selection and the place card ---------- */
function select(id, { fly = true } = {}) {
  S.sel = id; closePop();
  if (S.ideas && S.ideas.for !== id) S.ideas = null;
  if (isPhone() && id && S.view !== 'map') setView('map');
  renderAll();
  const p = S.places.get(id);
  if (p && fly) flyToPlace(p);
  else if (p && hasLoc(p)) { const [x, y] = P(p.lng, p.lat); if (x < 40 || y < 40 || x > W - 40 || y > H - 40) flyToPlace(p, 600, zk()); }
  presence({ sel: id || null });
}
function deselect() { S.sel = null; S.ideas = null; renderAll(); presence({ sel: null }); }
/* the visited-places book: ink stamps (Japan, Korea, Taiwan), postcards (Europe, Southeast Asia, the UK)
   or embroidered patches (the US, New Zealand), chosen by the trip's country */
function stampSVG(p, extra = '') { const b = COUNTRY().book; return b === 'postcards' ? postcardSVG(p, extra) : b === 'patches' ? patchSVG(p, extra) : inkStampSVG(p, extra); }
// a kind's Bauhaus shape, centred on cx,cy at size r
function kindShape(kind, cx, cy, r, fill) {
  const k = KINDS[kind] || KINDS.see, f = `fill="${fill}" stroke="none"`;
  return k.shape === 'circle' ? `<circle cx="${cx}" cy="${cy}" r="${r}" ${f}/>` : k.shape === 'tri' ? `<path d="M${cx} ${cy - r}L${cx + r * 1.1} ${cy + r * 0.9}H${cx - r * 1.1}z" ${f}/>`
    : k.shape === 'square' ? `<rect x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" ${f}/>` : k.shape === 'half' ? `<path d="M${cx - r} ${cy + r * 0.5}a${r} ${r} 0 0 1 ${r * 2} 0z" ${f}/>`
    : k.shape === 'bar' ? `<rect x="${cx - r * 1.3}" y="${cy - r * 0.35}" width="${r * 2.6}" height="${r * 0.7}" ${f}/>` : `<path d="M${cx - r} ${cy + r}V${cy - r}a${r * 2} ${r * 2} 0 0 1 ${r * 2} ${r * 2}z" ${f}/>`;
}
function postcardSVG(p, extra) {
  const rot = (hash(p.id) % 7) - 3, k = KINDS[p.kind] || KINDS.see, col = KC[k.color], f0 = picsOf(p)[0], src = f0 ? photoSrc(f0) : '';
  const dt = (p.visited || today()).split('-').reverse().join('.'), uid = 'pc' + hash(p.id);
  const words = p.name.split(' '), lines = ['', '']; for (const w of words) { const L = lines[0].length + w.length < 15 || !lines[0] ? 0 : 1; lines[L] = (lines[L] + ' ' + w).trim(); }
  if (lines[1].length > 15) lines[1] = lines[1].slice(0, 14) + '…';
  return `<svg class="stamp postcard ${extra}" viewBox="0 0 140 96" style="--rot:${rot}deg" role="img" aria-label="Postcard: ${esc(p.name)}, ${esc(dt)}">
    <defs><clipPath id="${uid}"><rect x="6" y="6" width="62" height="84"/></clipPath></defs>
    <rect x="0.75" y="0.75" width="138.5" height="94.5" fill="var(--surface)" stroke="var(--ink)" stroke-width="1.5"/>
    ${src ? `<image href="${esc(src)}" x="6" y="6" width="62" height="84" preserveAspectRatio="xMidYMid slice" clip-path="url(#${uid})"/>` : `<rect x="6" y="6" width="62" height="84" fill="${col}"/>${kindShape(p.kind, 37, 48, 13, k.color === 'ink' ? 'var(--surface)' : 'var(--ink)')}`}
    <line x1="74" y1="10" x2="74" y2="86" stroke="var(--ink)" stroke-width="0.8" opacity=".4"/>
    <rect x="108" y="8" width="24" height="28" fill="${col}" stroke="var(--surface)" stroke-width="2" stroke-dasharray="2 1.6"/>${kindShape(p.kind, 120, 22, 5.5, k.color === 'ink' ? 'var(--surface)' : 'var(--ink)')}
    <g fill="none" stroke="var(--ink)" stroke-width="0.9" opacity=".75"><circle cx="104" cy="32" r="10"/><path d="M90 28c5-3 9 3 14 0s9-3 14 0M90 34c5-3 9 3 14 0s9-3 14 0"/></g>
    <text x="104" y="34.5" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-weight="800" font-size="5" fill="var(--ink)">${esc(TRIP_COUNTRY())}</text>
    <text x="80" y="56" font-family="Plus Jakarta Sans, sans-serif" font-weight="800" font-size="9" fill="var(--ink)">${esc(lines[0])}</text>
    ${lines[1] ? `<text x="80" y="67" font-family="Plus Jakarta Sans, sans-serif" font-weight="800" font-size="9" fill="var(--ink)">${esc(lines[1])}</text>` : ''}
    <g stroke="var(--ink)" stroke-width="0.6" opacity=".35"><line x1="80" y1="74" x2="132" y2="74"/><line x1="80" y1="81" x2="132" y2="81"/></g>
    <text x="80" y="89" font-family="Plus Jakarta Sans, sans-serif" font-weight="700" font-size="5.5" letter-spacing=".8" fill="var(--ink-2)">${esc(dt)}</text>
  </svg>`;
}
function patchSVG(p, extra) {
  const rot = (hash(p.id) % 9) - 4, k = KINDS[p.kind] || KINDS.see, col = KC[k.color], uid = 'pa' + hash(p.id);
  const nm = p.name.toUpperCase().slice(0, 22), size = nm.length > 16 ? 8 : 9.5, yr = (p.visited || today()).slice(0, 4);
  return `<svg class="stamp patch ${extra}" viewBox="0 0 120 120" style="--rot:${rot}deg" role="img" aria-label="Patch: ${esc(p.name)}, ${esc(yr)}">
    <defs><path id="${uid}" d="M22 62a38 38 0 0 1 76 0"/></defs>
    <circle cx="60" cy="60" r="55" fill="${col}"/><circle cx="60" cy="60" r="47" fill="var(--surface)"/>
    <circle cx="60" cy="60" r="51" fill="none" stroke="var(--surface)" stroke-width="1.2" stroke-dasharray="2.4 2"/>
    <circle cx="60" cy="60" r="43" fill="none" stroke="${col}" stroke-width="1" stroke-dasharray="2.4 2"/>
    <text font-family="Plus Jakarta Sans, sans-serif" font-weight="800" font-size="${size}" letter-spacing="1.2" fill="var(--ink)"><textPath href="#${uid}" startOffset="50%" text-anchor="middle">${esc(nm)}</textPath></text>
    ${kindShape(p.kind, 60, 68, 12, col)}
    <text x="60" y="96" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-weight="800" font-size="8" letter-spacing="2" fill="var(--ink-2)">${esc(yr)}</text>
  </svg>`;
}
function inkStampSVG(p, extra) {
  const rot = (hash(p.id) % 15) - 7;
  const ja = p.ja ? [...p.ja].slice(0, 6).join('') : '';
  const jaSize = ja ? Math.min(22, Math.floor(84 / [...ja].length)) : 0;
  const en = p.name.toUpperCase().slice(0, 18), enSize = en.length > 13 ? 7.2 : 8.6;
  const dt = (p.visited || today()).replace(/-/g, '.');
  const k = KINDS[p.kind] || KINDS.see;
  return `<svg class="stamp ${extra}" viewBox="0 0 120 120" style="--rot:${rot}deg" role="img" aria-label="Stamp: ${esc(p.name)}, ${esc(dt)}"><g filter="url(#ink)" fill="currentColor" stroke="currentColor">
    <circle cx="60" cy="60" r="55" fill="none" stroke-width="4.5"/><circle cx="60" cy="60" r="48" fill="none" stroke-width="1.5"/>
    ${ja ? `<text x="60" y="${34 + jaSize * .4}" text-anchor="middle" style="font-family:var(--font-ja)" font-weight="900" font-size="${jaSize}" stroke="none">${esc(ja)}</text>` : ''}
    ${k.shape === 'circle' ? '<circle cx="60" cy="62" r="9" stroke="none"/>' : k.shape === 'tri' ? '<path d="M60 52 70 70H50z" stroke="none"/>' : k.shape === 'square' ? '<rect x="51" y="53" width="18" height="18" stroke="none"/>' : k.shape === 'half' ? '<path d="M50 70a10 10 0 0 1 20 0z" stroke="none"/>' : k.shape === 'bar' ? '<rect x="48" y="58" width="24" height="7" stroke="none"/>' : '<path d="M51 71V53a18 18 0 0 1 18 18z" stroke="none"/>'}
    <text x="60" y="88" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-weight="800" font-size="${enSize}" letter-spacing="1" stroke="none">${esc(en)}</text>
    <text x="60" y="99" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-weight="700" font-size="7.5" letter-spacing="1.5" stroke="none">${esc(dt)}</text>
  </g></svg>`;
}
let justStamped = null;
function whenText(p) {
  if (!p.start) return 'No date yet';
  if (p.kind === 'stay' && p.end) { const n = nightsOf(p); return `${fmtDay(p.start)} → ${fmtDay(p.end)}<small>${n} night${n === 1 ? '' : 's'}</small>`; }
  return fmtDay(p.start) + (p.time ? `<small>${fmtTime(p.time)}</small>` : '');
}
function renderCard() {
  const card = $('#card'); const p = S.places.get(S.sel);
  if (!p) { card.hidden = true; card.innerHTML = ''; return; }
  const keepScroll = card.scrollTop; card.hidden = false;
  const ord = itinerary(); const i = ord.findIndex(x => x.id === p.id);
  const prev = ord[i - 1], next = ord[i + 1], code = codes().get(p.id);
  const k = KINDS[p.kind], tot = totalOf(p), n = nightsOf(p);
  const likers = Object.keys(p.likes); const me = S.meId || 'local'; const iLike = !!p.likes[me];
  const peersHere = S.peers.filter(pe => pe.presence && pe.presence.sel === p.id);
  const editable = canEdit();
  let price = '';
  if (p.price != null) price = `<div class="price"><span class="big-num">${money(p.price)}</span><span class="per">${p.kind === 'stay' ? 'a night for both' : 'for both'} · ${other(p.price)}</span>
      ${p.kind === 'stay' && n > 1 ? `<span class="more num">${money(tot)} for ${n} nights (${other(tot)}) · ${money(tot / 2)} each</span>` : p.kind === 'stay' ? `<span class="more num">${money(p.price / 2)} each</span>` : ''}${p.priceNote ? `<span class="note">${esc(p.priceNote)}</span>` : ''}</div>`;
  else if (p.priceNote) price = `<div class="price"><span class="note" style="margin:0">${esc(p.priceNote)}</span></div>`;
  const copy = (v, label) => `<button class="copyable" type="button" data-copy="${esc(v)}" aria-label="Copy ${esc(label)}">${esc(v)}${icon('copy')}</button>`;
  const hasWallet = p.conf || p.checkin || p.checkout || p.address || p.addressJa || p.phone;
  const tix = ticketsOf(p), pics = picsOf(p), canTix = editable && p.kind !== 'note';
  const tixRow = tix.length || (hasWallet && canTix) ? `<div class="tix">${tix.map((f, j) => { const src = photoSrc(f); return `<button type="button" data-tix="${j}" aria-label="Show ticket ${j + 1}">${src ? `<img src="${esc(src)}" alt="">` : ''}</button>`; }).join('')}${canTix ? `<button class="tadd" type="button" id="addTicket">${icon('ticket')}<span>Add ticket</span></button>` : ''}</div>` : '';
  const wallet = hasWallet || tix.length ? `<div class="wallet"><div class="wh"><span class="label">${!hasWallet ? 'Tickets' : p.conf || p.checkin || p.checkout ? 'Booking' : 'Details'}</span><span style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">${tix.length ? `<button class="btn btn-sm" type="button" data-tix="0">${icon('ticket')}Show ticket</button>` : ''}${p.addressJa || p.address ? `<button class="btn btn-sm" type="button" id="driverBtn">${icon('car')}Show to driver</button>` : ''}</span></div><div class="wb">${hasWallet ? `<dl class="kv">
      ${p.conf ? `<dt>Ref</dt><dd>${copy(p.conf, 'booking reference')}</dd>` : ''}${p.checkin ? `<dt>Check-in</dt><dd>from ${fmtTime(p.checkin)}</dd>` : ''}${p.checkout ? `<dt>Check-out</dt><dd>by ${fmtTime(p.checkout)}</dd>` : ''}
      ${p.address ? `<dt>Address</dt><dd>${copy(p.address, 'address')}</dd>` : ''}${p.addressJa ? `<dt>${esc(ADDR_LBL())}</dt><dd class="ja" lang="${esc(COUNTRY().lang)}">${copy(p.addressJa, (LANG() || 'local') + ' address')}</dd>` : ''}${p.phone ? `<dt>Phone</dt><dd>${copy(p.phone, 'phone number')}</dd>` : ''}</dl>` : ''}${tixRow}</div></div>` : '';
  const photos = pics.map((f, j) => { const src = photoSrc(f); return src ? `<button class="ph" type="button" data-ph="${j}" aria-label="Open photo ${j + 1}"><img src="${esc(src)}" alt="" loading="lazy" decoding="async"></button>` : ''; }).join('');
  const addPh = editable ? `<button class="ph add" type="button" id="addPhoto">${icon('camera')}<span>Add photos</span></button>` : '';
  let ideas = '';
  if (S.ideas && S.ideas.for === p.id) {
    const I = S.ideas;
    ideas = `<div class="ideas"><h4>${icon('spark')}Ideas near here</h4>${I.loading ? '<div class="fine">Asking Claude for calm places to sketch, knit, eat and wander…</div>' : I.error ? `<div class="fine">${esc(I.error)}</div>` :
      I.items.map((it, j) => `<div class="idea"><b>${esc(it.name)}${it.ja ? ` <span class="ja" style="font-weight:500;color:var(--ink-2)">${esc(it.ja)}</span>` : ''}</b><small>${esc(KINDS[it.kind].label)} · ${esc(it.why || '')}</small>${it.added ? '<span class="chip maybe">Added</span>' : editable ? `<button class="btn btn-sm" type="button" data-addidea="${j}">${icon('plus')}Maybe</button>` : ''}</div>`).join('') + '<div class="fine">Suggestions can be wrong. Check the location and opening hours before you go.</div>'}</div>`;
  }
  const cr = p.by ? `<img src="${esc(who(p.by).avatarUrl)}" alt="">Added by ${esc(firstName(p.by))}` : '';
  const ed = p.last && p.last.by && p.last.at ? ` · ${esc(firstName(p.last.by))} ${esc(p.last.what || 'edited')} ${esc(ago(p.last.at))}` : '';
  const dots = ord.length > 1 ? `<span class="dots" aria-hidden="true">${[-1, 0, 1].map(o => `<i class="${o === 0 ? 'on' : ''}"></i>`).join('')}</span>` : '<span></span>';
  card.innerHTML = `
  <div class="sign" style="--kc:${KC[k.color]}">
    <div class="sign-in"><div style="min-width:0">${p.ja ? `<div class="sign-ja">${esc(p.ja)}</div><div class="sign-en">${esc(p.name)}</div>` : `<div class="sign-en big">${esc(p.name)}</div>`}</div>
      <div style="display:flex;gap:8px;align-items:flex-start">${code ? `<div class="scode num" aria-label="Stop ${code}"><span><small>${p.kind === 'stay' ? 'STAY' : 'STOP'}</small>${pad(code)}</span></div>` : ''}<button class="xbtn" type="button" id="cardX" aria-label="Close">${icon('x')}</button></div></div>
    <div class="sign-nav"><button type="button" class="pv" data-go="${prev ? esc(prev.id) : ''}" ${prev ? '' : 'disabled'}>${icon('left')}<span>${prev ? esc(prev.name) : ''}</span></button>${dots}<button type="button" class="nx" data-go="${next ? esc(next.id) : ''}" ${next ? '' : 'disabled'}><span>${next ? esc(next.name) : ''}</span>${icon('right')}</button></div>
    ${p.visited ? `<div class="stampwrap">${stampSVG(p, p.id === justStamped ? 'thunk' : '')}</div>` : ''}
  </div>
  <div class="cbody">
    <div class="chips"><span class="chip soft">${glyph(p.kind, { status: p.status })}${esc(k.label)}</span><span class="chip ${p.status}">${statusLabel(p)}</span><span class="when num">${whenText(p)}</span></div>
    ${peersHere.map(pe => `<div class="peerhere" style="--pc:${esc(who(pe.by).color)}"><i></i>${esc(firstName(pe.by))} is looking at this too</div>`).join('')}
    ${price}${wallet}
    ${photos || addPh ? `<div class="photos">${photos}${addPh}</div>` : ''}
    ${p.notes ? `<div class="notes">${esc(p.notes)}</div>` : ''}
    <div class="acts">
      <button class="btn btn-sm love ${iLike ? 'on' : ''}" type="button" id="loveBtn" ${editable ? '' : 'disabled'} aria-pressed="${iLike}">${icon('heart')}${iLike ? 'Loved' : 'Love it'}${likers.length ? `<span class="likers">${likers.slice(0, 3).map(id => `<img src="${esc(who(id).avatarUrl)}" alt="${esc(firstName(id))}">`).join('')}</span>` : ''}</button>
      ${editable && p.kind !== 'note' ? `<button class="btn btn-sm ${p.visited ? 'on' : ''}" type="button" id="stampBtn">${icon('stamp')}${p.visited ? BOOK().done : "We've been here"}</button>` : ''}
      ${editable && p.status === 'maybe' && p.kind !== 'note' && today() >= TRIP.start && today() <= TRIP.end ? `<button class="btn btn-sm" type="button" id="todayBtn">${icon('today')}Plan it for today</button>` : ''}
      ${hasLoc(p) ? `<a class="btn btn-sm" href="${esc(gmaps(p))}" target="_blank" rel="noopener">${icon('map')}Google Maps</a>` : ''}
      ${canTix && !hasWallet && !tix.length ? `<button class="btn btn-sm" type="button" id="addTicket">${icon('ticket')}Add ticket</button>` : ''}
      ${p.links.map(l => `<a class="btn btn-sm" href="${esc(l.url)}" target="_blank" rel="noopener">${icon('link')}${esc(l.label)}</a>`).join('')}
      ${sample && hasLoc(p) && editable ? `<button class="btn btn-sm" type="button" id="ideasBtn">${icon('spark')}Ideas nearby</button>` : ''}
    </div>
    ${likers.length >= 2 ? '<div class="both">You both love this one.</div>' : ''}
    ${ideas}
    <div class="cfoot">${cr}${ed}<span class="spacer"></span>${editable ? `<button class="btn btn-sm" type="button" id="moveBtn">${icon('move')}Move</button><button class="btn btn-sm btn-primary" type="button" id="editBtn">${icon('edit')}Edit</button>` : ''}</div>
  </div>`;
  card.scrollTop = keepScroll;
  if (justStamped === p.id) justStamped = null;
}
$('#card').addEventListener('click', async e => {
  const p = S.places.get(S.sel); if (!p) return; const t = e.target;
  if (t.closest('#cardX')) { deselect(); return; }
  const go = t.closest('[data-go]'); if (go && go.dataset.go) { select(go.dataset.go); return; }
  if (t.closest('#editBtn')) { openDialog(p); return; }
  if (t.closest('#driverBtn')) { showAddress(p); return; }
  const cp = t.closest('[data-copy]'); if (cp) { const v = cp.dataset.copy; try { await navigator.clipboard.writeText(v); toast('Copied'); } catch (er) { const r = document.createRange(); r.selectNodeContents(cp); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast('Selected. Copy it from the menu.'); } return; }
  if (t.closest('#moveBtn')) { startPick(`Tap the map where ${p.name} should go`, ll => patch('places', p.id, { lat: +ll[1].toFixed(5), lng: +ll[0].toFixed(5) }, 'moved')); return; }
  if (t.closest('#addPhoto')) { photoTarget = p.id; ticketMode = false; $('#photoInput').accept = 'image/*'; $('#photoInput').click(); return; }
  if (t.closest('#addTicket')) { photoTarget = p.id; ticketMode = true; $('#photoInput').accept = 'image/*,application/pdf'; $('#photoInput').click(); return; }
  const tx = t.closest('[data-tix]'); if (tx) { openTicket(p, +tx.dataset.tix); return; }
  const ph = t.closest('[data-ph]'); if (ph) { openLightbox(p.id, +ph.dataset.ph); return; }
  if (t.closest('#loveBtn')) { const me = S.meId || 'local'; const on = !p.likes[me]; await patch('places', p.id, { likes: { [me]: on } }, on ? 'loved' : 'edited'); return; }
  if (t.closest('#stampBtn')) { if (p.visited) { await patch('places', p.id, { visited: '' }, BOOK_VERB()[1]); return; } justStamped = p.id; await patch('places', p.id, { visited: today() }, BOOK_VERB()[0]); return; }
  if (t.closest('#todayBtn')) { if (await patch('places', p.id, { status: 'planned', start: today() }, 'planned')) toast(`${p.name} is on today's plan`); return; }
  if (t.closest('#ideasBtn')) { askIdeas(p); return; }
  const ai = t.closest('[data-addidea]'); if (ai) { addIdea(+ai.dataset.addidea); return; }
});

/* ---------- country words ---------- */
const ADDR_LBL = () => ({ JP: '住所', KR: '주소', TW: '地址', TH: 'ที่อยู่' })[TRIP_COUNTRY()] || (LANG() ? LANG() + ' address' : 'Local address');
const BOOK_VERB = () => ({ stamps: ['stamped', 'removed the stamp from'], postcards: ['kept a postcard of', 'removed the postcard of'], patches: ['earned a patch at', 'removed the patch for'] })[COUNTRY().book] || ['stamped', 'removed the stamp from'];
// 1.234,50 and 1,234.50 both read as 1234.5; 27,660 reads as 27660
function parseAmt(v) {
  let t = String(v == null ? '' : v).replace(/[\s\u00a0'’]/g, '').replace(/[^0-9.,]/g, '');
  if (/,\d{1,2}$/.test(t) && !/\.\d{1,2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.'); else t = t.replace(/,/g, '');
  return parseFloat(t);
}
// a captured currency (an ISO code, or the older jpy and aud) as the trip's local or home slot
function curSlot(c) {
  const u = String(c || '').toUpperCase();
  return !u || u === COUNTRY().cur ? 'jpy' : u === S.settings.home ? 'aud' : 'other';
}
// labels, placeholders and the map that follow the trip's country
var uiReady = false, uiCountry = '';
function onCountry() {
  if (!uiReady) return;
  const c = COUNTRY(), lang = c.lang, en = lang === 'en', smp = c.sample || {};
  const ja = $('#fJa'), aj = $('#fAddrJa');
  ja.closest('.field').hidden = en; aj.closest('.field').hidden = en;
  $('label[for="fJa"]').textContent = `${LANG()} name`; ja.placeholder = smp.local || ''; ja.lang = lang;
  $('label[for="fAddrJa"]').textContent = `Address in ${LANG()} (for taxis)`; aj.placeholder = smp.addr || ''; aj.lang = lang;
  $('#fPrice').placeholder = smp.price || '';
  const o = $$('#fCur option'); if (o[0]) o[0].textContent = CL().pre.trim(); if (o[1]) o[1].textContent = CH().pre.trim();
  $('#map').setAttribute('aria-label', `Map of ${c.name} with your places`);
  if (uiCountry !== TRIP_COUNTRY()) {
    const first = !uiCountry; uiCountry = TRIP_COUNTRY();
    if (!first) { drawBase(); if (GL) GL.setStyle(glStyle()); if (S.ready) { renderNav(); renderAll(); zoomTo(countryView(), 0); } }
  } else if (S.ready) renderNav();
}

/* ---------- dialog ---------- */
let draft = null, lastFocus = null;
const F = { scrim: $('#dlgScrim'), form: $('#dlg'), name: $('#fName'), ja: $('#fJa'), start: $('#fStart'), end: $('#fEnd'), time: $('#fTime'), price: $('#fPrice'), cur: $('#fCur'), pnote: $('#fPriceNote'), notes: $('#fNotes'), loc: $('#fLoc'), sugg: $('#fSugg'), where: $('#fWhere'),
  conf: $('#fConf'), cin: $('#fIn'), cout: $('#fOut'), addr: $('#fAddr'), addrJa: $('#fAddrJa'), phone: $('#fPhone'), links: $('#fLinks') };
$('#fKind').innerHTML = Object.entries(KINDS).map(([k, v]) => `<label><input type="radio" name="kind" value="${k}">${glyph(k)}${esc(v.label)}</label>`).join('');
const radio = (name, v) => $$(`#dlg input[name="${name}"]`).forEach(r => r.checked = r.value === v);
const radioVal = name => ($(`#dlg input[name="${name}"]:checked`) || {}).value;
function syncKind() {
  const k = radioVal('kind'), stay = k === 'stay';
  $('#endWrap').hidden = !stay;
  $('#startLbl').textContent = stay ? 'Check-in date' : 'Date';
  $('#timeLbl').textContent = stay ? 'Arrive around' : k === 'move' ? 'Leave at' : 'Time';
  $('#priceLbl').textContent = stay ? 'Price a night for both' : 'Cost for both';
  $('#plannedLbl').textContent = stay ? 'Shortlist' : 'Planned';
  F.name.placeholder = k === 'note' ? 'A short title (optional)' : k === 'move' ? 'Ferry from Uno to Naoshima' : 'Benesse House';
}
$('#fKind').addEventListener('change', syncKind);
function syncWhere() {
  const near = draft && hasLoc(draft) ? nearestPlaceName(draft.lat, draft.lng) : '';
  F.where.innerHTML = draft && hasLoc(draft) ? `Pinned at <b class="num">${draft.lat.toFixed(4)}, ${draft.lng.toFixed(4)}</b>${near ? ' · near ' + esc(near) : ''}` : 'Not on the map yet. Search above or pick a spot. Notes can stay off the map.';
}
function openDialog(p) {
  if (!canEdit()) return;
  closePop(); lastFocus = document.activeElement;
  draft = { ...p }; const isNew = !p.id;
  $('#dlgTitle').textContent = isNew ? (p.kind === 'note' ? 'Add a note' : p.kind === 'stay' ? 'Add a stay' : p.kind === 'move' ? 'Add travel' : 'Add a place') : 'Edit ' + p.name;
  F.name.value = p.title !== undefined ? p.title : (p.name || ''); F.ja.value = p.ja || '';
  radio('kind', p.kind || 'see'); radio('status', p.status || 'planned'); syncKind();
  [F.start, F.end].forEach(i => { i.min = TRIP.start; i.max = TRIP.end; });
  F.start.value = p.start || ''; F.end.value = p.end || ''; F.time.value = p.time || '';
  F.cur.value = 'jpy'; F.price.value = p.price != null ? roundL(p.price) : '';
  F.pnote.value = p.priceNote || ''; F.notes.value = p.notes || ''; F.loc.value = '';
  F.conf.value = p.conf || ''; F.cin.value = p.checkin || ''; F.cout.value = p.checkout || ''; F.addr.value = p.address || ''; F.addrJa.value = p.addressJa || ''; F.phone.value = p.phone || '';
  F.links.value = (p.links || []).map(l => `${l.label} | ${l.url}`).join('\n');
  $('#fMore').open = !!(p.conf || p.address || p.addressJa || p.phone || (p.links && p.links.length) || (p.kind === 'stay' && isNew));
  F.sugg.hidden = true; syncWhere();
  $('#fPasteBox').hidden = true; $('#fPasteBox').value = ''; pasteNote(''); pdfPending = null; $('#fKeepWrap').hidden = true; $('#fKeepPdf').checked = true;
  $('#fDel').hidden = isNew; $('#fConfirm').hidden = true;
  F.scrim.hidden = false;
  setTimeout(() => (isNew && !F.name.value ? F.name : F.notes).focus(), 30);
}
function closeDialog() { F.scrim.hidden = true; draft = null; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
F.scrim.addEventListener('click', e => { if (e.target === F.scrim || e.target.closest('[data-close]')) closeDialog(); });
let suggList = [], suggAct = -1;
let onlineT = 0;
function drawSugg(busy) {
  F.sugg.innerHTML = suggList.map((g, i) => `<button type="button" data-g="${i}"><b>${esc(g.n)}</b>${g.ja ? `<span class="ja">${esc(g.ja)}</span>` : ''}<small>${esc(g.sub)}</small></button>`).join('')
    + (busy && !suggList.length ? '<div class="sugg-note">Searching…</div>' : '');
  F.sugg.hidden = !suggList.length && !busy;
}
F.loc.addEventListener('input', () => {
  const q = F.loc.value.trim(); const c = parseCoords(q);
  clearTimeout(onlineT);
  if (c) { draft.lat = c.lat; draft.lng = c.lng; syncWhere(); F.sugg.hidden = true; return; }
  suggList = searchGaz(q); suggAct = -1;
  // Japan's place list works offline; other countries (or a Japan search with no match) look online
  const online = q.length >= 3 && navigator.onLine !== false && (TRIP_COUNTRY() !== 'JP' || !suggList.length);
  drawSugg(online);
  if (online) onlineT = setTimeout(async () => {
    const r = await searchOnline(q); if (F.loc.value.trim() !== q) return;
    const have = new Set(suggList.map(g => g.n.toLowerCase())); suggList = [...suggList, ...r.filter(g => !have.has(g.n.toLowerCase()))].slice(0, 8); suggAct = -1;
    drawSugg(false); if (!suggList.length && q) { F.sugg.innerHTML = '<div class="sugg-note">No places found. Try the town name, or pick the spot on the map.</div>'; F.sugg.hidden = false; }
  }, 350);
});
F.loc.addEventListener('keydown', e => {
  if (F.sugg.hidden) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); suggAct = (suggAct + (e.key === 'ArrowDown' ? 1 : -1) + suggList.length) % suggList.length; $$('#fSugg button').forEach((b, i) => b.classList.toggle('act', i === suggAct)); }
  if (e.key === 'Enter' && suggAct >= 0) { e.preventDefault(); pickSugg(suggAct); }
});
F.sugg.addEventListener('click', e => { const b = e.target.closest('[data-g]'); if (b) pickSugg(+b.dataset.g); });
function pickSugg(i) { const g = suggList[i]; if (!g) return; draft.lat = g.lat; draft.lng = g.lng; if (!F.name.value.trim()) F.name.value = g.n; if (!F.ja.value.trim() && g.ja) F.ja.value = g.ja; F.loc.value = ''; F.sugg.hidden = true; syncWhere(); }
$('#fPick').onclick = () => {
  const keep = readForm(); F.scrim.hidden = true; if (isPhone()) setView('map');
  startPick('Tap the map to place it', ll => { draft = { ...keep, lat: +ll[1].toFixed(5), lng: +ll[0].toFixed(5) }; restoreForm(draft); F.scrim.hidden = false; syncWhere(); }, () => { draft = keep; restoreForm(keep); F.scrim.hidden = false; });
};
function restoreForm(d) { const keepLinks = d.linksRaw; openDialog({ ...d, links: [] }); if (keepLinks != null) F.links.value = keepLinks; draft = { ...draft, lat: d.lat, lng: d.lng }; syncWhere(); }
function readForm() {
  const k = radioVal('kind'); const pv = parseAmt(F.price.value);
  const price = isFinite(pv) && pv > 0 && (F.cur.value !== 'aud' || S.settings.rate) ? roundL(F.cur.value === 'aud' ? pv * S.settings.rate : pv) : null;
  return { ...draft, title: F.name.value.trim(), name: F.name.value.trim(), ja: F.ja.value.trim(), kind: k, status: radioVal('status') || 'planned', start: F.start.value, end: k === 'stay' ? F.end.value : '', time: hhmm(F.time.value), price, priceNote: F.pnote.value.trim(), linksRaw: F.links.value, notes: F.notes.value.trim(),
    conf: F.conf.value.trim(), checkin: hhmm(F.cin.value), checkout: hhmm(F.cout.value), address: F.addr.value.trim(), addressJa: F.addrJa.value.trim(), phone: F.phone.value.trim() };
}
function parseLinks(raw) {
  const out = [], bad = [];
  for (const line of String(raw || '').split(/\n/).map(x => x.trim()).filter(Boolean)) {
    let label = '', url = ''; const i = line.lastIndexOf('|');
    if (i >= 0) { label = line.slice(0, i).trim(); url = line.slice(i + 1).trim(); }
    else { const m = line.match(/https?:\/\/\S+/i); url = m ? m[0] : line; label = m ? line.replace(m[0], '').trim() : ''; }
    if (!safeUrl(url)) { bad.push(line); continue; }
    out.push({ label: (label || hostOf(url)).slice(0, 40), url });
  }
  return { links: out.slice(0, 12), bad };
}
F.form.addEventListener('submit', async e => {
  e.preventDefault();
  const d = readForm();
  if (!d.name && d.kind !== 'note') { F.name.focus(); toast('Give it a name first.'); return; }
  if (F.cur.value === 'aud' && parseAmt(F.price.value) > 0 && !S.settings.rate) { F.price.focus(); toast(`Set the exchange rate on the Spend tab first, or enter the price in ${CL().name.toLowerCase()}.`); return; }
  if (d.kind === 'note' && !d.name && !d.notes) { F.notes.focus(); toast('Write the note first.'); return; }
  const pl = parseLinks(d.linksRaw); if (pl.bad.length) { $('#fMore').open = true; F.links.focus(); toast('Each link needs to start with https://'); return; }
  if (d.kind === 'stay' && d.start && d.end && d.end <= d.start) { F.end.focus(); toast('Check-out needs to be after check-in.'); return; }
  const data = { name: d.name, ja: d.ja, kind: d.kind, status: d.status, start: d.start, end: d.end, time: d.time, price: d.price, priceNote: d.priceNote, links: pl.links, link: '', notes: d.notes,
    conf: d.conf, checkin: d.checkin, checkout: d.checkout, address: d.address, addressJa: d.addressJa, phone: d.phone, lat: hasLoc(d) ? d.lat : null, lng: hasLoc(d) ? d.lng : null };
  $('#fSave').disabled = true;
  let ok, id = d.id;
  if (!id) { id = newId(); ok = await put('places', id, { ...data, by: S.meId || 'local', created: Date.now(), likes: {}, photos: {} }, 'added'); }
  else ok = await patch('places', id, data, 'edited');
  $('#fSave').disabled = false;
  if (!ok) return;
  const keep = pdfPending && $('#fKeepPdf').checked ? pdfPending.blob : null; pdfPending = null;
  closeDialog(); select(id, { fly: true });
  if (keep) { try { if (await storePhoto(id, keep, true)) toast('Saved, with the PDF as a ticket'); } catch (er) { toast("Saved, but the PDF couldn't be kept. Add it with Add ticket."); } }
});
$('#fDel').onclick = () => { $('#fConfirm').hidden = false; $('#fDel').hidden = true; $('#fDelNo').focus(); };
$('#fDelNo').onclick = () => { $('#fConfirm').hidden = true; $('#fDel').hidden = false; };
$('#fDelYes').onclick = async () => { const id = draft && draft.id; if (!id) return; closeDialog(); S.sel = null; await removePlace(id); toast('Place deleted'); renderAll(); };
$('#addBtn').onclick = () => openDialog({ kind: 'see', status: 'planned', start: S.day || '' });

/* pick mode */
function cancelPick() { const c = S.picking && S.picking.cancel; S.picking = null; mapEl.classList.remove('picking'); hideBanner(); c && c(); }
function startPick(msg, cb, cancel) {
  S.picking = { cb, cancel }; mapEl.classList.add('picking'); closePop();
  showBanner(`${esc(msg)} <button class="btn btn-sm" type="button" id="pickCancel">Cancel</button>`);
  $('#pickCancel').onclick = cancelPick;
}
function showBanner(html) { const b = $('#banner'); b.innerHTML = html; b.hidden = false; }
function hideBanner() { $('#banner').hidden = true; if (S.follow) followBanner(); }
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (e.target === MQ.el) return; // the search bar handles its own Escape
  if (!$('#show').hidden) { closeShow(); return; }
  if (!$('#lightbox').hidden) { closeLightbox(); return; }
  if (!F.scrim.hidden) { if (!F.sugg.hidden) F.sugg.hidden = true; else closeDialog(); return; }
  if (S.picking) { cancelPick(); return; }
  if (popEl) { closePop(); return; }
  if (!$('#menu').hidden) { toggleMenu(false); return; }
  if (S.sel) deselect();
});

/* ---------- map search: your places first, then Japan's place list (offline), then OpenStreetMap (online) ---------- */
const MQ = { el: $('#mq'), list: $('#msugg'), x: $('#mqx'), box: $('#msearch'), hits: [], act: -1, t: 0, busy: false };
function ownHits(q) {
  const f = fold(q), raw = q.trim(); if (!f && !raw) return [];
  const out = [];
  for (const p of itinerary()) {
    if (!hasLoc(p)) continue;
    const hay = fold([p.name, p.ja, p.address, p.addressJa].filter(Boolean).join(' '));
    if ((f && hay.includes(f)) || (p.ja && p.ja.includes(raw)) || (p.addressJa && p.addressJa.includes(raw))) out.push(p);
    if (out.length >= 5) break;
  }
  return out.map(p => ({ place: p.id, n: p.name, ja: p.ja, kind: p.kind, lat: p.lat, lng: p.lng, sub: [KINDS[p.kind].label, p.start ? fmtShort(p.start) + (p.kind === 'stay' && p.end ? ' to ' + fmtShort(p.end) : '') : ''].filter(Boolean).join(' · ') }));
}
// how close to zoom for a result: whole cities and regions stay wide, a shop or sight comes in close
function hitZoom(h) {
  const t = String(h.type || '');
  return /^(country|state|region|province|county|city)$/i.test(t) ? 11 : /^(town|island|islet|archipelago|municipality|district|borough|suburb|quarter|village|hamlet|neighbourhood|locality)$/i.test(t) ? 13 : 16;
}
function drawMapSearch() {
  const own = MQ.hits.filter(h => h.place), other = MQ.hits.filter(h => !h.place);
  let i = 0;
  const row = h => { const n = i++; return `<button type="button" role="option" id="mh${n}" data-mh="${n}" class="${n === MQ.act ? 'act' : ''}" aria-selected="${n === MQ.act}">${h.place ? glyph(h.kind) : icon('pin')}<span><b>${esc(h.n)}</b>${h.ja && h.ja !== h.n ? `<span class="ja">${esc(h.ja)}</span>` : ''}${h.sub ? `<small>${esc(h.sub)}</small>` : ''}</span></button>`; };
  let html = (own.length ? '<div class="mh-h">Your places</div>' + own.map(row).join('') : '') + (other.length ? `<div class="mh-h">${own.length ? 'More places' : 'Places'}</div>` + other.map(row).join('') : '');
  if (MQ.busy) html += '<div class="note">Searching…</div>';
  else if (!MQ.hits.length) html += `<div class="note">${navigator.onLine === false ? 'Nothing found in your places' + (TRIP_COUNTRY() === 'JP' ? " or Japan's place list" : '') + '. Searching for other places needs the internet.' : 'No places found. Try a town, a station or a sight.'}</div>`;
  MQ.list.innerHTML = html; MQ.list.hidden = false;
  MQ.el.setAttribute('aria-expanded', 'true');
  if (MQ.act >= 0) { const a = $('#mh' + MQ.act); if (a) a.scrollIntoView({ block: 'nearest' }); MQ.el.setAttribute('aria-activedescendant', 'mh' + MQ.act); } else MQ.el.removeAttribute('aria-activedescendant');
}
function closeMapSearch() { MQ.list.hidden = true; MQ.el.setAttribute('aria-expanded', 'false'); clearTimeout(MQ.t); }
function runMapSearch() {
  const q = MQ.el.value.trim(); clearTimeout(MQ.t); MQ.x.hidden = !MQ.el.value; MQ.act = -1;
  if (!q) { MQ.hits = []; MQ.busy = false; closeMapSearch(); return; }
  const c = parseCoords(q);
  const gaz = searchGaz(q).slice(0, 6).map(g => ({ n: g.n, ja: g.ja, lat: g.lat, lng: g.lng, sub: g.sub, type: g.sub === 'City' ? 'city' : g.sub === 'Sight' ? 'spot' : 'town' }));
  MQ.hits = [...ownHits(q), ...(c ? [{ n: 'Go to these coordinates', sub: `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}`, lat: c.lat, lng: c.lng, coords: true }] : []), ...gaz];
  MQ.busy = !c && q.length >= 2 && navigator.onLine !== false;
  drawMapSearch();
  if (!MQ.busy) return;
  MQ.t = setTimeout(async () => {
    measure(); const cen = unP(W / 2, H / 2);
    const r = await searchOnline(q, cen && isFinite(cen[0]) ? { lat: cen[1], lng: cen[0], z: GL ? GL.getZoom() : K0 + Math.log2(zk()) } : null);
    if (MQ.el.value.trim() !== q) return;
    const dup = h => MQ.hits.some(o => fold(o.n) === fold(h.n) && Math.abs(o.lat - h.lat) < 0.01 && Math.abs(o.lng - h.lng) < 0.01);
    MQ.hits = [...MQ.hits, ...r.filter(h => !dup(h))].slice(0, 14); MQ.busy = false;
    if (document.activeElement === MQ.el || !MQ.list.hidden) drawMapSearch();
  }, 320);
}
async function goToHit(h) {
  if (!h) return;
  closeMapSearch(); MQ.el.blur();
  if (h.place) { MQ.el.value = ''; MQ.x.hidden = true; select(h.place); return; }
  if (isPhone() && S.view !== 'map') setView('map');
  if (S.sel) deselect();
  closePop();
  const k = 2 ** (hitZoom(h) - K0); await flyToPlace({ lat: h.lat, lng: h.lng }, 800, GL ? k : Math.min(k, 100), isPhone() ? 0.3 : null);
  const [x, y] = P(h.lng, h.lat); openPop([h.lng, h.lat], x, y, h);
}
MQ.el.addEventListener('input', runMapSearch);
MQ.el.addEventListener('focus', () => { closePop(); if (MQ.el.value.trim()) { if (MQ.hits.length || MQ.busy) drawMapSearch(); else runMapSearch(); } });
MQ.el.addEventListener('keydown', e => {
  const n = MQ.hits.length;
  if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && n) { e.preventDefault(); if (MQ.list.hidden) drawMapSearch(); MQ.act = (MQ.act + (e.key === 'ArrowDown' ? 1 : -1) + n + 1) % (n + 1); if (MQ.act === n) MQ.act = e.key === 'ArrowDown' ? 0 : n - 1; drawMapSearch(); return; }
  if (e.key === 'Enter') { e.preventDefault(); if (n) goToHit(MQ.hits[MQ.act >= 0 ? MQ.act : 0]); else if (!MQ.busy) runMapSearch(); return; }
  if (e.key === 'Escape') { e.preventDefault(); if (!MQ.list.hidden) closeMapSearch(); else { MQ.el.value = ''; MQ.x.hidden = true; MQ.hits = []; MQ.el.blur(); } }
});
MQ.list.addEventListener('pointerdown', e => e.preventDefault()); // keep the keyboard up while choosing
MQ.list.addEventListener('click', e => { const b = e.target.closest('[data-mh]'); if (b) goToHit(MQ.hits[+b.dataset.mh]); });
MQ.x.addEventListener('click', () => { MQ.el.value = ''; MQ.hits = []; MQ.busy = false; MQ.x.hidden = true; closeMapSearch(); closePop(); MQ.el.focus(); });
document.addEventListener('pointerdown', e => { if (!MQ.list.hidden && !MQ.box.contains(e.target)) closeMapSearch(); });
// the search box sits on the map, so taps on it are not map taps
MQ.box.addEventListener('click', e => e.stopPropagation());
['pointerdown', 'mousedown', 'touchstart', 'wheel', 'dblclick'].forEach(t => MQ.box.addEventListener(t, e => e.stopPropagation(), { passive: true }));

/* ---------- photos and tickets ---------- */
let photoTarget = null, ticketMode = false;
// keep one picture on a place: a photo, or a ticket (t) that opens full screen on white
async function storePhoto(id, blob, tk) {
  const useAssets = assets && S.mode === 'shared';
  const key = (tk ? 't' : 'f') + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  let rec;
  if (useAssets) { const r = await assets.upload(blob); rec = { a: r.id, by: S.meId, at: Date.now() }; }
  else {
    const small = S.mode === 'local' ? blob : await shrink(blob, tk ? 1200 : 720, tk ? 0.85 : 0.72);
    const data = await blobToData(small); const pid = 'ph' + key;
    if (S.mode === 'local') await idb.set(pid, { data, place: id });
    else await enqueue('photos/' + pid, () => db.doc('photos/' + pid).set({ data, place: id, by: S.meId }));
    S.photos.set(pid, { data, place: id }); rec = { d: pid, by: S.meId || 'local', at: Date.now() };
  }
  if (tk) rec.t = 1;
  return patch('places', id, { photos: { [key]: rec } }, tk ? 'added a ticket to' : 'added a photo to');
}
$('#photoInput').addEventListener('change', async e => {
  const tk = ticketMode; ticketMode = false;
  const isPdf = f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
  const files = [...e.target.files].filter(f => f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|heic)$/i.test(f.name) || (tk && isPdf(f))); e.target.value = '';
  const id = photoTarget; photoTarget = null; if (!id || !files.length) return;
  const btn = $(tk ? '#addTicket' : '#addPhoto'); if (btn) btn.classList.add('busy');
  let added = 0;
  for (const f of files.slice(0, 8)) {
    const pdf = isPdf(f);
    try {
      const big = tk ? (assets && S.mode === 'shared' ? 2000 : 1600) : (assets && S.mode === 'shared' ? 1600 : 1280), q = tk ? 0.9 : (assets && S.mode === 'shared' ? 0.84 : 0.8);
      const blob = pdf ? (await readPdf(f, { text: false })).image : await shrink(f, big, q);
      if (!blob) throw new Error('decode');
      if (await storePhoto(id, blob, tk)) added++;
    } catch (er) {
      toast(er && er.code === 'quota_exceeded' ? 'No room for more. Delete a few photos first.' : pdf ? "That PDF couldn't be read. Take a screenshot of the ticket and add that instead." : /heic/i.test(f.name) ? 'That photo is HEIC. Try a JPEG or PNG.' : "That image couldn't be added. Try a smaller JPEG or PNG.");
    }
  }
  const b2 = $(tk ? '#addTicket' : '#addPhoto'); if (b2) b2.classList.remove('busy');
  if (added) toast(tk ? (added === 1 ? 'Ticket added' : `${added} tickets added`) : added === 1 ? 'Photo added' : `${added} photos added`);
});
async function shrink(file, max, q) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('decode')); im.src = url; });
    const w = img.naturalWidth || img.width, hh = img.naturalHeight || img.height; if (!w || !hh) throw new Error('decode');
    const s = Math.min(1, max / Math.max(w, hh));
    const c = document.createElement('canvas'); c.width = Math.round(w * s); c.height = Math.round(hh * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return await new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('encode')), 'image/jpeg', q));
  } finally { URL.revokeObjectURL(url); }
}

/* ---------- booking PDFs: pdf.js reads the text and draws page one ----------
   The iPhone app carries its own copy so it works offline; the shared map loads it from cdnjs. */
const PDFJS = PWA ? { lib: 'vendor/pdf.min.js', worker: 'vendor/pdf.worker.min.js' } : { lib: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', worker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js' };
let pdfjsP = null;
function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (!pdfjsP) pdfjsP = new Promise((res, rej) => {
    const sc = document.createElement('script'); sc.src = PDFJS.lib; sc.async = true;
    sc.onload = () => { const L = window.pdfjsLib; if (!L) { pdfjsP = null; rej(new Error('pdfjs')); return; } L.GlobalWorkerOptions.workerSrc = PDFJS.worker; res(L); };
    sc.onerror = () => { pdfjsP = null; sc.remove(); rej(new Error('pdfjs')); };
    document.head.appendChild(sc);
  });
  return pdfjsP;
}
// rebuild reading lines from positioned text, two ways. `rows` reads across the page, so a label and its value
// on one line stay together. `cols` reads down each column: cells stacked under each other (left, right or centre
// aligned) form a block, so CHECK-IN / 3 / NOVEMBER / 15:00 stay together even when other columns sit beside them.
function pdfPageLines(tc, page) {
  const items = tc.items.filter(it => it.str && it.str.trim()).map(it => ({ s: it.str.normalize('NFKC'), x: it.transform[4], y: it.transform[5], w: it.width || 0, h: Math.abs(it.transform[3]) || it.height || 10 }));
  const rows = [];
  for (const it of items.sort((a, b) => b.y - a.y || a.x - b.x)) { const r = rows.find(r => Math.abs(r.y - it.y) <= Math.max(2, Math.min(r.h, it.h) * 0.45)); if (r) { r.items.push(it); r.h = Math.max(r.h, it.h); } else rows.push({ y: it.y, h: it.h, items: [it] }); }
  rows.sort((a, b) => b.y - a.y);
  for (const r of rows) {
    r.items.sort((a, b) => a.x - b.x); r.cells = [];
    let cur = null;
    for (const it of r.items) {
      const gap = cur ? it.x - cur.end : 0;
      if (cur && gap <= Math.min(it.h, 11) * 2.2) { cur.s += (gap > it.h * 0.12 && !/\s$/.test(cur.s) && !/^\s/.test(it.s) ? ' ' : '') + it.s; cur.end = it.x + it.w; }
      else { cur = { s: it.s, x: it.x, end: it.x + it.w }; r.cells.push(cur); }
    }
    r.cells.forEach(c => { c.s = c.s.replace(/[ \t\u00a0]+/g, ' ').trim(); });
  }
  const out = [];
  for (let i = 0; i < rows.length;) {
    const n = rows[i].cells.length; let j = i + 1;
    if (n > 1) while (j < rows.length && rows[j].cells.length === n && rows[j].y < rows[j - 1].y && rows[j - 1].y - rows[j].y < rows[j].h * 3.2) j++;
    if (n > 1 && j - i > 1) { for (let c = 0; c < n; c++) out.push({ t: rows.slice(i, j).map(r => r.cells[c].s).join(' '), h: rows[i].h, p: page }); }
    else out.push({ t: rows[i].cells.map(c => c.s).join(' '), h: rows[i].h, p: page });
    i = n > 1 && j - i > 1 ? j : i + 1;
  }
  const blocks = [];
  for (const r of rows) for (const c of r.cells) {
    let best = null, bd = Infinity;
    for (const b of blocks) {
      const l = b[b.length - 1], dy = l.y - r.y;
      if (dy <= 0.5 || dy > Math.max(l.h, r.h) * 2.8) continue;
      const lw = l.end - l.x, cw = c.end - c.x;
      const aligned = Math.abs(l.x - c.x) < 4 || Math.abs(l.end - c.end) < 4 || Math.abs((l.x + l.end) - (c.x + c.end)) / 2 < Math.max(6, Math.min(lw, cw) * 0.3);
      const overlap = Math.min(l.end, c.end) - Math.max(l.x, c.x) > Math.min(lw, cw) * 0.6;
      if ((aligned || overlap) && dy < bd) { bd = dy; best = b; }
    }
    const cell = { t: c.s, x: c.x, end: c.end, y: r.y, h: r.h };
    if (best) best.push(cell); else blocks.push([cell]);
  }
  blocks.sort((a, b) => (Math.abs(a[0].y - b[0].y) < 3 ? a[0].x - b[0].x : b[0].y - a[0].y));
  const cols = blocks.flatMap(b => [...b.map(c => ({ t: c.t, h: c.h, p: page })), { t: '', h: 0, p: page }]);
  return { rows: out, cols };
}
async function pdfPageImage(pg) {
  const v0 = pg.getViewport({ scale: 1 }), sc = Math.min(3, 1500 / Math.max(v0.width, v0.height)), v = pg.getViewport({ scale: sc });
  const c = document.createElement('canvas'); c.width = Math.round(v.width); c.height = Math.round(v.height);
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
  await pg.render({ canvasContext: x, viewport: v }).promise;
  return await new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('encode')), 'image/jpeg', 0.88));
}
async function readPdf(file, { text = true } = {}) {
  const L = await loadPdfJs();
  const doc = await L.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
  const lines = [], cols = []; let image = null;
  for (let i = 1; i <= Math.min(doc.numPages, text ? 4 : 1); i++) {
    const pg = await doc.getPage(i);
    if (text) { const r = pdfPageLines(await pg.getTextContent(), i); lines.push(...r.rows); cols.push(...r.cols); }
    if (i === 1) image = await pdfPageImage(pg);
  }
  doc.destroy && doc.destroy();
  return { lines, cols, image, name: file.name || '' };
}
// the heading: the biggest type near the top of page one, joined across its lines
function pdfTitle(lines) {
  const top = lines.filter(l => l.p === 1).slice(0, 10); if (!top.length) return '';
  const hs = top.map(l => l.h).sort((a, b) => a - b), med = hs[Math.floor(hs.length / 2)];
  for (let i = 0; i < top.length; i++) {
    if (top[i].h < med * 1.25 || TP.GENERIC.test(top[i].t) || !/[a-z\u3040-\u9fff]{3}/i.test(top[i].t)) continue;
    const parts = [top[i].t]; for (let k = i + 1; k < top.length && Math.abs(top[k].h - top[i].h) < 0.5; k++) parts.push(top[k].t);
    return parts.join(' ');
  }
  return '';
}
function pdfCapture(pdf) {
  const text = pdf.lines.map(l => l.t).join('\n'), down = (pdf.cols || []).map(l => l.t).join('\n'), refDay = TRIP.start || today();
  // read down the columns first (labels stay with their values), then across the rows for anything missed
  const a = TP.fromText(down || text, { refDay, loose: true }), b = TP.fromText(text, { refDay, loose: true });
  const when = a.start ? null : { start: b.start, end: b.end, checkin: b.checkin, checkout: b.checkout, time: b.time };
  const rest = {}; for (const k of ['conf', 'phone', 'address', 'addressJa', 'lat', 'lng', 'kind', 'room', 'breakfast']) if (a[k] == null && b[k] != null) rest[k] = b[k];
  const pr = b.price != null ? b : a; // prices read best across the rows, where a label and its amount share a line
  if (pr.price != null) { a.price = pr.price; a.cur = pr.cur; a.total = pr.total; }
  const lab = [a, b].find(x => x.nameFrom === 'label'), head = TP.docName(pdfTitle(pdf.lines)), site = TP.siteOf(text);
  const c = TP.merge(lab ? { name: lab.name, ja: lab.ja } : null, head, a, when, rest, b.nameFrom === 'route' && !a.name ? { name: b.name, ja: b.ja } : null);
  if (!c.conf) c.conf = TP.fileRef(pdf.name);
  c.kind = TP.kindOfHost(site) || a.kind || b.kind || 'see'; c.site = site;
  return { c: cleanCapture(c), from: site ? `your ${site} PDF` : 'the PDF', empty: !text.trim() };
}
const blobToData = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });
let LB = null;
function openLightbox(id, i) { LB = { id, i }; renderLightbox(); }
function closeLightbox() { $('#lightbox').hidden = true; LB = null; }
function renderLightbox() {
  const p = S.places.get(LB && LB.id); const box = $('#lightbox');
  const list = picsOf(p);
  if (!p || !list.length) { closeLightbox(); return; }
  LB.i = (LB.i + list.length) % list.length; const f = list[LB.i];
  box.innerHTML = `<div class="lh"><b>${esc(p.name)} · ${LB.i + 1} of ${list.length} · ${esc(firstName(f.by))}</b>${canEdit() ? `<span id="lbConfirm" hidden>Remove it? <button class="btn btn-sm" type="button" id="lbYes">Remove</button></span><button class="btn btn-sm" type="button" id="lbDel">${icon('trash')}Remove</button>` : ''}<button class="btn btn-sm" type="button" id="lbX">${icon('x')}Close</button></div>
    <div class="stage"><img src="${esc(photoSrc(f))}" alt="Photo of ${esc(p.name)}"></div>
    <div class="lf">${list.length > 1 ? `<button class="btn" type="button" id="lbPrev">${icon('left')}Previous</button><button class="btn" type="button" id="lbNext">Next${icon('right')}</button>` : ''}</div>`;
  box.hidden = false;
  $('#lbX').onclick = closeLightbox;
  if ($('#lbPrev')) { $('#lbPrev').onclick = () => { LB.i--; renderLightbox(); }; $('#lbNext').onclick = () => { LB.i++; renderLightbox(); }; }
  if ($('#lbDel')) $('#lbDel').onclick = () => { $('#lbConfirm').hidden = false; $('#lbDel').hidden = true; };
  if ($('#lbYes')) $('#lbYes').onclick = async () => {
    await patch('places', p.id, { photos: { [f.key]: null } }, 'removed a photo from');
    if (f.d) { if (S.mode === 'local') { idb.del(f.d).catch(() => {}); S.photos.delete(f.d); } else enqueue('photos/' + f.d, () => db.doc('photos/' + f.d).delete()).catch(() => {}); }
    if (f.a && assets) assets.delete(f.a).catch(() => {});
    closeLightbox(); toast('Photo removed');
  };
  $('#lbX').focus();
}
$('#lightbox').addEventListener('click', e => { if (e.target.classList.contains('stage')) closeLightbox(); });

/* ---------- tickets: full screen on white so scanners can read them ---------- */
let TK = null;
function openTicket(p, j) {
  const list = ticketsOf(p); if (!list.length) return;
  TK = { id: p.id, i: ((j || 0) + list.length) % list.length }; renderTicket();
  try { navigator.wakeLock && navigator.wakeLock.request('screen').then(l => { $('#show')._lock = l; }).catch(() => {}); } catch (e) {}
}
function renderTicket() {
  const p = S.places.get(TK && TK.id), list = ticketsOf(p), el = $('#show');
  if (!list.length) { closeShow(); return; }
  TK.i = (TK.i + list.length) % list.length; const f = list[TK.i];
  el.classList.add('ticket');
  el.innerHTML = `<div class="bar"><span class="label">${esc(p.name)}${list.length > 1 ? ` · ${TK.i + 1} of ${list.length}` : ''}</span>${canEdit() ? `<span class="tconfirm" id="tkConfirm" hidden>Remove it? <button class="btn btn-sm btn-red" type="button" id="tkYes">Remove</button></span><button class="btn btn-sm btn-ghost" type="button" id="tkDel">${icon('trash')}Remove</button>` : ''}<button class="iconbtn" type="button" id="showX" aria-label="Close">${icon('x')}</button></div>
    <div class="tstage"><img src="${esc(photoSrc(f))}" alt="Ticket for ${esc(p.name)}"></div>
    ${list.length > 1 ? `<div class="lf"><button class="btn" type="button" id="tkPrev">${icon('left')}Previous</button><button class="btn" type="button" id="tkNext">Next${icon('right')}</button></div>` : ''}
    <div class="fine">Turn your screen brightness up if the scanner struggles.</div>`;
  el.hidden = false; $('#showX').focus();
}
$('#show').addEventListener('click', async e => {
  if (!TK || !$('#show').classList.contains('ticket')) return;
  const t = e.target;
  if (t.closest('#tkPrev')) { TK.i--; renderTicket(); return; }
  if (t.closest('#tkNext')) { TK.i++; renderTicket(); return; }
  if (t.closest('#tkDel')) { $('#tkConfirm').hidden = false; $('#tkDel').hidden = true; return; }
  if (t.closest('#tkYes')) {
    const p = S.places.get(TK.id), f = ticketsOf(p)[TK.i]; if (!p || !f) return;
    await patch('places', p.id, { photos: { [f.key]: null } }, 'removed a ticket from');
    if (f.d) { if (S.mode === 'local') { idb.del(f.d).catch(() => {}); S.photos.delete(f.d); } else enqueue('photos/' + f.d, () => db.doc('photos/' + f.d).delete()).catch(() => {}); }
    if (f.a && assets) assets.delete(f.a).catch(() => {});
    toast('Ticket removed'); if (ticketsOf(S.places.get(TK.id)).length) renderTicket(); else closeShow();
  }
});

/* ---------- paste from a site: what the Add to Tabi button copied, or a booking email ---------- */
$('#fClipHelp').href = PWA ? 'clip.html' : CLIP_PAGE;
function cleanCapture(c) {
  const o = {}, s = (v, n) => typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '';
  o.name = s(c.name, 80); o.ja = s(c.ja, 40);
  o.kind = ['stay', 'move', 'see', 'food', 'craft', 'walk'].includes(c.kind) ? c.kind : '';
  o.start = isIso(c.start) ? c.start : ''; o.end = isIso(c.end) && c.end > o.start ? c.end : '';
  o.time = hhmm(c.time); o.checkin = hhmm(c.checkin); o.checkout = hhmm(c.checkout);
  const pv = +c.price; o.price = isFinite(pv) && pv > 0 && pv < 1e8 ? pv : null; o.cur = curSlot(c.cur); o.total = c.total === true;
  if (o.price && o.cur === 'other') { o.priceOther = `${String(c.cur).toUpperCase().slice(0, 3)} ${o.price.toLocaleString('en-AU')}${o.total ? ' total' : ''}`; o.price = null; }
  o.conf = s(c.conf, 60); o.address = s(c.address, 200); o.addressJa = s(c.addressJa, 200); o.phone = s(c.phone, 40);
  // a location the Add to Tabi button found outside Japan counts only if it's in the trip's country
  if (c.lat == null && Array.isArray(c.geos)) { const g = c.geos.find(g => Array.isArray(g) && isFinite(g[0]) && isFinite(g[1]) && inTripCountry(+g[0], +g[1])); if (g) c = { ...c, lat: +g[0], lng: +g[1] }; }
  const la = +c.lat, ln = +c.lng; if (c.lat != null && isFinite(la) && isFinite(ln) && Math.abs(la) <= 85 && Math.abs(ln) <= 180 && (la || ln)) { o.lat = +la.toFixed(5); o.lng = +ln.toFixed(5); }
  o.url = safeUrl(s(c.url, 600)); o.site = s(c.site, 40); o.room = s(c.room, 80); o.breakfast = c.breakfast === true;
  // "APB 高円寺" becomes APB Koenji when Tabi knows the Japanese place name; the Japanese stays as the sign
  if (o.name && TP.JP.test(o.name)) {
    let en = o.name, ok = true;
    for (const r of o.name.match(/[\u3040-\u30ff\u3400-\u9fff]+/g) || []) { const g = GAZ.find(g => g.ja === r); if (g) en = en.replace(r, g.n); else ok = false; }
    if (ok) { if (!o.ja) o.ja = o.name.replace(/\s+/g, ''); o.name = en.replace(/\s+/g, ' ').trim(); }
  }
  return o;
}
function readCapture(text) {
  const rec = TP.decode(text), refDay = TRIP.start || today();
  if (rec) {
    const tx = typeof rec.text === 'string' ? TP.fromText(rec.text.slice(0, 8000), { refDay, loose: rec.sel === true }) : {};
    const c = rec.sel === true ? TP.merge(tx, rec) : TP.merge(rec, tx); // a selection is what they chose, so it outranks the page
    if (!rec.kind) c.kind = tx.kind || TP.kindOf(rec.name || '', rec.url ? hostOf(rec.url) : '');
    return { c: cleanCapture(c), from: rec.site || (rec.url ? hostOf(rec.url) : '') };
  }
  const urls = String(text).match(/https?:\/\/[^\s<>"')\]]+/g) || [];
  const c = TP.merge(TP.fromText(text, { refDay, loose: true }), ...urls.slice(0, 6).map(u => TP.fromUrl(u)));
  const gm = urls.find(u => /google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps|maps\.apple\.com/i.test(u));
  c.url = gm || (urls.length === 1 && text.trim() === urls[0] ? urls[0] : '');
  if (c.url && gm) c.site = 'Google Maps';
  return { c: cleanCapture(c), from: urls.length === 1 && text.trim() === urls[0] ? hostOf(urls[0]) : '' };
}
function pasteNote(html, miss) { const n = $('#fPasteNote'); n.innerHTML = html; n.hidden = !html; n.classList.toggle('miss', !!miss); }
function applyCapture(c, from) {
  const isNew = !draft.id, got = [];
  if (isNew && c.kind) { radio('kind', c.kind); syncKind(); $('#dlgTitle').textContent = c.kind === 'stay' ? 'Add a stay' : c.kind === 'move' ? 'Add travel' : 'Add a place'; }
  const k = radioVal('kind');
  if (c.name && !F.name.value.trim()) { F.name.value = c.name; got.push('name'); }
  if (c.ja && !F.ja.value.trim()) F.ja.value = c.ja;
  if (c.start) { F.start.value = c.start; if (k === 'stay' && c.end) F.end.value = c.end; got.push(k === 'stay' && c.end ? 'dates' : 'date'); }
  const t = k === 'stay' ? '' : c.time; if (t) { F.time.value = t; got.push('time'); }
  if (c.checkin) F.cin.value = c.checkin; if (c.checkout) F.cout.value = c.checkout; if (k === 'stay' && (c.checkin || c.checkout)) got.push('check-in times');
  if (c.price) {
    const n = k === 'stay' && F.start.value && F.end.value ? diffDays(F.start.value, F.end.value) : 0;
    let v = c.price; if (k === 'stay' && c.total && n > 1) v = c.price / n; // the card already shows the total for the stay
    F.cur.value = c.cur; F.price.value = c.cur === 'aud' ? Math.round(v * 100) / 100 : roundL(v); got.push('price');
  }
  else if (c.priceOther && !F.pnote.value.trim()) { F.pnote.value = 'Paid ' + c.priceOther; got.push('price'); }
  if (c.conf) { F.conf.value = c.conf; radio('status', 'booked'); got.push('booking ref'); }
  if (c.address && !F.addr.value.trim()) { F.addr.value = c.address; got.push('address'); }
  if (c.addressJa && !F.addrJa.value.trim()) { F.addrJa.value = c.addressJa; if (!got.includes('address')) got.push('address'); }
  if (c.phone && !F.phone.value.trim()) F.phone.value = c.phone;
  if (c.room && !F.notes.value.trim()) { F.notes.value = c.room + (c.breakfast ? '. Breakfast included.' : ''); got.push('room'); }
  else if (c.breakfast && !F.pnote.value.trim()) F.pnote.value = 'Breakfast included';
  let moved = false;
  if (c.lat != null) { const far = hasLoc(draft) && Math.hypot(draft.lat - c.lat, (draft.lng - c.lng) * 0.83) > 0.003; if (!hasLoc(draft) || far) { moved = far; draft.lat = c.lat; draft.lng = c.lng; syncWhere(); got.push('map location'); } }
  // the old pin's town name as the Japanese name (直島) follows the pin to its new island or town (男木島)
  let jaNote = '';
  if (moved && F.ja.value.trim()) {
    const old = GAZ.find(g => g.ja && g.ja === F.ja.value.trim()), cc = Math.cos(c.lat * Math.PI / 180);
    const nb = GAZ.filter(g => g.ja && Math.hypot(g.lat - c.lat, (g.lng - c.lng) * cc) * 111 < 5).sort((x, y) => Math.hypot(x.lat - c.lat, (x.lng - c.lng) * cc) - Math.hypot(y.lat - c.lat, (y.lng - c.lng) * cc))[0];
    if (old && nb && nb.ja !== old.ja) { F.ja.value = nb.ja; jaNote = `Its ${LANG()} name changed from ${old.ja} to ${nb.ja} to match. `; }
  }
  if (c.url && !F.links.value.includes(c.url)) { const lbl = (c.site || hostOf(c.url)).replace(/\|/g, ' ').slice(0, 40); F.links.value = (F.links.value.trim() ? F.links.value.trim() + '\n' : '') + `${lbl} | ${c.url}`; got.push('link'); }
  if (F.conf.value || F.addr.value || F.addrJa.value || F.phone.value || F.links.value) $('#fMore').open = true;
  let near = '';
  if (!hasLoc(draft)) { const g = guessPin(c); if (g) { draft.lat = g.lat; draft.lng = g.lng; syncWhere(); near = g.n; got.push('map location'); } }
  if (!hasLoc(draft)) {
    const tries = [c.name, c.ja, ...(c.address || '').split(',').map(x => x.trim()).filter(x => x && !/\d{3}/.test(x)).reverse()].filter(Boolean);
    if (TRIP_COUNTRY() === 'JP') { for (const q of tries) { if (searchGaz(q).length) { F.loc.value = q; F.loc.dispatchEvent(new Event('input')); break; } } }
    else { const q = (c.address || '').split(',').slice(0, 2).join(',').trim() || c.name; if (q) { F.loc.value = q; F.loc.dispatchEvent(new Event('input')); } }
  }
  if (c.ja && !c.name && !F.name.value.trim()) got.unshift(LANG() + ' name');
  const list = got.length > 1 ? got.slice(0, -1).join(', ') + ' and ' + got[got.length - 1] : got.join('');
  const todo = [!F.name.value.trim() ? 'add an English name' : '', hasLoc(draft) ? '' : 'pick it on the map or search below'].filter(Boolean).join(', ');
  if (got.length) pasteNote(`Filled in ${esc(list)}${from ? ' from ' + esc(from) : ''}. ${moved ? 'The pin moved to the location in the booking. ' + esc(jaNote) : ''}${near ? `It's pinned at ${esc(near)} for now; use <b>Pick on map</b> for the exact spot. ` : ''}${todo ? todo.charAt(0).toUpperCase() + todo.slice(1) + ', then check' : 'Check'} it and save.`);
  else pasteNote("Couldn't find booking details in that. Use the Add to Tabi button on the booking page, or paste the confirmation email text.", true);
}
// an island, town or sight Tabi already knows, named in the booking: "Kurashi, Teshima Island" or "366 Teshimaieura, ..."
function guessPin(c) {
  if (TRIP_COUNTRY() !== 'JP') return null;
  const clean = t => fold(String(t || '').replace(/\d[\d-]*/g, ' ').replace(/\b(?:island|islands|district|city|town|village|ward|prefecture|gun|shi|cho|machi|japan)\b/gi, ' ').replace(new RegExp('\\b' + COUNTRY().name + '\\b', 'gi'), ' '));
  const parts = String(c.name || '').split(',').map(clean).filter(Boolean);
  const toks = [...parts.slice(1), parts[0], clean(String(c.address || '').split(',')[0])].filter(t => t && t.length >= 4);
  for (const t of toks) {
    const g = GAZ.find(g => fold(g.n) === t) || GAZ.find(g => { const n = fold(g.n); return n.length >= 5 && !n.includes(' ') && t.split(' ').some(w => w !== n && w.startsWith(n)); });
    if (g) return g;
  }
  return null;
}
function usePaste(text) {
  $('#fPasteBox').hidden = true; if (!draft) return;
  // a whole Google Maps list goes to its own import, as maybes
  const ls = readListSource(text); if (ls) { closeDialog(); openListImport(ls); return; }
  const r = readCapture(text); applyCapture(r.c, r.from); }
async function pasteFromSite() {
  let text = '';
  try { if (navigator.clipboard && navigator.clipboard.readText) text = await navigator.clipboard.readText(); } catch (e) {}
  if (text && text.trim()) { usePaste(text); return; }
  const box = $('#fPasteBox'); box.hidden = false; box.value = ''; box.focus();
  pasteNote('');
}
$('#fPaste').onclick = () => pasteFromSite();
$('#fPasteBox').addEventListener('paste', e => { const v = e.clipboardData && e.clipboardData.getData('text'); if (v && v.trim()) { e.preventDefault(); usePaste(v); } });
let pasteT = null;
$('#fPasteBox').addEventListener('input', e => { clearTimeout(pasteT); const v = e.target.value; if (v.trim().length > 20) pasteT = setTimeout(() => usePaste(v), 700); });
function addFromSite() { openDialog({ kind: 'see', status: 'planned', start: '' }); pasteFromSite(); }
// a booking PDF: read it, fill the form, and offer to keep page one as a ticket
let pdfPending = null;
$('#fPdf').onclick = () => $('#pdfInput').click();
$('#pdfInput').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f || !draft) return;
  if (!(f.type === 'application/pdf' || /\.pdf$/i.test(f.name))) { pasteNote('That isn\'t a PDF. Choose the booking PDF from Files.', true); return; }
  const btn = $('#fPdf'); btn.classList.add('busy'); pasteNote('Reading the PDF…');
  try {
    const pdf = await readPdf(f);
    pdfPending = pdf.image ? { blob: pdf.image } : null; $('#fKeepWrap').hidden = !pdfPending;
    const r = pdfCapture(pdf);
    if (r.empty) pasteNote('This PDF is a scanned picture with no text, so Tabi can\'t read the details. Fill them in, and keep the PDF with the place to show at check-in.', true);
    else applyCapture(r.c, r.from);
  } catch (er) { pasteNote(navigator.onLine === false && !PWA ? 'Reading PDFs needs the internet the first time. Try again when you\'re online.' : 'That PDF couldn\'t be read. Try pasting the booking email instead.', true); }
  btn.classList.remove('busy');
});
function addFromPdf() { openDialog({ kind: 'see', status: 'planned', start: '' }); $('#pdfInput').click(); }

/* ---------- ideas from Claude ---------- */
async function askIdeas(p) {
  if (!sample) return;
  S.ideas = { for: p.id, loading: true, items: [] }; renderCard();
  const month = parseD(p.start || (today() >= TRIP.start && today() <= TRIP.end ? today() : TRIP.start)).toLocaleDateString('en-AU', { month: 'long' });
  const prompt = `Two adults are travelling in ${COUNTRY().name} in ${month}. They love drawing and knitting somewhere calm and scenic, craft and art, long walks, local food and quiet bars.
Suggest 5 real places within about 8 km of "${p.name}"${p.ja ? ` (${p.ja})` : ''} at latitude ${p.lat.toFixed(4)}, longitude ${p.lng.toFixed(4)}. Only include places you are confident exist and are open to visitors. Mix the kinds. Do not include "${p.name}" itself.
Reply with JSON only: {"ideas":[{"name":"English name","ja":"${LANG() ? LANG() + ' name' : ''}","kind":"see|food|craft|walk","lat":0,"lng":0,"why":"one short sentence on why it suits them"}]}`;
  try {
    const out = await sample.json(prompt, { modelTier: 'default' });
    const arr = (out && Array.isArray(out.ideas) ? out.ideas : []).filter(x => x && typeof x.name === 'string').slice(0, 6).map(x => ({
      name: String(x.name).slice(0, 80), ja: typeof x.ja === 'string' ? x.ja.slice(0, 30) : '', kind: ['see', 'food', 'craft', 'walk'].includes(x.kind) ? x.kind : 'see',
      lat: +x.lat, lng: +x.lng, why: typeof x.why === 'string' ? x.why.slice(0, 200) : '' }))
      .filter(x => isFinite(x.lat) && isFinite(x.lng) && Math.abs(x.lat - p.lat) < 0.3 && Math.abs(x.lng - p.lng) < 0.3);
    if (!S.ideas || S.ideas.for !== p.id) return;
    S.ideas = arr.length ? { for: p.id, items: arr } : { for: p.id, items: [], error: 'No ideas came back for this spot. Try another place.' };
    renderCard(); renderPins();
    if (arr.length) zoomTo(fitTransform([p, ...arr], { maxK: 14 }));
  } catch (e) {
    if (!S.ideas || S.ideas.for !== p.id) return;
    if (e && e.code === 'not_granted') { sample = null; S.ideas = null; renderCard(); toast('Ideas from Claude are turned off here.'); return; }
    S.ideas = { for: p.id, items: [], error: e && e.code === 'rate_limited' ? 'Too many requests just now. Try again in a minute.' : "Claude couldn't answer just now. Try again in a moment." };
    renderCard();
  }
}
async function addIdea(i) {
  const I = S.ideas; if (!I || !I.items[i]) return; const it = I.items[i]; const src = S.places.get(I.for);
  const ok = await put('places', newId(), { name: it.name, ja: it.ja, kind: it.kind, status: 'maybe', lat: it.lat, lng: it.lng, notes: (it.why ? it.why + '\n' : '') + `Suggested by Claude near ${src ? src.name : 'here'}. Check the location and opening hours.`, by: S.meId || 'local', created: Date.now(), likes: {}, photos: {} }, 'added');
  if (ok) { it.added = true; renderCard(); renderPins(); toast(it.name + ' added as a maybe'); }
}

/* ---------- play the trip ---------- */
$('#playBtn').onclick = () => S.playing ? stopPlay() : playTrip();
function setPlayBtn() { $('#playBtn').innerHTML = S.playing ? `${icon('stop')}<span class="btn-label">Stop</span>` : `${icon('play')}<span class="btn-label">Play the trip</span>`; $('#playBtn').classList.toggle('btn-primary', S.playing); }
function stopPlay() { S.playing = false; S.playDay = null; setPlayBtn(); if (trainEl) { trainEl.remove(); trainEl = null; } renderDays(); }
async function playTrip() {
  const stops = routeStays();
  if (stops.length < 2) { toast('Add at least two stays with dates to play the trip.'); return; }
  if (isPhone()) setView('map');
  S.playing = true; setPlayBtn(); closePop(); S.sel = null; renderAll();
  trainEl = document.createElement('div'); trainEl.className = 'train'; trainEl.innerHTML = `<span>${icon('train')}</span>`; pinsEl.appendChild(trainEl);
  const legMs = REDUCE ? 0 : 1500;
  try {
    for (let i = 0; i < stops.length && S.playing; i++) {
      const b = stops[i];
      if (i > 0) {
        const a = stops[i - 1];
        await zoomTo(fitTransform([a, b], { pad: 90, maxK: 9 }), REDUCE ? 0 : 900); if (!S.playing) break;
        const interp = d3.geoInterpolate([a.lng, a.lat], [b.lng, b.lat]);
        const days = TRIP_DAYS.filter(d => d >= a.start && d < b.start);
        await new Promise(res => {
          if (!legMs) { trainEl._ll = [b.lng, b.lat]; positionAll(); res(); return; }
          const t0 = performance.now();
          const step = now => { if (!S.playing) return res(); const k = Math.min(1, (now - t0) / legMs);
            trainEl._ll = interp(d3.easeCubicInOut(k)); positionAll();
            const di = Math.min(days.length - 1, Math.floor(k * days.length)); if (days[di] && S.playDay !== days[di]) { S.playDay = days[di]; renderDays(); }
            k < 1 ? requestAnimationFrame(step) : res(); };
          requestAnimationFrame(step);
        });
      } else { trainEl._ll = [b.lng, b.lat]; positionAll(); }
      if (!S.playing) break;
      S.playDay = b.start; S.sel = b.id; renderAll();
      await flyToPlace(b, REDUCE ? 0 : 900, 12);
      await sleep(REDUCE ? 1400 : 1900);
    }
  } finally { if (S.playing) { stopPlay(); toast('That is the trip so far.'); } }
}

/* ---------- presence ---------- */
let presenceTimer = null, pending = {};
function presence(patchObj) { if (!room) return; Object.assign(pending, patchObj); clearTimeout(presenceTimer); presenceTimer = setTimeout(() => { const p = pending; pending = {}; room.presence(p).catch(() => {}); }, 120); }
function onViewChange() { if (!room) return; const c = unP(W / 2, H / 2); if (c) presence({ c: [+c[0].toFixed(4), +c[1].toFixed(4)], z: +zk().toFixed(2) }); }
let lastMove = 0;
mapEl.addEventListener('pointermove', e => {
  if (!room || e.pointerType === 'touch') return; const now = performance.now(); if (now - lastMove < 50) return; lastMove = now;
  const r = mapEl.getBoundingClientRect(); const ll = unP(e.clientX - r.left, e.clientY - r.top); if (ll) room.presence({ cur: [+ll[0].toFixed(4), +ll[1].toFixed(4)] }).catch(() => {});
});
mapEl.addEventListener('pointerleave', () => { if (room) room.presence({ cur: null }).catch(() => {}); });
function renderCursors() {
  const live = new Set();
  for (const pe of S.peers) {
    const cur = pe.presence && Array.isArray(pe.presence.cur) ? pe.presence.cur : null; if (!cur || !isFinite(cur[0]) || !isFinite(cur[1])) continue;
    live.add(pe.peer); let el = cursorEls.get(pe.peer); const w = who(pe.by);
    if (!el) { el = document.createElement('div'); el.className = 'cursor'; pinsEl.appendChild(el); cursorEls.set(pe.peer, el); }
    el.style.setProperty('--pc', w.color);
    el.innerHTML = `<svg viewBox="0 0 18 18"><path d="M2 2l5 14 2-6 6-2z" fill="${esc(w.color)}" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg><em>${esc(firstName(pe.by))}</em>`;
    el._ll = cur;
  }
  for (const [k, el] of cursorEls) if (!live.has(k)) { el.remove(); cursorEls.delete(k); }
  positionAll();
}
$('#peers').addEventListener('click', e => {
  const b = e.target.closest('[data-peer]'); if (!b || !room) return;
  const pe = S.peers.find(p => p.peer === b.dataset.peer); if (!pe) return;
  if (S.follow === pe.peer) { S.follow = null; room.presence({ follow: null }).catch(() => {}); hideBanner(); return; }
  S.follow = pe.peer; room.presence({ follow: { of: pe.peer } }).catch(() => {}); followBanner(); if (isPhone()) setView('map'); goToPeer(pe, 700);
});
function followBanner() { const pe = S.peers.find(p => p.peer === S.follow); if (!pe) { S.follow = null; $('#banner').hidden = true; return; } showBanner(`Following ${esc(firstName(pe.by))} <button class="btn btn-sm" type="button" id="unfollow">Stop</button>`); $('#unfollow').onclick = () => { S.follow = null; room && room.presence({ follow: null }).catch(() => {}); $('#banner').hidden = true; }; }
function goToPeer(pe, dur) {
  const pr = pe.presence || {};
  if (pr.sel && S.places.get(pr.sel) && S.sel !== pr.sel) { S.sel = pr.sel; renderAll(); }
  if (Array.isArray(pr.c) && isFinite(pr.z)) zoomTo(viewAt(pr.c, pr.z), dur);
}

/* ---------- menu ---------- */
function renderMenu() {
  $('#menu').innerHTML = (PWA ? `<button type="button" data-m="share">${icon('share')}<span>Share trip file</span></button><label>${icon('upload')}<span>Import a trip file</span><input type="file" class="tripImport" accept=".json,application/json" hidden></label><button type="button" data-m="settings">${icon('settings')}<span>Trip settings</span></button><button type="button" data-m="trips">${icon('route')}<span>Trips and next country</span></button>` : `<label>${icon('upload')}<span>Import the old map's export</span><input type="file" id="importOld" accept=".json,application/json" hidden></label>`)
    + (canEdit() ? `<button type="button" data-m="paste">${icon('clip')}<span>Add from a site or email</span></button><button type="button" data-m="pdf">${icon('doc')}<span>Import a booking PDF</span></button><button type="button" data-m="gm">${icon('download')}<span>Import a Google Maps list</span></button>` : '') + `<a href="${PWA ? 'clip.html' : CLIP_PAGE}" target="_blank" rel="noopener" class="mlink">${icon('link')}<span>Set up the Add to Tabi button</span></a>`
    + `${TRIP_COUNTRY() === 'JP' ? `<button type="button" data-m="rail">${icon('train')}<span>${railOn ? 'Hide' : 'Show'} Shinkansen lines</span></button>` : ''}<button type="button" data-m="fit">${icon('fit')}<span>Show all of ${esc(COUNTRY().name)}</span></button><button type="button" data-m="detail">${icon('map')}<span>${glOn ? 'Use the simple map' : 'Use the detailed street map'}</span></button>${PWA && glOn ? `<button type="button" data-m="offline">${icon('download')}<span>Save maps for offline</span></button>` : ''}`
    + `<div class="note">Map data: MLIT National Land Numerical Information, Natural Earth and GeoNames.</div>` + (PWA ? `<div class="note">Each phone keeps its own copy and works offline. To sync, share your trip file and import it on the other phone. The newest change wins.</div>` : '');
}
function toggleMenu(open) { if (open) renderMenu(); $('#menu').hidden = !open; $('#moreBtn').setAttribute('aria-expanded', String(open)); }
$('#moreBtn').onclick = e => { e.stopPropagation(); toggleMenu($('#menu').hidden); };
document.addEventListener('click', e => { if (!e.target.closest('#menu,#moreBtn')) toggleMenu(false); });
$('#menu').addEventListener('click', e => {
  const b = e.target.closest('[data-m]'); if (!b) return; const m = b.dataset.m; toggleMenu(false);
  if (m === 'rail') { railOn = !railOn; mapEl.classList.toggle('no-rail', !railOn); pref('rail', railOn ? 'on' : 'off'); if (GL && GL.getLayer('tabi-rail')) GL.setLayoutProperty('tabi-rail', 'visibility', railOn ? 'visible' : 'none'); }
  if (m === 'detail') { glOn = !glOn; pref('detail', glOn ? 'on' : 'off'); if (glOn) { glTried = false; startGL(true); } else stopGL(); }
  if (m === 'offline') saveMapsOffline();
  if (m === 'fit') { if (isPhone()) setView('map'); zoomTo(countryView()); }
  if (m === 'share' && PWA) exportTrip();
  if (m === 'paste') addFromSite();
  if (m === 'pdf') addFromPdf();
  if (m === 'gm') openListImport(null);
  if (m === 'settings' && PWA) openSettings(false);
  if (m === 'trips' && PWA) openTrips();
});
$('#menu').addEventListener('change', e => {
  if (e.target.id === 'importOld') importOld(e.target);
  if (e.target.classList.contains('tripImport') && PWA) { toggleMenu(false); importTripFile(e.target); }
});
async function importOld(input) {
  const f = input.files[0]; input.value = ''; toggleMenu(false); if (!f) return;
  if (!canEdit()) { toast('Changes are turned off for you here.'); return; }
  try {
    const data = JSON.parse(await f.text()); const items = Array.isArray(data) ? data : data.items; if (!Array.isArray(items)) throw 0;
    const map = { stay: 'stay', visit: 'see', food: 'food', note: 'note', idea: 'see' }; let n = 0;
    for (const it of items.slice(0, 300)) {
      if (!it || typeof it.name !== 'string') continue;
      if ([...S.places.values()].some(p => p.name.toLowerCase() === it.name.trim().toLowerCase() && (p.start || '') === (it.start || ''))) continue;
      const ok = await put('places', newId(), { name: it.name.trim().slice(0, 120), kind: map[it.type] || 'see', status: it.type === 'idea' ? 'maybe' : it.type === 'stay' ? 'booked' : 'planned',
        start: isIso(it.start) ? it.start : '', end: it.type === 'stay' && isIso(it.end) ? it.end : '', lat: typeof it.lat === 'number' ? it.lat : null, lng: typeof it.lng === 'number' ? it.lng : null,
        notes: typeof it.notes === 'string' ? it.notes.slice(0, 4000) : '', visited: it.done ? today() : '', by: S.meId || 'local', created: Date.now(), likes: {}, photos: {} }, 'imported');
      if (ok) n++;
    }
    toast(n ? `Imported ${n} place${n === 1 ? '' : 's'}` : 'Everything in that file is already here.'); if (n) fitPlaces();
  } catch (er) { toast("That file isn't an export from the old trip map."); }
}

/* ---------- render ---------- */
function renderAll(skipProfiles) {
  renderHeader(); renderDays(); renderNav(); renderPanel(); renderRoute(); renderPins(); renderCard();
  if (!skipProfiles) refreshProfiles();
}
uiReady = true; onCountry();

/* ---------- Google Maps lists: a Saved list, or a list somebody shared, comes in as maybes ----------
   Three ways in: the Add to Tabi button on the list's page (it copies every place), a file from Google Takeout
   (a list's .csv, or Saved Places.json), or a My Maps .kml. Each place becomes a maybe, pinned on the map. */
const JP_WIDE = [122, 20, 154, 46.5]; // Okinawa to Hokkaido, as the Add to Tabi button has always judged Japan
function inTripCountry(lat, lng) {
  const c = COUNTRY().bbox, b = TRIP_COUNTRY() === 'JP' ? JP_WIDE : [c[0] - 1.5, c[1] - 1.5, c[2] + 1.5, c[3] + 1.5];
  return lng >= b[0] && lng <= b[2] && lat >= b[1] && lat <= b[3];
}
const km = (a, b) => { const c = Math.cos((a.lat + b.lat) / 2 * Math.PI / 180); return Math.hypot(a.lat - b.lat, (a.lng - b.lng) * c) * 111.2; };
const distText = d => d < 1 ? `${Math.max(10, Math.round(d * 100) * 10)} m` : `${d < 10 ? d.toFixed(1) : Math.round(d)} km`;
// what kind of place a name suggests; anything unrecognised is a sight
const KIND_GUESS = [
  ['food', /\b(bar|pub|izakaya|caf[eé]|coffee|kissa|bakery|ramen|sushi|soba|udon|yakitori|yakiniku|tonkatsu|tempura|curry|burgers?|pizza|pizzeria|restaurant|diner|bistro|brasserie|trattoria|osteria|taverna|kitchen|grill|eatery|noodles?|tea ?house|tea ?room|brewery|brewing|taproom|wine|sake|whisk(?:e)?y|cocktails?|gelat\w+|patisserie|donuts?|doughnuts?|market)\b|居酒屋|食堂|喫茶|珈琲|ラーメン|寿司|鮨|そば|蕎麦|うどん|焼肉|焼鳥|酒場|バー|カフェ|レストラン|식당|카페|餐廳|咖啡/i],
  ['stay', /\b(hotel|hostel|ryokan|guest ?house|minshuku|lodge)\b|旅館|ホテル|民宿/i],
  ['craft', /\b(museum|gallery|art|arts|craft|crafts|ceramics?|pottery|studio|yarn|wool|fabric|textiles?|book ?(?:store|shop)|books|records?|vintage|antiques?|stationery|atelier)\b|美術館|博物館|ギャラリー|工房|手芸|毛糸|古着/i],
  ['walk', /\b(park|gardens?|trail|hike|hiking|mt\.?|mount|mountain|gorge|falls|waterfall|beach|lake|forest|walk|path|lookout|viewpoint|observatory)\b|公園|庭園|渓谷|の滝|展望/i]
];
const guessKind = t => { for (const [k, re] of KIND_GUESS) if (re.test(t)) return k; return 'see'; };
// a small reader for comma-separated files, with quoted cells
function csvRows(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); cell = ''; rows.push(row); row = []; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
const cleanStr = (v, n) => typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '';
function listPlace(o) {
  const p = { n: cleanStr(o.n, 80), ja: cleanStr(o.ja, 40), a: cleanStr(o.a, 200), aj: cleanStr(o.aj, 200), note: cleanStr(o.note, 300), url: safeUrl(cleanStr(o.url, 600)) };
  const la = +o.lat, ln = +o.lng; if (o.lat != null && o.lng != null && isFinite(la) && isFinite(ln) && Math.abs(la) <= 85 && Math.abs(ln) <= 180 && (la || ln)) { p.lat = +la.toFixed(6); p.lng = +ln.toFixed(6); }
  if (!p.url && /^\d{1,20}$/.test(String(o.cid || ''))) p.url = 'https://www.google.com/maps?cid=' + o.cid;
  // a Japanese address from Google reads better to a driver in its own field
  if (p.a && !p.aj && TP.JP.test(p.a)) { p.aj = p.a; p.a = ''; }
  return p.n ? p : null;
}
const gmUrlCoords = u => { let s = String(u || ''); try { s = decodeURIComponent(s); } catch (e) {} const m = /\/maps\/search\/(-?\d+\.\d+),\s*(-?\d+\.\d+)/.exec(s); return m ? { lat: +m[1], lng: +m[2] } : TP.coords(s); };
// what a pasted text or a chosen file holds: { list, places } or null
function readListSource(text, fname) {
  const t = String(text || '').replace(/^﻿/, '').trim(); if (!t) return null;
  const done = (list, raw) => { const places = raw.map(listPlace).filter(Boolean).slice(0, 600); return places.length ? { list: cleanStr(list, 60) || 'Google Maps list', places } : null; };
  const base = String(fname || '').replace(/\.[a-z]+$/i, '');
  const rec = TP.decode(t);
  if (rec && Array.isArray(rec.places)) return done(rec.list, rec.places.filter(p => p && typeof p === 'object'));
  if (rec) return null;
  if (/^\)\]\}'/.test(t) || /^\[\[\[/.test(t)) { try { const r = TP.gmList(JSON.parse(t.replace(/^\)\]\}'\s*/, ''))); return done(r.list, r.places); } catch (e) { return null; } }
  if (t[0] === '{') {
    try {
      const j = JSON.parse(t); if (!Array.isArray(j.features)) return null;
      return done(base || 'Saved places', j.features.map(f => { const pr = (f && f.properties) || {}, lo = pr.location || pr.Location || {}, c = (f && f.geometry && f.geometry.coordinates) || [];
        return { n: lo.name || lo['Business Name'] || pr.Title || pr.name || lo.address || '', lat: c[1], lng: c[0], a: lo.address || lo.Address || '', note: pr.Comment || '', url: pr.google_maps_url || pr['Google Maps URL'] || '' }; }));
    } catch (e) { return null; }
  }
  if (/<Placemark[\s>]/i.test(t)) {
    const tag = (s, n) => { const m = new RegExp(`<${n}[^>]*>([\\s\\S]*?)</${n}>`, 'i').exec(s); return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim() : ''; };
    const doc = /<Document[^>]*>\s*<name>([\s\S]*?)<\/name>/i.exec(t);
    return done(doc ? doc[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1') : base, (t.match(/<Placemark[\s>][\s\S]*?<\/Placemark>/gi) || []).map(pm => { const c = tag(pm, 'coordinates').split(/[\s,]+/).map(Number); return { n: tag(pm, 'name'), lat: c[1], lng: c[0], note: tag(pm, 'description') }; }));
  }
  const rows = csvRows(t), hi = rows.findIndex(r => r.some(c => /^title$/i.test(c.trim())) && r.some(c => /^url$/i.test(c.trim())));
  if (hi >= 0) {
    const H = rows[hi].map(c => c.trim().toLowerCase()), col = n => H.indexOf(n);
    return done(base, rows.slice(hi + 1).filter(r => (r[col('title')] || '').trim() || (r[col('url')] || '').trim()).map(r => { const url = (r[col('url')] || '').trim(), c = gmUrlCoords(url) || {}, nm = /\/maps\/place\/([^/@?]+)/.exec(url);
      let n = (r[col('title')] || '').trim(); if (!n && nm) { try { n = decodeURIComponent(nm[1].replace(/\+/g, ' ')); } catch (e) {} }
      return { n: n || (c.lat != null ? 'Pinned place' : ''), lat: c.lat, lng: c.lng, note: [r[col('note')], r[col('comment')]].filter(x => x && x.trim()).join(' '), url }; }));
  }
  // several Google Maps links, one on each line
  const lines = t.split(/\n+/).map(l => l.trim()).filter(Boolean), GM_URL = /https?:\/\/(?:www\.|maps\.)?google\.[a-z.]+\/maps\S*/i;
  if (lines.length >= 2 && lines.every(l => GM_URL.test(l))) return done('Google Maps links', lines.map(l => { const u = GM_URL.exec(l)[0], r = TP.fromUrl(u); return { n: r.name || r.ja || '', lat: r.lat, lng: r.lng, url: u }; }));
  return null;
}
async function putMany(recs, what) {
  if (S.mode === 'local') { for (const [id, d] of recs) { local.places[id] = { ...d, ...lastStamp(what) }; delete local.deleted[id]; } saveLocal(); applyLocal(); return recs.length; }
  let n = 0; for (const [id, d] of recs) if (await put('places', id, d, what)) n++;
  return n;
}
let GM = null;
function closeListImport() { const s = $('#gmScrim'); if (s) s.remove(); GM = null; }
function openListImport(src) {
  if (!canEdit()) { toast('Changes are turned off for you here.'); return; }
  closeListImport(); toggleMenu(false);
  const el = document.createElement('div'); el.className = 'scrim'; el.id = 'gmScrim'; document.body.appendChild(el);
  el.addEventListener('click', e => {
    const t = e.target;
    if (t === el || t.closest('[data-gx]')) { closeListImport(); return; }
    if (t.closest('#gmPaste')) { listFromClipboard(); return; }
    if (t.closest('#gmAll')) { const on = GM.items.some(i => !i.on && !i.dupe); GM.items.forEach(i => { if (!i.dupe) i.on = on; }); drawListReview(); return; }
    if (t.closest('#gmGo')) runListImport();
  });
  el.addEventListener('change', e => {
    const t = e.target;
    if (t.classList.contains('gmFile')) { const f = t.files && t.files[0]; t.value = ''; if (f) f.text().then(x => takeList(x, f.name)).catch(() => listMiss()); return; }
    if (t.dataset.gi != null && GM) { GM.items[+t.dataset.gi].on = t.checked; listCount(); }
  });
  el.addEventListener('paste', e => { if (e.target.id !== 'gmBox') return; const v = e.clipboardData && e.clipboardData.getData('text'); if (v && v.trim()) { e.preventDefault(); takeList(v, ''); } });
  el.addEventListener('input', e => { if (e.target.id === 'gmBox' && e.target.value.trim().length > 20) { clearTimeout(pasteT); const v = e.target.value; pasteT = setTimeout(() => takeList(v, ''), 700); } });
  if (src) setListSource(src); else drawListIntro();
}
function drawListIntro(miss) {
  const el = $('#gmScrim'); if (!el) return;
  el.innerHTML = `<div class="dlg" role="dialog" aria-label="Import from Google Maps"><div class="dlg-h"><h2>Import from Google Maps</h2><button class="iconbtn" type="button" data-gx aria-label="Close">${icon('x')}</button></div>
    <div class="dlg-b"><p class="gm-p">Bring in one of your <b>Saved</b> lists, or a list somebody shared with you. Every place is added as a maybe and pinned on the map, ready to plan.</p>
      <ol class="gm-steps"><li>In Google Maps, open the list, tap <b>Share</b> and copy its link.</li><li>Paste the link into <b>Safari's address bar</b>, so the list opens in Safari and not in the Google Maps app.</li><li>Tap your <b>Add to Tabi</b> bookmark, then <b>Copy for Tabi</b>.</li><li>Come back here and tap <b>Paste the list</b>.</li></ol>
      <div class="acts"><button class="btn btn-primary" type="button" id="gmPaste">${icon('clip')}Paste the list</button><label class="btn">${icon('upload')}Choose a file<input type="file" class="gmFile" accept=".csv,.json,.kml,text/csv,application/json,application/vnd.google-earth.kml+xml" hidden></label></div>
      <textarea class="input" id="gmBox" rows="3" ${miss === 'box' ? '' : 'hidden'} aria-label="Paste the list here" placeholder="Tap and hold here, then tap Paste."></textarea>
      <div class="pastenote miss" role="status" ${miss && miss !== 'box' ? '' : 'hidden'}>${miss && miss !== 'box' ? esc(miss) : ''}</div>
      <div class="fine">A file works too: a list's .csv or Saved Places.json from Google Takeout, or a .kml from My Maps. Lists copied with an Add to Tabi bookmark saved before this update won't work, so <a href="${PWA ? 'clip.html' : CLIP_PAGE}" target="_blank" rel="noopener">set the button up again</a> first.</div></div>
    <div class="dlg-f"><button class="btn" type="button" data-gx>Close</button></div></div>`;
  if (miss === 'box') $('#gmBox').focus();
}
function listMiss() { drawListIntro("That doesn't look like a Google Maps list. Use the Add to Tabi button on the list's page, or choose a file from Google Takeout."); }
function takeList(text, fname) { const src = readListSource(text, fname); if (src) setListSource(src); else listMiss(); }
async function listFromClipboard() {
  let text = '';
  try { if (navigator.clipboard && navigator.clipboard.readText) text = await navigator.clipboard.readText(); } catch (e) {}
  if (!$('#gmScrim')) return;
  if (text && text.trim()) takeList(text, ''); else drawListIntro('box');
}
const sameName = (a, b) => { const x = fold(a), y = fold(b); return !!x && x === y; };
function setListSource(src) {
  const have = [...S.places.values()].filter(p => p.kind !== 'note'), seen = [];
  const items = src.places.map(p => {
    const loc = p.lat != null, twin = o => (p.url && o.url && p.url === o.url) || (sameName(p.n, o.n) && (!loc || o.lat == null || km(p, o) < 0.4));
    const dupe = have.some(o => (p.url && o.links.some(l => l.url === p.url)) || (sameName(p.n, o.name) && (!loc || !hasLoc(o) || km(p, o) < 0.4))) || seen.some(twin);
    seen.push(p);
    const out = loc && !inTripCountry(p.lat, p.lng);
    return { ...p, kind: guessKind(p.n + ' ' + p.ja), dupe, out, on: !dupe && !out };
  });
  GM = { list: src.list, items }; drawListReview();
}
function listCount() {
  const n = GM.items.filter(i => i.on).length, b = $('#gmGo'); if (!b) return;
  b.disabled = !n; b.textContent = n ? `Add ${n} as maybe${n === 1 ? '' : 's'}` : 'Nothing ticked';
  const a = $('#gmAll'); if (a) a.textContent = GM.items.some(i => !i.on && !i.dupe) ? 'Tick all' : 'Untick all';
}
function drawListReview() {
  const el = $('#gmScrim'); if (!el || !GM) return;
  const it = GM.items, dupes = it.filter(i => i.dupe).length, outs = it.filter(i => i.out && !i.dupe).length, noloc = it.filter(i => i.lat == null && !i.dupe).length;
  const bits = [dupes ? `${dupes} ${dupes === 1 ? 'is' : 'are'} already in Tabi` : '', outs ? `${outs} ${outs === 1 ? 'is' : 'are'} outside ${COUNTRY().name}, so ${outs === 1 ? "it's" : "they're"} left unticked` : '', noloc ? `${noloc} ${noloc === 1 ? 'has' : 'have'} no map location yet, so Tabi will look ${noloc === 1 ? 'it' : 'them'} up` : ''].filter(Boolean);
  const keep = el.querySelector('.gm-list') ? el.querySelector('.gm-list').scrollTop : 0;
  el.innerHTML = `<div class="dlg" role="dialog" aria-label="Import from Google Maps"><div class="dlg-h"><h2>${esc(GM.list)}</h2><button class="iconbtn" type="button" data-gx aria-label="Close">${icon('x')}</button></div>
    <div class="dlg-b"><div class="sec-h"><span class="label">${it.length} place${it.length === 1 ? '' : 's'} from Google Maps</span><button class="btn btn-sm btn-ghost" type="button" id="gmAll"></button></div>
      ${bits.length ? `<p class="gm-p">${esc(bits.join('. '))}.</p>` : ''}
      <div class="gm-list">${it.map((p, i) => `<label class="gm-row ${p.dupe ? 'dupe' : ''}"><input type="checkbox" data-gi="${i}" ${p.on ? 'checked' : ''} ${p.dupe ? 'disabled' : ''}>${glyph(p.kind, { status: 'maybe' })}<span><b>${esc(p.n)}</b>${p.ja ? `<span class="ja">${esc(p.ja)}</span>` : ''}<small>${esc([KINDS[p.kind].label, p.dupe ? 'Already in Tabi' : p.out ? 'Outside ' + COUNTRY().name : p.lat == null ? 'No map location yet' : '', p.note || p.a || p.aj].filter(Boolean).join(' · '))}</small></span></label>`).join('')}</div></div>
    <div class="dlg-f"><button class="btn btn-primary" type="button" id="gmGo"></button><button class="btn" type="button" data-gx>Cancel</button></div></div>`;
  el.querySelector('.gm-list').scrollTop = keep; listCount();
}
async function runListImport() {
  if (!GM || GM.busy) return;
  const picks = GM.items.filter(i => i.on), btn = $('#gmGo'); if (!picks.length) return;
  GM.busy = true; btn.disabled = true;
  const need = picks.filter(i => i.lat == null && i.n.length >= 3);
  if (need.length && navigator.onLine !== false) {
    let k = 0;
    for (const it of need) {
      btn.textContent = `Finding places: ${++k} of ${need.length}`;
      const h = (await searchOnline(it.n))[0]; if (!GM) return;
      if (h) { it.lat = +h.lat.toFixed(6); it.lng = +h.lng.toFixed(6); if (!it.ja && h.ja) it.ja = h.ja.slice(0, 40); }
    }
  }
  btn.textContent = 'Adding…';
  const list = GM.list, now = Date.now();
  const recs = picks.map((it, i) => [newId(), { name: it.n, ja: it.ja, kind: it.kind, status: 'maybe', start: '', end: '', time: '', price: null, priceNote: '',
    lat: it.lat != null ? it.lat : null, lng: it.lng != null ? it.lng : null, address: it.a, addressJa: it.aj, links: it.url ? [{ label: 'Google Maps', url: it.url }] : [],
    notes: (it.note ? it.note + '\n' : '') + `From the Google Maps list ${list}.`, by: S.meId || 'local', created: now + i, likes: {}, photos: {} }]);
  const ids = recs.map(r => r[0]), n = await putMany(recs, 'imported');
  closeListImport();
  if (!n) return;
  const lost = picks.filter(i => i.lat == null).length;
  go('notes'); toast(`${n} place${n === 1 ? '' : 's'} added as maybe${n === 1 ? '' : 's'}${lost ? `. ${lost} still need${lost === 1 ? 's' : ''} a spot on the map` : ''}`);
  const pts = ids.map(id => S.places.get(id)).filter(p => p && hasLoc(p)); if (pts.length) zoomTo(fitTransform(pts, { maxK: 12 }), 0);
  const hd = $('#maybesHead'); if (hd) hd.scrollIntoView({ block: 'start' });
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#gmScrim')) { e.stopPropagation(); closeListImport(); } }, true);

/* ---------- maybes by area: the city they're in (Japan), or the stay they're near ---------- */
function areaOf(p) {
  if (!hasLoc(p)) return 'Not on the map yet';
  if (TRIP_COUNTRY() === 'JP') {
    let best = null, bd = 25;
    for (const [n, , lat, lng] of CITIES) { const d = km(p, { lat, lng }); if (d < bd) { bd = d; best = n; } }
    if (best) return best;
  }
  let near = null, nd = 30;
  for (const s of S.places.values()) { if (s.kind !== 'stay' || s.status === 'maybe' || !hasLoc(s)) continue; const d = km(p, s); if (d < nd) { nd = d; near = s; } }
  if (near) return 'Near ' + near.name.split(/[,(]/)[0].trim();
  if (TRIP_COUNTRY() === 'JP') { const n = nearestPlaceName(p.lat, p.lng); if (n) return n; }
  return 'Elsewhere';
}
function maybeGroups(list) {
  const m = new Map(); for (const p of list) { const a = areaOf(p); if (!m.has(a)) m.set(a, []); m.get(a).push(p); }
  const last = a => a === 'Not on the map yet' ? 2 : a === 'Elsewhere' ? 1 : 0, here = hereNow();
  const dist = l => here ? Math.min(...l.filter(hasLoc).map(p => km(here, p)), 1e9) : 0;
  const out = [...m.entries()].sort((a, b) => last(a[0]) - last(b[0]) || dist(a[1]) - dist(b[1]) || b[1].length - a[1].length || a[0].localeCompare(b[0]));
  if (here) for (const [, l] of out) l.sort((a, b) => (hasLoc(a) ? km(here, a) : 1e9) - (hasLoc(b) ? km(here, b) : 1e9));
  return out;
}

/* ---------- where you are: a dot on the map, and what's near you. Your location stays on this device. ---------- */
let hereWatch = null;
const hereNow = () => S.here && Date.now() - S.here.at < 20 * 60e3 ? S.here : null;
function drawHere() {
  if (!S.here) { if (hereEl) { hereEl.remove(); hereEl = null; } return; }
  if (!hereEl) { hereEl = document.createElement('div'); hereEl.className = 'here'; hereEl.innerHTML = '<i></i>'; hereEl.setAttribute('aria-label', 'You are here'); pinsEl.appendChild(hereEl); }
  hereEl._ll = [S.here.lng, S.here.lat]; positionAll();
}
function flyHere() { if (!S.here) return; if (isPhone() && S.view !== 'map') setView('map'); flyToPlace(S.here, 700); }
function startLocate(fly) {
  if (!navigator.geolocation) { toast("This device can't share its location."); return; }
  if (S.here && fly) flyHere();
  if (hereWatch != null) return;
  let first = true; $('#zloc').classList.add('busy');
  hereWatch = navigator.geolocation.watchPosition(pos => {
    const was = S.here; S.here = { lat: pos.coords.latitude, lng: pos.coords.longitude, at: Date.now() };
    $('#zloc').classList.remove('busy'); $('#zloc').classList.add('on'); drawHere();
    if (first) { first = false; pref('here', 'on'); if (fly) flyHere(); if (S.tab === 'today') renderPanel(); }
    else if (S.tab === 'today' && (!was || km(was, S.here) > 0.15)) renderPanel();
  }, err => {
    navigator.geolocation.clearWatch(hereWatch); hereWatch = null; $('#zloc').classList.remove('busy', 'on');
    if (err && err.code === 1) pref('here', 'off');
    if (fly || !first) toast(err && err.code === 1 ? (PWA ? 'Location is turned off for Tabi. Allow it in your phone settings, then try again.' : "Location isn't available here.") : "Couldn't find where you are. Try again in a moment.");
  }, { enableHighAccuracy: true, maximumAge: 15000, timeout: 25000 });
}
$('#zloc').onclick = () => startLocate(true);
// carry on showing the dot next time, but only where permission was already given, so nothing pops up on opening
function resumeLocate() { if (pref('here') !== 'on' || !navigator.permissions || !navigator.permissions.query) return; navigator.permissions.query({ name: 'geolocation' }).then(r => { if (r.state === 'granted') startLocate(false); }).catch(() => {}); }
function nearHTML() {
  const pts = [...S.places.values()].filter(p => hasLoc(p) && p.kind !== 'note' && p.kind !== 'move' && p.kind !== 'stay' && !p.visited);
  if (!pts.length) return '';
  const here = hereNow();
  if (!here) return `<div class="sec"><div class="sec-h"><span class="label">Near you</span><button class="btn btn-sm btn-ghost" type="button" data-near>${icon('locate')}Find what's near me</button></div><div class="muted" style="font-size:13px">See which of your places and maybes are closest to where you are right now.</div></div>`;
  const list = pts.map(p => [km(here, p), p]).filter(x => x[0] <= 5).sort((a, b) => a[0] - b[0]).slice(0, 6);
  return `<div class="sec"><div class="sec-h"><span class="label">Near you</span><button class="btn btn-sm btn-ghost" type="button" data-near>${icon('locate')}Show me</button></div>${list.length ? `<div class="timeline">${list.map(([d, p]) => `<button class="tl" type="button" data-id="${esc(p.id)}"><span class="tt">${distText(d)}</span>${glyph(p.kind, { status: p.status })}<span><span class="tn">${esc(p.name)}</span><span class="tm">${esc(KINDS[p.kind].label)} · ${esc(statusLabel(p))}${d <= 3 ? ` · ${Math.max(1, Math.round(d * 13))} min walk` : ''}</span></span></button>`).join('')}</div>` : '<div class="muted" style="font-size:13px">None of your places are within 5 km of here.</div>'}</div>`;
}
$('#pbody').addEventListener('click', e => {
  if (e.target.closest('[data-near]')) { startLocate(true); return; }
  if (e.target.closest('[data-gmimport]')) openListImport(null);
});

/* ---------- boot: offline phone app ---------- */
addEventListener('resize', () => { renderNav(); if (!isPhone() && S.tab === 'more') { S.tab = 'today'; renderPanel(); } });
const stampOf = raw => raw && raw.last && typeof raw.last.at === 'number' ? raw.last.at : (raw && raw.created) || 0;
const ID_OK = id => /^[A-Za-z0-9_\-.~:@+]{1,80}$/.test(id);
async function exportTrip() {
  const photos = {};
  for (const p of S.places.values()) for (const f of p.photos) if (f.d && S.photos.get(f.d)) photos[f.d] = S.photos.get(f.d).data;
  const st = local.settings || {};
  const data = { format: 'tabi-trip', version: 1, exportedAt: Date.now(), from: st.me || '',
    settings: { title: st.title, start: st.start, end: st.end, rate: st.rate, budget: st.budget, names: st.names, country: st.country || 'JP', home: st.home || 'AUD', at: st.at || 0, tid: st.tid, journey: st.journey }, places: local.places, spend: local.spend, deleted: local.deleted, photos };
  const name = `${(st.title || 'trip').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'trip'}-${today()}.json`;
  const file = new File([JSON.stringify(data)], name, { type: 'application/json' });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: st.title || 'Our trip' }); return; } }
  catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  toast('Trip file saved. Send it to the other phone and import it there.');
}
async function importTrip(data) {
  let added = 0, updated = 0, removed = 0, pics = 0;
  const st = data.settings && typeof data.settings === 'object' ? data.settings : {};
  const ls = local.settings;
  // a new phone takes the trip's country and home currency (the rate belongs with them)
  const fresh = !Object.keys(local.places || {}).length;
  if (fresh && COUNTRIES[st.country] && st.country !== (ls.country || 'JP')) { ls.country = st.country; ls.rate = 0; }
  if (fresh && HOMES.includes(st.home) && st.home !== (ls.home || 'AUD')) { ls.home = st.home; ls.rate = 0; }
  if (!ls.start && isIso(st.start) && isIso(st.end)) { ls.start = st.start; ls.end = st.end; }
  if (!ls.title && typeof st.title === 'string') ls.title = st.title.slice(0, 60);
  if (!ls.names && Array.isArray(st.names)) ls.names = st.names.slice(0, 2).map(x => String(x || '').slice(0, 24));
  if (!ls.rate && typeof st.rate === 'number') ls.rate = st.rate;
  if (!ls.budget && typeof st.budget === 'number') ls.budget = st.budget;
  // settings changed more recently on the other phone replace this phone's: dates, names, rate and budget
  if (typeof st.at === 'number' && st.at > (ls.at || 0) && (st.country || 'JP') === (ls.country || 'JP')) {
    if (isIso(st.start) && isIso(st.end) && st.end > st.start) { ls.start = st.start; ls.end = st.end; }
    if (typeof st.title === 'string' && st.title.trim()) ls.title = st.title.slice(0, 60);
    if (Array.isArray(st.names) && st.names.length === 2) ls.names = st.names.map(x => String(x || '').slice(0, 24));
    if ((st.home || 'AUD') === (ls.home || 'AUD') && typeof st.rate === 'number' && st.rate > 0) ls.rate = st.rate;
    if (typeof st.budget === 'number' && st.budget >= 0) ls.budget = st.budget;
    ls.at = st.at;
  }
  for (const [id, at] of Object.entries(data.deleted || {})) if (ID_OK(id) && typeof at === 'number') local.deleted[id] = Math.max(at, local.deleted[id] || 0);
  for (const [id, raw] of Object.entries(data.places || {})) {
    if (!ID_OK(id) || !raw || typeof raw !== 'object') continue;
    if (local.deleted[id] && local.deleted[id] >= stampOf(raw)) continue;
    const cur = local.places[id];
    if (!cur) { local.places[id] = raw; added++; }
    else if (stampOf(raw) > stampOf(cur)) { local.places[id] = { ...raw, photos: { ...(cur.photos || {}), ...(raw.photos || {}) }, likes: { ...(cur.likes || {}), ...(raw.likes || {}) } }; updated++; }
    else { const ph = { ...(raw.photos || {}), ...(cur.photos || {}) }; if (Object.keys(ph).length !== Object.keys(cur.photos || {}).length) { local.places[id] = { ...cur, photos: ph }; updated++; } }
  }
  for (const [id, raw] of Object.entries(data.spend || {})) { if (ID_OK(id) && raw && typeof raw === 'object' && !local.spend[id] && !local.deleted[id]) { local.spend[id] = raw; added++; } }
  for (const [id, at] of Object.entries(local.deleted)) { const cur = local.places[id]; if (cur && at >= stampOf(cur)) { delete local.places[id]; removed++; } if (local.spend[id]) { delete local.spend[id]; removed++; } }
  for (const [pid, d] of Object.entries(data.photos || {})) { if (ID_OK(pid) && typeof d === 'string' && d.startsWith('data:image/') && !S.photos.has(pid)) { await idb.set(pid, { data: d }); S.photos.set(pid, { data: d }); pics++; } }
  ls.seen = true; saveLocal(); applyLocal();
  return { added, updated, removed, pics };
}
async function importTripFile(input) {
  const f = input.files && input.files[0]; input.value = ''; if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (!data || data.format !== 'tabi-trip') throw 0;
    // a file from a different trip never mixes into this one: it opens that trip, or adds it, and this one stays saved
    const fst = data.settings && typeof data.settings === 'object' ? data.settings : {}, ft = tripId(fst), blank = !Object.keys(local.places || {}).length && !Object.keys(local.spend || {}).length;
    if (ft !== tripId(local.settings) && blank && !local.settings.journey) { if (fst.tid) local.settings.tid = String(fst.tid).slice(0, 40); if (fst.journey) local.settings.journey = String(fst.journey).slice(0, 40); }
    else if (ft !== tripId(local.settings)) {
      const me = local.settings.me, parked = localStorage.getItem(LKEY + '.' + ft); parkTrip();
      let next = null; try { next = parked ? JSON.parse(parked) : null; } catch (e) {}
      local = next && next.places ? { spend: {}, deleted: {}, settings: {}, ...next } : { places: {}, spend: {}, deleted: {}, settings: { me, tid: ft === 'first' ? undefined : ft, journey: fst.journey ? String(fst.journey).slice(0, 40) : undefined } };
      localStorage.removeItem(LKEY + '.' + ft);
      const r = await importTrip(data); noteTrip();
      try { sessionStorage.setItem('tabi.toast', `${local.settings.title || 'The other trip'} is open now. ${r.added} new, ${r.updated} updated. Your other trip is still saved under Trips.`); } catch (e) {}
      location.reload(); return;
    }
    const r = await importTrip(data); closeSettings();
    const bits = [r.added && `${r.added} new`, r.updated && `${r.updated} updated`, r.removed && `${r.removed} removed`, r.pics && `${r.pics} photos`].filter(Boolean);
    toast(bits.length ? 'Imported: ' + bits.join(', ') : 'Already up to date');
    fitPlaces(); scrollDaysToToday();
  } catch (e) { toast("That file isn't a Tabi trip file."); }
}
/* ---------- trips: several trips kept on this phone, and one trip carried on into another country ----------
   The open trip lives where it always has (LKEY). The others wait under LKEY.<id>, and TKEY lists them all.
   A trip made before this existed has no id and is called 'first', on both phones, so their files still match.
   Trips that share a 'journey' are parts of one continuous trip (Japan, then Korea). */
const TKEY = 'tabi.trips.v1';
const tripId = st => (st && st.tid) || 'first', journeyId = st => (st && st.journey) || tripId(st);
function tripsReg() { let r = null; try { r = JSON.parse(localStorage.getItem(TKEY) || 'null'); } catch (e) {} return r && Array.isArray(r.list) ? r : { list: [] }; }
function saveReg(r) { try { localStorage.setItem(TKEY, JSON.stringify(r)); } catch (e) {} }
function tripLine(d) {
  const st = d.settings || {}, x = Object.values(d.spend || {}).reduce((s, e) => s + (+e.amount || 0), 0);
  return { id: tripId(st), journey: journeyId(st), title: st.title || 'Trip', country: COUNTRIES[st.country] ? st.country : 'JP', start: st.start || '', end: st.end || '', home: st.home || 'AUD', rate: +st.rate || 0, places: Object.values(d.places || {}).filter(p => p && p.kind !== 'note').length, spent: x };
}
// keep the open trip's line in the list up to date
function noteTrip() { if (!local.settings.seen) return; const r = tripsReg(), c = tripLine(local), i = r.list.findIndex(t => t.id === c.id); if (i >= 0) r.list[i] = c; else r.list.push(c); r.active = c.id; saveReg(r); }
function parkTrip() { if (!local.settings.seen) return true; noteTrip(); try { localStorage.setItem(LKEY + '.' + tripId(local.settings), JSON.stringify(local)); return true; } catch (e) { toast('This phone is out of space, so the trip could not be put aside.'); return false; } }
function openTrip(id, dropBlank) {
  const raw = localStorage.getItem(LKEY + '.' + id); if (!raw) { toast("That trip couldn't be found on this phone."); return; }
  if (!dropBlank && !parkTrip()) return;
  pref('legAsk', today()); // chosen by hand today, so no offer to switch back
  try { localStorage.setItem(LKEY, raw); localStorage.removeItem(LKEY + '.' + id); const r = tripsReg(); r.active = id; saveReg(r); } catch (e) { toast('This phone is out of space.'); return; }
  location.reload();
}
const NEXT_GUESS = { JP: 'KR', KR: 'JP', TW: 'JP', TH: 'VN', VN: 'TH', ID: 'TH', IT: 'FR', FR: 'ES', ES: 'PT', PT: 'ES', GR: 'IT', DE: 'FR', GB: 'FR', US: 'JP', NZ: 'JP' };
function startTrip(next) {
  const st = local.settings; if (!parkTrip()) return;
  const cc = COUNTRIES[st.country] ? st.country : 'JP';
  local = { places: {}, spend: {}, deleted: {}, settings: { me: st.me, names: st.names, home: st.home, tid: newId('t'), ...(next ? { journey: journeyId(st), after: cc, from: st.title || COUNTRIES[cc].name, start: st.end, country: NEXT_GUESS[cc] || 'JP', budget: 0 } : {}) } };
  pref('legAsk', today()); saveLocal(); location.reload();
}
// photos and tickets kept for a trip, found wherever they sit in its places
function tripPhotoIds(d) { const ids = []; const walk = v => { if (!v || typeof v !== 'object') return; for (const [k, x] of Object.entries(v)) { if (k === 'd' && typeof x === 'string') ids.push(x); else walk(x); } }; walk(d.places); return ids; }
async function removeTrip(id) {
  const r = tripsReg(), t = r.list.find(t => t.id === id); if (!t || id === tripId(local.settings)) return;
  if (!await ask(`Delete ${t.title}?`, `This removes ${t.title} and its ${t.places} place${t.places === 1 ? '' : 's'}, spending and photos from this phone. It can't be undone. Share its trip file first if you want a copy.`, 'Delete the trip', 'Keep it')) return;
  try { const d = JSON.parse(localStorage.getItem(LKEY + '.' + id) || 'null'); if (d) for (const pid of tripPhotoIds(d)) { idb.del(pid).catch(() => {}); S.photos.delete(pid); } } catch (e) {}
  localStorage.removeItem(LKEY + '.' + id); r.list = r.list.filter(t => t.id !== id); saveReg(r); openTrips(); toast(`${t.title} deleted`);
}
// a small yes or no sheet
function ask(title, text, yes, no) {
  return new Promise(res => {
    const el = document.createElement('div'); el.className = 'scrim'; el.style.zIndex = 70;
    el.innerHTML = `<div class="dlg" role="alertdialog" aria-label="${esc(title)}" style="width:min(420px,100%)"><div class="dlg-h"><h2>${esc(title)}</h2></div><div class="dlg-b"><p class="gm-p">${esc(text)}</p></div><div class="dlg-f"><button class="btn btn-primary" type="button" data-y>${esc(yes)}</button><button class="btn" type="button" data-n>${esc(no)}</button></div></div>`;
    el.addEventListener('click', e => { const y = e.target.closest('[data-y]'), n = e.target.closest('[data-n]') || e.target === el; if (y || n) { el.remove(); res(!!y); } });
    document.body.appendChild(el);
  });
}
const tripDates = t => isIso(t.start) && isIso(t.end) ? `${fmtDay(t.start).replace(/^\w+,?\s*/, '')} to ${fmtDay(t.end).replace(/^\w+,?\s*/, '')}` : 'No dates yet';
function closeTrips() { const s = $('#tripScrim'); if (s) s.remove(); }
function openTrips() {
  closeTrips(); toggleMenu(false); noteTrip();
  const r = tripsReg(), mine = tripId(local.settings), list = r.list.slice().sort((a, b) => (a.start || '9').localeCompare(b.start || '9'));
  const legs = list.filter(t => t.journey === journeyId(local.settings)), homes = new Set(legs.map(t => t.home));
  const whole = legs.length > 1 && homes.size === 1 && legs.every(t => t.rate > 0 || !t.spent) ? legs.reduce((s, t) => s + (t.rate > 0 ? t.spent / t.rate : 0), 0) : null;
  const el = document.createElement('div'); el.className = 'scrim'; el.id = 'tripScrim';
  el.innerHTML = `<div class="dlg" role="dialog" aria-label="Trips"><div class="dlg-h"><h2>Trips</h2><button class="iconbtn" type="button" data-tx aria-label="Close">${icon('x')}</button></div>
    <div class="dlg-b"><div class="trips">${list.map(t => { const part = list.filter(o => o.journey === t.journey), n = part.indexOf(t) + 1;
      return `<div class="trip ${t.id === mine ? 'on' : ''}"><span class="tflag">${esc(t.country)}</span><span class="tmain"><b>${esc(t.title)}</b><small>${esc([COUNTRIES[t.country].name, tripDates(t), `${t.places} place${t.places === 1 ? '' : 's'}`].join(' · '))}</small>${part.length > 1 ? `<small>Part ${n} of ${part.length} of one trip</small>` : ''}</span>${t.id === mine ? '<span class="chip booked">Open now</span>' : `<span class="tacts"><button class="btn btn-sm" type="button" data-topen="${esc(t.id)}">Open</button><button class="iconbtn" type="button" data-tdel="${esc(t.id)}" aria-label="Delete ${esc(t.title)}">${icon('trash')}</button></span>`}</div>`; }).join('')}</div>
      ${whole != null ? `<p class="gm-p">Whole trip so far: <b>${esc(CUR[legs[0].home].pre)}${Math.round(whole).toLocaleString('en-AU')}</b> logged across ${esc(legs.map(t => COUNTRIES[t.country].name).join(', ').replace(/, ([^,]*)$/, ' and $1'))}.</p>` : ''}
      <div class="acts"><button class="btn btn-primary" type="button" data-tnext>${icon('route')}Continue to another country</button><button class="btn" type="button" data-tnew>${icon('plus')}Start a separate trip</button></div>
      <div class="fine">Continuing keeps this as one trip: your names and home money carry over, and the new country brings its own map, phrases, money and keepsake book. Each part keeps its own places and spending, and Tabi offers to switch when the dates move on. Nothing is removed from the trip you leave.</div></div>
    <div class="dlg-f"><button class="btn" type="button" data-tx>Close</button></div></div>`;
  el.addEventListener('click', e => {
    const t = e.target;
    if (t === el || t.closest('[data-tx]')) { closeTrips(); return; }
    const o = t.closest('[data-topen]'); if (o) { openTrip(o.dataset.topen); return; }
    const d = t.closest('[data-tdel]'); if (d) { removeTrip(d.dataset.tdel); return; }
    if (t.closest('[data-tnext]')) startTrip(true);
    if (t.closest('[data-tnew]')) startTrip(false);
  });
  document.body.appendChild(el);
}
// when the dates have moved on to the next part of the trip, offer to open it (once a day)
async function nextLegPrompt() {
  const st = local.settings, d = today(), r = tripsReg();
  if (isIso(st.start) && isIso(st.end) && d >= st.start && d <= st.end) return;
  const t = r.list.find(t => t.id !== tripId(st) && t.journey === journeyId(st) && isIso(t.start) && isIso(t.end) && d >= t.start && d <= t.end);
  if (!t || pref('legAsk') === d) return; pref('legAsk', d);
  if (await ask(`On to ${COUNTRIES[t.country].name}?`, `Today falls in ${t.title}. Open it now? ${st.title || 'This part'} stays saved under Trips.`, `Open ${t.title}`, 'Not now')) openTrip(t.id);
}
function closeSettings() { const s = $('#setScrim'); if (s) s.remove(); }
// today's rate: how much of the trip's currency one unit of home money buys
async function fetchRate(home, cur) {
  if (home === cur) return 1;
  const c = new AbortController(), t = setTimeout(() => c.abort(), 7000);
  try { const r = await fetch(`https://open.er-api.com/v6/latest/${home}`, { signal: c.signal }); const j = r.ok ? await r.json() : null; const v = j && j.rates && +j.rates[cur]; return v > 0 ? +(v >= 100 ? v.toFixed(1) : v >= 10 ? v.toFixed(2) : v.toFixed(4)) : 0; }
  catch (e) { return 0; } finally { clearTimeout(t); }
}
function openSettings(first) {
  closeSettings();
  const st = local.settings || {}, names = Array.isArray(st.names) ? st.names : [];
  const has = Object.keys(local.places || {}).length > 0, cc = COUNTRIES[st.country] ? st.country : 'JP', home = HOMES.includes(st.home) ? st.home : 'AUD';
  const others = first ? tripsReg().list.filter(t => t.id !== tripId(st)).length : 0;
  const el = document.createElement('div'); el.className = 'scrim'; el.id = 'setScrim';
  const opt = (v, label, on) => `<option value="${esc(v)}"${on ? ' selected' : ''}>${esc(label)}</option>`;
  el.innerHTML = `<form class="dlg" id="setForm" novalidate><div class="dlg-h"><h2>${!first ? 'Trip settings' : st.after ? 'Next country' : others ? 'New trip' : 'Welcome to Tabi'}</h2>${first ? '' : `<button class="iconbtn" type="button" data-sx aria-label="Close">${icon('x')}</button>`}</div>
    <div class="dlg-b">${first && st.after ? `<p style="margin:0;font:500 15px/1.5 var(--font);color:var(--ink-2)">Carry on from <b>${esc(st.from || 'your trip')}</b>. Pick the next country and its dates. Your names and home money come with you, and ${esc(st.from || 'the earlier part')} stays saved under Trips.</p>` : first ? `<p style="margin:0;font:500 15px/1.5 var(--font);color:var(--ink-2)">${others ? 'Set up the new trip below, or import a trip file you were sent. Your other trips stay saved on this phone.' : 'Tabi keeps your trip on this phone and works without internet. Import the trip file you were sent, or set up a new trip below.'}</p><label class="btn btn-primary">${icon('upload')}Import a trip file<input type="file" class="tripImport" accept=".json,application/json" hidden></label>` : ''}
      <div class="field"><label for="stMe">Your name</label><input class="input" id="stMe" autocomplete="given-name" value="${esc(st.me || '')}" placeholder="Shown on things you add"></div>
      <div class="field"><label for="stCountry">Country</label><select class="input" id="stCountry"${has ? ' disabled' : ''}>${COUNTRY_LIST.map(c => opt(c.code, c.name, c.code === cc)).join('')}</select>
        <small class="hint" id="stCountryHint">${has ? 'Set when the trip was made. Start a new trip to change it.' : 'Sets the phrases, money, local names and the keepsake book.'}</small></div>
      <div class="field"><label for="stTitle">Trip name</label><input class="input" id="stTitle" value="${esc(st.title || '')}" placeholder="${esc(COUNTRIES[cc].sample.title)}"></div>
      <div class="g2"><div class="field"><label for="stStart">First day</label><input class="input" type="date" id="stStart" value="${esc(st.start || '')}"></div><div class="field"><label for="stEnd">Fly home</label><input class="input" type="date" id="stEnd" value="${esc(st.end || '')}"></div></div>
      <div class="g2"><div class="field"><label for="stN0">Traveller one</label><input class="input" id="stN0" value="${esc(names[0] || st.me || '')}"></div><div class="field"><label for="stN1">Traveller two</label><input class="input" id="stN1" value="${esc(names[1] || '')}"></div></div>
      <div class="g2"><div class="field"><label for="stHome">Home money</label><select class="input" id="stHome">${HOMES.map(h => opt(h, `${CUR[h].pre.trim()} ${CUR[h].name}`, h === home)).join('')}</select></div>
        <div class="field"><label for="stRate" id="stRateLbl"></label><div class="row2"><input class="input num" id="stRate" inputmode="decimal" value="${esc(st.rate || '')}"><button class="btn" type="button" id="stRateGet">Today's rate</button></div></div></div>
      <small class="hint" id="stRateNote"></small></div>
    <div class="dlg-f"><button class="btn btn-primary" type="submit">${!first ? 'Save' : st.after ? 'Continue the trip' : 'Start a new trip'}</button>${first ? (others ? '<button class="btn" type="button" data-back>Cancel and go back</button>' : '') : '<button class="btn" type="button" data-sx>Cancel</button>'}</div></form>`;
  document.body.appendChild(el);
  const cSel = $('#stCountry'), hSel = $('#stHome'), rate = $('#stRate'), note = $('#stRateNote');
  let auto = !st.rate; // the rate fills itself in until someone types one
  const sync = () => {
    const c = COUNTRIES[cSel.value], h = CUR[hSel.value], l = CUR[c.cur];
    $('#stRateLbl').textContent = `${h.pre.trim()}1 buys`; rate.placeholder = `${l.pre.trim()} ${c.cur === 'JPY' && hSel.value === 'AUD' ? '113' : ''}`.trim();
    $('#stTitle').placeholder = c.sample.title;
    note.textContent = hSel.value === c.cur ? `${c.name} uses your home money, so no rate is needed.` : `How many ${l.name.toLowerCase()} one ${h.pre.trim()} buys. Tabi uses it to show prices in ${/^(Australian|Canadian|Singapore|US|NZ|NT)\b/.test(h.name) ? h.name : h.name.toLowerCase()}.`;
  };
  const getRate = async loud => {
    const c = COUNTRIES[cSel.value], h = hSel.value, key = h + c.cur; if (h === c.cur) { rate.value = 1; return; }
    if (navigator.onLine === false) { if (loud) toast('Connect to the internet to get today\'s rate, or type it in.'); return; }
    note.textContent = 'Getting today\'s rate…';
    const v = await fetchRate(h, c.cur); if (!el.isConnected || hSel.value + COUNTRIES[cSel.value].cur !== key) return;
    if (v) { rate.value = v; auto = true; sync(); note.textContent += ` Today's rate filled in: ${CUR[h].pre.trim()}1 = ${CUR[c.cur].pre}${v}.`; }
    else { sync(); if (loud) toast('The rate couldn\'t be fetched. Type it in instead.'); }
  };
  sync(); if (auto && !has) getRate(false);
  cSel.addEventListener('change', () => { sync(); if (auto) { rate.value = ''; getRate(false); } });
  hSel.addEventListener('change', () => { sync(); if (auto || !has) { rate.value = ''; getRate(false); } });
  rate.addEventListener('input', () => { auto = false; });
  $('#stRateGet').onclick = () => getRate(true);
  el.addEventListener('click', e => { if (e.target.closest('[data-sx]')) closeSettings(); if (e.target.closest('[data-back]')) { const r = tripsReg(), t = r.list.find(t => t.id === r.active) || r.list[r.list.length - 1]; if (t) openTrip(t.id, true); } });
  el.addEventListener('change', e => { if (e.target.classList.contains('tripImport')) importTripFile(e.target); });
  el.querySelector('form').addEventListener('submit', e => {
    e.preventDefault();
    const s = $('#stStart').value, en = $('#stEnd').value;
    if (!isIso(s) || !isIso(en) || en <= s) { toast('Pick the first day and a later fly-home day.'); return; }
    const rv = parseFloat(String(rate.value).replace(',', '.'));
    if (rate.value.trim() && !(rv > 0 && rv < 1e6)) { rate.focus(); toast('Enter the rate as a number, or leave it empty.'); return; }
    const me = $('#stMe').value.trim().slice(0, 24), country = has ? cc : cSel.value, c = COUNTRIES[country];
    local.settings = { ...local.settings, me, country, home: hSel.value, rate: rv > 0 ? rv : 0, title: $('#stTitle').value.trim().slice(0, 60) || c.sample.title.replace(/\d{4}$/, s.slice(0, 4)), start: s, end: en, names: [$('#stN0').value.trim().slice(0, 24) || me || 'Me', $('#stN1').value.trim().slice(0, 24) || 'Partner'], seen: true, at: Date.now() };
    S.meId = me ? 'n:' + me : 'local'; saveLocal(); noteTrip();
    // a new trip or the next country starts clean: the map, phrases and money all follow the country
    if (first && others) { location.reload(); return; }
    applyLocal(); closeSettings(); scrollDaysToToday();
    if (!has) fitPlaces(0);
  });
}
async function boot() {
  measure(); S.ready = true;
  S.mode = 'local'; loadLocal();
  S.meId = local.settings.me ? 'n:' + local.settings.me : 'local';
  try { S.photos = new Map(Object.entries(await idb.all())); } catch (e) {}
  mapSel.call(zoomer.transform, countryView());
  setView(isPhone() ? S.tab : 'map');
  renderLegend(); applyLocal(); scrollDaysToToday();
  if (S.places.size) fitPlaces(0);
  if (!local.settings.seen) openSettings(true); else { noteTrip(); nextLegPrompt(); }
  try { const m = sessionStorage.getItem('tabi.toast'); if (m) { sessionStorage.removeItem('tabi.toast'); setTimeout(() => toast(m), 600); } } catch (e) {}
  setTimeout(() => startGL(), 400);
  resumeLocate();
}
boot();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

})();
