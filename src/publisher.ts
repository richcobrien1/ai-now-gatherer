/**
 * AI-Now Social Publisher - Twitter OAuth 1.0a User Context
 */

interface Env {
  R2_ASSETS: R2Bucket;
  EPISODE_METADATA: KVNamespace;
  POST_STATUS: KVNamespace;
  
  TWITTER_API_KEY: string;
  TWITTER_API_SECRET: string;
  TWITTER_ACCESS_TOKEN: string;
  TWITTER_ACCESS_TOKEN_SECRET: string;
  
  BASE_URL: string;
  DASHBOARD_URL: string;
}

interface Episode {
  episode_id: string;
  title: string;
  description: string;
  publish_date: string;
  layer1_links: {
    youtube?: string;
    spotify?: string;
    rumble?: string;
    itunes?: string;
  };
  tags: string[];
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    try {
      if (url.pathname === '/health') {
        return jsonResponse({ status: 'healthy' }, 200, corsHeaders);
      }
      
      if (url.pathname === '/api/publish' && request.method === 'POST') {
        return await handlePublish(request, env, corsHeaders);
      }
      
      if (url.pathname === '/api/status' && request.method === 'GET') {
        const episodeId = url.searchParams.get('episode_id');
        if (!episodeId) {
          return jsonResponse({ error: 'Missing episode_id' }, 400, corsHeaders);
        }
        const status = await env.POST_STATUS.get(episodeId);
        if (!status) {
          return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
        }
        return jsonResponse(JSON.parse(status), 200, corsHeaders);
      }
      
      return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
      
    } catch (error) {
      console.error('Error:', error);
      return jsonResponse({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, 500, corsHeaders);
    }
  },

  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    console.log('Cron triggered at:', new Date(event.scheduledTime).toISOString());
  }
};

async function handlePublish(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const episode: Episode = await request.json();
  
  if (!episode.episode_id || !episode.title) {
    return jsonResponse({ error: 'Missing required fields' }, 400, corsHeaders);
  }
  
  await env.EPISODE_METADATA.put(episode.episode_id, JSON.stringify(episode));
  
  let twitterResult;
  try {
    twitterResult = await postToTwitter(episode, env);
  } catch (error) {
    console.error('Twitter posting failed:', error);
    twitterResult = {
      posted: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      platform: 'twitter'
    };
  }
  
  const status = {
    episode_id: episode.episode_id,
    status: { twitter: twitterResult },
    created_at: new Date().toISOString()
  };
  
  await env.POST_STATUS.put(episode.episode_id, JSON.stringify(status));
  
  return jsonResponse({
    success: twitterResult.posted,
    episode_id: episode.episode_id,
    status: status.status
  }, 200, corsHeaders);
}

async function postToTwitter(episode: Episode, env: Env) {
  const content = buildTwitterPost(episode);
  const url = 'https://api.twitter.com/2/tweets';
  const payload = { text: content };
  
  console.log('Posting to Twitter with OAuth 1.0a...');
  console.log('Content:', content);
  
  const authHeader = await buildOAuth1Header(
    'POST',
    url,
    payload,
    env.TWITTER_API_KEY,
    env.TWITTER_API_SECRET,
    env.TWITTER_ACCESS_TOKEN,
    env.TWITTER_ACCESS_TOKEN_SECRET
  );
  
  console.log('OAuth header built, posting...');
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  console.log('Response status:', response.status);
  
  const responseText = await response.text();
  console.log('Response body:', responseText);
  
  if (!response.ok) {
    throw new Error(`Twitter API error (${response.status}): ${responseText}`);
  }
  
  const result = JSON.parse(responseText);
  console.log('✅ Tweet posted! ID:', result.data?.id);
  
  return {
    posted: true,
    post_id: result.data.id,
    timestamp: new Date().toISOString(),
    platform: 'twitter'
  };
}

async function buildOAuth1Header(
  method: string,
  url: string,
  body: Record<string, any>,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessTokenSecret: string
): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();
  
  // OAuth parameters
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_token: accessToken,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_nonce: nonce,
    oauth_version: '1.0'
  };
  
  // All parameters for signature (OAuth + body)
  const allParams: Record<string, string> = {
    ...oauthParams,
    ...body
  };
  
  // Sort and encode for signature base string
  const paramString = Object.keys(allParams)
    .sort()
    .map(key => `${encodeParam(key)}=${encodeParam(String(allParams[key]))}`)
    .join('&');
  
  // Create signature base string
  const signatureBase = [
    method.toUpperCase(),
    encodeParam(url),
    encodeParam(paramString)
  ].join('&');
  
  // Create signing key
  const signingKey = `${encodeParam(consumerSecret)}&${encodeParam(accessTokenSecret)}`;
  
  // Generate HMAC-SHA1 signature
  const signature = await hmacSha1(signingKey, signatureBase);
  oauthParams.oauth_signature = signature;
  
  // Build Authorization header
  const authorizationHeader = 'OAuth ' + Object.keys(oauthParams)
    .sort()
    .map(key => `${encodeParam(key)}="${encodeParam(oauthParams[key])}"`)
    .join(', ');
  
  return authorizationHeader;
}

function encodeParam(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
}

async function hmacSha1(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

function buildTwitterPost(episode: Episode): string {
  const primaryLink = episode.layer1_links.youtube || episode.layer1_links.spotify || '';
  const shortTitle = episode.title.substring(0, 100) + (episode.title.length > 100 ? '...' : '');
  
  const lines = [
    `🎙️ New AI-Now Episode!`,
    ``,
    shortTitle,
    ``,
    `🎧 ${primaryLink}`,
    ``,
    `#AINow #AI #Podcast`
  ];
  
  const draft = lines.join('\n');
  
  if (draft.length > 280) {
    return draft.substring(0, 277) + '...';
  }
  
  return draft;
}

function jsonResponse(data: any, status: number = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  });
}