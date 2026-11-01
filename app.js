(() => {
'use strict';
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

/* ---------- dates ---------- */
const pad = n => String(n).padStart(2, '0');
const isoOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isIso = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
const parseD = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return isoOf(d); };
const diffDays = (a, b) => Math.round((parseD(b) - parseD(a)) / 864e5);
const today = () => isoOf(new Date());
let TRIP = { start: '', end: '' }, TRIP_DAYS = [], NIGHTS = [];
function setTrip(start, end) {
  if (!isIso(start) || !isIso(end) || end <= start || diffDays(start, end) > 120) { const t = today(); start = t; end = addDays(t, 14); }
  TRIP = { start, end }; TRIP_DAYS = []; for (let s = start; s <= end; s = addDays(s, 1)) TRIP_DAYS.push(s); NIGHTS = TRIP_DAYS.slice(0, -1);
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
 ['Onomichi','尾道',34.409,133.205,3],['Shirakawa-gō','白川郷',36.2577,136.9063,3],['Tsumago','妻籠',35.5767,137.5953,3],['Teshima','豊島',34.4916,134.0632,3]
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


/* ---------- phrases ---------- */
const PHRASES = [
  ['Basics', [
    ['Hello', 'こんにちは', 'konnichiwa'], ['Thank you very much', 'ありがとうございます', 'arigatō gozaimasu'],
    ['Excuse me, sorry', 'すみません', 'sumimasen'], ["I don't understand Japanese", '日本語がわかりません', 'nihongo ga wakarimasen']]],
  ['Getting around', [
    ['Where is the station?', '駅はどこですか？', 'eki wa doko desu ka?'], ['Please take me to this address', 'この住所までお願いします', 'kono jūsho made onegai shimasu'],
    ['Does this train stop at this station?', 'この電車はこの駅に止まりますか？', 'kono densha wa kono eki ni tomarimasu ka?'], ['Two adults, please', '大人二人お願いします', 'otona futari onegai shimasu']]],
  ['Eating', [
    ['A table for two, please', '二人です', 'futari desu'], ['This one, please', 'これをください', 'kore o kudasai'],
    ['The bill, please', 'お会計お願いします', 'okaikei onegai shimasu'], ['Can I pay by card?', 'カードで払えますか？', 'kādo de haraemasu ka?'],
    ['That was delicious, thank you', 'ごちそうさまでした', 'gochisōsama deshita']]],
  ['Staying', [
    ['We have a reservation', '予約しています', 'yoyaku shite imasu'], ['Could you keep our luggage?', '荷物を預かってもらえますか？', 'nimotsu o azukatte moraemasu ka?'],
    ['What time is check-out?', 'チェックアウトは何時ですか？', 'chekkuauto wa nanji desu ka?']]],
  ['Craft and art', [
    ['Is it OK to sketch here?', 'ここでスケッチしてもいいですか？', 'koko de suketchi shite mo ii desu ka?'], ['Is there a yarn shop nearby?', 'この近くに毛糸屋さんはありますか？', 'kono chikaku ni keitoya-san wa arimasu ka?'],
    ['May I take a photo?', '写真を撮ってもいいですか？', 'shashin o totte mo ii desu ka?'], ['Is this handmade?', 'これは手作りですか？', 'kore wa tezukuri desu ka?']]]
];

/* ---------- state ---------- */
const S = {
  mode: 'loading', places: new Map(), spend: new Map(), photos: new Map(), rawSettings: {},
  settings: { rate: 113, budget: 0, names: ['Me', 'Partner'], title: 'Our trip', start: '', end: '' },
  sel: null, tab: 'today', view: 'map', filter: 'week', day: null, cur: 'jpy',
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
const yen = n => '¥' + Math.round(n).toLocaleString('en-AU');
const aud = n => 'A$' + Math.round(n / (S.settings.rate || 113)).toLocaleString('en-AU');
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
    if (v && typeof v === 'object' && (typeof v.a === 'string' || typeof v.d === 'string')) photos.push({ key: k, a: v.a || '', d: v.d || '', by: str(v.by), at: numv(v.at) || 0 });
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
  return { id, amount: numv(d.amount) > 0 ? Math.round(d.amount) : 0, cat: CATS[d.cat] ? d.cat : 'other', payer: d.payer === 1 ? 1 : 0,
    date: isIso(d.date) ? d.date : today(), note: str(d.note).slice(0, 120), by: str(d.by), at: numv(d.at) || 0 };
}
function applySettings(st) {
  st = st && typeof st === 'object' ? st : {}; const d = DEFAULTS || {};
  const nm = Array.isArray(st.names) ? st.names : [];
  S.settings = {
    rate: numv(st.rate) > 20 && st.rate < 400 ? st.rate : d.rate || 113, budget: numv(st.budget) >= 0 && st.budget ? st.budget : d.budget || 0,
    names: [str(nm[0]).trim() || (d.names && d.names[0]) || 'Me', str(nm[1]).trim() || (d.names && d.names[1]) || 'Partner'],
    title: str(st.title).trim() || d.title || 'Our trip', start: isIso(st.start) ? st.start : d.start || '', end: isIso(st.end) ? st.end : d.end || ''
  };
  setTrip(S.settings.start, S.settings.end);
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
const PAL = ['#1d4fa3', '#cc3226', '#8a6200', '#141414', '#3d6cc6', '#a8271d'];
const initialAv = (name, col) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" fill="${col}"/><text x="12" y="16.5" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="12" fill="#fff">${(name || '?').trim().charAt(0).toUpperCase().replace(/[<&]/g, '')}</text></svg>`);
const CLAUDE_AV = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" fill="#cc3226"/><path d="M12 4.5 13.4 10.6 19.5 12 13.4 13.4 12 19.5 10.6 13.4 4.5 12 10.6 10.6z" fill="#fff"/></svg>');
function who(id) {
  if (id === 'claude') return { name: 'Claude', avatarUrl: CLAUDE_AV, color: '#cc3226' };
  if (id === 'local') return { name: 'You', avatarUrl: initialAv('Y', '#141414'), color: '#141414' };
  if (!id) return { name: 'Someone', avatarUrl: initialAv('?', '#8a8a83'), color: '#8a8a83' };
  if (id.startsWith('n:')) { const nm = id.slice(2) || 'Someone'; const col = PAL[hash(nm) % PAL.length]; return { name: id === S.meId ? 'You' : nm, avatarUrl: initialAv(nm, col), color: col }; }
  const p = S.profiles[id], isMe = id === S.meId;
  return { name: isMe ? 'You' : (p && p.name) || 'Someone', avatarUrl: (p && p.avatarUrl) || (isMe && S.me && S.me.avatarUrl) || initialAv('?', '#8a8a83'), color: (p && p.color) || '#8a8a83' };
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
  if (S.mode === 'local') { local.settings = { ...local.settings, ...partial }; saveLocal(); applyLocal(); return true; }
  S.rawSettings = next; applySettings(next); renderAll(true);
  try { await enqueue('trip/settings', () => db.doc('trip/settings').set(next)); return true; } catch (e) { writeErr(e); return false; }
}
const newId = (p = 'p') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
function canEdit() { return S.mode !== 'loading' && S.canWrite !== false; }
let toastT = null;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 3400); }

/* ---------- map ---------- */
const mapEl = $('#map'), mapSel = d3.select(mapEl);
const prefsObj = GEO.prefs.objects.prefs;
const MAIN = { type: 'MultiPoint', coordinates: [[129.4, 31.0], [145.9, 45.5]] };
const base = d3.geoConicConformal().parallels([33, 44]).rotate([-137, 0]).fitSize([1000, 1000], MAIN);
const gpath = d3.geoPath(base);
let T = d3.zoomIdentity, W = 800, H = 600;
const P = (lng, lat) => { const xy = base([lng, lat]); return xy ? [T.applyX(xy[0]), T.applyY(xy[1])] : [-9999, -9999]; };
const unP = (x, y) => base.invert(T.invert([x, y]));
(function drawBase() {
  d3.select('#land').attr('d', gpath(topojson.feature(GEO.prefs, prefsObj)));
  d3.select('#borders').attr('d', gpath(topojson.mesh(GEO.prefs, prefsObj, (a, b) => a !== b)));
  d3.select('#coast').attr('d', gpath(topojson.mesh(GEO.prefs, prefsObj, (a, b) => a === b)));
  d3.select('#lake').attr('d', gpath(topojson.feature(GEO.lake, GEO.lake.objects.lakes)));
  d3.select('#rail path').attr('d', gpath({ type: 'MultiLineString', coordinates: RAIL.map(l => l.map(([a, b]) => [b, a])) }));
  mapEl.classList.toggle('no-rail', !railOn);
})();
const zoomer = d3.zoom().scaleExtent([0.45, 110])
  .filter(e => !e.target.closest('.ctl,.pop,.card,.banner') && (!e.ctrlKey || e.type === 'wheel') && !e.button)
  .on('zoom', e => { T = e.transform; d3.select('#world').attr('transform', T); positionAll(); onViewChange(); });
mapSel.call(zoomer).on('dblclick.zoom', null);
function measure() { W = mapEl.clientWidth || 800; H = mapEl.clientHeight || 600; }
function fitTransform(pts, { pad = 70, maxK = 16 } = {}) {
  measure();
  const xy = pts.map(p => base([p.lng, p.lat])).filter(Boolean);
  if (!xy.length) return T;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  xy.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
  const px = Math.min(pad, W / 4), py = Math.min(pad, H / 4);
  const k = Math.max(0.45, Math.min(maxK, (W - px * 2) / Math.max(x1 - x0, 1), (H - py * 2) / Math.max(y1 - y0, 1)));
  return d3.zoomIdentity.translate(W / 2, H / 2).scale(k).translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
}
function zoomTo(t, dur = 750) {
  return new Promise(res => {
    if (REDUCE || dur <= 0) { mapSel.interrupt().call(zoomer.transform, t); res(); return; }
    mapSel.transition().duration(dur).ease(d3.easeCubicInOut).call(zoomer.transform, t).on('end', res).on('interrupt', res);
  });
}
const japanView = () => fitTransform([{ lng: 129.6, lat: 31.2 }, { lng: 145.6, lat: 45.4 }], { pad: 20 });
function fitPlaces(dur = 750) { const pts = [...S.places.values()].filter(hasLoc); return zoomTo(pts.length ? fitTransform(pts, { maxK: 10 }) : japanView(), dur); }
function flyToPlace(p, dur = 750, k) {
  if (!hasLoc(p)) return Promise.resolve();
  measure();
  const kk = k || Math.max(T.k, 14); const [x, y] = base([p.lng, p.lat]);
  const open = !$('#card').hidden, ph = isPhone();
  const cx = open && !ph ? W * 0.64 : W / 2, cy = open ? (ph ? H * 0.22 : H * 0.36) : H / 2;
  return zoomTo(d3.zoomIdentity.translate(cx, cy).scale(kk).translate(-x, -y), dur);
}
$('#zin').onclick = () => mapSel.transition().duration(REDUCE ? 0 : 300).call(zoomer.scaleBy, 1.8);
$('#zout').onclick = () => mapSel.transition().duration(REDUCE ? 0 : 300).call(zoomer.scaleBy, 1 / 1.8);
$('#zfit').onclick = () => fitPlaces();
new ResizeObserver(() => { const ow = W, oh = H; measure(); if (S.ready && ow && oh && W && H && (ow !== W || oh !== H)) mapSel.call(zoomer.translateBy, (W - ow) / 2 / T.k, (H - oh) / 2 / T.k); positionAll(); }).observe(mapEl);

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
let pinEls = new Map(), clusterEls = [], ghostEls = [], cursorEls = new Map(), trainEl = null, popEl = null;
function photoSrc(f) { if (f.a) return '/_blob/' + f.a; if (f.d) { const d = S.photos.get(f.d); return d && typeof d.data === 'string' && d.data.startsWith('data:image/') ? d.data : ''; } return ''; }
function currentStay() { const t = today(); let cur = null; for (const p of routeStays()) if (p.start <= t) cur = p; return t >= TRIP.start && t <= TRIP.end ? cur : null; }
function renderPins() {
  const keep = new Set(), cs = codes(), cur = currentStay();
  for (const p of S.places.values()) {
    if (!hasLoc(p)) continue;
    keep.add(p.id);
    let el = pinEls.get(p.id);
    const f0 = p.photos[0], src = f0 ? photoSrc(f0) : '';
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
  const k = T.k;
  for (const L of LABELS) { if (L.test(k)) { const [x, y] = P(L.lng, L.lat); const on = x > -80 && y > -40 && x < W + 80 && y < H + 40; L.el.hidden = !on; if (on) place(L.el, x, y); } else L.el.hidden = true; }
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
}
function renderRoute() {
  const r = d3.select('#route'); r.selectAll('*').remove();
  const st = routeStays(); if (st.length < 2) return;
  const t = today(), done = [], todo = [];
  for (let i = 1; i < st.length; i++) (st[i].start <= t ? done : todo).push([[st[i - 1].lng, st[i - 1].lat], [st[i].lng, st[i].lat]]);
  const ml = c => gpath({ type: 'MultiLineString', coordinates: c });
  if (done.length) r.append('path').attr('class', 'done').attr('d', ml(done));
  if (todo.length) r.append('path').attr('class', 'todo').attr('d', ml(todo));
}
function renderLegend() {
  $('#legend').innerHTML = ['stay', 'see', 'craft', 'food', 'walk', 'move'].map(k => `<span>${glyph(k)}${esc(KINDS[k].label)}</span>`).join('');
}

/* map clicks */
mapEl.addEventListener('click', e => {
  if (e.target.closest('.ctl,.card,.banner,.pop')) return;
  const pin = e.target.closest('.pin'); if (pin) { closePop(); select(pin.dataset.id, { fly: false }); return; }
  const cl = e.target.closest('.cluster'); if (cl) { closePop(); zoomTo(fitTransform(cl._ids.map(id => S.places.get(id)), { maxK: Math.max(T.k * 3, 12) })); return; }
  const gh = e.target.closest('.ghost'); if (gh) { const it = S.ideas.items[+gh.dataset.idea]; toast(it.name + (it.why ? ': ' + it.why : '')); return; }
  const r = mapEl.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top;
  const ll = unP(x, y); if (!ll) return;
  if (S.picking) { const cb = S.picking.cb; S.picking = null; mapEl.classList.remove('picking'); hideBanner(); cb(ll); return; }
  if (!canEdit()) return;
  openPop(ll, x, y);
});
function openPop(ll, x, y) {
  closePop();
  const near = nearestPlaceName(ll[1], ll[0]);
  popEl = document.createElement('div'); popEl.className = 'pop'; popEl._ll = ll;
  popEl.innerHTML = `<h4>Drop a pin here</h4><p>${near ? 'Near ' + esc(near) : `${ll[1].toFixed(3)}, ${ll[0].toFixed(3)}`}</p>
    <div class="grid">${Object.entries(KINDS).map(([k, v]) => `<button class="btn" type="button" data-k="${k}">${glyph(k)}${esc(v.label)}</button>`).join('')}</div>`;
  mapEl.appendChild(popEl); placePop(x, y);
  popEl.addEventListener('click', ev => { const b = ev.target.closest('[data-k]'); if (!b) return; const k = b.dataset.k; closePop();
    openDialog({ kind: k, lat: ll[1], lng: ll[0], name: k === 'note' ? '' : (near || ''), status: 'planned', start: S.day || '' }); });
  popEl.querySelector('button').focus();
}
function placePop(x, y) { if (!popEl) return; const w = 252, h = popEl.offsetHeight || 220; let px = x + 12, py = y - h / 2; if (px + w > W - 8) px = x - w - 12; px = Math.max(8, px); py = Math.max(8, Math.min(H - h - 8, py)); popEl.style.left = px + 'px'; popEl.style.top = py + 'px'; }
function closePop() { if (popEl) { popEl.remove(); popEl = null; } }

/* gazetteer */
const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9぀-ヿ㐀-鿿]+/g, ' ').trim();
const GAZ = [
  ...POIS.map(([n, ja, lat, lng, k]) => ({ n, ja, lat, lng, k, sub: 'Sight', f: fold(n + ' ' + ja) })),
  ...CITIES.map(([n, ja, lat, lng]) => ({ n, ja, lat, lng, sub: 'City', f: fold(n + ' ' + ja) })),
  ...GEO.towns.map(([n, lat, lng, pi]) => ({ n, ja: '', lat, lng, sub: GEO.prefNames[pi] || '', f: fold(n) }))
];
function searchGaz(q) {
  const f = fold(q); if (!f) return [];
  const out = [], seen = new Set();
  for (const pass of [g => g.f.startsWith(f), g => g.f.includes(f)]) for (const g of GAZ) {
    if (out.length >= 8) break; const key = g.n + g.lat; if (seen.has(key)) continue; if (pass(g)) { seen.add(key); out.push(g); }
  }
  return out;
}
function nearestPlaceName(lat, lng) {
  let best = null, bd = Infinity; const c = Math.cos(lat * Math.PI / 180);
  for (const g of GAZ) { const d = (g.lat - lat) ** 2 + ((g.lng - lng) * c) ** 2; if (d < bd) { bd = d; best = g; } }
  return best && Math.sqrt(bd) * 111 < 18 ? best.n : '';
}
function parseCoords(s) {
  const m = s.match(/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/) || s.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || s.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/) || s.match(/^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{2,3}\.\d+)\s*$/);
  if (!m) return null; const lat = +m[1], lng = +m[2];
  return lat > 20 && lat < 46.5 && lng > 122 && lng < 154 ? { lat, lng } : null;
}

/* ---------- navigation ---------- */
const VIEWS = [['today', 'Today', 'today'], ['plan', 'Plan', 'plan'], ['stays', 'Stays', 'stay'], ['spend', 'Spend', 'yen'], ['notes', 'Notes', 'note'], ['stamps', 'Stamps', 'stamp'], ['phrases', 'Phrases', 'chat']];
const NAV = [['today', 'Today', 'today'], ['map', 'Map', 'mapnav'], ['plan', 'Plan', 'plan'], ['spend', 'Spend', 'yen'], ['more', 'More', 'more']];
function renderNav() {
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
  const f = p.photos[0]; const src = f ? photoSrc(f) : '';
  return `<span class="thumb">${src ? `<img src="${esc(src)}" alt="" loading="lazy">` : glyph(p.kind, { status: p.status })}${n ? `<span class="n num">${n}</span>` : ''}</span>`;
}
function rowHTML(p, cs) {
  const n = cs.get(p.id); const bits = [KINDS[p.kind].label, statusLabel(p)];
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
      <div class="acts">${night.addressJa || night.address ? `<button class="btn btn-sm" type="button" data-showaddr="${esc(night.id)}">${icon('car')}Show to driver</button>` : ''}${hasLoc(night) ? `<a class="btn btn-sm" href="${esc(gmaps(night))}" target="_blank" rel="noopener">${icon('map')}Directions</a>` : ''}<button class="btn btn-sm btn-ghost" type="button" data-id="${esc(night.id)}">Details</button></div></div>`;
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
      <div style="display:flex;gap:12px;align-items:center">${glyph(nx.kind, { status: nx.status, cls: 'g' }).replace('class="g"', 'class="g" style="width:28px;height:28px"')}<div style="min-width:0"><div class="next-time num">${nx.time ? fmtTime(nx.time) : fmtDay(nx.start)}</div><div class="h-head" style="margin-top:4px">${esc(nx.name)}</div></div></div>
      ${nx.notes ? `<div class="muted" style="font-size:13px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(nx.notes)}</div>` : ''}</div>`;
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
    <div class="sec"><span class="label">Quick</span><div class="quick"><button class="btn" type="button" data-nav="phrases">${icon('chat')}Phrases</button><button class="btn" type="button" data-nav="spend">${icon('yen')}Convert</button><button class="btn" type="button" data-nav="map">${icon('mapnav')}Map</button></div></div>`;
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
  return `<div class="inline"><div class="seg" role="group" aria-label="Currency"><button type="button" data-cur="jpy" aria-pressed="${S.cur === 'jpy'}">¥ Yen</button><button type="button" data-cur="aud" aria-pressed="${S.cur === 'aud'}">A$ Dollars</button></div><label for="rateIn">A$1 = ¥</label><input id="rateIn" class="input num" inputmode="decimal" value="${esc(S.settings.rate)}" ${canEdit() ? '' : 'disabled'}></div>`;
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
      <div class="r"><input class="input num" id="xAmt" inputmode="decimal" autocomplete="off" placeholder="Amount" aria-label="Amount"><select class="input" id="xCur" aria-label="Currency"><option value="jpy">¥</option><option value="aud">A$</option></select></div>
      <div class="cats-pick" role="radiogroup" aria-label="Category">${Object.entries(CATS).map(([k, c]) => `<label><input type="radio" name="xcat" value="${k}" ${sel.cat === k ? 'checked' : ''}>${glyph(c.kind)}${c.label}</label>`).join('')}</div>
      <div class="payer" role="radiogroup" aria-label="Who paid"><span class="label" style="align-self:center;margin-right:4px">Paid by</span>${[n0, n1].map((n, i) => `<label><input type="radio" name="xpay" value="${i}" ${sel.payer === i ? 'checked' : ''}>${esc(n)}</label>`).join('')}</div>
      <div class="r"><input class="input" id="xNote" autocomplete="off" placeholder="What was it? (optional)" aria-label="Note"><input class="input" type="date" id="xDate" value="${t}" aria-label="Date"></div>
      <button class="btn btn-primary" type="submit">${icon('plus')}Add expense</button></form></div>`;
  if (byCat.length) h += `<div class="sec"><span class="label">By category</span><div class="cats">${byCat.map(([k, v]) => `<div class="cat"><span>${CATS[k].label}</span><span class="bar"><i style="width:${v / max * 100}%;background:${CATS[k].color}"></i></span><b>${money(v)}</b></div>`).join('')}</div></div>`;
  h += `<div class="sec"><span class="label">Convert</span><div class="convert"><input class="input num" id="cvJ" inputmode="decimal" placeholder="¥" aria-label="Yen"><span>=</span><input class="input num" id="cvA" inputmode="decimal" placeholder="A$" aria-label="Australian dollars"></div></div>`;
  if (canEdit()) h += `<div class="sec"><span class="label">Settings</span><div class="g2"><div class="field"><label for="sBudget">Daily budget for both (¥)</label><input class="input num" id="sBudget" inputmode="numeric" value="${b || ''}" placeholder="15000"></div><div class="field"><label for="sN0">Names</label><div style="display:flex;gap:6px"><input class="input" id="sN0" value="${esc(n0)}" aria-label="First traveller"><input class="input" id="sN1" value="${esc(n1)}" aria-label="Second traveller"></div></div></div></div>`;
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
  h += `<div class="sec" style="padding:18px 0 0"><span class="label" style="padding:0 18px">Maybes · ${maybes.length}</span>${maybes.length ? maybes.map(p => rowHTML(p, cs)).join('') : '<div class="muted" style="padding:0 18px 18px;font-size:14px">Mark anything as Maybe to keep it here.</div>'}</div>`;
  return h;
}
function stampsHTML() {
  const v = [...S.places.values()].filter(p => p.visited).sort((a, b) => a.visited.localeCompare(b.visited) || a.name.localeCompare(b.name));
  const total = [...S.places.values()].filter(p => p.kind !== 'note').length;
  return viewHead('Stamps', `${v.length} of ${total} places`) + `<div class="sec">${v.length ? `<div class="stampbook">${v.map(p => `<button class="stampcell" type="button" data-id="${esc(p.id)}">${stampSVG(p)}<span>${esc(fmtShort(p.visited))}</span></button>`).join('')}</div>`
    : `<div class="empty" style="padding:0"><b>No stamps yet</b>Stations in Japan keep an ink stamp for travellers to collect. Open a place and tap "We've been here" to stamp it into this book.</div>`}</div>`;
}
function phrasesHTML() {
  let i = 0;
  return viewHead('Phrases', 'Tap one to show it full screen') + PHRASES.map(([group, list]) => `<div class="sec"><span class="label">${esc(group)}</span><div class="phrases">${list.map(([en, jp, ro]) => `<button class="phrase" type="button" data-phrase="${i++}"><span class="en">${esc(en)}</span><span class="jp">${esc(jp)}</span><span class="ro">${esc(ro)}</span></button>`).join('')}</div></div>`).join('');
}
function moreHTML() {
  const item = (k, l, ic, sub) => `<button class="row" type="button" data-nav="${k}" style="grid-template-columns:44px minmax(0,1fr)"><span class="thumb">${ic}</span><span><span class="rname">${l}</span><span class="rmeta">${sub}</span></span></button>`;
  const n = [...S.places.values()];
  return viewHead('More', S.settings.title) +
    item('stays', 'Stays', glyph('stay', { status: 'booked' }), `${n.filter(p => p.kind === 'stay').length} stays and the nights still to sort`) +
    item('notes', 'Notes and maybes', glyph('note'), `${n.filter(p => p.kind === 'note').length} notes`) +
    item('stamps', 'Stamps', glyph('see'), `${n.filter(p => p.visited).length} stamped`) +
    item('phrases', 'Phrases', glyph('food'), 'Japanese to show staff and drivers') +
    (PWA ? `<div class="sec"><span class="label">This phone</span><div class="acts"><button class="btn" type="button" data-act="share">${icon('share')}Share trip file</button><label class="btn">${icon('upload')}Import trip file<input type="file" class="tripImport" accept=".json,application/json" hidden></label><button class="btn" type="button" data-act="settings">${icon('settings')}Trip settings</button></div><div class="fine">Each phone keeps its own copy. To sync, share your trip file and import it on the other phone. The newest change wins.</div></div>` : '');
}

/* panel events */
const PH_FLAT = PHRASES.flatMap(([, l]) => l);
$('#pbody').addEventListener('click', async e => {
  const t = e.target;
  if (t.closest('a[href]')) return;
  const f = t.closest('[data-filter]'); if (f) { S.filter = f.dataset.filter; pref('filter', S.filter); renderPanel(); return; }
  const c = t.closest('[data-cur]'); if (c) { S.cur = c.dataset.cur; pref('cur', S.cur); renderAll(); return; }
  const g = t.closest('[data-gap]'); if (g) { const [a, b] = g.dataset.gap.split('|'); openDialog({ kind: 'stay', status: 'planned', start: a, end: b }); return; }
  const ad = t.closest('[data-addday]'); if (ad) { openDialog({ kind: 'see', status: 'planned', start: ad.dataset.addday }); return; }
  const sa = t.closest('[data-showaddr]'); if (sa) { showAddress(S.places.get(sa.dataset.showaddr)); return; }
  const ph = t.closest('[data-phrase]'); if (ph) { const [en, jp, ro] = PH_FLAT[+ph.dataset.phrase]; openShow({ label: en, jp, sub: ro, kc: 'var(--blue)' }); return; }
  const tk = t.closest('[data-tick]'); if (tk) { const p = S.places.get(tk.dataset.tick); if (p) await patch('places', p.id, { done: !p.done }, p.done ? 'reopened' : 'ticked off'); return; }
  const dx = t.closest('[data-delx]'); if (dx) {
    if (dx.dataset.armed) { await remove('spend', dx.dataset.delx); toast('Expense deleted'); }
    else { dx.dataset.armed = '1'; dx.innerHTML = '<span style="font:700 12px var(--font);color:var(--red-ink)">Delete?</span>'; setTimeout(() => { if (dx.isConnected) { delete dx.dataset.armed; dx.innerHTML = icon('x'); } }, 3000); }
    return;
  }
  const act = t.closest('[data-act]'); if (act && PWA) { if (act.dataset.act === 'share') exportTrip(); if (act.dataset.act === 'settings') openSettings(false); return; }
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
    const amount = Math.round($('#xCur').value === 'aud' ? raw * S.settings.rate : raw);
    const cat = ($('input[name="xcat"]:checked') || {}).value || 'other', payer = +(($('input[name="xpay"]:checked') || {}).value || 0);
    S.xpend = { cat, payer };
    const ok = await put('spend', newId('x'), { amount, cat, payer, date: isIso($('#xDate').value) ? $('#xDate').value : today(), note: $('#xNote').value.trim().slice(0, 120), by: S.meId || 'local', at: Date.now() });
    if (ok) toast(`${yen(amount)} added`);
  }
});
$('#pbody').addEventListener('input', e => {
  const r = S.settings.rate;
  if (e.target.id === 'cvJ') { const v = parseFloat(e.target.value.replace(/[^0-9.]/g, '')); $('#cvA').value = v > 0 ? (v / r).toFixed(2) : ''; }
  if (e.target.id === 'cvA') { const v = parseFloat(e.target.value.replace(/[^0-9.]/g, '')); $('#cvJ').value = v > 0 ? Math.round(v * r) : ''; }
});
$('#pbody').addEventListener('change', async e => {
  const id = e.target.id;
  if (id === 'rateIn') { const v = parseFloat(e.target.value); if (!(v > 20 && v < 400)) { toast('Enter how many yen one Australian dollar buys, like 113.'); e.target.value = S.settings.rate; return; } await saveSettings({ rate: v }); }
  if (id === 'sBudget') { const v = Math.round(parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0); await saveSettings({ budget: v }); toast(v ? `Daily budget set to ${yen(v)}` : 'Daily budget cleared'); }
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
  const el = $('#show');
  el.innerHTML = `<div class="bar"><span class="label">${esc(label)}</span><button class="iconbtn" type="button" id="showX" aria-label="Close">${icon('x')}</button></div><div class="main"><div class="accent" style="--kc:${kc || 'var(--red)'}"></div><div class="jp" lang="ja">${esc(jp)}</div>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</div>`;
  el.hidden = false; $('#showX').focus();
  try { navigator.wakeLock && navigator.wakeLock.request('screen').then(l => { el._lock = l; }).catch(() => {}); } catch (e) {}
}
function closeShow() { const el = $('#show'); el.hidden = true; if (el._lock) { el._lock.release().catch(() => {}); el._lock = null; } }
$('#show').addEventListener('click', e => { if (e.target.closest('#showX')) closeShow(); });
function showAddress(p) {
  if (!p) return;
  const jp = p.addressJa || p.address || p.ja || p.name;
  openShow({ label: 'Please take us here', jp: (p.ja ? p.ja + '\n' : '') + jp, sub: `${p.name}${p.address && p.addressJa ? ' · ' + p.address : ''}${p.phone ? ' · ' + p.phone : ''}`, kc: KC[KINDS[p.kind].color] });
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
  else if (p && hasLoc(p)) { const [x, y] = P(p.lng, p.lat); if (x < 40 || y < 40 || x > W - 40 || y > H - 40) flyToPlace(p, 600, T.k); }
  presence({ sel: id || null });
}
function deselect() { S.sel = null; S.ideas = null; renderAll(); presence({ sel: null }); }
function stampSVG(p, extra = '') {
  const rot = (hash(p.id) % 15) - 7;
  const ja = p.ja ? [...p.ja].slice(0, 6).join('') : '';
  const jaSize = ja ? Math.min(22, Math.floor(84 / [...ja].length)) : 0;
  const en = p.name.toUpperCase().slice(0, 18), enSize = en.length > 13 ? 7.2 : 8.6;
  const dt = (p.visited || today()).replace(/-/g, '.');
  const k = KINDS[p.kind] || KINDS.see;
  return `<svg class="stamp ${extra}" viewBox="0 0 120 120" style="--rot:${rot}deg" role="img" aria-label="Stamp: ${esc(p.name)}, ${esc(dt)}"><g filter="url(#ink)" fill="currentColor" stroke="currentColor">
    <circle cx="60" cy="60" r="55" fill="none" stroke-width="4.5"/><circle cx="60" cy="60" r="48" fill="none" stroke-width="1.5"/>
    ${ja ? `<text x="60" y="${34 + jaSize * .4}" text-anchor="middle" font-family="Noto Sans JP, sans-serif" font-weight="900" font-size="${jaSize}" stroke="none">${esc(ja)}</text>` : ''}
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
  const wallet = hasWallet ? `<div class="wallet"><div class="wh"><span class="label">Booking</span>${p.addressJa || p.address ? `<button class="btn btn-sm" type="button" id="driverBtn">${icon('car')}Show to driver</button>` : ''}</div><div class="wb"><dl class="kv">
      ${p.conf ? `<dt>Ref</dt><dd>${copy(p.conf, 'booking reference')}</dd>` : ''}${p.checkin ? `<dt>Check-in</dt><dd>from ${fmtTime(p.checkin)}</dd>` : ''}${p.checkout ? `<dt>Check-out</dt><dd>by ${fmtTime(p.checkout)}</dd>` : ''}
      ${p.address ? `<dt>Address</dt><dd>${copy(p.address, 'address')}</dd>` : ''}${p.addressJa ? `<dt>住所</dt><dd class="ja">${copy(p.addressJa, 'Japanese address')}</dd>` : ''}${p.phone ? `<dt>Phone</dt><dd>${copy(p.phone, 'phone number')}</dd>` : ''}</dl></div></div>` : '';
  const photos = p.photos.map((f, j) => { const src = photoSrc(f); return src ? `<button class="ph" type="button" data-ph="${j}" aria-label="Open photo ${j + 1}"><img src="${esc(src)}" alt="" loading="lazy" decoding="async"></button>` : ''; }).join('');
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
      ${editable && p.kind !== 'note' ? `<button class="btn btn-sm ${p.visited ? 'on' : ''}" type="button" id="stampBtn">${icon('stamp')}${p.visited ? 'Stamped' : "We've been here"}</button>` : ''}
      ${hasLoc(p) ? `<a class="btn btn-sm" href="${esc(gmaps(p))}" target="_blank" rel="noopener">${icon('map')}Google Maps</a>` : ''}
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
  if (t.closest('#addPhoto')) { photoTarget = p.id; $('#photoInput').click(); return; }
  const ph = t.closest('[data-ph]'); if (ph) { openLightbox(p.id, +ph.dataset.ph); return; }
  if (t.closest('#loveBtn')) { const me = S.meId || 'local'; const on = !p.likes[me]; await patch('places', p.id, { likes: { [me]: on } }, on ? 'loved' : 'edited'); return; }
  if (t.closest('#stampBtn')) { if (p.visited) { await patch('places', p.id, { visited: '' }, 'removed the stamp from'); return; } justStamped = p.id; await patch('places', p.id, { visited: today() }, 'stamped'); return; }
  if (t.closest('#ideasBtn')) { askIdeas(p); return; }
  const ai = t.closest('[data-addidea]'); if (ai) { addIdea(+ai.dataset.addidea); return; }
});

/* ---------- dialog ---------- */
let draft = null, lastFocus = null;
const F = { scrim: $('#dlgScrim'), form: $('#dlg'), name: $('#fName'), ja: $('#fJa'), start: $('#fStart'), end: $('#fEnd'), time: $('#fTime'), price: $('#fPrice'), cur: $('#fCur'), pnote: $('#fPriceNote'), notes: $('#fNotes'), loc: $('#fLoc'), sugg: $('#fSugg'), where: $('#fWhere'),
  conf: $('#fConf'), cin: $('#fIn'), cout: $('#fOut'), addr: $('#fAddr'), addrJa: $('#fAddrJa'), phone: $('#fPhone'), links: $('#fLinks') };
$('#fKind').innerHTML = Object.entries(KINDS).map(([k, v]) => `<label><input type="radio" name="kind" value="${k}">${glyph(k)}${esc(v.label)}</label>`).join('');
const radio = (name, v) => $$(`#dlg input[name="${name}"]`).forEach(r => r.checked = r.value === v);
const radioVal = name => ($(`#dlg input[name="${name}"]:checked`) || {}).value;
function syncKind() {
  const k = radioVal('kind'), stay = k === 'stay';
  $('#endWrap').style.visibility = stay ? 'visible' : 'hidden';
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
  F.cur.value = 'jpy'; F.price.value = p.price != null ? Math.round(p.price) : '';
  F.pnote.value = p.priceNote || ''; F.notes.value = p.notes || ''; F.loc.value = '';
  F.conf.value = p.conf || ''; F.cin.value = p.checkin || ''; F.cout.value = p.checkout || ''; F.addr.value = p.address || ''; F.addrJa.value = p.addressJa || ''; F.phone.value = p.phone || '';
  F.links.value = (p.links || []).map(l => `${l.label} | ${l.url}`).join('\n');
  $('#fMore').open = !!(p.conf || p.address || p.addressJa || p.phone || (p.links && p.links.length) || (p.kind === 'stay' && isNew));
  F.sugg.hidden = true; syncWhere();
  $('#fDel').hidden = isNew; $('#fConfirm').hidden = true;
  F.scrim.hidden = false;
  setTimeout(() => (isNew && !F.name.value ? F.name : F.notes).focus(), 30);
}
function closeDialog() { F.scrim.hidden = true; draft = null; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
F.scrim.addEventListener('click', e => { if (e.target === F.scrim || e.target.closest('[data-close]')) closeDialog(); });
let suggList = [], suggAct = -1;
F.loc.addEventListener('input', () => {
  const q = F.loc.value.trim(); const c = parseCoords(q);
  if (c) { draft.lat = c.lat; draft.lng = c.lng; syncWhere(); F.sugg.hidden = true; return; }
  suggList = searchGaz(q); suggAct = -1;
  F.sugg.innerHTML = suggList.map((g, i) => `<button type="button" data-g="${i}"><b>${esc(g.n)}</b>${g.ja ? `<span class="ja">${esc(g.ja)}</span>` : ''}<small>${esc(g.sub)}</small></button>`).join('');
  F.sugg.hidden = !suggList.length;
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
  const k = radioVal('kind'); const pv = parseFloat(String(F.price.value).replace(/[^0-9.]/g, ''));
  const price = isFinite(pv) && pv > 0 ? Math.round(F.cur.value === 'aud' ? pv * (S.settings.rate || 113) : pv) : null;
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
  closeDialog(); select(id, { fly: true });
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
  if (!$('#show').hidden) { closeShow(); return; }
  if (!$('#lightbox').hidden) { closeLightbox(); return; }
  if (!F.scrim.hidden) { if (!F.sugg.hidden) F.sugg.hidden = true; else closeDialog(); return; }
  if (S.picking) { cancelPick(); return; }
  if (popEl) { closePop(); return; }
  if (!$('#menu').hidden) { toggleMenu(false); return; }
  if (S.sel) deselect();
});

/* ---------- photos ---------- */
let photoTarget = null;
$('#photoInput').addEventListener('change', async e => {
  const files = [...e.target.files].filter(f => f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|heic)$/i.test(f.name)); e.target.value = '';
  const id = photoTarget; photoTarget = null; if (!id || !files.length) return;
  const btn = $('#addPhoto'); if (btn) btn.classList.add('busy');
  let added = 0;
  for (const f of files.slice(0, 8)) {
    try {
      const useAssets = assets && S.mode === 'shared';
      const blob = await shrink(f, useAssets ? 1600 : 1280, useAssets ? 0.84 : 0.8);
      const key = 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      let rec;
      if (useAssets) { const r = await assets.upload(blob); rec = { a: r.id, by: S.meId, at: Date.now() }; }
      else {
        const small = S.mode === 'local' ? blob : await shrink(f, 720, 0.72);
        const data = await blobToData(small); const pid = 'ph' + key;
        if (S.mode === 'local') await idb.set(pid, { data, place: id });
        else await enqueue('photos/' + pid, () => db.doc('photos/' + pid).set({ data, place: id, by: S.meId }));
        S.photos.set(pid, { data, place: id }); rec = { d: pid, by: S.meId || 'local', at: Date.now() };
      }
      await patch('places', id, { photos: { [key]: rec } }, 'added a photo to'); added++;
    } catch (er) {
      toast(er && er.code === 'quota_exceeded' ? 'No room for more photos. Delete a few first.' : /heic/i.test(f.name) ? 'That photo is HEIC. Try a JPEG or PNG.' : "A photo couldn't be added. Try a smaller JPEG or PNG.");
    }
  }
  const b2 = $('#addPhoto'); if (b2) b2.classList.remove('busy');
  if (added) toast(added === 1 ? 'Photo added' : `${added} photos added`);
});
async function shrink(file, max, q) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('decode')); im.src = url; });
    const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return await new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('encode')), 'image/jpeg', q));
  } finally { URL.revokeObjectURL(url); }
}
const blobToData = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });
let LB = null;
function openLightbox(id, i) { LB = { id, i }; renderLightbox(); }
function closeLightbox() { $('#lightbox').hidden = true; LB = null; }
function renderLightbox() {
  const p = S.places.get(LB && LB.id); const box = $('#lightbox');
  if (!p || !p.photos.length) { closeLightbox(); return; }
  LB.i = (LB.i + p.photos.length) % p.photos.length; const f = p.photos[LB.i];
  box.innerHTML = `<div class="lh"><b>${esc(p.name)} · ${LB.i + 1} of ${p.photos.length} · ${esc(firstName(f.by))}</b>${canEdit() ? `<span id="lbConfirm" hidden>Remove it? <button class="btn btn-sm" type="button" id="lbYes">Remove</button></span><button class="btn btn-sm" type="button" id="lbDel">${icon('trash')}Remove</button>` : ''}<button class="btn btn-sm" type="button" id="lbX">${icon('x')}Close</button></div>
    <div class="stage"><img src="${esc(photoSrc(f))}" alt="Photo of ${esc(p.name)}"></div>
    <div class="lf">${p.photos.length > 1 ? `<button class="btn" type="button" id="lbPrev">${icon('left')}Previous</button><button class="btn" type="button" id="lbNext">Next${icon('right')}</button>` : ''}</div>`;
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

/* ---------- ideas from Claude ---------- */
async function askIdeas(p) {
  if (!sample) return;
  S.ideas = { for: p.id, loading: true, items: [] }; renderCard();
  const month = p.start ? parseD(p.start).toLocaleDateString('en-AU', { month: 'long' }) : 'early November';
  const prompt = `Two adults are travelling in Japan in ${month}. They love drawing and knitting somewhere calm and scenic, craft and art, long walks, local food and quiet bars.
Suggest 5 real places within about 8 km of "${p.name}"${p.ja ? ` (${p.ja})` : ''} at latitude ${p.lat.toFixed(4)}, longitude ${p.lng.toFixed(4)}. Only include places you are confident exist and are open to visitors. Mix the kinds. Do not include "${p.name}" itself.
Reply with JSON only: {"ideas":[{"name":"English name","ja":"Japanese name","kind":"see|food|craft|walk","lat":0,"lng":0,"why":"one short sentence on why it suits them"}]}`;
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
function onViewChange() { if (!room) return; const c = unP(W / 2, H / 2); if (c) presence({ c: [+c[0].toFixed(4), +c[1].toFixed(4)], z: +T.k.toFixed(2) }); }
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
  if (Array.isArray(pr.c) && isFinite(pr.z)) { measure(); const [x, y] = base(pr.c); zoomTo(d3.zoomIdentity.translate(W / 2, H / 2).scale(Math.max(0.45, Math.min(110, pr.z))).translate(-x, -y), dur); }
}

/* ---------- menu ---------- */
function renderMenu() {
  $('#menu').innerHTML = (PWA ? `<button type="button" data-m="share">${icon('share')}<span>Share trip file</span></button><label>${icon('upload')}<span>Import a trip file</span><input type="file" class="tripImport" accept=".json,application/json" hidden></label><button type="button" data-m="settings">${icon('settings')}<span>Trip settings</span></button>` : `<label>${icon('upload')}<span>Import the old map's export</span><input type="file" id="importOld" accept=".json,application/json" hidden></label>`)
    + `<button type="button" data-m="rail">${icon('train')}<span>${railOn ? 'Hide' : 'Show'} Shinkansen lines</span></button><button type="button" data-m="fit">${icon('fit')}<span>Show all of Japan</span></button>`
    + `<div class="note">Map data: MLIT National Land Numerical Information, Natural Earth and GeoNames.</div>` + (PWA ? `<div class="note">Each phone keeps its own copy and works offline. To sync, share your trip file and import it on the other phone. The newest change wins.</div>` : '');
}
function toggleMenu(open) { if (open) renderMenu(); $('#menu').hidden = !open; $('#moreBtn').setAttribute('aria-expanded', String(open)); }
$('#moreBtn').onclick = e => { e.stopPropagation(); toggleMenu($('#menu').hidden); };
document.addEventListener('click', e => { if (!e.target.closest('#menu,#moreBtn')) toggleMenu(false); });
$('#menu').addEventListener('click', e => {
  const b = e.target.closest('[data-m]'); if (!b) return; const m = b.dataset.m; toggleMenu(false);
  if (m === 'rail') { railOn = !railOn; mapEl.classList.toggle('no-rail', !railOn); pref('rail', railOn ? 'on' : 'off'); }
  if (m === 'fit') { if (isPhone()) setView('map'); zoomTo(japanView()); }
  if (m === 'share' && PWA) exportTrip();
  if (m === 'settings' && PWA) openSettings(false);
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

/* ---------- boot: offline phone app ---------- */
addEventListener('resize', () => { renderNav(); if (!isPhone() && S.tab === 'more') { S.tab = 'today'; renderPanel(); } });
const stampOf = raw => raw && raw.last && typeof raw.last.at === 'number' ? raw.last.at : (raw && raw.created) || 0;
const ID_OK = id => /^[A-Za-z0-9_\-.~:@+]{1,80}$/.test(id);
async function exportTrip() {
  const photos = {};
  for (const p of S.places.values()) for (const f of p.photos) if (f.d && S.photos.get(f.d)) photos[f.d] = S.photos.get(f.d).data;
  const st = local.settings || {};
  const data = { format: 'tabi-trip', version: 1, exportedAt: Date.now(), from: st.me || '',
    settings: { title: st.title, start: st.start, end: st.end, rate: st.rate, budget: st.budget, names: st.names }, places: local.places, spend: local.spend, deleted: local.deleted, photos };
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
  if (!ls.start && isIso(st.start) && isIso(st.end)) { ls.start = st.start; ls.end = st.end; }
  if (!ls.title && typeof st.title === 'string') ls.title = st.title.slice(0, 60);
  if (!ls.names && Array.isArray(st.names)) ls.names = st.names.slice(0, 2).map(x => String(x || '').slice(0, 24));
  if (!ls.rate && typeof st.rate === 'number') ls.rate = st.rate;
  if (!ls.budget && typeof st.budget === 'number') ls.budget = st.budget;
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
    const r = await importTrip(data); closeSettings();
    const bits = [r.added && `${r.added} new`, r.updated && `${r.updated} updated`, r.removed && `${r.removed} removed`, r.pics && `${r.pics} photos`].filter(Boolean);
    toast(bits.length ? 'Imported: ' + bits.join(', ') : 'Already up to date');
    fitPlaces(); scrollDaysToToday();
  } catch (e) { toast("That file isn't a Tabi trip file."); }
}
function closeSettings() { const s = $('#setScrim'); if (s) s.remove(); }
function openSettings(first) {
  closeSettings();
  const st = local.settings || {}, names = Array.isArray(st.names) ? st.names : [];
  const el = document.createElement('div'); el.className = 'scrim'; el.id = 'setScrim';
  el.innerHTML = `<form class="dlg" id="setForm" novalidate><div class="dlg-h"><h2>${first ? 'Welcome to Tabi' : 'Trip settings'}</h2>${first ? '' : `<button class="iconbtn" type="button" data-sx aria-label="Close">${icon('x')}</button>`}</div>
    <div class="dlg-b">${first ? `<p style="margin:0;font:500 15px/1.5 var(--font);color:var(--ink-2)">Tabi keeps your trip on this phone and works without internet. Import the trip file you were sent, or set up a new trip below.</p><label class="btn btn-primary">${icon('upload')}Import a trip file<input type="file" class="tripImport" accept=".json,application/json" hidden></label>` : ''}
      <div class="field"><label for="stMe">Your name</label><input class="input" id="stMe" autocomplete="given-name" value="${esc(st.me || '')}" placeholder="Shown on things you add"></div>
      <div class="field"><label for="stTitle">Trip name</label><input class="input" id="stTitle" value="${esc(st.title || '')}" placeholder="Japan 2026"></div>
      <div class="g2"><div class="field"><label for="stStart">First day</label><input class="input" type="date" id="stStart" value="${esc(st.start || '')}"></div><div class="field"><label for="stEnd">Fly home</label><input class="input" type="date" id="stEnd" value="${esc(st.end || '')}"></div></div>
      <div class="g2"><div class="field"><label for="stN0">Traveller one</label><input class="input" id="stN0" value="${esc(names[0] || st.me || '')}"></div><div class="field"><label for="stN1">Traveller two</label><input class="input" id="stN1" value="${esc(names[1] || '')}"></div></div></div>
    <div class="dlg-f"><button class="btn btn-primary" type="submit">${first ? 'Start a new trip' : 'Save'}</button>${first ? '' : '<button class="btn" type="button" data-sx>Cancel</button>'}</div></form>`;
  document.body.appendChild(el);
  el.addEventListener('click', e => { if (e.target.closest('[data-sx]')) closeSettings(); });
  el.addEventListener('change', e => { if (e.target.classList.contains('tripImport')) importTripFile(e.target); });
  el.querySelector('form').addEventListener('submit', e => {
    e.preventDefault();
    const s = $('#stStart').value, en = $('#stEnd').value;
    if (!isIso(s) || !isIso(en) || en <= s) { toast('Pick the first day and a later fly-home day.'); return; }
    const me = $('#stMe').value.trim().slice(0, 24);
    local.settings = { ...local.settings, me, title: $('#stTitle').value.trim().slice(0, 60) || 'Our trip', start: s, end: en, names: [$('#stN0').value.trim().slice(0, 24) || me || 'Me', $('#stN1').value.trim().slice(0, 24) || 'Partner'], seen: true };
    S.meId = me ? 'n:' + me : 'local'; saveLocal(); applyLocal(); closeSettings(); scrollDaysToToday();
  });
}
async function boot() {
  measure(); S.ready = true;
  S.mode = 'local'; loadLocal();
  S.meId = local.settings.me ? 'n:' + local.settings.me : 'local';
  try { S.photos = new Map(Object.entries(await idb.all())); } catch (e) {}
  mapSel.call(zoomer.transform, japanView());
  setView(isPhone() ? S.tab : 'map');
  renderLegend(); applyLocal(); scrollDaysToToday();
  if (S.places.size) fitPlaces(0);
  if (!local.settings.seen) openSettings(true);
}
boot();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

})();
