import { signal, computed, effect, h, mount } from "/lucid/index.js";
import { Button, Tooltip, Icon, Textarea, toast, hotkey } from "/lucid/ui/index.js";
import { DotSparkline, DotMeter, DotColumns } from "/lucid/viz/index.js";
import { ExitCard } from "/exit.js";
import { CLINICIANS, CLINICIAN, PATIENTS, ROOMS, LABS, APPOINTMENTS, WEEK } from "./data.js";

const stored = key => { try { return localStorage.getItem(`lucid-clinic:${key}`); } catch { return null; } };
const theme = signal(stored("theme") ?? "light");
effect(() => {
  try { localStorage.setItem("lucid-clinic:theme", theme.value); } catch {}
  if (theme.value === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme.value;
});

const screen = signal("today");
const sideOpen = signal(stored("side") !== "closed");
const rightOpen = signal(stored("right") !== "closed");
effect(() => { try { localStorage.setItem("lucid-clinic:side", sideOpen.value ? "open" : "closed"); localStorage.setItem("lucid-clinic:right", rightOpen.value ? "open" : "closed"); } catch {} });
const tab = signal({ today: "overview", schedule: "day", patients: "overview", messages: "conversation" });
const patients = signal(PATIENTS.map(p => ({ ...p })));
const selected = signal("p2");
const appt = signal(1);
const hidden = signal(new Set());
const query = signal("");
const NOW = 9 + 10 / 60;

const patient = computed(() => patients.value.find(p => p.id === selected.value));
const initials = name => name.split(" ").map(w => w[0]).slice(0, 2).join("");
const freeRooms = computed(() => ROOMS.filter(r => !patients.value.some(p => p.status === "in-room" && p.room === r)));
const waiting = computed(() => patients.value.filter(p => p.status === "waiting"));
const ORDER = { waiting: 0, arriving: 1, "in-room": 2, done: 3 };
const queue = computed(() => [...patients.value].sort((a, b) => ORDER[a.status] - ORDER[b.status] || Number(b.priority) - Number(a.priority) || b.wait - a.wait));

function update(id, change) {
  patients.value = patients.peek().map(p => (p.id === id ? { ...p, ...change } : p));
}

function callToRoom(p) {
  const room = freeRooms.peek()[0];
  if (!room) { toast("No rooms free", { icon: "info", description: "Finish a consultation to free a room." }); return; }
  update(p.id, { status: "in-room", room, wait: 0 });
  toast(`${p.name} called to Room ${room}`, { tone: "success", description: `${CLINICIAN[p.clinician].short} has been notified.` });
}

function finish(p) {
  update(p.id, { status: "done", room: undefined });
  toast(`${p.name} checked out`, { tone: "success", description: "Room is being cleaned and will be ready in 5 minutes." });
}

const STATUS = { waiting: "Waiting", arriving: "Arriving", "in-room": "In room", done: "Done" };

function Avatar(p, size = 34) {
  return h("span", { class: "cl-avatar", style: { "--c": CLINICIAN[p.clinician].color, width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.36)}px` } }, initials(p.name));
}

function Rail() {
  const item = (id, icon, label) => Tooltip({ label, placement: "right" }, h("button", {
    type: "button", class: "cl-rail-btn", "aria-current": () => (screen.value === id ? "page" : undefined), aria: { label },
    onClick: () => { if (id) screen.value = id; else toast(`${label} isn't part of this demo`, { icon: "info" }); }
  }, Icon({ name: icon, size: 19 })));
  const cycle = () => { theme.value = { light: "dark", dark: "system", system: "light" }[theme.peek()]; };
  return h("nav", { class: "cl-rail", aria: { label: "Main" } },
    h("div", { class: "cl-logo", "aria-hidden": "true" }, h("i"), h("i"), h("i")),
    item("today", "hexagon", "Today"),
    item("schedule", "calendar", "Schedule"),
    item("patients", "users", "Patients"),
    item("messages", "message", "Messages"),
    item(null, "sliders", "Settings"),
    h("span", { class: "lucid-spacer" }),
    ExitCard({ compact: true }),
    Tooltip({ label: () => `Theme: ${theme.value}`, placement: "right" }, h("button", { type: "button", class: "cl-rail-btn", aria: { label: "Change theme" }, onClick: cycle },
      () => Icon({ name: theme.value === "dark" ? "moon" : theme.value === "light" ? "sun" : "monitor", size: 18 }))),
    Tooltip({ label: "Dr. Amara Rahman", placement: "right" }, h("span", { class: "cl-me", tabindex: 0, aria: { label: "Signed in as Dr. Amara Rahman" } }, "AR")));
}

function PanelToggle(sig, label, key, side) {
  return Tooltip({ label, kbd: [key] }, h("button", {
    type: "button", class: "cl-panel-toggle", "data-side": side, "aria-pressed": () => String(sig.value), aria: { label },
    onClick: () => { sig.value = !sig.peek(); }
  }, Icon({ name: "sidebar", size: 16 })));
}

function Tabs(items) {
  const key = screen.peek();
  return h("div", { class: "cl-tabbar" },
    PanelToggle(sideOpen, "List panel", "[", "left"),
    h("div", { class: "cl-tabs", role: "tablist" }, items.map(([id, label, count]) => h("button", {
      type: "button", role: "tab", class: "cl-tab", "aria-selected": () => tab.value[key] === id,
      onClick: () => { tab.value = { ...tab.peek(), [key]: id }; }
    }, label, count != null ? h("span", { class: "cl-tab-count" }, count) : null))),
    PanelToggle(rightOpen, "Details panel", "]", "right"));
}

function QueueSidebar() {
  return h("aside", { class: "cl-side" },
    h("div", { class: "cl-side-head" }, h("b", "Today's queue"), h("span", { class: "cl-pill" }, () => `${waiting.value.length} waiting`)),
    h("ul", { class: "cl-list" }, () => queue.value.map(p => h("li",
      h("button", { type: "button", class: "cl-row", "data-status": p.status, "aria-current": () => (selected.value === p.id ? "true" : undefined), onClick: () => { selected.value = p.id; } },
        Avatar(p),
        h("span", { class: "cl-row-copy" }, h("b", p.name, p.priority ? h("i", { class: "cl-flag" }, "Priority") : null), h("span", p.reason)),
        h("span", { class: "cl-row-meta" },
          p.status === "waiting" ? h("b", { "data-long": p.wait > 15 }, `${p.wait}m`) : p.status === "in-room" ? h("b", `Rm ${p.room}`) : h("span", STATUS[p.status])))))));
}

function TodayMain() {
  const flow = [["8", 4], ["9", 6], ["10", 5], ["11", 3], ["12", 2], ["13", 4], ["14", 5], ["15", 4], ["16", 3]].map(([label, value]) => ({ label: `${label}:00`, value }));
  return h("div", { class: "cl-main-inner" },
    Tabs([["overview", "Overview"], ["rooms", "Rooms", () => `${6 - freeRooms.value.length}/6`]]),
    () => tab.value.today === "rooms" ? Rooms() : h("div", { class: "cl-scroll" },
      h("header", { class: "cl-hello" }, h("h1", "Good morning, Dr. Rahman"), h("p", "Friday 3 October · 22 booked today · 3 clinicians on shift")),
      h("div", { class: "cl-cards" },
        h("section", { class: "cl-card cl-stat" },
          h("span", "Waiting now"), h("b", () => waiting.value.length),
          () => DotMeter({ value: waiting.value.length, max: 10, dots: 10, color: "var(--cl-accent)", label: "Waiting room capacity" }),
          h("small", "of 10 seats")),
        h("section", { class: "cl-card cl-stat" },
          h("span", "Average wait"), h("b", () => Math.round(waiting.value.reduce((n, p) => n + p.wait, 0) / Math.max(1, waiting.value.length)), h("small", " min")),
          DotSparkline({ data: [12, 9, 14, 11, 8, 10, 13, 9], height: 26, color: "var(--cl-accent)", label: "Average wait this morning" }),
          h("small", "Target under 15 min")),
        h("section", { class: "cl-card cl-stat" },
          h("span", "Rooms free"), h("b", () => freeRooms.value.length),
          h("div", { class: "cl-room-dots" }, () => ROOMS.map(r => h("i", { "data-free": freeRooms.value.includes(r) }))),
          h("small", "of 6 exam rooms"))),
      h("section", { class: "cl-block" },
        h("div", { class: "cl-block-head" }, h("h2", "Patient flow"), h("span", "Arrivals by hour")),
        DotColumns({ data: flow, height: 150, unit: "patients", color: "var(--cl-accent)", label: "Arrivals by hour" })),
      h("p", { class: "cl-text" }, "Morning clinics are running about four minutes behind. Paediatrics has capacity after 11:00, and the bloods round finishes at 10:30."),
      () => {
        const urgent = patients.value.find(p => p.priority && p.status === "waiting");
        return urgent ? h("section", { class: "cl-card cl-alert" },
          Avatar(urgent, 44),
          h("div", { class: "cl-alert-copy" }, h("b", `${urgent.name} should be seen next`), h("span", `${urgent.reason} · BP ${urgent.bp} · HR ${urgent.hr}`)),
          Button({ variant: "primary", icon: "arrow-right", onClick: () => callToRoom(urgent) }, "Call to room"))
          : h("section", { class: "cl-card cl-alert cl-alert-ok" }, Icon({ name: "check-circle", size: 20 }), h("div", { class: "cl-alert-copy" }, h("b", "No priority patients waiting"), h("span", "The queue is in triage order.")));
      }));
}

function Rooms() {
  return h("div", { class: "cl-scroll" },
    h("header", { class: "cl-hello" }, h("h1", "Exam rooms"), h("p", "Live status. Rooms are cleaned between every patient.")),
    h("div", { class: "cl-rooms" }, () => ROOMS.map(r => {
      const p = patients.value.find(x => x.status === "in-room" && x.room === r);
      return h("section", { class: "cl-card cl-room", "data-busy": Boolean(p) },
        h("div", { class: "cl-room-top" }, h("b", `Room ${r}`), h("span", { class: "cl-room-state" }, p ? "In use" : "Ready")),
        p ? [
          h("div", { class: "cl-room-who" }, Avatar(p, 30), h("div", h("b", p.name), h("span", CLINICIAN[p.clinician].short))),
          h("div", { class: "cl-room-actions" },
            Button({ size: "sm", onClick: () => { selected.value = p.id; } }, "Details"),
            Button({ size: "sm", variant: "primary", onClick: () => finish(p) }, "Finish"))
        ] : h("p", { class: "cl-muted" }, "Free for the next patient"));
    })));
}

function PatientPanel() {
  return h("aside", { class: "cl-right" }, () => {
    const p = patient.value;
    if (!p) return null;
    const vital = (label, value, unit, alert) => h("div", { class: "cl-vital", "data-alert": alert }, h("span", label), h("b", value, h("small", unit)));
    return h("div", { class: "cl-right-inner" },
      h("div", { class: "cl-right-head" },
        Avatar(p, 52),
        h("div", h("b", p.name), h("span", `${p.age} · ${p.sex === "F" ? "Female" : "Male"} · ${STATUS[p.status]}`))),
      h("p", { class: "cl-reason" }, p.reason),
      h("section", { class: "cl-card cl-vitals" },
        h("div", { class: "cl-right-label" }, "Triage vitals"),
        h("div", { class: "cl-vital-grid" },
          vital("Heart rate", p.hr, " bpm", p.hr > 100),
          vital("Blood pressure", p.bp, "", Number(p.bp.split("/")[0]) > 140),
          vital("Temperature", p.temp.toFixed(1), " °C", p.temp >= 38),
          vital("SpO₂", p.spo2, " %", p.spo2 < 95))),
      h("div", { class: "cl-right-label" }, "Allergies"),
      h("div", { class: "cl-chips" }, p.allergies.length ? p.allergies.map(a => h("span", { class: "cl-chip cl-chip-warn" }, Icon({ name: "alert-circle", size: 12 }), a)) : h("span", { class: "cl-chip" }, "None known")),
      h("div", { class: "cl-right-label" }, "Seeing"),
      h("div", { class: "cl-with", style: { "--c": CLINICIAN[p.clinician].color } }, h("i"), CLINICIAN[p.clinician].name, h("span", CLINICIAN[p.clinician].role)),
      h("div", { class: "cl-actions" },
        p.status === "waiting" || p.status === "arriving" ? Button({ variant: "primary", icon: "arrow-right", onClick: () => callToRoom(p) }, "Call to room") : null,
        p.status === "in-room" ? Button({ variant: "primary", icon: "check", onClick: () => finish(p) }, "Finish visit") : null,
        Button({ icon: "users", onClick: () => { screen.value = "patients"; } }, "Open chart")),
      h("div", { class: "cl-right-label" }, "On shift"),
      h("ul", { class: "cl-shift" }, CLINICIANS.map(c => h("li", { "data-off": !c.on }, h("i", { style: { "--c": c.color } }), h("span", c.name), h("small", c.on ? "On shift" : "Off today")))));
  });
}

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16];

function ScheduleSidebar() {
  return h("aside", { class: "cl-side" },
    h("div", { class: "cl-side-head" }, h("b", "Clinicians"), h("span", { class: "cl-pill" }, "Fri 3 Oct")),
    h("ul", { class: "cl-list" }, CLINICIANS.map(c => h("li",
      h("button", { type: "button", class: "cl-row", disabled: !c.on, "data-off": !c.on, "aria-pressed": () => c.on && !hidden.value.has(c.id), onClick: () => {
        const next = new Set(hidden.peek());
        next.has(c.id) ? next.delete(c.id) : next.add(c.id);
        hidden.value = next;
      } },
        h("span", { class: "cl-avatar", style: { "--c": c.color } }, initials(c.name.replace("Dr. ", "").replace(", NP", ""))),
        h("span", { class: "cl-row-copy" }, h("b", c.name), h("span", c.role)),
        c.on ? h("span", { class: "cl-check", "data-on": () => !hidden.value.has(c.id) }, Icon({ name: "check", size: 12 })) : h("span", { class: "cl-off" }, "Off today"))))),
    h("div", { class: "cl-side-note" }, "Toggle clinicians to compare their days."));
}

function ScheduleMain() {
  const columns = computed(() => CLINICIANS.filter(c => c.on && !hidden.value.has(c.id)));
  const top = t => `${((t - 7.5) / 9) * 100}%`;
  return h("div", { class: "cl-main-inner" },
    Tabs([["day", "Day"], ["week", "Week"]]),
    () => tab.value.schedule === "week" ? h("div", { class: "cl-scroll" },
      h("header", { class: "cl-hello" }, h("h1", "This week"), h("p", "Booked appointments per hour. Bigger dots, busier hours.")),
      h("section", { class: "cl-card cl-week" },
        h("div", { class: "cl-week-grid" },
          h("span"), HOURS.map(hr => h("span", { class: "cl-week-h" }, `${hr}`)),
          WEEK.flatMap(d => [h("span", { class: "cl-week-d" }, d.day), ...d.slots.map(v => h("span", { class: "cl-week-cell" }, h("i", { style: { "--v": v } })))]))))
      : h("div", { class: "cl-day" },
          h("div", { class: "cl-day-head", style: { "--cols": () => columns.value.length } }, h("span"), () => columns.value.map(c => h("span", { style: { "--c": c.color } }, h("i"), c.short))),
          h("div", { class: "cl-day-body", style: { "--cols": () => columns.value.length } },
            h("div", { class: "cl-hours" }, HOURS.map(hr => h("span", { style: { top: top(hr) } }, `${hr}:00`))),
            () => columns.value.map(c => h("div", { class: "cl-col" },
              HOURS.map(hr => h("i", { class: "cl-gridline", style: { top: top(hr) } })),
              APPOINTMENTS.map((a, i) => (a.who !== c.id ? null : h("button", {
                type: "button", class: "cl-appt", "data-type": a.type, "aria-pressed": () => appt.value === i,
                style: { top: top(a.start), height: `calc(${(a.len / 9) * 100}% - 4px)`, "--c": c.color },
                onClick: () => { appt.value = i; }
              }, h("b", a.patient), a.len >= 0.5 ? h("span", `${fmt(a.start)} · ${a.type}`) : null))))),
            h("div", { class: "cl-now", style: { top: top(NOW) } }, h("span", "9:10")))));
}

const fmt = t => `${Math.floor(t)}:${String(Math.round((t % 1) * 60)).padStart(2, "0")}`;

function ScheduleRight() {
  return h("aside", { class: "cl-right" }, h("div", { class: "cl-right-inner" },
    () => {
      const a = APPOINTMENTS[appt.value];
      const c = CLINICIAN[a.who];
      return h("section", { class: "cl-card cl-appt-card", style: { "--c": c.color } },
        h("div", { class: "cl-right-label" }, "Appointment"),
        h("b", { class: "cl-appt-title" }, a.patient),
        h("p", { class: "cl-muted" }, `${fmt(a.start)}–${fmt(a.start + a.len)} · ${a.type}`),
        h("div", { class: "cl-with" }, h("i"), c.name, h("span", c.role)),
        h("div", { class: "cl-actions" },
          Button({ size: "sm", onClick: () => toast("Reminder sent", { tone: "success", description: `Text reminder sent to ${a.patient}.` }) }, "Send reminder"),
          Button({ size: "sm", variant: "ghost", onClick: () => toast("Rescheduling isn't part of this demo", { icon: "info" }) }, "Reschedule")));
    },
    h("div", { class: "cl-right-label" }, "Utilisation today"),
    h("ul", { class: "cl-util" }, CLINICIANS.filter(c => c.on).map(c => {
      const booked = APPOINTMENTS.filter(a => a.who === c.id).reduce((n, a) => n + a.len, 0);
      return h("li", h("span", c.short), DotMeter({ value: Math.round((booked / 8) * 100), max: 100, dots: 12, color: c.color, label: `${c.short} booked` }), h("b", `${Math.round((booked / 8) * 100)}%`));
    })),
    h("div", { class: "cl-right-label" }, "Open slots"),
    h("ul", { class: "cl-slots" }, [["10:30", "Dr. Marsh"], ["11:15", "NP Ruiz"], ["13:30", "Dr. Rahman"], ["15:00", "Dr. Rahman"]].map(([t, who]) => h("li",
      h("b", t), h("span", who), Button({ size: "xs", onClick: () => toast(`Held ${t} with ${who}`, { tone: "success", description: "The slot is held for 10 minutes." }) }, "Hold"))))));
}

function PatientsSidebar() {
  const list = computed(() => patients.value.filter(p => !query.value || p.name.toLowerCase().includes(query.value.toLowerCase())));
  return h("aside", { class: "cl-side" },
    h("label", { class: "cl-search" }, Icon({ name: "search", size: 15 }), h("input", { type: "search", placeholder: "Search patients", value: () => query.value, onInput: e => { query.value = e.target.value; }, aria: { label: "Search patients" } })),
    h("ul", { class: "cl-list" }, () => list.value.map(p => h("li",
      h("button", { type: "button", class: "cl-row", "aria-current": () => (selected.value === p.id ? "true" : undefined), onClick: () => { selected.value = p.id; } },
        Avatar(p),
        h("span", { class: "cl-row-copy" }, h("b", p.name), h("span", `${p.age} · ${p.conditions[0] ?? "No conditions"}`)))))));
}

function PatientsMain() {
  return h("div", { class: "cl-main-inner" },
    Tabs([["overview", "Overview"], ["visits", "Visits"], ["labs", "Labs"]]),
    () => {
      const p = patient.value;
      const t = tab.value.patients;
      const head = h("section", { class: "cl-card cl-chart-head" },
        Avatar(p, 56),
        h("div", h("h1", p.name), h("p", `${p.age} years · ${p.sex === "F" ? "Female" : "Male"} · MRN 00${4120 + PATIENTS.findIndex(x => x.id === p.id) * 37}`)),
        h("span", { class: "lucid-spacer" }),
        h("span", { class: "cl-pill" }, STATUS[p.status]));
      if (t === "visits") return h("div", { class: "cl-scroll" }, head,
        h("ol", { class: "cl-timeline" }, [["Today", p.reason, p.clinician], ...p.visits].map(([date, what, who], i) => h("li", { style: { "--c": CLINICIAN[who].color } },
          h("i"), h("div", h("b", what), h("span", `${date} · ${CLINICIAN[who].name}`)), i === 0 ? h("span", { class: "cl-pill" }, "Current") : null))));
      if (t === "labs") return h("div", { class: "cl-scroll" }, head,
        h("section", { class: "cl-card" },
          h("div", { class: "cl-block-head" }, h("h2", "Latest results"), h("span", "22 September · normal range shaded")),
          h("ul", { class: "cl-labs" }, LABS.map(l => {
            const out = l.value < l.low || l.value > l.high;
            return h("li", { "data-out": out },
              h("span", { class: "cl-lab-name" }, l.name),
              h("span", { class: "cl-lab-track" },
                h("i", { class: "cl-lab-range", style: { left: `${(l.low / l.max) * 100}%`, width: `${((l.high - l.low) / l.max) * 100}%` } }),
                h("i", { class: "cl-lab-dot", style: { left: `${(l.value / l.max) * 100}%` } })),
              h("b", `${l.value} `, h("small", l.unit)));
          }))));
      return h("div", { class: "cl-scroll" }, head,
        h("div", { class: "cl-cards cl-cards-2" },
          h("section", { class: "cl-card cl-stat" }, h("span", "Heart rate, last 10 visits"), h("b", p.hr, h("small", " bpm")), DotSparkline({ data: p.hrTrend, height: 34, color: "#e9765b", label: "Heart rate trend" })),
          h("section", { class: "cl-card cl-stat" }, h("span", "Systolic pressure, last 10 visits"), h("b", p.bp.split("/")[0], h("small", " mmHg")), DotSparkline({ data: p.bpTrend, height: 34, color: "var(--cl-accent)", label: "Blood pressure trend" }))),
        h("div", { class: "cl-cards cl-cards-2" },
          h("section", { class: "cl-card" }, h("div", { class: "cl-right-label" }, "Conditions"), h("ul", { class: "cl-plain" }, p.conditions.length ? p.conditions.map(c => h("li", c)) : h("li", { class: "cl-muted" }, "None recorded"))),
          h("section", { class: "cl-card" }, h("div", { class: "cl-right-label" }, "Medications"), h("ul", { class: "cl-plain" }, p.meds.length ? p.meds.map(m => h("li", m)) : h("li", { class: "cl-muted" }, "None")))),
        h("section", { class: "cl-card cl-note" },
          h("div", { class: "cl-right-label" }, "Today's note"),
          h("p", `${p.reason}. Seen by ${CLINICIAN[p.clinician].short}. Vitals recorded at triage. Plan to be confirmed after examination.`),
          Button({ size: "sm", icon: "pen", onClick: () => toast("Note saved", { tone: "success" }) }, "Add to note")));
    });
}

function PatientsRight() {
  return h("aside", { class: "cl-right" }, () => {
    const p = patient.value;
    return h("div", { class: "cl-right-inner" },
      h("div", { class: "cl-right-label" }, "Care team"),
      h("ul", { class: "cl-shift" }, [...new Set([p.clinician, ...p.visits.map(v => v[2])])].map(id => h("li", h("i", { style: { "--c": CLINICIAN[id].color } }), h("span", CLINICIAN[id].name), h("small", CLINICIAN[id].role)))),
      h("div", { class: "cl-right-label" }, "Allergies"),
      h("div", { class: "cl-chips" }, p.allergies.length ? p.allergies.map(a => h("span", { class: "cl-chip cl-chip-warn" }, Icon({ name: "alert-circle", size: 12 }), a)) : h("span", { class: "cl-chip" }, "None known")),
      h("section", { class: "cl-card cl-next" }, h("div", { class: "cl-right-label" }, "Next appointment"), h("b", "Tue 14 Oct, 10:30"), h("span", `${CLINICIAN[p.clinician].short} · Follow-up`)),
      h("div", { class: "cl-right-label" }, "Documents"),
      h("ul", { class: "cl-docs" }, [["Referral letter", "PDF · 2 pages"], ["Blood results", "22 Sep"], ["Consent form", "Signed"]].map(([n, m]) => h("li", Icon({ name: "copy", size: 14 }), h("span", n), h("small", m)))));
  });
}

const THREADS = signal([
  { id: "t1", patient: "p1", unread: true, messages: [
    { from: "patient", at: "7:58", text: "Hi, the cough is keeping me up at night now. Should I still come in at 9 or is there anything I can take before?" },
    { from: "clinic", at: "8:06", text: "Please still come in at 9, Maya. Honey in warm water can ease it tonight. We'll check your chest when you're here." },
    { from: "patient", at: "8:40", text: "Thank you. I'm in the waiting room now." }] },
  { id: "t2", patient: "p8", unread: true, messages: [
    { from: "patient", at: "8:55", text: "Running about ten minutes late, sorry! Traffic on the bridge." }] },
  { id: "t3", patient: "p5", unread: false, messages: [
    { from: "clinic", at: "Yesterday", text: "Reminder: please bring all your current medications to tomorrow's review, including anything over the counter." },
    { from: "patient", at: "Yesterday", text: "Will do. My daughter is bringing me." }] },
  { id: "t4", patient: "p3", unread: false, messages: [
    { from: "patient", at: "Wed", text: "Lily's fever came back last night, 38.6. Can we see Dr. Marsh?" },
    { from: "clinic", at: "Wed", text: "We've booked Lily with Dr. Marsh on Friday at 8:30. If the fever goes above 39.5 before then, call us." }] }
]);
const thread = signal("t1");
const current = computed(() => THREADS.value.find(t => t.id === thread.value));
const P = id => patients.value.find(p => p.id === id);

function MessagesSidebar() {
  return h("aside", { class: "cl-side" },
    h("div", { class: "cl-side-head" }, h("b", "Messages"), h("span", { class: "cl-pill" }, () => `${THREADS.value.filter(t => t.unread).length} new`)),
    h("ul", { class: "cl-list" }, () => THREADS.value.map(t => {
      const p = P(t.patient);
      const last = t.messages[t.messages.length - 1];
      return h("li", h("button", { type: "button", class: "cl-row cl-thread", "data-unread": t.unread, "aria-current": () => (thread.value === t.id ? "true" : undefined),
        onClick: () => { thread.value = t.id; selected.value = t.patient; THREADS.value = THREADS.peek().map(x => (x.id === t.id ? { ...x, unread: false } : x)); } },
        Avatar(p),
        h("span", { class: "cl-row-copy" }, h("b", p.name), h("span", last.text)),
        h("span", { class: "cl-row-meta" }, h("span", last.at), t.unread ? h("i", { class: "cl-unread" }) : null)));
    })));
}

function MessagesMain() {
  const draft = signal("");
  const send = () => {
    const text = draft.peek().trim();
    if (!text) return;
    THREADS.value = THREADS.peek().map(t => (t.id === thread.peek() ? { ...t, messages: [...t.messages, { from: "clinic", at: "Now", text }] } : t));
    draft.value = "";
    toast("Message sent", { tone: "success", description: `To ${P(current.peek().patient).name}` });
  };
  const quick = ["Please come straight to reception.", "Your results are back and look normal.", "We're running about 10 minutes behind."];
  return h("div", { class: "cl-main-inner" },
    Tabs([["conversation", "Conversation"]]),
    () => {
      const t = current.value;
      const p = P(t.patient);
      return h("div", { class: "cl-thread-view" },
        h("header", { class: "cl-thread-head" }, Avatar(p, 40), h("div", h("b", p.name), h("span", `${p.reason} · ${STATUS[p.status]}`))),
        h("ol", { class: "cl-messages" }, t.messages.map(m => h("li", { class: "cl-msg", "data-from": m.from }, h("p", m.text), h("small", m.from === "clinic" ? `Juniper Clinic · ${m.at}` : m.at)))),
        h("div", { class: "cl-quick" }, quick.map(q => h("button", { type: "button", class: "cl-chip cl-quick-chip", onClick: () => { draft.value = q; } }, q))),
        h("form", { class: "cl-compose", onSubmit: e => { e.preventDefault(); send(); } },
          Textarea({ bind: draft, rows: 2, placeholder: `Reply to ${p.name.split(" ")[0]}`, aria: { label: "Reply" }, onKeydown: e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } } }),
          Button({ variant: "primary", icon: "arrow-right", type: "submit" }, "Send")));
    });
}

const VIEWS = {
  today: { side: QueueSidebar, main: TodayMain, right: PatientPanel },
  schedule: { side: ScheduleSidebar, main: ScheduleMain, right: ScheduleRight },
  patients: { side: PatientsSidebar, main: PatientsMain, right: PatientsRight },
  messages: { side: MessagesSidebar, main: MessagesMain, right: PatientPanel }
};

function App() {
  hotkey("1", () => { screen.value = "today"; });
  hotkey("2", () => { screen.value = "schedule"; });
  hotkey("3", () => { screen.value = "patients"; });
  hotkey("4", () => { screen.value = "messages"; });
  effect(() => { if (screen.value === "messages") selected.value = current.value.patient; });
  hotkey("[", () => { sideOpen.value = !sideOpen.peek(); });
  hotkey("]", () => { rightOpen.value = !rightOpen.peek(); });
  return h("div", { class: "cl-app", "data-side": sideOpen, "data-right": rightOpen },
    Rail(),
    () => VIEWS[screen.value].side(),
    h("main", { class: "cl-main", "data-screen": screen }, () => VIEWS[screen.value].main()),
    () => VIEWS[screen.value].right(),
    h("footer", { class: "cl-bar" },
      h("span", { class: "cl-bar-ok" }, h("i"), "All systems normal"),
      h("span", "Synced just now"),
      h("span", () => `${waiting.value.length} waiting · ${6 - freeRooms.value.length} of 6 rooms in use`),
      h("span", { class: "lucid-spacer" }),
      h("span", "Juniper Clinic is fictional. Patients and data are invented for a Lucid UI demo."),
      h("span", "1 to 4 switch screens · [ ] panels")));
}

mount(App, "#app");
