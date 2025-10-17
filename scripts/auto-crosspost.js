#!/usr/bin/env node
import fs from 'fs';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const CHANNEL_HANDLE = process.env.YT_CHANNEL_HANDLE || 'v2u.AI-Now';
const DRY_RUN = (process.env.DRY_RUN || 'false') === 'true';
const N8N_WEBHOOKS = (process.env.N8N_WEBHOOKS || 'http://localhost:5678/webhook/youtube-latest').split(',').map(s=>s.trim()).filter(Boolean);

async function fetchLatestVideo() {
  // Use jina.ai text proxy to avoid JS-heavy pages; falls back to public RSS pattern
  const proxy = `https://r.jina.ai/http://www.youtube.com/@${CHANNEL_HANDLE}`;
  try {
    const res = await fetch(proxy);
    const txt = await res.text();
    // crude parse: find first /watch?v=ID
    const m = txt.match(/watch\?v=([A-Za-z0-9_-]{11})/);
    if (m) return { id: m[1], url: `https://www.youtube.com/watch?v=${m[1]}` };
  } catch (e) { console.error('proxy fetch failed', e); }

  // fallback: try RSS by username (may 404 for handles)
  const rssUser = `https://www.youtube.com/feeds/videos.xml?user=${CHANNEL_HANDLE}`;
  try {
    const r = await fetch(rssUser);
    if (r.ok) {
      const body = await r.text();
      const mm = body.match(/<guid>https:\/\/www.youtube.com\/watch\?v=([A-Za-z0-9_-]{11})<\/guid>/);
      if (mm) return { id: mm[1], url: `https://www.youtube.com/watch?v=${mm[1]}` };
    }
  } catch (e) {}
  throw new Error('Could not resolve latest video');
}

async function fetchVideoMetadata(videoId) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  // crude: use jina.ai page snapshot
  const proxy = `https://r.jina.ai/http://www.youtube.com/watch?v=${videoId}`;
  const res = await fetch(proxy);
  const txt = await res.text();
  // title
  const title = (txt.match(/<title>([^<]+)<\/title>/) || [null, ''])[1].replace(' - YouTube','').trim();
  // description: best-effort find meta name="description"
  const descMatch = txt.match(/<meta name=\"description\" content=\"([^\"]+)\"/);
  const description = descMatch ? descMatch[1] : '';
  // publish date: search for "Published" lines
  return { title, description, url };
}

function buildPlatformPayloads(meta) {
  const text = `${meta.title}\n\n${meta.description}\n\nWatch: ${meta.url}`;
  return {
    linkedin: { text },
    x: { text },
    facebook: { text },
    instagram: { text },
    threads: { text },
    locals: { text }
  };
}

async function dryRun() {
  console.log('Starting dry run...');
  const vid = await fetchLatestVideo();
  console.log('Latest video:', vid.url);
  const meta = await fetchVideoMetadata(vid.id);
  console.log('Metadata:', { title: meta.title, description: (meta.description||'').slice(0,140) + '...' });
  const payloads = buildPlatformPayloads(meta);
  console.log('Prepared payloads for platforms:');
  console.log(JSON.stringify(payloads, null, 2));
  // write sample n8n workflow variable output
  fs.writeFileSync('app/public/posts/latest-crosspost.json', JSON.stringify({ video: vid, meta, payloads }, null, 2));
  console.log('Wrote app/public/posts/latest-crosspost.json');
}

async function run() {
  const vid = await fetchLatestVideo();
  console.log('Latest video:', vid.url);
  const meta = await fetchVideoMetadata(vid.id);
  const payloads = buildPlatformPayloads(meta);

  // Prepare envelope
  const envelope = { video: vid, meta, payloads, timestamp: new Date().toISOString() };

  if (DRY_RUN) {
    return dryRun();
  }

  if (!N8N_WEBHOOKS.length) {
    throw new Error('No N8N_WEBHOOKS configured. Set N8N_WEBHOOKS in .env to one or more webhook URLs.');
  }

  for (const wh of N8N_WEBHOOKS) {
    try {
      console.log(`POSTing payload to ${wh} ...`);
      const resp = await fetch(wh, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(envelope) });
      const text = await resp.text();
      console.log(`Webhook ${wh} returned ${resp.status}: ${text.slice(0,400)}`);
    } catch (e) {
      console.error(`Error posting to ${wh}:`, e);
    }
  }
}

run().catch(err => { console.error(err); process.exit(1); });
