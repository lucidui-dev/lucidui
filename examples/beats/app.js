import { signal, computed, effect, h, mount, onCleanup, batch } from "/lucid/index.js";
import { Button, Segmented, Tooltip, Icon, Kbd, toast, hotkey } from "/lucid/ui/index.js";
import { ExitCard } from "/exit.js";

const stored = key => { try { return localStorage.getItem(`lucid-beats:${key}`); } catch { return null; } };
const theme = signal(stored("theme") ?? "dark");
effect(() => {
  try { localStorage.setItem("lucid-beats:theme", theme.value); } catch {}
  if (theme.value === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme.value;
});

const STEPS = 16;
const TRACKS = [
  { id: "kick", label: "Kick", color: "#ff5c7a" },
  { id: "snare", label: "Snare", color: "#ffb347" },
  { id: "hat", label: "Hats", color: "#f7f06d" },
  { id: "clap", label: "Clap", color: "#7cf0b0" },
  { id: "bass", label: "Bass", color: "#5cc8ff" },
  { id: "chord", label: "Keys", color: "#b48cff" }
];
const BASS = [36, 36, 39, 36, 43, 36, 41, 39, 36, 36, 39, 41, 43, 46, 43, 41];
const CHORDS = [[60, 63, 67, 70], [56, 60, 63, 67], [58, 62, 65, 69], [55, 58, 62, 65]];

const row = str => str.split("").map(c => c === "x");
const PRESETS = {
  night: { name: "Night drive", bpm: 104, swing: 12, grid: {
    kick: row("x.....x...x....."), snare: row("....x.......x..."), hat: row("..x...x...x...xx"),
    clap: row("............x..."), bass: row("x..x..x...x..x.."), chord: row("x.......x.......") } },
  house: { name: "Four on the floor", bpm: 124, swing: 0, grid: {
    kick: row("x...x...x...x..."), snare: row("................"), hat: row("..x...x...x...x."),
    clap: row("....x.......x..."), bass: row(".x.x.x.x.x.x.x.x"), chord: row("...x.......x....") } },
  boom: { name: "Boom bap", bpm: 88, swing: 28, grid: {
    kick: row("x......xx.x....."), snare: row("....x.......x..."), hat: row("x.x.x.x.x.x.x.x."),
    clap: row("....x.......x..x"), bass: row("x......x..x....."), chord: row("x...............") } },
  empty: { name: "Blank", bpm: 110, swing: 0, grid: Object.fromEntries(TRACKS.map(t => [t.id, row("................")])) }
};

const preset = signal("night");
const grid = signal(structuredClone(PRESETS.night.grid));
const bpm = signal(PRESETS.night.bpm);
const swing = signal(PRESETS.night.swing);
const playing = signal(false);
const step = signal(-1);
const mutes = signal(new Set());
const solos = signal(new Set());
const levels = signal(Object.fromEntries(TRACKS.map(t => [t.id, t.id === "hat" ? 0.55 : t.id === "chord" ? 0.6 : 0.85])));
const master = signal(0.8);

const load = key => batch(() => {
  preset.value = key;
  grid.value = structuredClone(PRESETS[key].grid);
  bpm.value = PRESETS[key].bpm;
  swing.value = PRESETS[key].swing;
});

const toggle = (track, i) => {
  const next = { ...grid.peek(), [track]: [...grid.peek()[track]] };
  next[track][i] = !next[track][i];
  grid.value = next;
  if (!playing.peek() && next[track][i]) audition(track, i);
};

const audible = id => {
  const s = solos.value;
  return s.size ? s.has(id) : !mutes.value.has(id);
};

let ctx = null;
let out = null;
let analyser = null;
let noise = null;

function ensure() {
  if (ctx) return ctx;
  ctx = new AudioContext();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  out = ctx.createGain();
  out.gain.value = master.peek();
  analyser = ctx.createAnalyser();
  analyser.fftSize = 128;
  analyser.smoothingTimeConstant = 0.78;
  out.connect(comp).connect(analyser).connect(ctx.destination);
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return ctx;
}
effect(() => { const v = master.value; if (out) out.gain.setTargetAtTime(v, ctx.currentTime, 0.02); });

const hz = n => 440 * Math.pow(2, (n - 69) / 12);

function env(gain, t, peak, decay) {
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);
}

function burst(t, filterType, freq, peak, decay, q = 0.8) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = filterType;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  env(g, t, peak, decay);
  src.connect(f).connect(g).connect(out);
  src.start(t);
  src.stop(t + decay + 0.05);
}

function tone(t, type, freq, peak, decay, glideTo, filter) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + decay * 0.6);
  const g = ctx.createGain();
  env(g, t, peak, decay);
  let node = o;
  if (filter) {
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(filter, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(120, filter / 4), t + decay);
    f.Q.value = 6;
    node = o.connect(f);
  }
  node.connect(g).connect(out);
  o.start(t);
  o.stop(t + decay + 0.05);
}

function play(track, i, t) {
  const v = levels.peek()[track];
  if (track === "kick") tone(t, "sine", 150, 1.1 * v, 0.42, 42);
  else if (track === "snare") { burst(t, "highpass", 1400, 0.7 * v, 0.18); tone(t, "triangle", 190, 0.35 * v, 0.1, 120); }
  else if (track === "hat") burst(t, "highpass", 8000, 0.32 * v, i % 4 === 2 ? 0.09 : 0.045);
  else if (track === "clap") [0, 0.012, 0.026].forEach((d, k) => burst(t + d, "bandpass", 1600, (k === 2 ? 0.7 : 0.4) * v, k === 2 ? 0.16 : 0.03, 1.4));
  else if (track === "bass") tone(t, "sawtooth", hz(BASS[i]), 0.45 * v, 0.28, null, 1400);
  else if (track === "chord") CHORDS[Math.floor(i / 4) % 4].forEach(n => tone(t, "triangle", hz(n), 0.11 * v, 0.9, null, 3200));
}

function audition(track, i) {
  ensure();
  if (ctx.state === "suspended") ctx.resume();
  play(track, i, ctx.currentTime + 0.01);
}

let next = 0;
let current = 0;
let timer = 0;
const queue = [];

function schedule() {
  const sixteenth = 60 / bpm.peek() / 4;
  while (next < ctx.currentTime + 0.12) {
    const swingOffset = current % 2 === 1 ? sixteenth * (swing.peek() / 100) * 0.6 : 0;
    const at = next + swingOffset;
    const g = grid.peek();
    for (const t of TRACKS) if (g[t.id][current] && audible(t.id)) play(t.id, current, at);
    queue.push({ step: current, at });
    next += sixteenth;
    current = (current + 1) % STEPS;
  }
}

function start() {
  ensure();
  if (ctx.state === "suspended") ctx.resume();
  current = 0;
  next = ctx.currentTime + 0.06;
  queue.length = 0;
  timer = setInterval(schedule, 25);
  schedule();
  playing.value = true;
}

function stop() {
  clearInterval(timer);
  playing.value = false;
  step.value = -1;
}

const togglePlay = () => (playing.peek() ? stop() : start());

const pump = () => {
  if (ctx) while (queue.length && queue[0].at <= ctx.currentTime) step.value = queue.shift().step;
  requestAnimationFrame(pump);
};
requestAnimationFrame(pump);

function Visualizer() {
  const BANDS = 84;
  const ROWS = 10;
  const dots = [];
  const svg = h("svg", { class: "dw-viz", viewBox: `0 0 ${BANDS * 12} ${ROWS * 12}`, preserveAspectRatio: "xMidYMid meet", "aria-hidden": "true" },
    Array.from({ length: BANDS }, (_, c) => Array.from({ length: ROWS }, (_, r) => {
      const dot = h("circle", { cx: c * 12 + 6, cy: (ROWS - 1 - r) * 12 + 6, r: 3.6, style: { "--h": `${(c / BANDS) * 300 - 20}` } });
      dots.push({ dot, c, r });
      return dot;
    })));
  let frame = 0;
  const buf = new Uint8Array(64);
  let idle = 0;
  const loop = () => {
    if (ctx && analyser) analyser.getByteFrequencyData(buf);
    idle += 0.03;
    for (const { dot, c, r } of dots) {
      const v = ctx && playing.peek() ? buf[Math.min(63, Math.floor(c * 0.68) + 1)] / 255 : (Math.sin(idle + c * 0.2) * 0.5 + 0.5) * 0.18;
      dot.toggleAttribute("data-on", r < Math.round(v * ROWS * 1.15));
    }
    frame = requestAnimationFrame(loop);
  };
  frame = requestAnimationFrame(loop);
  onCleanup(() => cancelAnimationFrame(frame));
  return svg;
}

function Sequencer() {
  const cursor = signal({ t: 0, s: 0 });
  const refs = new Map();
  const keys = event => {
    let { t, s } = cursor.peek();
    if (event.key === "ArrowRight") s = (s + 1) % STEPS;
    else if (event.key === "ArrowLeft") s = (s + STEPS - 1) % STEPS;
    else if (event.key === "ArrowDown") t = Math.min(TRACKS.length - 1, t + 1);
    else if (event.key === "ArrowUp") t = Math.max(0, t - 1);
    else if (event.key === "Enter") { event.preventDefault(); toggle(TRACKS[t].id, s); return; }
    else return;
    event.preventDefault();
    cursor.value = { t, s };
    refs.get(`${t}:${s}`)?.focus();
  };
  const setLevel = (id, value) => { levels.value = { ...levels.peek(), [id]: value }; };
  const flip = (sig, id) => {
    const next = new Set(sig.peek());
    next.has(id) ? next.delete(id) : next.add(id);
    sig.value = next;
  };
  return h("div", { class: "dw-seq", role: "grid", aria: { label: "Step sequencer. Arrow keys move, Enter toggles a step, Space plays." }, onKeydown: keys },
    h("div", { class: "dw-ruler", "aria-hidden": "true" }, h("span"), Array.from({ length: STEPS }, (_, i) => h("span", { "data-beat": i % 4 === 0, "data-now": () => step.value === i }, i % 4 === 0 ? String(i / 4 + 1) : ""))),
    TRACKS.map((track, ti) => h("div", { class: "dw-row", role: "row", style: { "--c": track.color }, "data-silent": () => !audible(track.id) },
      h("div", { class: "dw-track", role: "rowheader" },
        h("span", { class: "dw-track-dot" }),
        h("b", track.label),
        h("span", { class: "dw-track-tools" },
          Tooltip({ label: "Mute" }, h("button", { type: "button", class: "dw-tool", "aria-pressed": () => mutes.value.has(track.id), aria: { label: `Mute ${track.label}` }, onClick: () => flip(mutes, track.id) }, "M")),
          Tooltip({ label: "Solo" }, h("button", { type: "button", class: "dw-tool", "data-solo": "", "aria-pressed": () => solos.value.has(track.id), aria: { label: `Solo ${track.label}` }, onClick: () => flip(solos, track.id) }, "S"))),
        h("span", { class: "dw-level", role: "group", aria: { label: `${track.label} level` } },
          [0.2, 0.4, 0.6, 0.8, 1].map(v => h("button", {
            type: "button", class: "dw-level-dot", "data-on": () => levels.value[track.id] >= v - 0.05,
            aria: { label: `${track.label} level ${Math.round(v * 100)}%` }, onClick: () => setLevel(track.id, v)
          })))),
      Array.from({ length: STEPS }, (_, si) => h("button", {
        type: "button",
        role: "gridcell",
        class: "dw-step",
        ref: el => refs.set(`${ti}:${si}`, el),
        tabindex: () => (cursor.value.t === ti && cursor.value.s === si ? 0 : -1),
        "data-beat": si % 4 === 0,
        "data-on": () => grid.value[track.id][si],
        "data-now": () => step.value === si,
        "aria-pressed": () => grid.value[track.id][si],
        aria: { label: `${track.label}, step ${si + 1}` },
        onFocus: () => { cursor.value = { t: ti, s: si }; },
        onClick: () => toggle(track.id, si)
      }, h("i"))))));
}

const screen = signal(stored("screen") ?? "studio");
const browser = signal(stored("browser") !== "closed" && !matchMedia("(max-width: 900px)").matches);
const saved = signal([]);
effect(() => { try { localStorage.setItem("lucid-beats:screen", screen.value); localStorage.setItem("lucid-beats:browser", browser.value ? "open" : "closed"); } catch {} });
const ICONS = { kick: "target", snare: "zap", hat: "sun", clap: "hexagon", bass: "layers", chord: "sliders" };

function Transport() {
  const nudge = d => { bpm.value = Math.max(60, Math.min(180, bpm.peek() + d)); };
  return h("header", { class: "dw-transport" },
    h("div", { class: "dw-brand" }, h("span", { class: "dw-mark", "aria-hidden": "true" }, h("i"), h("i"), h("i"), h("i")), h("b", "Dotwave")),
    h("span", { class: "dw-divider", "aria-hidden": "true" }),
    h("button", { type: "button", class: "dw-play", "data-playing": playing, aria: { label: () => (playing.value ? "Stop" : "Play") }, onClick: togglePlay },
      () => (playing.value ? h("span", { class: "dw-stop-glyph" }) : h("span", { class: "dw-play-glyph" }))),
    h("div", { class: "dw-lcd", "aria-live": "polite" },
      h("span", { class: "dw-lcd-step" }, () => (step.value < 0 ? "1.1" : `${Math.floor(step.value / 4) + 1}.${(step.value % 4) + 1}`)),
      h("span", { class: "dw-lcd-name" }, () => PRESETS[preset.value]?.name ?? "Untitled")),
    h("div", { class: "dw-field" },
      h("span", "Tempo"),
      h("div", { class: "dw-bpm" },
        h("button", { type: "button", aria: { label: "Slower" }, onClick: () => nudge(-2) }, "−"),
        h("b", () => bpm.value, h("small", "bpm")),
        h("button", { type: "button", aria: { label: "Faster" }, onClick: () => nudge(2) }, "+"))),
    h("label", { class: "dw-field dw-field-range" },
      h("span", () => `Swing ${swing.value}%`),
      h("input", { type: "range", min: 0, max: 50, value: () => swing.value, class: "dw-range", style: { "--p": () => `${swing.value * 2}%` }, onInput: e => { swing.value = Number(e.target.value); } })),
    h("label", { class: "dw-field dw-field-range" },
      h("span", () => `Volume ${Math.round(master.value * 100)}%`),
      h("input", { type: "range", min: 0, max: 100, value: () => Math.round(master.value * 100), class: "dw-range", style: { "--p": () => `${master.value * 100}%` }, onInput: e => { master.value = Number(e.target.value) / 100; } })),
    h("span", { class: "lucid-spacer" }),
    Segmented({ value: screen, size: "sm", aria: { label: "Screen" }, options: [{ value: "studio", label: "Studio", icon: "board" }, { value: "mixer", label: "Mixer", icon: "sliders" }, { value: "library", label: "Library", icon: "layers" }] }),
    Segmented({
      value: theme, size: "sm", iconOnly: true, aria: { label: "Theme" },
      options: [{ value: "light", label: "Light", icon: "sun" }, { value: "dark", label: "Dark", icon: "moon" }, { value: "system", label: "System", icon: "monitor" }]
    }));
}

function Browser() {
  const presets = computed(() => (saved.value, Object.keys(PRESETS).filter(k => k !== "empty")));
  return h("aside", { class: "dw-browser", "data-open": browser, aria: { label: "Browser" } },
    h("div", { class: "dw-browser-top" },
      h("span", { class: "dw-browser-title" }, "Browser"),
      Tooltip({ label: "Browser", kbd: "B" }, Button({ variant: "ghost", size: "sm", icon: "sidebar", class: "dw-browser-toggle", aria: { label: () => (browser.value ? "Collapse browser" : "Expand browser") }, onClick: () => { browser.value = !browser.peek(); } }))),
    h("div", { class: "dw-browser-section" },
      h("p", { class: "dw-browser-label" }, "Sounds"),
      TRACKS.map(t => Tooltip({ label: `Play ${t.label}` }, h("button", { type: "button", class: "dw-sound", style: { "--c": t.color }, aria: { label: `Audition ${t.label}` }, onClick: () => audition(t.id, 0) },
        h("span", { class: "dw-sound-icon" }, Icon({ name: ICONS[t.id], size: 14 })),
        h("span", { class: "dw-sound-name" }, t.label),
        h("span", { class: "dw-sound-play" }, "▶"))))),
    h("div", { class: "dw-browser-section dw-browser-patterns" },
      h("p", { class: "dw-browser-label" }, "Patterns"),
      () => presets.value.map(key => h("button", { type: "button", class: "dw-pattern", "aria-current": () => (preset.value === key ? "true" : undefined), onClick: () => load(key) },
        h("span", { class: "dw-pattern-dot" }), h("span", { class: "dw-sound-name" }, PRESETS[key].name)))),
    h("div", { class: "lucid-spacer" }),
    h("div", { class: "dw-tip" }, h("b", "Keys"), h("span", Kbd("space"), " play or stop"), h("span", Kbd("←"), Kbd("→"), " move"), h("span", Kbd("enter"), " toggle a step")),
    ExitCard({ compact: () => !browser.value }));
}

const lit = (id, n) => () => {
  const s = step.value;
  if (!playing.value || s < 0 || !grid.value[id][s] || !audible(id)) return 0;
  return Math.round(levels.value[id] * n);
};

function Strip(track) {
  const DOTS = 12;
  const setLevel = v => { levels.value = { ...levels.peek(), [track.id]: v }; };
  const flip = sig => { const next = new Set(sig.peek()); next.has(track.id) ? next.delete(track.id) : next.add(track.id); sig.value = next; };
  const meter = lit(track.id, DOTS);
  return h("div", { class: "dw-strip", style: { "--c": track.color }, "data-silent": () => !audible(track.id) },
    h("div", { class: "dw-strip-meter", "aria-hidden": "true" }, Array.from({ length: DOTS }, (_, i) => h("i", { "data-on": () => DOTS - i <= meter() }))),
    h("div", { class: "dw-strip-fader", role: "group", aria: { label: `${track.label} level` } }, Array.from({ length: 10 }, (_, i) => {
      const v = (10 - i) / 10;
      return h("button", { type: "button", class: "dw-fader-dot", "data-on": () => levels.value[track.id] >= v - 0.05, aria: { label: `${track.label} ${Math.round(v * 100)}%` }, onClick: () => setLevel(v) });
    })),
    h("b", { class: "dw-strip-value" }, () => `${Math.round(levels.value[track.id] * 100)}`),
    h("div", { class: "dw-strip-tools" },
      h("button", { type: "button", class: "dw-tool", "aria-pressed": () => mutes.value.has(track.id), aria: { label: `Mute ${track.label}` }, onClick: () => flip(mutes) }, "M"),
      h("button", { type: "button", class: "dw-tool", "data-solo": "", "aria-pressed": () => solos.value.has(track.id), aria: { label: `Solo ${track.label}` }, onClick: () => flip(solos) }, "S")),
    h("span", { class: "dw-strip-name" }, h("i"), track.label));
}

function Mixer() {
  const any = () => TRACKS.reduce((n, t) => Math.max(n, lit(t.id, 12)()), 0);
  return h("div", { class: "dw-screen" },
    h("header", { class: "dw-head" }, h("div", h("p", { class: "dw-kicker" }, "Mixer"), h("h1", "Balance the band")), h("span", { class: "lucid-spacer" }),
      Button({ variant: "ghost", icon: "x", onClick: () => { mutes.value = new Set(); solos.value = new Set(); } }, "Clear mutes and solos")),
    h("section", { class: "dw-mixer" },
      TRACKS.map(Strip),
      h("div", { class: "dw-strip dw-strip-master", style: { "--c": "#f3f0f8" } },
        h("div", { class: "dw-strip-meter", "aria-hidden": "true" }, Array.from({ length: 12 }, (_, i) => h("i", { "data-on": () => 12 - i <= Math.round(any() * master.value) }))),
        h("div", { class: "dw-strip-fader", role: "group", aria: { label: "Master level" } }, Array.from({ length: 10 }, (_, i) => {
          const v = (10 - i) / 10;
          return h("button", { type: "button", class: "dw-fader-dot", "data-on": () => master.value >= v - 0.05, aria: { label: `Master ${Math.round(v * 100)}%` }, onClick: () => { master.value = v; } });
        })),
        h("b", { class: "dw-strip-value" }, () => `${Math.round(master.value * 100)}`),
        h("div", { class: "dw-strip-tools" }),
        h("span", { class: "dw-strip-name" }, h("i"), "Master"))),
    h("p", { class: "dw-hint" }, "Press space to play. Each column lights up as its track hits, scaled by its level."));
}

function Library() {
  const keys = computed(() => (saved.value, Object.keys(PRESETS).filter(k => k !== "empty")));
  const save = () => {
    const key = `mine-${saved.peek().length + 1}`;
    PRESETS[key] = { name: `My pattern ${saved.peek().length + 1}`, bpm: bpm.peek(), swing: swing.peek(), grid: structuredClone(grid.peek()) };
    saved.value = [...saved.peek(), key];
    preset.value = key;
    toast("Pattern saved", { tone: "success", description: `${PRESETS[key].name} · ${bpm.peek()} bpm` });
  };
  return h("div", { class: "dw-screen" },
    h("header", { class: "dw-head" }, h("div", h("p", { class: "dw-kicker" }, "Library"), h("h1", "Patterns")), h("span", { class: "lucid-spacer" }),
      Button({ variant: "primary", icon: "plus", onClick: save }, "Save current pattern")),
    h("ul", { class: "dw-library" }, () => keys.value.map(key => {
      const p = PRESETS[key];
      return h("li", h("button", { type: "button", class: "dw-card", "aria-current": () => (preset.value === key ? "true" : undefined), onClick: () => { load(key); screen.value = "studio"; } },
        h("div", { class: "dw-card-grid", "aria-hidden": "true" }, TRACKS.map(t => p.grid[t.id].map(on => h("i", { style: { "--c": t.color }, "data-on": on })))),
        h("div", { class: "dw-card-copy" }, h("b", p.name), h("span", `${p.bpm} bpm · swing ${p.swing}%`)),
        h("span", { class: "dw-card-open" }, "Open in Studio", Icon({ name: "arrow-right", size: 13 }))));
    })));
}

function Studio() {
  const active = computed(() => TRACKS.reduce((n, t) => n + grid.value[t.id].filter(Boolean).length, 0));
  return h("div", { class: "dw-screen" },
    h("header", { class: "dw-head" },
      h("div",
        h("p", { class: "dw-kicker" }, () => (playing.value ? "Playing" : "Ready"), h("i", { "data-on": playing })),
        h("h1", () => PRESETS[preset.value].name)),
      h("span", { class: "lucid-spacer" }),
      h("span", { class: "dw-meta" }, () => `${active.value} steps · ${TRACKS.length} tracks · 1 bar`),
      Button({ variant: "ghost", icon: "trash", onClick: () => load("empty") }, "Clear")),
    h("section", { class: "dw-stage" }, Visualizer()),
    h("section", { class: "dw-panel" }, Sequencer()));
}

function App() {
  hotkey(" ", () => togglePlay());
  hotkey("b", () => { browser.value = !browser.peek(); });
  onCleanup(stop);
  return h("div", { class: "dw-app" },
    Transport(),
    h("div", { class: "dw-body", "data-browser": browser },
      Browser(),
      h("main", { class: "dw-main" },
        () => ({ studio: Studio, mixer: Mixer, library: Library }[screen.value] ?? Studio)(),
        h("footer", { class: "dw-foot" }, "Sound is synthesised live in your browser with the Web Audio API. No samples, no uploads. Dotwave is a Lucid UI demo."))));
}

mount(App, "#app");
