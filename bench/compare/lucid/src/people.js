const FIRST = ["Ada", "Ben", "Cleo", "Dev", "Esme", "Finn", "Gus", "Hana", "Ivo", "Juno"];
const LAST = ["Brook", "Okafor", "Varga", "Anand", "Lund", "Ito", "Hart", "Moss", "Kade", "Pell"];
const ROLES = ["Design", "Engineering", "Support", "Sales", "Finance"];
const CITIES = ["Lisbon", "Leeds", "Austin", "Osaka", "Lagos"];

export const people = Array.from({ length: 1000 }, (_, i) => ({
  id: i + 1,
  name: `${FIRST[i % 10]} ${LAST[Math.floor(i / 10) % 10]}`,
  role: ROLES[i % 5],
  city: CITIES[(i * 7) % 5]
}));
