const L1 = [
  "Vaughan Metropolitan Centre", "Highway 407", "Pioneer Village", "York University", "Finch West", "Downsview Park", "Sheppard West",
  "Wilson", "Yorkdale", "Lawrence West", "Glencairn", "Cedarvale", "St Clair West", "Dupont", "Spadina", "St George",
  "Museum", "Queen's Park", "St Patrick", "Osgoode", "St Andrew", "Union", "King", "Queen", "TMU", "College", "Wellesley",
  "Bloor-Yonge", "Rosedale", "Summerhill", "St Clair", "Davisville", "Eglinton", "Lawrence", "York Mills", "Sheppard-Yonge",
  "North York Centre", "Finch"
];

const L2 = [
  "Kipling", "Islington", "Royal York", "Old Mill", "Jane", "Runnymede", "High Park", "Keele", "Dundas West", "Lansdowne",
  "Dufferin", "Ossington", "Christie", "Bathurst", "Spadina", "St George", "Bay", "Bloor-Yonge", "Sherbourne", "Castle Frank",
  "Broadview", "Chester", "Pape", "Donlands", "Greenwood", "Coxwell", "Woodbine", "Main Street", "Victoria Park", "Warden", "Kennedy"
];

const L4 = ["Sheppard-Yonge", "Bayview", "Bessarion", "Leslie", "Don Mills"];

const WEST = 470;
const EAST = 600;
const ROW = 470;
const STEP = 26;

const l1Point = i => {
  if (i <= 6) return [302 + i * 24, 94 + i * 24];
  if (i <= 15) return [WEST, 262 + (i - 7) * STEP];
  if (i <= 20) return [WEST, 506 + (i - 16) * 36];
  if (i === 21) return [535, 690];
  if (i <= 26) return [EAST, 650 - (i - 22) * 36];
  return [EAST, ROW - (i - 27) * STEP];
};

const l2Point = i => {
  if (i <= 14) return [30 + i * 29, ROW];
  if (i === 15) return [WEST, ROW];
  if (i === 16) return [535, ROW];
  if (i === 17) return [EAST, ROW];
  return [640 + (i - 18) * 27.5, ROW];
};

const l4Point = i => [EAST + i * 60, 262];

const corner = {
  "1": { 20: [[WEST, 670], [490, 690]], 21: [[580, 690], [EAST, 670]] }
};

function label(line, i, [x, y]) {
  if (line === "2") {
    if (i === 15) return { x: x - 9, y: y - 10, anchor: "end" };
    if (i === 16) return { x, y: y - 12, anchor: "middle" };
    if (i === 17) return { x: x + 9, y: y - 10, anchor: "start" };
    if (i === 14) return { x: x - 4, y: y + 12, anchor: "end", rotate: -45 };
    return i < 14 ? { x: x + 4, y: y - 10, anchor: "start", rotate: -45 } : { x: x + 4, y: y + 12, anchor: "start", rotate: 45 };
  }
  if (line === "4") return { x: x + 4, y: y - 10, anchor: "start", rotate: -45 };
  if (i === 21) return { x, y: y + 20, anchor: "middle" };
  if (i <= 20) return { x: x - 11, y: y + 3.5, anchor: "end" };
  return { x: x + 11, y: y + 3.5, anchor: "start" };
}

const WEIGHT = {
  "Union": 10, "Bloor-Yonge": 10, "St George": 8, "Finch": 7, "Kennedy": 7, "Kipling": 6, "Sheppard-Yonge": 7, "Eglinton": 7,
  "Spadina": 5, "Dundas West": 5, "King": 6, "Queen": 6, "TMU": 6, "St Andrew": 5, "College": 5, "Broadview": 4, "Yorkdale": 5,
  "Vaughan Metropolitan Centre": 5, "Don Mills": 5, "Pape": 4, "Main Street": 4, "Islington": 4, "Bay": 5, "Osgoode": 4, "York University": 4
};

export const LINES = [
  { id: "1", name: "Yonge–University", color: "#f2c200", ink: "#3a2c00", names: L1, point: l1Point, trains: 18, minutes: 2.1 },
  { id: "2", name: "Bloor–Danforth", color: "#1fa463", ink: "#ffffff", names: L2, point: l2Point, trains: 14, minutes: 2.0 },
  { id: "4", name: "Sheppard", color: "#a7479c", ink: "#ffffff", names: L4, point: l4Point, trains: 2, minutes: 2.4 }
].map(line => {
  const stations = line.names.map((name, i) => {
    const xy = line.point(i);
    return { id: `${line.id}:${i}`, line: line.id, index: i, name, x: xy[0], y: xy[1], label: label(line.id, i, xy), weight: WEIGHT[name] ?? 2 + ((name.length * 7) % 3) };
  });
  const legs = stations.slice(0, -1).map((s, i) => {
    const points = [[s.x, s.y], ...(corner[line.id]?.[i] ?? []), [stations[i + 1].x, stations[i + 1].y]];
    let length = 0;
    const cumulative = [0];
    for (let k = 1; k < points.length; k++) {
      length += Math.hypot(points[k][0] - points[k - 1][0], points[k][1] - points[k - 1][1]);
      cumulative.push(length);
    }
    return { points, cumulative, length };
  });
  const path = legs.reduce((d, leg, i) => d + leg.points.slice(i === 0 ? 0 : 1).map((p, k) => `${i === 0 && k === 0 ? "M" : "L"}${p[0]} ${p[1]}`).join(" ") + " ", "").trim();
  return { ...line, stations, legs, path };
});

export const LINE = Object.fromEntries(LINES.map(line => [line.id, line]));

export const INTERCHANGES = new Set(["St George", "Bloor-Yonge", "Sheppard-Yonge", "Spadina"]);
export const KEY = new Set(["Vaughan Metropolitan Centre", "Finch", "Kipling", "Kennedy", "Don Mills", "Union", "St George", "Bloor-Yonge", "Sheppard-Yonge", "Spadina", "Eglinton", "Dundas West", "Broadview"]);

export const STATIONS = (() => {
  const byName = new Map();
  for (const line of LINES) for (const s of line.stations) {
    const entry = byName.get(s.name) ?? { name: s.name, lines: [], weight: s.weight, points: [] };
    entry.lines.push(line.id);
    entry.points.push(s);
    byName.set(s.name, entry);
  }
  return byName;
})();

export function pointAt(line, position) {
  const max = line.stations.length - 1;
  const p = Math.max(0, Math.min(max, position));
  const i = Math.min(max - 1, Math.floor(p));
  const leg = line.legs[i];
  const target = (p - i) * leg.length;
  let k = 1;
  while (k < leg.cumulative.length - 1 && leg.cumulative[k] < target) k++;
  const a = leg.points[k - 1];
  const b = leg.points[k];
  const span = leg.cumulative[k] - leg.cumulative[k - 1] || 1;
  const t = (target - leg.cumulative[k - 1]) / span;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

export function segmentPath(line, from, to) {
  const [a, b] = from <= to ? [from, to] : [to, from];
  const points = [];
  for (let i = a; i < b; i++) points.push(...line.legs[i].points.slice(i === a ? 0 : 1));
  if (a === b) points.push([line.stations[a].x, line.stations[a].y]);
  return points.map((p, k) => `${k ? "L" : "M"}${p[0]} ${p[1]}`).join(" ");
}

export const HOURS = [
  ["5a", 18], ["6a", 52], ["7a", 118], ["8a", 164], ["9a", 121], ["10a", 74], ["11a", 66], ["12p", 71], ["1p", 69], ["2p", 72],
  ["3p", 93], ["4p", 131], ["5p", 168], ["6p", 129], ["7p", 84], ["8p", 61], ["9p", 48], ["10p", 37], ["11p", 26]
];

export const SEED_ALERTS = [
  { id: 1, line: "2", type: "delay", from: 7, to: 11, cause: "Signal problem", posted: -14 },
  { id: 2, line: "1", type: "elevator", from: 13, to: 13, cause: "Elevator out of service", posted: -52 }
];
