const API = "https://api.github.com";
const KEY = "lucid-builder:github";

export const savedToken = () => { try { return sessionStorage.getItem(KEY); } catch { return null; } };
export const saveToken = token => { try { if (token) sessionStorage.setItem(KEY, token); else sessionStorage.removeItem(KEY); } catch {} };

const PENDING = "lucid-builder:github-pending";
export const pendingSignIn = () => { try { const p = JSON.parse(sessionStorage.getItem(PENDING) ?? "null"); return p && p.until > Date.now() ? p : null; } catch { return null; } };
export const clearPending = () => savePending(null);
const savePending = value => { try { if (value) sessionStorage.setItem(PENDING, JSON.stringify(value)); else sessionStorage.removeItem(PENDING); } catch {} };

export async function enabled() {
  try { const res = await fetch("/api/github.php?step=status"); return (await res.json()).enabled === true; } catch { return false; }
}

export async function startSignIn() {
  const res = await fetch("/api/github.php?step=start", { method: "POST" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.device_code) throw new Error(body.error ?? "start");
  const pending = { ...body, until: Date.now() + (body.expires_in || 900) * 1000 };
  savePending(pending);
  return pending;
}

export async function waitForToken(start, { signal } = {}) {
  let interval = Math.max(5, start.interval || 5) * 1000;
  const until = start.until ?? Date.now() + (start.expires_in || 900) * 1000;
  while (Date.now() < until) {
    await new Promise((done, fail) => { const t = setTimeout(done, interval); signal?.addEventListener("abort", () => { clearTimeout(t); fail(new Error("cancelled")); }, { once: true }); });
    const res = await fetch("/api/github.php?step=poll", { method: "POST", headers: { "Content-Type": "text/plain" }, body: start.device_code, signal });
    const body = await res.json().catch(() => ({}));
    if (body.token) { savePending(null); return body.token; }
    if (body.pending === "slow_down") interval += 5000;
    else if (body.pending === "access_denied") { savePending(null); throw new Error("denied"); }
    else if (body.pending === "expired_token") { savePending(null); throw new Error("expired"); }
  }
  savePending(null);
  throw new Error("expired");
}

async function call(token, method, path, body) {
  const res = await fetch(API + path, { method, headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data, scopes: res.headers.get("x-oauth-scopes") };
}

export async function whoami(token) {
  const res = await call(token, "GET", "/user");
  if (!res.ok) throw new Error(res.status === 401 ? "signed out" : "github");
  return res.data.login;
}

export async function orgs(token) {
  const res = await call(token, "GET", "/user/orgs?per_page=100");
  const list = res.ok && Array.isArray(res.data) ? res.data.map(o => o.login) : [];
  return { list, canList: res.scopes == null || /\bread:org\b|\badmin:org\b/.test(res.scopes) };
}

const base64 = text => {
  const bytes = new TextEncoder().encode(text);
  let out = "";
  for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(out);
};

export const repoName = name => name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^[-.]+|[-.]+$/g, "").slice(0, 90) || "lucid-app";

export async function push(token, { owner, repo, files, create, description, pages, personal = true, onProgress }) {
  if (create) {
    const made = await call(token, "POST", personal ? "/user/repos" : `/orgs/${owner}/repos`, { name: repo, description, homepage: pages ? `https://${owner.toLowerCase()}.github.io/${repo}/` : undefined, has_wiki: false, has_projects: false });
    if (made.status === 422) throw new Error("exists");
    if (made.status === 403 || made.status === 404) throw new Error(personal ? "create" : "org");
    if (!made.ok) throw new Error("create");
  }
  let done = 0;
  for (const file of files) {
    onProgress?.(done, files.length, file.name);
    const path = file.name.split("/").map(encodeURIComponent).join("/");
    const existing = create ? null : await call(token, "GET", `/repos/${owner}/${repo}/contents/${path}`);
    const sha = existing?.ok ? existing.data?.sha : undefined;
    const put = await call(token, "PUT", `/repos/${owner}/${repo}/contents/${path}`, { message: `${sha ? "Update" : "Add"} ${file.name} from Lucid Builder`, content: base64(file.text), sha });
    if (!put.ok) throw new Error(put.status === 404 ? "missing" : "push");
    done++;
  }
  onProgress?.(done, files.length, "");
  let site = null;
  if (pages) {
    const repoInfo = await call(token, "GET", `/repos/${owner}/${repo}`);
    const branch = repoInfo.data?.default_branch ?? "main";
    const on = await call(token, "POST", `/repos/${owner}/${repo}/pages`, { source: { branch, path: "/" } });
    if (on.ok || on.status === 409) site = `https://${owner.toLowerCase()}.github.io/${repo}/`;
  }
  return { url: `https://github.com/${owner}/${repo}`, site };
}
