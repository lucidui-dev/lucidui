export const CLINICIANS = [
  { id: "rahman", name: "Dr. Amara Rahman", short: "Dr. Rahman", role: "Family medicine", color: "#2f9e8f", on: true },
  { id: "marsh", name: "Dr. Leo Marsh", short: "Dr. Marsh", role: "Paediatrics", color: "#7c6cf0", on: true },
  { id: "ruiz", name: "Sofia Ruiz, NP", short: "NP Ruiz", role: "Nurse practitioner", color: "#3b8fe0", on: true },
  { id: "ito", name: "Dr. Ken Ito", short: "Dr. Ito", role: "Cardiology", color: "#e9765b", on: false }
];
export const CLINICIAN = Object.fromEntries(CLINICIANS.map(c => [c.id, c]));

const trend = (base, swing, seed) => Array.from({ length: 10 }, (_, i) => Math.round(base + Math.sin(i * 1.3 + seed) * swing + (i / 9) * swing * 0.6));

export const PATIENTS = [
  { id: "p1", name: "Maya Thompson", age: 34, sex: "F", reason: "Persistent cough, 2 weeks", status: "waiting", arrived: "8:42", wait: 18, clinician: "rahman", priority: false, hr: 82, bp: "118/76", temp: 37.4, spo2: 97, allergies: ["Penicillin"], conditions: ["Asthma, mild intermittent"], meds: ["Salbutamol inhaler, as needed"], hrTrend: trend(78, 6, 1), bpTrend: trend(116, 5, 2), visits: [["12 Aug", "Annual check-up", "rahman"], ["3 Mar", "Asthma review", "ruiz"]] },
  { id: "p2", name: "Daniel Okoro", age: 61, sex: "M", reason: "Chest tightness on exertion", status: "waiting", arrived: "8:51", wait: 9, clinician: "rahman", priority: true, hr: 96, bp: "148/92", temp: 36.8, spo2: 95, allergies: [], conditions: ["Hypertension", "Type 2 diabetes"], meds: ["Amlodipine 5 mg daily", "Metformin 500 mg twice daily"], hrTrend: trend(88, 8, 3), bpTrend: trend(142, 7, 1), visits: [["20 Sep", "BP review", "rahman"], ["2 Jul", "Diabetes review", "ruiz"], ["11 Apr", "Cardiology referral", "ito"]] },
  { id: "p3", name: "Lily Chen", age: 7, sex: "F", reason: "Ear pain and fever", status: "in-room", arrived: "8:20", wait: 0, room: 2, clinician: "marsh", priority: false, hr: 108, bp: "98/62", temp: 38.3, spo2: 98, allergies: ["Peanuts"], conditions: [], meds: [], hrTrend: trend(102, 6, 4), bpTrend: trend(98, 3, 2), visits: [["14 Jun", "Vaccinations", "marsh"]] },
  { id: "p4", name: "Omar Haddad", age: 45, sex: "M", reason: "Lower back pain", status: "waiting", arrived: "8:58", wait: 4, clinician: "ruiz", priority: false, hr: 74, bp: "126/80", temp: 36.6, spo2: 99, allergies: ["Ibuprofen"], conditions: [], meds: [], hrTrend: trend(72, 4, 5), bpTrend: trend(124, 4, 3), visits: [["1 Feb", "Sports injury", "ruiz"]] },
  { id: "p5", name: "Grace Whitaker", age: 78, sex: "F", reason: "Medication review", status: "in-room", arrived: "8:05", wait: 0, room: 1, clinician: "rahman", priority: false, hr: 70, bp: "134/78", temp: 36.5, spo2: 96, allergies: ["Sulfa drugs"], conditions: ["Atrial fibrillation", "Osteoarthritis"], meds: ["Apixaban 5 mg twice daily", "Paracetamol 1 g as needed"], hrTrend: trend(72, 5, 2), bpTrend: trend(132, 4, 4), visits: [["5 Sep", "INR clinic", "ruiz"], ["18 Jun", "Falls assessment", "rahman"]] },
  { id: "p6", name: "Noah Becker", age: 3, sex: "M", reason: "Rash after new soap", status: "waiting", arrived: "9:02", wait: 1, clinician: "marsh", priority: false, hr: 112, bp: "92/58", temp: 36.9, spo2: 99, allergies: [], conditions: ["Eczema"], meds: ["Emollient cream"], hrTrend: trend(110, 5, 6), bpTrend: trend(92, 3, 1), visits: [["30 May", "Eczema review", "marsh"]] },
  { id: "p7", name: "Priya Nair", age: 29, sex: "F", reason: "Prenatal visit, 24 weeks", status: "done", arrived: "7:45", wait: 0, clinician: "ruiz", priority: false, hr: 84, bp: "112/70", temp: 36.7, spo2: 99, allergies: [], conditions: ["Pregnancy, 24 weeks"], meds: ["Folic acid", "Iron supplement"], hrTrend: trend(82, 4, 3), bpTrend: trend(112, 3, 5), visits: [["5 Sep", "Prenatal, 20 weeks", "ruiz"], ["8 Aug", "Prenatal, 16 weeks", "ruiz"]] },
  { id: "p8", name: "Samuel Reyes", age: 52, sex: "M", reason: "Follow-up, blood results", status: "arriving", arrived: "9:15", wait: 0, clinician: "rahman", priority: false, hr: 76, bp: "130/84", temp: 36.6, spo2: 98, allergies: [], conditions: ["High cholesterol"], meds: ["Atorvastatin 20 mg nightly"], hrTrend: trend(76, 3, 1), bpTrend: trend(130, 3, 2), visits: [["22 Sep", "Bloods taken", "ruiz"]] }
];

export const ROOMS = [1, 2, 3, 4, 5, 6];

export const LABS = [
  { name: "HbA1c", value: 6.9, unit: "%", low: 4, high: 6.5, max: 10 },
  { name: "LDL cholesterol", value: 2.8, unit: "mmol/L", low: 0, high: 3, max: 6 },
  { name: "eGFR", value: 74, unit: "mL/min", low: 60, high: 120, max: 120 },
  { name: "Haemoglobin", value: 138, unit: "g/L", low: 130, high: 175, max: 200 },
  { name: "Potassium", value: 4.6, unit: "mmol/L", low: 3.5, high: 5.1, max: 7 }
];

export const APPOINTMENTS = [
  { who: "rahman", start: 8, len: 0.5, patient: "Grace Whitaker", type: "Review" },
  { who: "rahman", start: 9, len: 0.5, patient: "Maya Thompson", type: "Acute" },
  { who: "rahman", start: 9.5, len: 0.5, patient: "Daniel Okoro", type: "Acute" },
  { who: "rahman", start: 10.25, len: 0.25, patient: "Samuel Reyes", type: "Results" },
  { who: "rahman", start: 11, len: 1, patient: "Team huddle", type: "Admin" },
  { who: "rahman", start: 13, len: 0.5, patient: "Ana Silva", type: "Review" },
  { who: "rahman", start: 14, len: 0.75, patient: "Tom Harper", type: "Procedure" },
  { who: "marsh", start: 8.25, len: 0.5, patient: "Lily Chen", type: "Acute" },
  { who: "marsh", start: 9, len: 0.5, patient: "Noah Becker", type: "Acute" },
  { who: "marsh", start: 10, len: 1, patient: "Vaccination clinic", type: "Clinic" },
  { who: "marsh", start: 13.5, len: 0.5, patient: "Zoe Martin", type: "Review" },
  { who: "marsh", start: 15, len: 0.5, patient: "Eli Novak", type: "Review" },
  { who: "ruiz", start: 7.75, len: 0.5, patient: "Priya Nair", type: "Prenatal" },
  { who: "ruiz", start: 9, len: 0.5, patient: "Omar Haddad", type: "Acute" },
  { who: "ruiz", start: 10, len: 0.5, patient: "Bloods round", type: "Clinic" },
  { who: "ruiz", start: 12, len: 1, patient: "Lunch", type: "Break" },
  { who: "ruiz", start: 14, len: 0.5, patient: "Leah Park", type: "Prenatal" },
  { who: "ruiz", start: 15.5, len: 0.5, patient: "Ben Ross", type: "Review" }
];

export const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, d) => ({ day, slots: Array.from({ length: 9 }, (_, h) => Math.max(0, Math.min(4, Math.round(2 + Math.sin(d * 1.7 + h * 0.9) * 1.6 + (h < 3 ? 1 : 0))))) }));
