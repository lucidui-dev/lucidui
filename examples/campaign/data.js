export const RACE = {
  state: "Westmere",
  office: "Governor",
  year: 2028,
  today: new Date(2028, 8, 26),
  election: new Date(2028, 10, 7),
  turnout: 4.12
};

export const CANDIDATES = [
  { id: "okafor", name: "Maya Okafor", last: "Okafor", party: "Harbor", color: "#2f6bff", soft: "rgb(47 107 255 / .16)", role: "State Treasurer", age: 47, home: "Brightwater" },
  { id: "whitfield", name: "Daniel Whitfield", last: "Whitfield", party: "Summit", color: "#ef3e4a", soft: "rgb(239 62 74 / .16)", role: "Former Senator", age: 58, home: "Iron Hill" },
  { id: "sorensen", name: "Lena Sorensen", last: "Sorensen", party: "Independent", color: "#a46bff", soft: "rgb(164 107 255 / .16)", role: "Mayor of Saltmarsh", age: 41, home: "Saltmarsh" }
];
export const CANDIDATE = Object.fromEntries(CANDIDATES.map(c => [c.id, c]));

const wave = (base, amp, phase, drift) => Array.from({ length: 24 }, (_, w) =>
  Math.round((base + Math.sin(w / 3.1 + phase) * amp + (w / 23) * drift + Math.sin(w * 1.7 + phase * 2) * 0.35) * 10) / 10);

export const WEEKS = Array.from({ length: 24 }, (_, w) => {
  const d = new Date(RACE.today);
  d.setDate(d.getDate() - (23 - w) * 7);
  return d;
});

export const POLLS = {
  okafor: wave(41.6, 1.2, 0.4, 2.4),
  whitfield: wave(43.4, 1.0, 2.1, -0.9),
  sorensen: wave(7.1, 0.7, 1.1, 1.2)
};

export const POLLSTERS = [
  { name: "Westmere Ledger", grade: "A", size: 1204, okafor: 45, whitfield: 42, sorensen: 8 },
  { name: "Northgate Univ.", grade: "A-", size: 980, okafor: 44, whitfield: 43, sorensen: 9 },
  { name: "Civic Pulse", grade: "B+", size: 1530, okafor: 43, whitfield: 44, sorensen: 7 },
  { name: "Harrow & Finch", grade: "B", size: 760, okafor: 46, whitfield: 41, sorensen: 8 },
  { name: "Signal Research", grade: "B+", size: 1102, okafor: 44, whitfield: 43, sorensen: 9 },
  { name: "Lakeside Poll", grade: "A-", size: 890, okafor: 42, whitfield: 44, sorensen: 10 }
];

export const COUNTIES = [
  { id: "harbor", name: "Harbor", seat: "Port Ellery", seed: [0.18, 0.62], voters: 612, lean: 9, swing: false },
  { id: "pine", name: "Pine Ridge", seat: "Tamsin", seed: [0.24, 0.24], voters: 188, lean: -14, swing: false },
  { id: "coldwater", name: "Coldwater", seat: "Vey", seed: [0.42, 0.14], voters: 141, lean: -19, swing: false },
  { id: "marrow", name: "Marrow", seat: "Marrow", seed: [0.38, 0.42], voters: 297, lean: -3, swing: true },
  { id: "ashford", name: "Ashford", seat: "Linden", seed: [0.6, 0.3], voters: 254, lean: -8, swing: false },
  { id: "eastgate", name: "Eastgate", seat: "Corley", seed: [0.82, 0.22], voters: 176, lean: -12, swing: false },
  { id: "saltmarsh", name: "Saltmarsh", seat: "Saltmarsh", seed: [0.3, 0.82], voters: 233, lean: 2, swing: true },
  { id: "ironhill", name: "Iron Hill", seat: "Galt", seed: [0.66, 0.56], voters: 318, lean: -1, swing: true },
  { id: "kestrel", name: "Kestrel", seat: "Ammon", seed: [0.86, 0.48], voters: 207, lean: -6, swing: false },
  { id: "brightwater", name: "Brightwater", seat: "Brightwater", seed: [0.52, 0.64], voters: 701, lean: 14, swing: false },
  { id: "lowfield", name: "Lowfield", seat: "Ostrow", seed: [0.5, 0.88], voters: 166, lean: 1, swing: true },
  { id: "cedar", name: "Cedar Bluff", seat: "Hale", seed: [0.78, 0.8], voters: 224, lean: 4, swing: true }
];
export const COUNTY = Object.fromEntries(COUNTIES.map(c => [c.id, c]));

export const GRID = { cols: 46, rows: 30 };

const BORDER = [
  [0.05, 0.05], [0.7, 0.05], [0.72, 0.11], [0.95, 0.11], [0.97, 0.3], [0.93, 0.42], [0.97, 0.55], [0.92, 0.68],
  [0.95, 0.8], [0.86, 0.9], [0.74, 0.87], [0.64, 0.96], [0.5, 0.92], [0.4, 0.97], [0.28, 0.9], [0.16, 0.93],
  [0.08, 0.8], [0.13, 0.7], [0.03, 0.63], [0.07, 0.52], [0.02, 0.4], [0.06, 0.3], [0.04, 0.18]
];

const inside = (x, y) => {
  let hit = false;
  for (let i = 0, j = BORDER.length - 1; i < BORDER.length; j = i++) {
    const [xi, yi] = BORDER[i];
    const [xj, yj] = BORDER[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
};

export const CELLS = (() => {
  const out = [];
  const { cols, rows } = GRID;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c / (cols - 1);
      const y = r / (rows - 1);
      const lake = Math.hypot((x - 0.6) * 1.3, y - 0.4) < 0.055;
      if (!inside(x, y) || lake) continue;
      let best = null;
      let dist = Infinity;
      for (const county of COUNTIES) {
        const d = Math.hypot(x - county.seed[0], (y - county.seed[1]) * 0.9) + Math.sin((x + y) * 19 + county.seed[0] * 7) * 0.012;
        if (d < dist) { dist = d; best = county.id; }
      }
      out.push({ c, r, x, y, county: best });
    }
  }
  return out;
})();

export const CENTROIDS = Object.fromEntries(COUNTIES.map(county => {
  const own = CELLS.filter(cell => cell.county === county.id);
  return [county.id, { c: own.reduce((s, k) => s + k.c, 0) / own.length, r: own.reduce((s, k) => s + k.r, 0) / own.length, n: own.length }];
}));

export const FUNDS = [
  { id: "okafor", small: 14, large: 9, pac: 6, cash: 11.4, spent: 17.6 },
  { id: "whitfield", small: 8, large: 13, pac: 11, cash: 14.2, spent: 17.8 },
  { id: "sorensen", small: 6, large: 2, pac: 0, cash: 2.1, spent: 5.9 }
];

export const PRIORITIES = [
  { label: "Housing costs", value: 31, color: "#ffd400" },
  { label: "Jobs and wages", value: 24, color: "#ff8f3f" },
  { label: "Schools", value: 16, color: "#2fd3a6" },
  { label: "Water rights", value: 12, color: "#4fb3ff" },
  { label: "Public safety", value: 10, color: "#c084fc" },
  { label: "Other", value: 7, color: "#6b6b73" }
];

export const TRAIL = [
  { day: 27, month: "Sep", who: "okafor", kind: "Rally", place: "Harbor", title: "Waterfront rally on housing", time: "6:30 PM" },
  { day: 28, month: "Sep", who: "whitfield", kind: "Town hall", place: "Iron Hill", title: "Manufacturing town hall at Galt Works", time: "11:00 AM" },
  { day: 29, month: "Sep", who: "sorensen", kind: "Tour", place: "Saltmarsh", title: "Coastal towns bus tour begins", time: "9:00 AM" },
  { day: 2, month: "Oct", who: "all", kind: "Debate", place: "Brightwater", title: "First televised debate, Brightwater Hall", time: "8:00 PM" },
  { day: 5, month: "Oct", who: "whitfield", kind: "Rally", place: "Marrow", title: "Farm country rally", time: "4:00 PM" },
  { day: 7, month: "Oct", who: "okafor", kind: "Tour", place: "Lowfield", title: "Schools tour, three stops", time: "10:00 AM" },
  { day: 12, month: "Oct", who: "all", kind: "Debate", place: "Iron Hill", title: "Second debate on the economy", time: "7:00 PM" }
];

export const HEADLINES = [
  "Okafor edges ahead in Westmere Ledger poll, 45 to 42",
  "Whitfield outraises rivals in September with $4.1M",
  "Sorensen qualifies for first televised debate",
  "Iron Hill county officials expand early voting sites",
  "Water rights emerge as top issue in Lowfield and Saltmarsh",
  "Whitfield ad blitz targets Marrow and Kestrel",
  "Okafor picks up endorsement from Brightwater teachers' union",
  "Turnout models point to record mail-in voting"
];
