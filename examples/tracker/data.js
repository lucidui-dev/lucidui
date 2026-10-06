const DAY = 86400000;

function random(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const STATUSES = [
  { id: "backlog", label: "Backlog", color: "var(--lucid-ink-3)", hollow: true },
  { id: "todo", label: "Todo", color: "var(--lucid-ink-3)" },
  { id: "in_progress", label: "In progress", color: "var(--lucid-series-4)" },
  { id: "in_review", label: "In review", color: "var(--lucid-series-3)" },
  { id: "done", label: "Done", color: "var(--lucid-series-1)" },
  { id: "canceled", label: "Canceled", color: "var(--lucid-ink-4)" }
];

export const PRIORITIES = [
  { id: 1, label: "Urgent" },
  { id: 2, label: "High" },
  { id: 3, label: "Medium" },
  { id: 4, label: "Low" },
  { id: 0, label: "No priority" }
];

export const LABELS = [
  { id: "bug", label: "Bug", color: "var(--lucid-series-8)" },
  { id: "feature", label: "Feature", color: "var(--lucid-series-7)" },
  { id: "improvement", label: "Improvement", color: "var(--lucid-series-1)" },
  { id: "design", label: "Design", color: "var(--lucid-series-5)" },
  { id: "performance", label: "Performance", color: "var(--lucid-series-2)" },
  { id: "docs", label: "Docs", color: "var(--lucid-series-3)" }
];

export const TEAMS = [
  { id: "plt", key: "PLT", name: "Platform", hue: 250 },
  { id: "app", key: "WEB", name: "Web App", hue: 160 },
  { id: "mob", key: "MOB", name: "Mobile", hue: 20 }
];

export const PEOPLE = [
  { id: "mara", name: "Mara Okonkwo", role: "Engineering lead", teams: ["plt", "app"] },
  { id: "theo", name: "Theo Varga", role: "Backend engineer", teams: ["plt"] },
  { id: "priya", name: "Priya Anand", role: "Product designer", teams: ["app", "mob"] },
  { id: "jonas", name: "Jonas Ferreira", role: "Frontend engineer", teams: ["app"] },
  { id: "ines", name: "Ines Halvorsen", role: "iOS engineer", teams: ["mob"] },
  { id: "kenji", name: "Kenji Moreau", role: "Infrastructure", teams: ["plt"] },
  { id: "lena", name: "Lena Castellano", role: "Android engineer", teams: ["mob"] },
  { id: "sam", name: "Sam Adeyemi", role: "Full-stack engineer", teams: ["app", "plt"] }
];

export const ME = "mara";

const TITLES = {
  plt: [
    "Rate limiter drops requests during deploys", "Move session store to regional replicas", "Add tracing to the billing worker",
    "Webhook retries ignore exponential backoff", "Upgrade Postgres to 17 in staging", "Cache invalidation storm after bulk import",
    "Audit log export times out above 50k rows", "Rotate signing keys without downtime", "Queue depth alert fires too late",
    "Reduce cold start on the search service", "Pagination cursor breaks on deleted rows", "Migrate cron jobs to the scheduler",
    "Memory leak in the image resize worker", "Add idempotency keys to the payments API", "Shard the events table by workspace",
    "Health checks report green while degraded", "Backfill missing timezone on old accounts", "Connection pool exhaustion under load",
    "Document the internal service mesh", "Feature flags evaluate twice per request", "Slow query on the activity feed",
    "API returns 500 on malformed JSON", "Encrypt backups with customer keys", "Remove legacy v1 auth endpoints",
    "Batch writes for the analytics ingester", "Split the monolith config into services", "Retry budget for outbound webhooks",
    "Dead letter queue for failed exports", "Expose request IDs in error responses", "Tune autoscaling for the worker pool",
    "Read replicas lag during nightly jobs", "Structured logs for the auth service", "Load test the new search cluster",
    "Clean up orphaned file uploads", "Per-workspace API rate limits", "Gzip large JSON responses",
    "Alert on certificate expiry", "Consolidate duplicate user records", "Disaster recovery runbook"
  ],
  app: [
    "Command menu loses focus after closing a dialog", "Redesign the empty state for new workspaces", "Keyboard shortcut sheet",
    "Board view drag ghost flickers in Safari", "Dark mode contrast on muted labels", "Inline editing for issue titles",
    "Bulk actions on selected rows", "Saved views per team", "Onboarding checklist for invited members",
    "Charts misalign at narrow widths", "Date picker presets for filters", "Improve load time of the insights page",
    "Notification preferences per project", "Paste images into descriptions", "Activity feed groups related changes",
    "Mentions autocomplete ranks recent people first", "Settings page reorganisation", "Export issues to CSV",
    "Sidebar collapses on tablet widths", "Undo for archive and delete", "Avatar upload crops off-centre",
    "Filter chips overflow on small screens", "Search highlights matched words", "Copy issue link with title",
    "Sticky group headers in list view", "Remember the last used view per team", "Emoji reactions on comments",
    "Markdown shortcuts in the editor", "Hover cards for issue references", "Focus ring missing on menu items",
    "Right-to-left layout support", "Quick filter for my open work", "Timezone shown on due dates",
    "Draft autosave for long descriptions", "Workspace switcher shows unread counts", "Reduce layout shift on first load",
    "Theme toggle remembers system choice", "Assignee picker searches by role", "Print styles for issue pages"
  ],
  mob: [
    "Push notifications arrive twice on Android", "Offline drafts for new issues", "Swipe to change status",
    "Crash when rotating during upload", "Widget for assigned issues", "Biometric unlock for the app",
    "Deep links open the wrong workspace", "Reduce app size below 40 MB", "Haptics on board drag and drop",
    "Accessibility labels on priority icons", "Background sync drains battery", "Dark mode splash screen flashes white",
    "Share sheet extension", "Pull to refresh stutters on long lists", "Tablet split view layout",
    "Attachment previews for PDFs", "Login loop after password change", "Localise date formats",
    "Large text support in issue lists", "Quick add from the lock screen", "Offline banner overlaps the header",
    "Camera upload compresses too much", "Haptic feedback on status change", "Siri shortcut to create an issue",
    "Notification grouping by project", "Scroll position lost after editing", "Keyboard covers the comment box"
  ]
};

const SUBTASKS = [
  "Write the technical plan", "Design review", "Build the first version", "Add tests for the edge cases",
  "Roll out behind a feature flag", "Add metrics and alerts", "Update the docs", "QA on staging",
  "Migrate existing data", "Accessibility pass", "Performance check", "Clean up the old code path"
];

const DESCRIPTIONS = [
  "Seen in production for a handful of workspaces. Repro steps and logs are in the linked thread.",
  "We should land this before the next release so the follow-up work is unblocked.",
  "Small, contained change. The design is agreed; this is mostly implementation and tests.",
  "Customers have asked for this repeatedly. Scope it to the smallest version that solves the core need.",
  "Needs a short spike first to confirm the approach, then a proper estimate.",
  "Blocked on a decision from design. Leaving notes here so nothing gets lost."
];

const COMMENTS = [
  "Picked this up, should have a draft today.",
  "Can we split this into two smaller pieces?",
  "Reproduced locally. It only happens with large accounts.",
  "Pushed a fix to the branch, ready for a look.",
  "Looks good to me. Shipping after the next deploy window.",
  "Added a test that covers the edge case.",
  "Talked to support, two more customers are affected.",
  "Design updated, see the latest frames."
];

export function seed(now = Date.now()) {
  const rand = random(20261002);
  const pick = list => list[Math.floor(rand() * list.length)];
  const normal = () => {
    let u = 0;
    let v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const start = today.getTime() - 26 * 7 * DAY;
  const counters = { plt: 100, app: 200, mob: 40 };
  const used = { plt: new Set(), app: new Set(), mob: new Set() };
  const issues = [];
  const events = [];

  for (let week = 0; week < 26; week++) {
    const growth = 2.6 + week * 0.17;
    const incident = week === 17 ? 9 : week === 18 ? 4 : 0;
    const holiday = week === 11 ? -3 : 0;
    const created = Math.max(2, Math.round(growth + normal() * 2.2 + incident + holiday));
    for (let n = 0; n < created; n++) {
      const roll = rand();
      const team = roll < 0.42 ? "plt" : roll < 0.78 ? "app" : "mob";
      let day = Math.floor(rand() * 7);
      if (day >= 5 && rand() < 0.75) day = Math.floor(rand() * 5);
      const createdAt = start + week * 7 * DAY + day * DAY + (9 + rand() * 9) * 3600000;
      if (createdAt > now) continue;
      const titles = TITLES[team];
      let title = pick(titles);
      if (used[team].size < titles.length) {
        while (used[team].has(title)) title = pick(titles);
      } else {
        title = `${title} (${pick(["follow-up", "part 2", "regression", "edge case"])})`;
      }
      used[team].add(title);
      const isBug = /drop|leak|crash|break|error|500|loop|flicker|twice|ignore|loses|misalign|times out|late|stutter|flash/i.test(title);
      const priority = incident && rand() < 0.5 ? 1 : isBug ? pick([1, 2, 2, 3]) : pick([2, 3, 3, 3, 4, 4, 0]);
      const team_people = PEOPLE.filter(p => p.teams.includes(team));
      const assignee = rand() < 0.88 ? pick(team_people).id : null;
      const labels = new Set([isBug ? "bug" : pick(["feature", "improvement", "improvement", "feature"])]);
      if (rand() < 0.3) labels.add(pick(["design", "performance", "docs"]));
      const parked = rand() < (priority === 4 || priority === 0 ? 0.5 : priority === 3 ? 0.18 : 0.04);
      const wait = Math.exp(0.9 + normal() * 0.9) * DAY * (priority === 1 ? 0.25 : priority === 4 || priority === 0 ? 2.2 : 1);
      const cycle = Math.exp(1.75 + normal() * 0.7) * DAY * (priority === 1 ? 0.45 : 1) * (rand() < 0.16 ? 4.5 : 1);
      const startedAt = createdAt + wait;
      const completedAt = startedAt + cycle;
      let status;
      let canceledAt = null;
      if (rand() < 0.05 && createdAt + 10 * DAY < now) {
        status = "canceled";
        canceledAt = createdAt + (3 + rand() * 7) * DAY;
      } else if (parked) status = rand() < 0.65 ? "backlog" : "todo";
      else if (completedAt < now && rand() < 0.94) status = "done";
      else if (startedAt < now) status = completedAt - cycle * 0.3 < now ? "in_review" : "in_progress";
      else status = priority === 4 || priority === 0 || rand() < 0.3 ? "backlog" : "todo";
      if (!assignee && (status === "in_progress" || status === "in_review")) status = "todo";
      counters[team]++;
      const id = `${team.toUpperCase().replace("APP", "WEB")}-${counters[team]}`;
      const dueAt = rand() < 0.3 && status !== "done" && status !== "canceled" ? today.getTime() + Math.round(-3 + rand() * 24) * DAY : null;
      const issue = {
        id,
        team,
        title,
        description: pick(DESCRIPTIONS),
        status,
        priority,
        assignee,
        labels: [...labels],
        createdAt,
        startedAt: status === "backlog" || status === "todo" ? null : Math.min(startedAt, now),
        completedAt: status === "done" ? completedAt : canceledAt,
        dueAt,
        rank: rand(),
        creator: rand() < 0.5 && assignee ? assignee : pick(team_people).id,
        comments: []
      };
      const commentCount = status === "backlog" ? 0 : Math.floor(rand() * 4);
      for (let c = 0; c < commentCount; c++) {
        const at = createdAt + rand() * ((issue.completedAt ?? now) - createdAt);
        issue.comments.push({ id: `${id}-c${c}`, author: rand() < 0.6 && assignee ? assignee : pick(PEOPLE).id, body: pick(COMMENTS), at });
        events.push(at);
      }
      issue.comments.sort((a, b) => a.at - b.at);
      issues.push(issue);
      events.push(createdAt);
      if (issue.startedAt) events.push(issue.startedAt);
      if (status === "done") events.push(completedAt, completedAt + 3600000);
    }
  }

  const bugPattern = /drop|leak|crash|break|error|500|loop|flicker|twice|ignore|loses|misalign|times out|late|stutter|flash|lag|overlap|missing|lost|covers|storm/i;
  for (const team of Object.keys(TITLES)) {
    const pool = [...TITLES[team]].sort(() => rand() - 0.5);
    const closed = issue => issue.status === "done" || issue.status === "canceled";
    const mine = issues.filter(issue => issue.team === team).sort((a, b) => closed(a) - closed(b) || b.createdAt - a.createdAt);
    mine.forEach((issue, index) => {
      const base = pool[index % pool.length];
      issue.title = index < pool.length ? base : `${base} (${["follow-up", "part 2", "regression"][Math.floor(index / pool.length) - 1] ?? "again"})`;
      const bug = bugPattern.test(base);
      const rest = issue.labels.filter(label => label !== "bug" && label !== "feature" && label !== "improvement");
      issue.labels = [bug ? "bug" : issue.labels.includes("feature") ? "feature" : "improvement", ...rest];
    });
  }

  for (const team of Object.keys(TITLES)) {
    const mine = issues.filter(issue => issue.team === team && issue.status !== "canceled");
    const parents = mine.filter(issue => ["todo", "in_progress", "in_review"].includes(issue.status) && !issue.labels.includes("bug")).slice(0, 3);
    for (const parent of parents) {
      const spare = mine
        .filter(issue => issue !== parent && !issue.parent && !parents.includes(issue))
        .sort((a, b) => Math.abs(a.createdAt - parent.createdAt) - Math.abs(b.createdAt - parent.createdAt))
        .slice(0, 6);
      const count = 2 + Math.floor(rand() * 3);
      const children = [];
      const tasks = [...SUBTASKS].sort(() => rand() - 0.5);
      for (let k = 0; k < count && spare.length; k++) {
        const child = spare.splice(Math.floor(rand() * spare.length), 1)[0];
        child.parent = parent.id;
        child.title = tasks[k];
        children.push(child);
      }
      children.sort((a, b) => a.createdAt - b.createdAt).forEach((child, k) => { child.title = tasks[k]; });
      if (children.length && children.every(child => child.status === "done")) {
        const last = children.reduce((a, b) => (a.createdAt > b.createdAt ? a : b));
        last.status = "in_progress";
        last.completedAt = null;
        last.startedAt = last.startedAt ?? last.createdAt;
      }
      if (parent.status === "todo" && children.some(child => child.status !== "backlog" && child.status !== "todo")) {
        parent.status = "in_progress";
        parent.startedAt = Math.min(...children.map(child => child.startedAt ?? child.createdAt));
      }
    }
  }

  return { issues, events: events.filter(at => at <= now), now: today.getTime() };
}
