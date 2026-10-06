export const BOOKING = { ref: "CE7K2Q", last: "Park" };

export const FLIGHT = {
  number: "CE 017",
  aircraft: "Boeing 777-300ER",
  from: { code: "ICN", city: "Seoul", airport: "Incheon International", terminal: "T2" },
  to: { code: "LAX", city: "Los Angeles", airport: "Los Angeles International", terminal: "TBIT" },
  date: "Sat, 10 Oct",
  depart: "14:40",
  arrive: "09:55",
  duration: "11h 15m",
  gate: "248",
  boarding: "13:50",
  status: "On time"
};

export const PASSENGERS = [
  { id: "p1", first: "Jiwoo", last: "Park", type: "Adult", tier: "Morning Calm", allowance: 2, seat: "31C" },
  { id: "p2", first: "Minseo", last: "Park", type: "Adult", tier: null, allowance: 2, seat: null },
  { id: "p3", first: "Hana", last: "Park", type: "Child, 7", tier: null, allowance: 1, seat: null }
];

export const COLUMNS = ["A", "B", "C", null, "D", "E", "F", "G", null, "H", "J", "K"];
export const ROWS = Array.from({ length: 20 }, (_, i) => 28 + i);
export const SPACE_ROWS = new Set([28, 29]);
export const EXIT_ROWS = new Set([38]);

const rand = seed => {
  const x = Math.sin(seed * 91.17) * 10000;
  return x - Math.floor(x);
};

export const TAKEN = new Set(
  ROWS.flatMap(row => COLUMNS.filter(Boolean).map(col => `${row}${col}`))
    .filter((seat, i) => seat !== "31C" && rand(i + 3) < 0.58 && !["32D", "32E", "32F", "33D", "33E", "36H", "36J", "36K", "29A", "29B"].includes(seat))
);

export const seatKind = id => {
  const col = id.replace(/\d+/, "");
  if (col === "A" || col === "K") return "Window";
  if (["C", "D", "G", "H"].includes(col)) return "Aisle";
  return "Middle";
};

export const seatPrice = id => {
  const row = Number(id.match(/\d+/)[0]);
  return SPACE_ROWS.has(row) ? 80 : EXIT_ROWS.has(row) ? 60 : 0;
};
