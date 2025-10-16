/// <reference types="@cloudflare/workers-types" />

// Single-file, minimal Cloudflare Worker for AI-Now

interface AutomationRun {
  id: string;
  date: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  storyCount?: number;
  sourcesCount?: number;
  error?: string;
  logs: string[];
}

interface Env {
  R2_SOURCES: R2Bucket;
  NEWS_CACHE?: KVNamespace;
  RESEND_API_KEY?: string;
  EMAIL_TO?: string;
  // LinkedIn OAuth secrets (kept as worker secrets, not committed)
  LINKEDIN_CLIENT_ID?: string;
  LINKEDIN_CLIENT_SECRET?: string;
  LINKEDIN_REDIRECT_URI?: string;
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runCollection(env, 'scheduled'));
    return new Response('scheduled queued');
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) return handleDashboardAPI(request, env, url, ctx);

    if (url.pathname === '/trigger' && request.method === 'POST') {
      const runId = await triggerManualRun(env, ctx);
      return new Response(JSON.stringify({ runId }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (url.pathname === '/list') {
      try {
        const list = await env.R2_SOURCES.list({ prefix: 'sources/' });
        const dates = [...new Set(list.objects.map(o => (o.key || '').split('/')[1]))].filter(Boolean);
        // build full URLs for each date and its files
        const origin = url.origin || (request.headers.get('origin') || `https://${(env as any).BASE_URL || ''}`).replace(/\/+$/, '');
        const result: Record<string, { readme: string, files: string[], keys: string[], workerReachable?: boolean }> = {};
        for (const d of dates) {
          const objs = list.objects.filter(o => (o.key || '').startsWith(`sources/${d}/`));
          const files = objs.map(o => (o.key || '').split('/').slice(2).join('/')).filter(Boolean);
          const readmeUrl = `${origin}/sources/${d}/README.md`;
          // best-effort probe (fire-and-forget but await a short fetch)
          let reachable: boolean | undefined = undefined;
          try {
            const resp = await fetch(readmeUrl, { method: 'HEAD', redirect: 'follow' });
            reachable = resp.status >= 200 && resp.status < 300;
          } catch (e) { reachable = false; }
          result[d] = {
            readme: readmeUrl,
            files: files.map(f => `${origin}/sources/${d}/${f}`),
            keys: objs.map(o => o.key || ''),
            workerReachable: reachable
          };
        }
        return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
      } catch (e) { return new Response(JSON.stringify({ error: String(e) }), { status: 500 }); }
    }

    if (url.pathname.startsWith('/sources/')) {
      const parts = url.pathname.split('/').filter(Boolean);
      const date = parts[1];
      const file = parts[2] || 'README.md';
      try {
        const obj = await env.R2_SOURCES.get(`sources/${date}/${file}`);
        if (!obj) return new Response('Not found', { status: 404 });
        return new Response(await obj.text(), { headers: { 'Content-Type': 'text/markdown' } });
      } catch (e) { return new Response(String(e), { status: 500 }); }
    }

    // Debug: inspect storage bindings and meta (safe to leave; restricted to local/dev or protected by your infra)
    if (url.pathname === '/debug/inspect') {
      try {
        const dateParam = url.searchParams.get('date');
        const response: any = { r2: !!env.R2_SOURCES, kv: !!env.NEWS_CACHE };
        // fetch last_run and runs_list via meta helpers
        try { response.last_run = await getMeta(env, 'last_run'); } catch (e) { response.last_run_error = String(e); }
        try { response.runs_list = await getMeta(env, 'runs_list'); } catch (e) { response.runs_list_error = String(e); }

        if (env.R2_SOURCES) {
          if (dateParam) {
            const list = await env.R2_SOURCES.list({ prefix: `sources/${dateParam}/` });
            response.keys = list.objects.map(o => o.key || '');
            response.urls = (list.objects || []).map(o => {
              const key = o.key || '';
              const parts = key.split('/').filter(Boolean);
              const d = parts[1];
              const file = parts.slice(2).join('/');
              const base = getBaseUrl(env);
              return file ? `${base}/sources/${d}/${file}` : null;
            }).filter(Boolean);
          } else {
            const list = await env.R2_SOURCES.list({ prefix: 'sources/' });
            const dates = [...new Set(list.objects.map(o => (o.key || '').split('/')[1]))].filter(Boolean);
            response.dates = dates;
            // include sample keys (limit 200)
            response.sampleKeys = list.objects.slice(0, 200).map(o => o.key || '');
          }
        }

        return new Response(JSON.stringify(response, null, 2), { headers: { 'Content-Type': 'application/json' } });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    return new Response('AI-Now Source Gatherer', { headers: { 'Content-Type': 'text/plain' } });
  }
};

/* Core functions */
async function runCollection(env: Env, mode: 'scheduled' | 'manual') {
  const runId = `${mode}-${Date.now()}`;
  const today = new Date().toISOString().split('T')[0];
  const run: AutomationRun = { id: runId, date: today, status: 'running', startedAt: new Date().toISOString(), logs: ['started'] };
  await putMeta(env, 'last_run', JSON.stringify(run));

  try {
    const [tc, vb, rd, hn, ar] = await Promise.all([
      gatherTechCrunch(),
      gatherVentureBeat(),
      gatherReddit(),
      gatherHackerNews(),
      gatherArXiv()
    ]);

    const sources: Record<string, string> = { techcrunch: tc, venturebeat: vb, reddit: rd, hackernews: hn, arxiv: ar };

    for (const [k, v] of Object.entries(sources)) {
      try {
        await env.R2_SOURCES.put(`sources/${today}/${k}.md`, v, { httpMetadata: { contentType: 'text/markdown' } });
      } catch (e) { /* ignore individual put errors */ }
    }

    const index = createIndexFile(sources, today);
    try { await env.R2_SOURCES.put(`sources/${today}/README.md`, index, { httpMetadata: { contentType: 'text/markdown' } }); } catch {}

    // write a plain text file with full absolute URLs (one per line)
    try {
      const base = getBaseUrl(env);
      const urls = createUrlsFile(sources, today, base);
      await env.R2_SOURCES.put(`sources/${today}/urls.txt`, urls, { httpMetadata: { contentType: 'text/plain' } });
    } catch (e) { /* ignore urls file errors */ }

    run.status = 'completed';
    run.completedAt = new Date().toISOString();
    run.storyCount = Object.values(sources).reduce((s, x) => s + countStories(x), 0);
    run.sourcesCount = Object.keys(sources).length;
    run.logs.push('completed');
    await safeKVPut(env, 'last_run', JSON.stringify(run));

    // (helpers moved to top-level)

  // send completion notification (best-effort)
  try { await sendCompletionEmail(env, run, true); } catch (err) { console.error('sendCompletionEmail error', err); }

  const runsRaw = await getMeta(env, 'runs_list');
  const runs: AutomationRun[] = runsRaw ? JSON.parse(runsRaw) : [];
  runs.push(run);
  await putMeta(env, 'runs_list', JSON.stringify(runs.slice(-100)));
  } catch (e) {
    run.status = 'failed';
    run.completedAt = new Date().toISOString();
    run.error = String(e);
    run.logs.push(String(e));
  await putMeta(env, 'last_run', JSON.stringify(run));
    try { await sendCompletionEmail(env, run, false); } catch (err) { console.error('sendCompletionEmail error', err); }
  }
}

async function triggerManualRun(env: Env, ctx?: ExecutionContext): Promise<string> {
  const runId = `manual-${Date.now()}`;
  const run: AutomationRun = { id: runId, date: new Date().toISOString().split('T')[0], status: 'running', startedAt: new Date().toISOString(), logs: ['manual queued'] };
  await putMeta(env, 'last_run', JSON.stringify(run));
  const runsRaw = await getMeta(env, 'runs_list');
  const runs: AutomationRun[] = runsRaw ? JSON.parse(runsRaw) : [];
  runs.push(run);
  await putMeta(env, 'runs_list', JSON.stringify(runs.slice(-100)));
  const bg = async () => runCollection(env, 'manual');
  if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(bg()); else bg();
  return runId;
}

/* Dashboard API */
async function handleDashboardAPI(request: Request, env: Env, url: URL, ctx: ExecutionContext): Promise<Response> {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    if (url.pathname === '/api/status' && request.method === 'GET') return new Response(JSON.stringify(await getAutomationStatus(env)), { headers: { ...cors, 'Content-Type': 'application/json' } });
    if (url.pathname === '/api/runs' && request.method === 'GET') { const limit = parseInt(url.searchParams.get('limit') || '10'); return new Response(JSON.stringify(await getRecentRuns(env, limit)), { headers: { ...cors, 'Content-Type': 'application/json' } }); }
    if (url.pathname === '/api/trigger' && request.method === 'POST') { const runId = await triggerManualRun(env, ctx); return new Response(JSON.stringify({ runId }), { headers: { ...cors, 'Content-Type': 'application/json' } }); }
  if (url.pathname === '/api/reset-last-run' && request.method === 'POST') { await deleteMeta(env, 'last_run'); return new Response(JSON.stringify({ success: true }), { headers: { ...cors, 'Content-Type': 'application/json' } }); }
  if (url.pathname === '/api/delete-run' && request.method === 'POST') { const body = await request.json().catch(() => ({} as any)); const runId = (body as any).runId || url.searchParams.get('id'); if (!runId) return new Response(JSON.stringify({ error: 'missing runId' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }); const runsRaw = await getMeta(env, 'runs_list'); const runs: AutomationRun[] = runsRaw ? JSON.parse(runsRaw) : []; const filtered = runs.filter(r => r.id !== runId); await putMeta(env, 'runs_list', JSON.stringify(filtered)); const lastRaw = await getMeta(env, 'last_run'); if (lastRaw) { try { const lr = JSON.parse(lastRaw) as AutomationRun; if (lr.id === runId) await deleteMeta(env, 'last_run'); } catch (e) {} } return new Response(JSON.stringify({ success: true }), { headers: { ...cors, 'Content-Type': 'application/json' } }); }
    if (url.pathname === '/api/config' && request.method === 'GET') { return new Response(JSON.stringify(await getConfigurationStatus(env)), { headers: { ...cors, 'Content-Type': 'application/json' } }); }
    // LinkedIn OAuth: return public client_id and redirect URI (safe), and perform server-side exchange
    if (url.pathname === '/api/linkedin/config' && request.method === 'GET') {
      const cfg = { client_id: env.LINKEDIN_CLIENT_ID || '', redirect_uri: env.LINKEDIN_REDIRECT_URI || getBaseUrl(env) + '/linkedin-callback' };
      return new Response(JSON.stringify(cfg), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    if (url.pathname === '/api/linkedin/exchange' && request.method === 'POST') {
      const body = await request.json().catch(() => ({} as any));
      const code = (body as any).code;
      if (!code) return new Response(JSON.stringify({ error: 'missing code' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
      const params = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: env.LINKEDIN_REDIRECT_URI || getBaseUrl(env) + '/linkedin-callback', client_id: env.LINKEDIN_CLIENT_ID || '', client_secret: env.LINKEDIN_CLIENT_SECRET || '' });
      try {
        const tokenResp = await fetch('https://www.linkedin.com/oauth/v2/accessToken', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params });
  const tokenData: any = await tokenResp.json();
  if (!tokenResp.ok) return new Response(JSON.stringify(tokenData), { status: tokenResp.status, headers: { ...cors, 'Content-Type': 'application/json' } });
        // optional: fetch user info to determine URN
        let urn = undefined;
        try {
          if (tokenData && tokenData.access_token) {
            const profileResp = await fetch('https://api.linkedin.com/v2/userinfo', { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
            const profile: any = await profileResp.json();
            urn = profile?.sub || profile?.id;
          }
        } catch (e) { /* ignore profile fetch errors */ }
        return new Response(JSON.stringify(Object.assign({}, tokenData, { urn })), { headers: { ...cors, 'Content-Type': 'application/json' } });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
      }
    }
    if (url.pathname === '/api/logs' && request.method === 'GET') { const limit = parseInt(url.searchParams.get('limit') || '50'); return new Response(JSON.stringify(await getRecentLogs(env, limit)), { headers: { ...cors, 'Content-Type': 'application/json' } }); }
    return new Response(JSON.stringify({ error: 'Endpoint not found' }), { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) { return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }); }
}

async function getAutomationStatus(env: Env) {
  const lastRaw = await getMeta(env, 'last_run');
  const lastRun = lastRaw ? JSON.parse(lastRaw) : undefined;
  const runsRaw = await getMeta(env, 'runs_list');
  const runs = runsRaw ? JSON.parse(runsRaw) : [];
  const now = new Date();
  const nextRun = new Date(now);
  nextRun.setHours(4,0,0,0);
  if (nextRun <= now) nextRun.setDate(nextRun.getDate()+1);
  const total = runs.length;
  const success = runs.filter((r:any)=>r.status==='completed').length;
  const successRate = total>0?Math.round((success/total)*10000)/100:0;
  return { isRunning: lastRun?.status==='running'||false, lastRun, nextScheduledRun: nextRun.toISOString(), totalRuns: total, successRate };
}

async function getRecentRuns(env: Env, limit = 10) { const runsRaw = await getMeta(env, 'runs_list'); const runs = runsRaw ? JSON.parse(runsRaw) : []; return runs.sort((a:any,b:any)=> new Date(b.startedAt).getTime()-new Date(a.startedAt).getTime()).slice(0, limit); }
async function getRecentLogs(env: Env, limit = 50) { const raw = await getMeta(env, 'logs'); const logs = raw ? JSON.parse(raw) : []; return logs.slice(-limit); }
async function getConfigurationStatus(env: Env) { return { storage: { r2: !!env.R2_SOURCES, kv: !!env.NEWS_CACHE } }; }

// Build a base URL for artifact links. Prefer env.BASE_URL if provided.
function getBaseUrl(env: Env): string {
  const b = (env as any).BASE_URL || '';
  if (b && typeof b === 'string' && b.trim()) return b.replace(/\s+$/,'').replace(/\/+$/, '');
  return 'https://v2u.us';
}

// Create a plain-text file with one absolute URL per line for README and each source file.
function createUrlsFile(sources: Record<string,string>, date: string, base: string): string {
  const lines: string[] = [];
  lines.push(`${base}/sources/${date}/README.md`);
  for (const k of Object.keys(sources)) {
    lines.push(`${base}/sources/${date}/${k}.md`);
  }
  return lines.join('\n') + '\n';
}

// Iterate existing dates in R2 and write urls.txt for each
async function generateUrlsForAllDates(env: Env): Promise<{ date: string, written: boolean }[]> {
  if (!env.R2_SOURCES) return [];
  const list = await env.R2_SOURCES.list({ prefix: 'sources/' });
  const dates = [...new Set(list.objects.map(o => (o.key || '').split('/')[1]))].filter(Boolean);
  const base = getBaseUrl(env);
  const out: { date: string, written: boolean }[] = [];
  for (const d of dates) {
    const objs = list.objects.filter(o => (o.key || '').startsWith(`sources/${d}/`));
    const files = objs.map(o => (o.key || '').split('/').slice(2).join('/')).filter(Boolean);
    const sources: Record<string,string> = {};
    for (const f of files) {
      const name = f.replace(/\.md$/,'');
      sources[name] = `https://${base}/sources/${d}/${f}`; // placeholder value
    }
    const urls = createUrlsFile(sources, d, base);
    try {
      await env.R2_SOURCES.put(`sources/${d}/urls.txt`, urls, { httpMetadata: { contentType: 'text/plain' } });
      out.push({ date: d, written: true });
    } catch (e) { out.push({ date: d, written: false }); }
  }
  return out;
}



// Improved KV helpers with retries + exponential backoff for transient errors (rate limits, network blips)
async function safeKVGet(env: Env, key: string): Promise<string|null> {
  if (!env.NEWS_CACHE) return null;
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const v = await env.NEWS_CACHE.get(key);
      return v;
    } catch (e) {
      console.error(`KV get error (attempt ${attempt})`, e);
      if (attempt === maxAttempts) return null;
      await new Promise((r) => setTimeout(r, 200 * attempt));
    }
  }
  return null;
}

async function safeKVPut(env: Env, key: string, value: string): Promise<boolean> {
  if (!env.NEWS_CACHE) return false;
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await env.NEWS_CACHE.put(key, value);
      return true;
    } catch (e: any) {
      // KV can return 429 or other transient errors; retry with backoff
      console.error(`KV put error (attempt ${attempt})`, { message: e?.message || String(e), code: e?.code });
      if (attempt === maxAttempts) return false;
      await new Promise((r) => setTimeout(r, 300 * attempt));
    }
  }
  return false;
}

async function safeKVDelete(env: Env, key: string): Promise<boolean> {
  if (!env.NEWS_CACHE) return false;
  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await env.NEWS_CACHE.delete(key);
      return true;
    } catch (e) {
      console.error(`KV delete error (attempt ${attempt})`, e);
      if (attempt === maxAttempts) return false;
      await new Promise((r) => setTimeout(r, 200 * attempt));
    }
  }
  return false;
}

/* Metadata helpers with R2 fallback
   store small JSON blobs under meta/<key>.json in R2 when KV put fails (e.g., quota 429)
*/
async function getMeta(env: Env, key: string): Promise<string|null> {
  try {
    if (env.NEWS_CACHE) {
      const v = await env.NEWS_CACHE.get(key);
      if (v != null) return v;
    }
  } catch (e) {
    console.error('KV get error (meta)', e);
  }
  try {
    if (!env.R2_SOURCES) return null;
    const obj = await env.R2_SOURCES.get(`meta/${key}.json`);
    if (!obj) return null;
    return await obj.text();
  } catch (e) {
    console.error('R2 get meta error', e);
    return null;
  }
}

async function putMeta(env: Env, key: string, value: string): Promise<boolean> {
  // Try KV first
  try {
    if (env.NEWS_CACHE) {
      const ok = await safeKVPut(env, key, value);
      if (ok) return true;
      // if KV put failed (e.g., rate limit), fall through to R2
    }
  } catch (e) {
    console.error('KV put error (meta)', e);
  }
  // Write to R2 as fallback
  try {
    if (!env.R2_SOURCES) return false;
    await env.R2_SOURCES.put(`meta/${key}.json`, value, { httpMetadata: { contentType: 'application/json' } });
    return true;
  } catch (e) {
    console.error('R2 put meta error', e);
    return false;
  }
}

async function deleteMeta(env: Env, key: string): Promise<boolean> {
  try {
    if (env.NEWS_CACHE) {
      const ok = await safeKVDelete(env, key);
      // don't return early; try to delete from R2 too to keep consistent
    }
  } catch (e) {
    console.error('KV delete error (meta)', e);
  }
  try {
    if (!env.R2_SOURCES) return true;
    await env.R2_SOURCES.delete(`meta/${key}.json`);
    return true;
  } catch (e) {
    console.error('R2 delete meta error', e);
    return false;
  }
}

/* Simple gatherers */
async function gatherTechCrunch(): Promise<string> { try { const res = await fetch('https://techcrunch.com/feed/'); const xml = await res.text(); return `# TechCrunch\n\nFetched ${xml.length} chars`; } catch { return '# TechCrunch\n\n*Failed*'; } }
async function gatherVentureBeat(): Promise<string> { try { const res = await fetch('https://venturebeat.com/feed/'); const xml = await res.text(); return `# VentureBeat\n\nFetched ${xml.length} chars`; } catch { return '# VentureBeat\n\n*Failed*'; } }
async function gatherReddit(): Promise<string> { return '# Reddit\n\nPlaceholder'; }
async function gatherHackerNews(): Promise<string> { return '# Hacker News\n\nPlaceholder'; }
async function gatherArXiv(): Promise<string> { return '# arXiv\n\nPlaceholder'; }

function createIndexFile(sources: Record<string,string>, date: string): string { let md = `# AI-Now Sources - ${date}\n\nGenerated: ${new Date().toISOString()}\n\n## Files\n\n`; for (const k of Object.keys(sources)) md += `- ${k}.md\n`; return md; }
function countStories(md: string): number { return (md.match(/^## /gm) || []).length; }

/* Email notification (Resend) - best-effort */
async function sendCompletionEmail(env: Env, run: AutomationRun, success: boolean): Promise<void> {
  try {
    if (!env.RESEND_API_KEY || !env.EMAIL_TO) {
      console.log('Resend email not configured; skipping notification');
      return;
    }

    const subject = success ? `AI-Now run ${run.id} completed` : `AI-Now run ${run.id} failed`;
    const text = `Run ${run.id} (${run.date}) finished with status: ${run.status}\nStarted: ${run.startedAt}\nCompleted: ${run.completedAt || 'N/A'}\nStories: ${run.storyCount || 0}\nSources: ${run.sourcesCount || 0}\nError: ${run.error || ''}`;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'AI-Now Dashboard <dashboard@v2u.us>',
        to: env.EMAIL_TO,
        subject,
        text
      })
    });
  } catch (e) {
    console.error('sendCompletionEmail error', e);
  }
}
