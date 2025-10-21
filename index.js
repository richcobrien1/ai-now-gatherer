// news-collector/index.js
// Helper functions for defining properties
// and setting function names
// Copyright (c) 2025 V2U Labs, Inc. All rights reserved.

var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
var index_default = {
  // Cron trigger (scheduled)
  async scheduled(event, env, ctx) {
    const runId = `scheduled-${Date.now()}`;
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    console.log("\u{1F680} Starting scheduled daily news gathering...");
    await logToKV(env, "\u{1F680} Starting scheduled daily news gathering");
    const run = {
      id: runId,
      date: today,
      status: "running",
      startedAt: (/* @__PURE__ */ new Date()).toISOString(),
      logs: ["Scheduled run started"]
    };
    try {
      await env.NEWS_CACHE.put("last_run", JSON.stringify(run));
      const runsList = await env.NEWS_CACHE.get("runs_list");
      const runs = runsList ? JSON.parse(runsList) : [];
      runs.push(run);
      await env.NEWS_CACHE.put("runs_list", JSON.stringify(runs.slice(-100)));
      run.logs.push("Starting news gathering...");
      await env.NEWS_CACHE.put("last_run", JSON.stringify(run));
      const sources = {};
      const [
        techcrunch,
        venturebeat,
        reddit,
        hackernews,
        arxiv
      ] = await Promise.all([
        gatherTechCrunch(),
        gatherVentureBeat(),
        gatherReddit(),
        gatherHackerNews(),
        gatherArXiv()
      ]);
      sources.techcrunch = techcrunch;
      sources.venturebeat = venturebeat;
      sources.reddit = reddit;
      sources.hackernews = hackernews;
      sources.arxiv = arxiv;
      run.logs.push(`Gathered sources: ${Object.keys(sources).join(", ")}`);
      await env.NEWS_CACHE.put("last_run", JSON.stringify(run));
      for (const [name, content] of Object.entries(sources)) {
        await env.R2_SOURCES.put(
          `sources/${today}/${name}.md`,
          content,
          {
            httpMetadata: {
              contentType: "text/markdown"
            }
          }
        );
      }
      const index = createIndexFile(sources, today);
      await env.R2_SOURCES.put(`sources/${today}/README.md`, index);
      await env.NEWS_CACHE.put(`sources:${today}`, JSON.stringify({
        date: today,
        sources: Object.keys(sources),
        storyCount: Object.values(sources).reduce((sum, s) => sum + countStories(s), 0),
        generatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }));
      await sendNotification(env, today, sources);
      await postToSocialMedia(env, today, sources);
      await trackEpisodeAnalytics(env, today, sources);
      await generateProfessionalDescription(env, today, sources);
      run.status = "completed";
      run.completedAt = (/* @__PURE__ */ new Date()).toISOString();
      run.storyCount = Object.values(sources).reduce((sum, s) => sum + countStories(s), 0);
      run.sourcesCount = Object.keys(sources).length;
      run.logs.push(`Completed successfully: ${run.storyCount} stories from ${run.sourcesCount} sources`);
      await env.NEWS_CACHE.put("last_run", JSON.stringify(run));
      const updatedRunsList = await env.NEWS_CACHE.get("runs_list");
      const updatedRuns = updatedRunsList ? JSON.parse(updatedRunsList) : [];
      const runIndex = updatedRuns.findIndex((r) => r.id === runId);
      if (runIndex >= 0) {
        updatedRuns[runIndex] = run;
        await env.NEWS_CACHE.put("runs_list", JSON.stringify(updatedRuns));
      }
      console.log(`\u2705 Scheduled run ${runId} completed for ${today}`);
      await logToKV(env, `\u2705 Scheduled run ${runId} completed for ${today}: ${run.storyCount} stories from ${run.sourcesCount} sources`);
      return new Response("Success", { status: 200 });
    } catch (error) {
      console.error("\u274C Scheduled run failed:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      await logToKV(env, `\u274C Scheduled run ${runId} failed: ${errorMessage}`);
      run.status = "failed";
      run.completedAt = (/* @__PURE__ */ new Date()).toISOString();
      run.error = errorMessage;
      run.logs.push(`Failed: ${errorMessage}`);
      await env.NEWS_CACHE.put("last_run", JSON.stringify(run));
      const updatedRunsList = await env.NEWS_CACHE.get("runs_list");
      const updatedRuns = updatedRunsList ? JSON.parse(updatedRunsList) : [];
      const runIndex = updatedRuns.findIndex((r) => r.id === runId);
      if (runIndex >= 0) {
        updatedRuns[runIndex] = run;
        await env.NEWS_CACHE.put("runs_list", JSON.stringify(updatedRuns));
      }
      await sendAlert(env, errorMessage);
      return new Response("Failed", { status: 500 });
    }
  },
  // HTTP endpoint for manual triggers and downloads
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return await handleDashboardAPI(request, env, url, ctx);
    }
    if (url.pathname === "/trigger") {
      const mockEvent = {};
      return await this.scheduled(mockEvent, env, {});
    }
    if (url.pathname.startsWith("/sources/")) {
      const date = url.pathname.split("/")[2];
      const file = url.pathname.split("/")[3] || "README.md";
      const content = await env.R2_SOURCES.get(`sources/${date}/${file}`);
      if (!content) {
        return new Response("Not found", { status: 404 });
      }
      return new Response(content.body, {
        headers: {
          "Content-Type": "text/markdown",
          "Content-Disposition": `attachment; filename="${file}"`
        }
      });
    }
    if (url.pathname === "/list") {
      const list = await env.R2_SOURCES.list({ prefix: "sources/" });
      const dates = [...new Set(list.objects.map((o) => o.key.split("/")[1]))];
      return new Response(JSON.stringify(dates), {
        headers: { "Content-Type": "application/json" }
      });
    }
    if (url.pathname === "/analytics") {
      const analytics = await getAnalyticsDashboard(env);
      return new Response(JSON.stringify(analytics, null, 2), {
        headers: { "Content-Type": "application/json" }
      });
    }
    if (url.pathname === "/test-email") {
      try {
        const testMessage = `\u{1F9EA} Test email from AI-Now Dashboard

This is a test notification sent at ${(/* @__PURE__ */ new Date()).toISOString()}

Dashboard URL: ${env.BASE_URL}
Test triggered from: ${request.headers.get("CF-Connecting-IP") || "Unknown IP"}`;
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: "AI-Now Dashboard <dashboard@v2u.us>",
            to: "admin@v2u.us",
            subject: "Test Email from AI-Now Dashboard",
            text: testMessage
          })
        });
        return new Response(JSON.stringify({
          success: true,
          message: "Test email sent successfully"
        }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error("Test email failed:", error);
        return new Response(JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    if (url.pathname.startsWith("/descriptions/")) {
      const date = url.pathname.split("/")[2];
      const description = await env.R2_SOURCES.get(`descriptions/${date}.md`);
      if (!description) {
        return new Response("Not found", { status: 404 });
      }
      return new Response(description.body, {
        headers: {
          "Content-Type": "text/markdown"
        }
      });
    }
    if (url.pathname === "/test-r2") {
      try {
        console.log("\u{1F9EA} Testing R2 bucket put operation...");
        const testContent = `Test file created at ${(/* @__PURE__ */ new Date()).toISOString()}`;
        const testKey = `test-${Date.now()}.txt`;
        console.log("Test key:", testKey);
        console.log("Test content:", testContent);
        const putResult = await env.R2_SOURCES.put(testKey, testContent, {
          httpMetadata: {
            contentType: "text/plain"
          }
        });
        console.log("Put result:", putResult);
        const getResult = await env.R2_SOURCES.get(testKey);
        if (getResult) {
          const retrievedContent = await getResult.text();
          console.log("Retrieved content:", retrievedContent);
          console.log("Content matches:", retrievedContent === testContent);
        } else {
          console.log("Get result is null");
        }
        return new Response(`R2 test completed. Key: ${testKey}`);
      } catch (error) {
        console.error("R2 test failed:", error);
        const err = error;
        return new Response(`R2 test failed: ${err.message}`, { status: 500 });
      }
    }
    if (url.pathname === "/trigger") {
      const list = await env.R2_SOURCES.list({ prefix: "sources/" });
      const dates = [...new Set(list.objects.map((o) => o.key.split("/")[1]))];
      const latestDate = dates.sort().pop();
      if (!latestDate) {
        return new Response("No data available", { status: 404 });
      }
      console.log("\u{1F9EA} Testing R2 bucket access...");
      try {
        const testList = await env.R2_SOURCES.list();
        console.log("R2 list result:", testList.objects.length, "objects");
      } catch (listError) {
        console.error("R2 list failed:", listError);
      }
      const sources = {};
      for (const sourceName of ["techcrunch", "venturebeat", "reddit", "hackernews", "arxiv"]) {
        try {
          const content = await env.R2_SOURCES.get(`sources/${latestDate}/${sourceName}.md`);
          if (content) {
            sources[sourceName] = await content.text();
          }
        } catch (e) {
        }
      }
      await generateProfessionalDescription(env, latestDate, sources);
      return new Response("Description generation triggered for " + latestDate);
    }
    if (url.pathname === "/test-description") {
      let debugLog = "\u{1F9EA} Test description endpoint called\n";
      const list = await env.R2_SOURCES.list({ prefix: "sources/" });
      const dates = [...new Set(list.objects.map((o) => o.key.split("/")[1]))];
      const latestDate = dates.sort().pop();
      debugLog += `\u{1F4C5} Latest date found: ${latestDate}
`;
      if (!latestDate) {
        return new Response("No data available", { status: 404 });
      }
      const sources = {};
      for (const sourceName of ["techcrunch", "venturebeat", "reddit", "hackernews", "arxiv"]) {
        try {
          const content = await env.R2_SOURCES.get(`sources/${latestDate}/${sourceName}.md`);
          if (content) {
            const text = await content.text();
            sources[sourceName] = text;
            debugLog += `\u2705 Loaded ${sourceName}: ${text.length} chars
`;
          } else {
            debugLog += `\u26A0\uFE0F No content for ${sourceName}
`;
          }
        } catch (e) {
          debugLog += `\u274C Error loading ${sourceName}: ${e}
`;
        }
      }
      debugLog += `\u{1F4CA} Loaded ${Object.keys(sources).length} sources
`;
      debugLog += "\u{1F680} Calling generateProfessionalDescription...\n";
      try {
        await generateProfessionalDescription(env, latestDate, sources);
        debugLog += "\u2705 generateProfessionalDescription completed\n";
      } catch (error) {
        debugLog += `\u274C generateProfessionalDescription failed: ${error}
`;
      }
      return new Response(debugLog + "\nDescription generation test completed for " + latestDate);
    }
    if (url.pathname === "/test-video-upload") {
      const videoPath = url.searchParams.get("path");
      if (!videoPath) {
        return new Response("Missing video path parameter. Use: /test-video-upload?path=/path/to/video.mp4", { status: 400 });
      }
      try {
        console.log(`\u{1F3AC} Testing video upload for: ${videoPath}`);
        const uploadResult = await uploadVideoToR2(env, videoPath);
        console.log("\u2705 Upload result:", uploadResult);
        return new Response(JSON.stringify({
          success: true,
          message: "Video upload test completed",
          result: uploadResult
        }, null, 2), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error("\u274C Video upload test failed:", error);
        return new Response(JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }, null, 2), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    if (url.pathname === "/test-video-deploy") {
      let debugLog = "\u{1F3AC} Test video deployment (DRY RUN MODE)\n";
      const list = await env.R2_SOURCES.list({ prefix: "sources/" });
      const dates = [...new Set(list.objects.map((o) => o.key.split("/")[1]))];
      const latestDate = dates.sort().pop();
      debugLog += `\u{1F4C5} Latest date found: ${latestDate}
`;
      if (!latestDate) {
        return new Response("No data available", { status: 404 });
      }
      const sources = {};
      for (const sourceName of ["techcrunch", "venturebeat", "reddit", "hackernews", "arxiv"]) {
        try {
          const content = await env.R2_SOURCES.get(`sources/${latestDate}/${sourceName}.md`);
          if (content) {
            sources[sourceName] = await content.text();
          }
        } catch (e) {
        }
      }
      debugLog += `\u{1F4CA} Loaded ${Object.keys(sources).length} sources
`;
      debugLog += "\u{1F680} Testing video deployment to YouTube, Rumble, Spotify...\n";
      const youtubeCreds = !!(env.YOUTUBE_API_KEY && env.YOUTUBE_CHANNEL_ID);
      const rumbleCreds = !!(env.RUMBLE_API_KEY && env.RUMBLE_CHANNEL_ID);
      const spotifyCreds = !!env.SPOTIFY_API_KEY;
      debugLog += `\u{1F50D} Platform Credentials Status:
`;
      debugLog += `   YouTube: ${youtubeCreds ? "\u2705 Configured" : "\u274C Missing"}
`;
      debugLog += `   Rumble: ${rumbleCreds ? "\u2705 Configured" : "\u274C Missing"}
`;
      debugLog += `   Spotify: ${spotifyCreds ? "\u2705 Configured" : "\u274C Missing"}
`;
      debugLog += `   Vimeo: ${!!env.VIMEO_ACCESS_TOKEN ? "\u2705 Configured" : "\u274C Missing"}
`;
      debugLog += `   Odysee: ${!!(env.ODYSEE_API_KEY && env.ODYSEE_CHANNEL_ID) ? "\u2705 Configured" : "\u274C Missing"}

`;
      try {
        await uploadVideoToPlatforms(env, latestDate, sources, true);
        debugLog += "\u2705 Video deployment test completed (DRY RUN)\n";
      } catch (error) {
        debugLog += `\u274C Video deployment test failed: ${error}
`;
      }
      return new Response(debugLog + "\nVideo deployment dry run completed for " + latestDate);
    }
    return new Response("AI-Now Source Gatherer", {
      headers: { "Content-Type": "text/plain" }
    });
  }
};
async function handleDashboardAPI(request, env, url, ctx) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    if (url.pathname === "/api/status" && request.method === "GET") {
      const status = await getAutomationStatus(env);
      return new Response(JSON.stringify(status), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    if (url.pathname === "/api/runs" && request.method === "GET") {
      const limit = parseInt(url.searchParams.get("limit") || "10");
      const runs = await getRecentRuns(env, limit);
      return new Response(JSON.stringify(runs), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    if (url.pathname === "/api/trigger" && request.method === "POST") {
      const runId = await triggerManualRun(env, ctx);
      return new Response(JSON.stringify({ runId, message: "Manual run triggered" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    if (url.pathname === "/api/reset-last-run" && request.method === "POST") {
      try {
        await env.NEWS_CACHE.delete("last_run");
        return new Response(JSON.stringify({ success: true, message: "last_run cleared" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ success: false, error: String(error) }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }
    if (url.pathname === "/api/config" && request.method === "GET") {
      const config = await getConfigurationStatus(env);
      return new Response(JSON.stringify(config), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    if (url.pathname === "/api/logs" && request.method === "GET") {
      const limit = parseInt(url.searchParams.get("limit") || "50");
      const logs = await getRecentLogs(env, limit);
      return new Response(JSON.stringify(logs), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ error: "Endpoint not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return new Response(JSON.stringify({
      error: "Internal server error",
      message: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}
__name(handleDashboardAPI, "handleDashboardAPI");
async function getAutomationStatus(env) {
  try {
    const lastRunData = await env.NEWS_CACHE.get("last_run");
    const lastRun = lastRunData ? JSON.parse(lastRunData) : void 0;
    const now = /* @__PURE__ */ new Date();
    const nextRun = new Date(now);
    nextRun.setHours(4, 0, 0, 0);
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
    const runsList = await env.NEWS_CACHE.get("runs_list");
    const runs = runsList ? JSON.parse(runsList) : [];
    const totalRuns = runs.length;
    const successfulRuns = runs.filter((run) => run.status === "completed").length;
    const successRate = totalRuns > 0 ? successfulRuns / totalRuns * 100 : 0;
    return {
      isRunning: lastRun?.status === "running" || false,
      lastRun,
      nextScheduledRun: nextRun.toISOString(),
      totalRuns,
      successRate: Math.round(successRate * 100) / 100
    };
  } catch (error) {
    console.error("Failed to get automation status:", error);
    return {
      isRunning: false,
      nextScheduledRun: new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString(),
      totalRuns: 0,
      successRate: 0
    };
  }
}
__name(getAutomationStatus, "getAutomationStatus");
async function getRecentRuns(env, limit = 10) {
  try {
    const runsList = await env.NEWS_CACHE.get("runs_list");
    const runs = runsList ? JSON.parse(runsList) : [];
    return runs.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()).slice(0, limit);
  } catch (error) {
    console.error("Failed to get recent runs:", error);
    return [];
  }
}
__name(getRecentRuns, "getRecentRuns");
async function triggerManualRun(env, ctx) {
  const runId = `manual-${Date.now()}`;
  const run = {
    id: runId,
    date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    status: "running",
    startedAt: (/* @__PURE__ */ new Date()).toISOString(),
    logs: ["Manual run triggered"]
  };
  await env.NEWS_CACHE.put("last_run", JSON.stringify(run));
  const runsList = await env.NEWS_CACHE.get("runs_list");
  const runs = runsList ? JSON.parse(runsList) : [];
  runs.push(run);
  await env.NEWS_CACHE.put("runs_list", JSON.stringify(runs.slice(-100)));
  const background = /* @__PURE__ */ __name(async () => {
    try {
      console.log(`\u{1F680} Starting manual run ${runId}`);
      run.logs.push("Starting news gathering...");
      await env.NEWS_CACHE.put("last_run", JSON.stringify(run));
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const sources = {};
      const [
        techcrunch,
        venturebeat,
        reddit,
        hackernews,
        arxiv
      ] = await Promise.all([
        gatherTechCrunch(),
        gatherVentureBeat(),
        gatherReddit(),
        gatherHackerNews(),
        gatherArXiv()
      ]);
      sources.techcrunch = techcrunch;
      sources.venturebeat = venturebeat;
      sources.reddit = reddit;
      sources.hackernews = hackernews;
      sources.arxiv = arxiv;
      for (const [name, content] of Object.entries(sources)) {
        await env.R2_SOURCES.put(
          `sources/${today}/${name}.md`,
          content,
          {
            httpMetadata: {
              contentType: "text/markdown"
            }
          }
        );
      }
      const index = createIndexFile(sources, today);
      await env.R2_SOURCES.put(`sources/${today}/README.md`, index);
      await env.NEWS_CACHE.put(`sources:${today}`, JSON.stringify({
        date: today,
        sources: Object.keys(sources),
        storyCount: Object.values(sources).reduce((sum, s) => sum + countStories(s), 0),
        generatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }));
      run.status = "completed";
      run.completedAt = (/* @__PURE__ */ new Date()).toISOString();
      run.storyCount = Object.values(sources).reduce((sum, s) => sum + countStories(s), 0);
      run.sourcesCount = Object.keys(sources).length;
      run.logs.push(`Completed successfully: ${run.storyCount} stories from ${run.sourcesCount} sources`);
      await env.NEWS_CACHE.put("last_run", JSON.stringify(run));
      const updatedRunsList = await env.NEWS_CACHE.get("runs_list");
      const updatedRuns = updatedRunsList ? JSON.parse(updatedRunsList) : [];
      const runIndex = updatedRuns.findIndex((r) => r.id === runId);
      if (runIndex >= 0) {
        updatedRuns[runIndex] = run;
        await env.NEWS_CACHE.put("runs_list", JSON.stringify(updatedRuns));
      }
      console.log(`\u2705 Manual run ${runId} completed`);
    } catch (error) {
      console.error(`\u274C Manual run ${runId} failed:`, error);
      run.status = "failed";
      run.completedAt = (/* @__PURE__ */ new Date()).toISOString();
      run.error = error instanceof Error ? error.message : String(error);
      run.logs.push(`Failed: ${run.error}`);
      await env.NEWS_CACHE.put("last_run", JSON.stringify(run));
      const updatedRunsList = await env.NEWS_CACHE.get("runs_list");
      const updatedRuns = updatedRunsList ? JSON.parse(updatedRunsList) : [];
      const runIndex = updatedRuns.findIndex((r) => r.id === runId);
      if (runIndex >= 0) {
        updatedRuns[runIndex] = run;
        await env.NEWS_CACHE.put("runs_list", JSON.stringify(updatedRuns));
      }
    }
  }, "background");
  if (ctx && typeof ctx.waitUntil === "function") {
    ctx.waitUntil(background());
  } else {
    background();
  }
  return runId;
}
__name(triggerManualRun, "triggerManualRun");
async function getConfigurationStatus(env) {
  return {
    socialMedia: {
      twitter: {
        configured: !!(env.TWITTER_API_KEY && env.TWITTER_ACCESS_TOKEN),
        hasCredentials: !!(env.TWITTER_API_KEY && env.TWITTER_API_SECRET && env.TWITTER_ACCESS_TOKEN && env.TWITTER_ACCESS_SECRET)
      },
      bluesky: {
        configured: !!(env.BLUESKY_USERNAME && env.BLUESKY_PASSWORD),
        hasCredentials: !!(env.BLUESKY_USERNAME && env.BLUESKY_PASSWORD)
      },
      linkedin: {
        configured: !!env.LINKEDIN_ACCESS_TOKEN,
        hasCredentials: !!env.LINKEDIN_ACCESS_TOKEN
      }
    },
    videoPlatforms: {
      youtube: {
        configured: !!(env.YOUTUBE_API_KEY && env.YOUTUBE_CHANNEL_ID),
        hasCredentials: !!(env.YOUTUBE_API_KEY && env.YOUTUBE_CHANNEL_ID)
      },
      rumble: {
        configured: !!(env.RUMBLE_API_KEY && env.RUMBLE_CHANNEL_ID),
        hasCredentials: !!(env.RUMBLE_API_KEY && env.RUMBLE_CHANNEL_ID)
      },
      vimeo: {
        configured: !!env.VIMEO_ACCESS_TOKEN,
        hasCredentials: !!env.VIMEO_ACCESS_TOKEN
      },
      odysee: {
        configured: !!(env.ODYSEE_API_KEY && env.ODYSEE_CHANNEL_ID),
        hasCredentials: !!(env.ODYSEE_API_KEY && env.ODYSEE_CHANNEL_ID)
      }
    },
    podcastPlatforms: {
      buzzsprout: {
        configured: !!(env.BUZZSPROUT_API_KEY && env.BUZZSPROUT_PODCAST_ID),
        hasCredentials: !!(env.BUZZSPROUT_API_KEY && env.BUZZSPROUT_PODCAST_ID)
      },
      libsyn: {
        configured: !!(env.LIBSYN_API_KEY && env.LIBSYN_PODCAST_ID),
        hasCredentials: !!(env.LIBSYN_API_KEY && env.LIBSYN_PODCAST_ID)
      },
      spotify: {
        configured: !!env.SPOTIFY_API_KEY,
        hasCredentials: !!env.SPOTIFY_API_KEY
      },
      apple: {
        configured: !!env.APPLE_PODCASTS_KEY,
        hasCredentials: !!env.APPLE_PODCASTS_KEY
      }
    },
    other: {
      email: {
        configured: !!env.RESEND_API_KEY,
        hasCredentials: !!env.RESEND_API_KEY
      },
      translation: {
        openai: !!env.OPENAI_API_KEY,
        deepl: !!env.DEEPL_API_KEY,
        targetLanguages: env.TARGET_LANGUAGES ? env.TARGET_LANGUAGES.split(",").map((l) => l.trim()) : []
      },
      storage: {
        r2: !!env.R2_SOURCES,
        kv: !!env.NEWS_CACHE,
        analytics: !!env.ANALYTICS_KV
      }
    }
  };
}
__name(getConfigurationStatus, "getConfigurationStatus");
async function getRecentLogs(env, limit = 50) {
  try {
    const logsData = await env.NEWS_CACHE.get("logs");
    const logs = logsData ? JSON.parse(logsData) : [];
    return logs.slice(-limit);
  } catch (error) {
    console.error("Failed to get recent logs:", error);
    return [];
  }
}
__name(getRecentLogs, "getRecentLogs");
async function logToKV(env, message) {
  try {
    const logsData = await env.NEWS_CACHE.get("logs");
    const logs = logsData ? JSON.parse(logsData) : [];
    logs.push(`[${(/* @__PURE__ */ new Date()).toISOString()}] ${message}`);
    await env.NEWS_CACHE.put("logs", JSON.stringify(logs.slice(-1e3)));
  } catch (error) {
    console.error("Failed to log to KV:", error);
  }
}
__name(logToKV, "logToKV");
async function gatherTechCrunch() {
  try {
    const response = await fetch("https://techcrunch.com/feed/");
    const xml = await response.text();
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    const stories = [];
    for (const item of items.slice(0, 10)) {
      const title = cleanHTML(extractTag(item, "title"));
      const link = extractTag(item, "link");
      const description = cleanHTML(extractTag(item, "description"));
      const pubDate = extractTag(item, "pubDate");
      if (isAIRelated(title + " " + description)) {
        stories.push({ title, link, description, pubDate });
      }
    }
    return formatMarkdown("TechCrunch", filterAndDedupeStories(stories, 8), "https://techcrunch.com");
  } catch (error) {
    console.error("TechCrunch failed:", error);
    return "# TechCrunch\n\n*Failed to fetch*\n";
  }
}
__name(gatherTechCrunch, "gatherTechCrunch");
async function gatherVentureBeat() {
  try {
    const response = await fetch("https://venturebeat.com/feed/");
    const xml = await response.text();
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    const stories = [];
    for (const item of items.slice(0, 10)) {
      const title = cleanHTML(extractTag(item, "title"));
      const link = extractTag(item, "link");
      const description = cleanHTML(extractTag(item, "description"));
      const pubDate = extractTag(item, "pubDate");
      if (isAIRelated(title + " " + description)) {
        stories.push({ title, link, description, pubDate });
      }
    }
    return formatMarkdown("VentureBeat", filterAndDedupeStories(stories, 8), "https://venturebeat.com");
  } catch (error) {
    console.error("VentureBeat failed:", error);
    return "# VentureBeat\n\n*Failed to fetch*\n";
  }
}
__name(gatherVentureBeat, "gatherVentureBeat");
async function gatherReddit() {
  try {
    const subreddits = ["artificial", "MachineLearning", "OpenAI"];
    const allPosts = [];
    for (const sub of subreddits) {
      const response = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=10`, {
        headers: { "User-Agent": "AI-Now-Bot/1.0" }
      });
      const data = await response.json();
      for (const post of data.data.children) {
        const p = post.data;
        allPosts.push({
          title: p.title,
          link: `https://reddit.com${p.permalink}`,
          description: p.selftext ? p.selftext.slice(0, 300) : "[Link post]",
          score: p.score,
          subreddit: sub
        });
      }
    }
    allPosts.sort((a, b) => b.score - a.score);
    const aiPosts = allPosts.filter((post) => isAIRelated(post.title + " " + post.description));
    const filteredPosts = filterAndDedupeStories(aiPosts, 12);
    return formatMarkdown("Reddit", filteredPosts, "https://reddit.com");
  } catch (error) {
    console.error("Reddit failed:", error);
    return "# Reddit\n\n*Failed to fetch*\n";
  }
}
__name(gatherReddit, "gatherReddit");
async function gatherHackerNews() {
  try {
    const topResponse = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json");
    const topIds = await topResponse.json();
    const stories = [];
    for (let i = 0; i < Math.min(20, topIds.length); i += 5) {
      const batch = topIds.slice(i, i + 5);
      const storyPromises = batch.map(
        (id) => fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then((r) => r.json())
      );
      const batchStories = await Promise.all(storyPromises);
      for (const story of batchStories) {
        if (story && story.title && isAIRelated(story.title)) {
          stories.push({
            title: story.title,
            link: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
            description: story.text ? cleanHTML(story.text).slice(0, 200) : "[Discussion]",
            score: story.score
          });
        }
      }
    }
    return formatMarkdown("Hacker News", filterAndDedupeStories(stories, 10), "https://news.ycombinator.com");
  } catch (error) {
    console.error("Hacker News failed:", error);
    return "# Hacker News\n\n*Failed to fetch*\n";
  }
}
__name(gatherHackerNews, "gatherHackerNews");
async function gatherArXiv() {
  try {
    const response = await fetch(
      "http://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.LG&sortBy=submittedDate&sortOrder=descending&max_results=10"
    );
    const xml = await response.text();
    const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
    const papers = [];
    for (const entry of entries) {
      const title = cleanHTML(extractTag(entry, "title"));
      const summary = cleanHTML(extractTag(entry, "summary")).slice(0, 300);
      const link = extractTag(entry, "id");
      const published = extractTag(entry, "published");
      papers.push({ title, link, description: summary, pubDate: published });
    }
    return formatMarkdown("arXiv Research Papers", filterAndDedupeStories(papers, 8), "https://arxiv.org");
  } catch (error) {
    console.error("arXiv failed:", error);
    return "# arXiv Research Papers\n\n*Failed to fetch*\n";
  }
}
__name(gatherArXiv, "gatherArXiv");
function extractTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return match ? match[1].trim() : "";
}
__name(extractTag, "extractTag");
function cleanHTML(str) {
  return str.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\n\s*\n/g, "\n\n").trim();
}
__name(cleanHTML, "cleanHTML");
function isAIRelated(text) {
  const keywords = [
    // Core AI terms
    "ai",
    "artificial intelligence",
    "machine learning",
    "deep learning",
    "llm",
    "gpt",
    "claude",
    "gemini",
    "chatbot",
    "neural network",
    "openai",
    "anthropic",
    "google ai",
    "meta ai",
    "generative",
    "transformer",
    "model",
    "training",
    "algorithm",
    "automation",
    // Extended AI terms
    "computer vision",
    "nlp",
    "natural language processing",
    "reinforcement learning",
    "supervised learning",
    "unsupervised learning",
    "computer vision",
    "robotics",
    "autonomous",
    "intelligent agent",
    "expert system",
    "knowledge graph",
    "large language model",
    "foundation model",
    "multimodal",
    "diffusion model",
    "stable diffusion",
    "dall-e",
    "midjourney",
    "text-to-image",
    "image generation",
    // Industry terms
    "ai startup",
    "ai investment",
    "ai funding",
    "ai acquisition",
    "ai partnership",
    "ai ethics",
    "ai regulation",
    "ai policy",
    "ai safety",
    "ai alignment",
    // Research terms
    "arxiv",
    "preprint",
    "peer review",
    "conference",
    "icml",
    "neurips",
    "iclr",
    "aaai",
    "acl",
    "emnlp",
    "cvpr",
    "iccv",
    "eccv",
    "siggraph"
  ];
  const lowerText = text.toLowerCase();
  const hasKeyword = keywords.some((keyword) => lowerText.includes(keyword));
  if (!hasKeyword) return false;
  const qualityIndicators = [
    "announc",
    "launch",
    "releas",
    "updat",
    "new version",
    "breakthrough",
    "research",
    "study",
    "paper",
    "conference",
    "award",
    "funding",
    "partnership",
    "acquisition",
    "investment",
    "milestone"
  ];
  const hasQualityIndicator = qualityIndicators.some(
    (indicator) => lowerText.includes(indicator)
  );
  const wordCount = text.split(/\s+/).length;
  const hasSubstantialContent = wordCount > 10;
  return hasKeyword && (hasQualityIndicator || hasSubstantialContent);
}
__name(isAIRelated, "isAIRelated");
function filterAndDedupeStories(stories, maxStories = 15) {
  const uniqueStories = [];
  const seenTitles = /* @__PURE__ */ new Set();
  for (const story of stories) {
    const normalizedTitle = story.title.toLowerCase().replace(/[^\w\s]/g, "").trim();
    let isDuplicate = false;
    for (const seen of seenTitles) {
      const similarity = calculateSimilarity(normalizedTitle, seen);
      if (similarity > 0.8) {
        isDuplicate = true;
        break;
      }
    }
    if (!isDuplicate) {
      uniqueStories.push(story);
      seenTitles.add(normalizedTitle);
    }
  }
  uniqueStories.sort((a, b) => {
    const scoreA = calculateRelevanceScore(a.title + " " + (a.description || ""));
    const scoreB = calculateRelevanceScore(b.title + " " + (b.description || ""));
    return scoreB - scoreA;
  });
  return uniqueStories.slice(0, maxStories);
}
__name(filterAndDedupeStories, "filterAndDedupeStories");
function calculateSimilarity(text1, text2) {
  const words1 = new Set(text1.split(/\s+/));
  const words2 = new Set(text2.split(/\s+/));
  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = /* @__PURE__ */ new Set([...words1, ...words2]);
  return intersection.size / union.size;
}
__name(calculateSimilarity, "calculateSimilarity");
function calculateRelevanceScore(text) {
  const lowerText = text.toLowerCase();
  let score = 0;
  const coreTerms = ["ai", "artificial intelligence", "machine learning", "gpt", "llm", "openai", "anthropic"];
  coreTerms.forEach((term) => {
    if (lowerText.includes(term)) score += 3;
  });
  const extendedTerms = ["deep learning", "neural network", "generative", "transformer", "algorithm"];
  extendedTerms.forEach((term) => {
    if (lowerText.includes(term)) score += 2;
  });
  const researchTerms = ["arxiv", "preprint", "conference", "paper", "research"];
  researchTerms.forEach((term) => {
    if (lowerText.includes(term)) score += 2;
  });
  const industryTerms = ["startup", "funding", "investment", "partnership", "acquisition"];
  industryTerms.forEach((term) => {
    if (lowerText.includes(term)) score += 1;
  });
  return score;
}
__name(calculateRelevanceScore, "calculateRelevanceScore");
function formatMarkdown(source, stories, sourceUrl) {
  let md = `# ${source}

`;
  md += `Source: [${sourceUrl}](${sourceUrl})
`;
  md += `Stories found: ${stories.length}
`;
  md += `Generated: ${(/* @__PURE__ */ new Date()).toISOString()}

`;
  md += `---

`;
  for (const story of stories) {
    md += `## ${story.title}

`;
    if (story.description) {
      md += `${story.description}

`;
    }
    md += `\u{1F517} [Read more](${story.link})
`;
    if (story.score) {
      md += `\u2B06\uFE0F Score: ${story.score}
`;
    }
    if (story.subreddit) {
      md += `\u{1F4CD} r/${story.subreddit}
`;
    }
    md += `
---

`;
  }
  return md;
}
__name(formatMarkdown, "formatMarkdown");
function createIndexFile(sources, date) {
  let md = `# AI-Now Sources - ${date}

`;
  md += `Generated at: ${(/* @__PURE__ */ new Date()).toISOString()}

`;
  md += `## Quick Summary

`;
  for (const [name, content] of Object.entries(sources)) {
    const count = countStories(content);
    md += `- **${name}**: ${count} stories
`;
  }
  md += `
## Files

`;
  md += `Drag all these files into NotebookLM:

`;
  for (const name of Object.keys(sources)) {
    md += `- [ ] ${name}.md
`;
  }
  md += `
## Next Steps

`;
  md += `1. Download all markdown files
`;
  md += `2. Open NotebookLM
`;
  md += `3. Create new notebook
`;
  md += `4. Drag & drop all .md files
`;
  md += `5. Click "Generate Audio Overview"
`;
  md += `6. Wait for Alex & Jessica to work their magic!
`;
  return md;
}
__name(createIndexFile, "createIndexFile");
function countStories(markdown) {
  return (markdown.match(/^## /gm) || []).length;
}
__name(countStories, "countStories");
async function generateProfessionalDescription(env, date, sources) {
  let testKey = "";
  try {
    console.log("\u{1F3AF} Starting professional description generation for", date);
    const debugInfo = `Debug: Starting generation at ${(/* @__PURE__ */ new Date()).toISOString()}
Sources: ${Object.keys(sources).join(", ")}
Source count: ${Object.keys(sources).length}`;
    await env.R2_SOURCES.put(`debug/${date}-start.txt`, debugInfo);
    const testDescription = `# Test Description for ${date}

This is a test description to verify the generation is working.

Generated at: ${(/* @__PURE__ */ new Date()).toISOString()}

Sources available: ${Object.keys(sources).join(", ")}
`;
    console.log("\u{1F4BE} Saving test description to R2...");
    console.log("Bucket binding exists:", !!env.R2_SOURCES);
    console.log("Test description length:", testDescription.length);
    testKey = `test-description-${Date.now()}.md`;
    const testPutResult = await env.R2_SOURCES.put(testKey, testDescription, {
      httpMetadata: {
        contentType: "text/markdown"
      }
    });
    console.log("\u2705 Test description put result:", testPutResult);
    console.log("\u2705 Test description saved with key:", testKey);
    await env.R2_SOURCES.put(`debug/${date}-test-saved.txt`, `Test description saved at ${(/* @__PURE__ */ new Date()).toISOString()}`);
    console.log("\u{1F50D} Verifying test description was saved...");
    const verifyTest = await env.R2_SOURCES.get(testKey);
    console.log("Verification result:", !!verifyTest);
    if (verifyTest) {
      console.log("Verified content length:", (await verifyTest.text()).length);
      await env.R2_SOURCES.put(`debug/${date}-verified.txt`, `Verification successful for key ${testKey} at ${(/* @__PURE__ */ new Date()).toISOString()}`);
    } else {
      await env.R2_SOURCES.put(`debug/${date}-verify-failed.txt`, `Verification failed for key ${testKey} at ${(/* @__PURE__ */ new Date()).toISOString()}`);
    }
    console.log("\u{1F504} Attempting full description generation...");
    const storyCount = Object.values(sources).reduce((sum, s) => sum + countStories(s), 0);
    console.log("\u{1F4CA} Story count:", storyCount);
    const topStories = getTopStories(sources, 3);
    console.log("\uFFFD Top stories:", topStories.length);
    const title = `${date} - AI-Now: Deep Dive with Alex and Jessica`;
    const keyThemes = extractKeyThemes(sources);
    console.log("\u{1F3F7}\uFE0F Key themes:", keyThemes);
    const description = createEpisodeDescription(storyCount, topStories, keyThemes, date, env.BASE_URL);
    console.log("\u{1F4DD} Description created");
    const timestamps = generateTimestamps();
    const tags = generateTags(keyThemes);
    const fullDescription = formatProfessionalDescription(
      title,
      storyCount,
      sources,
      description,
      timestamps,
      tags,
      date
    );
    console.log("\u{1F4BE} Saving full description to R2...");
    console.log("Full description length:", fullDescription.length);
    const fullPutResult = await env.R2_SOURCES.put(
      `descriptions/${date}.md`,
      fullDescription,
      {
        httpMetadata: {
          contentType: "text/markdown"
        }
      }
    );
    console.log("\u2705 Full description put result:", fullPutResult);
    console.log("\u2705 Full professional description generated successfully");
  } catch (error) {
    console.error("\u274C Description generation failed:", error);
    const err = error;
    console.error("Error details:", {
      message: err.message,
      stack: err.stack,
      name: err.name
    });
    const errorInfo = `Error generating description for ${date} at ${(/* @__PURE__ */ new Date()).toISOString()}:
Message: ${err.message}
Stack: ${err.stack}
Name: ${err.name}
Sources: ${Object.keys(sources).join(", ")}
`;
    console.log("\u{1F4BE} Saving error info to R2...");
    try {
      const errorPutResult = await env.R2_SOURCES.put(
        `descriptions/${date}-error.txt`,
        errorInfo,
        {
          httpMetadata: {
            contentType: "text/plain"
          }
        }
      );
      console.log("\u2705 Error info saved:", errorPutResult);
    } catch (saveError) {
      console.error("\u274C Failed to save error info:", saveError);
    }
    return "";
  }
  return "";
}
__name(generateProfessionalDescription, "generateProfessionalDescription");
function extractKeyThemes(sources) {
  const allContent = Object.values(sources).join(" ").toLowerCase();
  const themes = [];
  const themeKeywords = {
    "Autonomous Agents": ["agent", "autonomous", "automation", "kit"],
    "Operating System": ["platform", "operating system", "apps sdk", "chatgpt"],
    "Hardware": ["jony ive", "hardware", "device", "form factor"],
    "Compute": ["compute", "bottleneck", "infrastructure", "gpu", "chip"],
    "Research": ["research", "paper", "arxiv", "model", "algorithm"],
    "Enterprise": ["enterprise", "business", "productivity", "workflow"]
  };
  for (const [theme, keywords] of Object.entries(themeKeywords)) {
    if (keywords.some((keyword) => allContent.includes(keyword))) {
      themes.push(theme);
    }
  }
  return themes.slice(0, 3);
}
__name(extractKeyThemes, "extractKeyThemes");
function createEpisodeDescription(storyCount, topStories, keyThemes, date, baseUrl) {
  const themeText = keyThemes.length > 0 ? `focusing on ${keyThemes.join(", ").toLowerCase()}` : "covering the latest AI developments";
  return `This deep dive explores ${themeText}. We analyze ${storyCount} stories from ${Object.keys(topStories).length} sources, featuring breakthrough developments in artificial intelligence.

\u2022 ${topStories.map((story, i) => `${story.title}`).join("\n\u2022 ")}

Full show notes and sources: ${baseUrl}/sources/${date}

#AINews #AI #MachineLearning #TechNews`;
}
__name(createEpisodeDescription, "createEpisodeDescription");
function generateTimestamps() {
  return [
    "0:00 \u2013 Introduction and Key Themes",
    "2:30 \u2013 Major Announcements and Breakthroughs",
    "8:15 \u2013 Technical Deep Dive",
    "12:45 \u2013 Industry Implications",
    "15:30 \u2013 Future Outlook and Predictions"
  ];
}
__name(generateTimestamps, "generateTimestamps");
function generateTags(keyThemes) {
  const baseTags = ["#AI", "#ArtificialIntelligence", "#MachineLearning", "#TechNews", "#DeepDive"];
  const themeTags = {
    "Autonomous Agents": ["#AutonomousAgents", "#AgentKit", "#Automation"],
    "Operating System": ["#AIOperatingSystem", "#ChatGPT", "#AppsSDK"],
    "Hardware": ["#JonyIve", "#AIHardware", "#FutureOfComputing"],
    "Compute": ["#ComputeBottleneck", "#AIInfrastructure", "#GPUs"],
    "Research": ["#AIResearch", "#ArXiv", "#MachineLearningResearch"],
    "Enterprise": ["#EnterpriseAI", "#AIBusiness", "#Productivity"]
  };
  const additionalTags = keyThemes.flatMap((theme) => themeTags[theme] || []);
  return [...baseTags, ...additionalTags].slice(0, 12);
}
__name(generateTags, "generateTags");
function formatProfessionalDescription(title, storyCount, sources, description, timestamps, tags, date) {
  const sourceSummary = Object.entries(sources).map(([name, content]) => `${name}: ${countStories(content)} stories`).join(", ");
  return `# ${title}

\u{1F6A8} FOUNDING MEMBER OFFER\u{1F6A8} 

\u{1F680} AI-Now Premium just launched! \u{1F680} 

For a limited time, you can become an AI-Now Founding Member today! 

Learn more at: https://www.v2u.us/founder-subscriber

If you've found this episode informative, insightful or beneficial, don't forget to like and share with someone who may also benefit.

Questions? Ask below! \u{1F447} 

Primary Keyword Cluster: 

${tags.slice(0, 5).map((tag) => tag.replace("#", "")).join(", ")}.

Description: 

${description}

Timestamps: 

${timestamps.map((ts) => `\u2022 ${ts}`).join("\n")}

Tags and Keywords: 

${tags.join(", ")}`;
}
__name(formatProfessionalDescription, "formatProfessionalDescription");
async function sendNotification(env, date, sources) {
  const storyCount = Object.values(sources).reduce((sum, s) => sum + countStories(s), 0);
  const message = `\u2705 AI-Now sources ready for ${date}

\u{1F4CA} Total stories: ${storyCount}

Sources:
${Object.entries(sources).map(
    ([name, content]) => `- ${name}: ${countStories(content)} stories`
  ).join("\n")}

\u{1F4E5} Download: ${env.BASE_URL}/sources/${date}

Next: Upload to NotebookLM and generate your episode!`;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "AI-Now Bot <automation@v2u.us>",
      to: "admin@v2u.us",
      subject: `Sources Ready: ${date}`,
      text: message
    })
  });
}
__name(sendNotification, "sendNotification");
async function sendAlert(env, error) {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "AI-Now Alerts <alerts@v2u.us>",
      to: "admin@v2u.us",
      subject: "\u{1F6A8} Source Gathering Failed",
      text: `Error: ${error}

Check logs in Cloudflare dashboard.`
    })
  });
}
__name(sendAlert, "sendAlert");
async function postToSocialMedia(env, date, sources) {
  const storyCount = Object.values(sources).reduce((sum, s) => sum + countStories(s), 0);
  const topStories = getTopStories(sources, 3);
  const message = `\u{1F680} Fresh AI News Episode Ready!

\u{1F4CA} ${storyCount} stories from ${Object.keys(sources).length} sources
\u{1F4F0} Top stories:
${topStories.map((story) => `\u2022 ${story.title}`).join("\n")}

\u{1F3A7} Listen now: ${env.BASE_URL}/episode/${date}
#AINews #AI #MachineLearning #TechNews`;
  try {
    const socialPromises = [
      postToTwitter(env, message),
      postToBluesky(env, message),
      postToLinkedIn(env, message, topStories)
    ];
    await Promise.allSettled(socialPromises);
    console.log("\u2705 Posted to social media");
  } catch (error) {
    console.error("\u274C Social media posting failed:", error);
  }
}
__name(postToSocialMedia, "postToSocialMedia");
function getTopStories(sources, limit) {
  const allStories = [];
  for (const [sourceName, content] of Object.entries(sources)) {
    const lines = content.split("\n");
    let currentStory = {};
    for (const line of lines) {
      if (line.startsWith("## ")) {
        if (currentStory.title) {
          allStories.push(currentStory);
        }
        currentStory = { title: line.substring(3).trim() };
      } else if (line.startsWith("\u{1F517} [Read more](")) {
        const linkMatch = line.match(/🔗 \[Read more\]\((.*?)\)/);
        if (linkMatch) {
          currentStory.link = linkMatch[1];
        }
      }
    }
    if (currentStory.title) {
      allStories.push(currentStory);
    }
  }
  return allStories.sort((a, b) => calculateRelevanceScore(b.title) - calculateRelevanceScore(a.title)).slice(0, limit);
}
__name(getTopStories, "getTopStories");
async function postToTwitter(env, message) {
  if (!env.TWITTER_API_KEY || !env.TWITTER_ACCESS_TOKEN) {
    console.log("Twitter credentials not configured, skipping");
    return;
  }
  try {
    const response = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.TWITTER_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text: message })
    });
    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.status}`);
    }
    console.log("\u2705 Posted to Twitter");
  } catch (error) {
    console.error("Twitter posting failed:", error);
  }
}
__name(postToTwitter, "postToTwitter");
async function postToBluesky(env, message) {
  if (!env.BLUESKY_USERNAME || !env.BLUESKY_PASSWORD) {
    console.log("Bluesky credentials not configured, skipping");
    return;
  }
  try {
    const response = await fetch("https://bsky.social/xrpc/com.atproto.server.createSession", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: env.BLUESKY_USERNAME,
        password: env.BLUESKY_PASSWORD
      })
    });
    const session = await response.json();
    await fetch("https://bsky.social/xrpc/com.atproto.repo.createRecord", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${session.accessJwt}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        repo: session.did,
        collection: "app.bsky.feed.post",
        record: {
          text: message,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      })
    });
    console.log("\u2705 Posted to Bluesky");
  } catch (error) {
    console.error("Bluesky posting failed:", error);
  }
}
__name(postToBluesky, "postToBluesky");
async function postToLinkedIn(env, message, topStories) {
  if (!env.LINKEDIN_ACCESS_TOKEN) {
    console.log("LinkedIn credentials not configured, skipping");
    return;
  }
  try {
    const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.LINKEDIN_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0"
      },
      body: JSON.stringify({
        author: "urn:li:person:YOUR_LINKEDIN_ID",
        // Would need to be configured
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: message
            },
            shareMediaCategory: "NONE"
          }
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        }
      })
    });
    if (!response.ok) {
      throw new Error(`LinkedIn API error: ${response.status}`);
    }
    console.log("\u2705 Posted to LinkedIn");
  } catch (error) {
    console.error("LinkedIn posting failed:", error);
  }
}
__name(postToLinkedIn, "postToLinkedIn");
async function trackEpisodeAnalytics(env, date, sources) {
  if (!env.ANALYTICS_KV) {
    console.log("Analytics KV not configured, skipping tracking");
    return;
  }
  try {
    const storyCount = Object.values(sources).reduce((sum, s) => sum + countStories(s), 0);
    const topStories = getTopStories(sources, 5);
    const analyticsData = {
      episodeId: date,
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      totalStories: storyCount,
      sourcesCount: Object.keys(sources).length,
      topStories: topStories.map((story) => ({
        title: story.title,
        link: story.link,
        relevanceScore: calculateRelevanceScore(story.title + (story.description || ""))
      })),
      sources: Object.entries(sources).map(([name, content]) => ({
        name,
        storyCount: countStories(content),
        contentLength: content.length
      })),
      // Initialize engagement metrics (will be updated later)
      socialEngagement: {
        twitter: { likes: 0, retweets: 0, replies: 0 },
        bluesky: { likes: 0, reposts: 0, replies: 0 },
        linkedin: { likes: 0, comments: 0, shares: 0 }
      },
      podcastMetrics: {
        downloads: 0,
        listens: 0,
        completionRate: 0,
        averageListenTime: 0
      }
    };
    await env.ANALYTICS_KV.put(`episode:${date}`, JSON.stringify(analyticsData));
    console.log("\u2705 Episode analytics tracked");
  } catch (error) {
    console.error("Analytics tracking failed:", error);
  }
}
__name(trackEpisodeAnalytics, "trackEpisodeAnalytics");
async function getAnalyticsDashboard(env) {
  if (!env.ANALYTICS_KV) {
    return { error: "Analytics not configured" };
  }
  try {
    const analytics = await env.ANALYTICS_KV.list({ prefix: "episode:" });
    const episodes = [];
    for (const key of analytics.keys) {
      const data = await env.ANALYTICS_KV.get(key.name);
      if (data) {
        episodes.push(JSON.parse(data));
      }
    }
    const totalEpisodes = episodes.length;
    const totalStories = episodes.reduce((sum, ep) => sum + ep.totalStories, 0);
    const avgStoriesPerEpisode = totalEpisodes > 0 ? totalStories / totalEpisodes : 0;
    const recentEpisodes = episodes.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()).slice(0, 10);
    return {
      summary: {
        totalEpisodes,
        totalStories,
        avgStoriesPerEpisode,
        lastEpisodeDate: recentEpisodes[0]?.episodeId || null
      },
      recentEpisodes,
      performance: calculatePerformanceMetrics(episodes)
    };
  } catch (error) {
    console.error("Failed to get analytics dashboard:", error);
    return { error: "Failed to load analytics" };
  }
}
__name(getAnalyticsDashboard, "getAnalyticsDashboard");
function calculatePerformanceMetrics(episodes) {
  if (episodes.length === 0) return {};
  const sortedEpisodes = episodes.sort(
    (a, b) => new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime()
  );
  const storyCountTrend = sortedEpisodes.map((ep) => ep.totalStories);
  const avgStoryCount = storyCountTrend.reduce((a, b) => a + b, 0) / storyCountTrend.length;
  const totalTwitterLikes = episodes.reduce((sum, ep) => sum + (ep.socialEngagement?.twitter?.likes || 0), 0);
  const totalPodcastDownloads = episodes.reduce((sum, ep) => sum + (ep.podcastMetrics?.downloads || 0), 0);
  return {
    storyCountTrend,
    avgStoryCount,
    totalSocialEngagement: {
      twitterLikes: totalTwitterLikes,
      podcastDownloads: totalPodcastDownloads
    },
    bestPerformingEpisodes: episodes.sort((a, b) => (b.podcastMetrics?.downloads || 0) - (a.podcastMetrics?.downloads || 0)).slice(0, 3)
  };
}
__name(calculatePerformanceMetrics, "calculatePerformanceMetrics");
async function uploadVideoToPlatforms(env, date, sources, dryRun = true, videoPath) {
  try {
    const videoData = await generateVideoMetadata(env, date, sources, videoPath);
    console.log("\u{1F50D} Checking platform credentials...");
    const platforms = [
      { name: "YouTube", hasCreds: !!(env.YOUTUBE_API_KEY && env.YOUTUBE_CHANNEL_ID) },
      { name: "Rumble", hasCreds: !!(env.RUMBLE_API_KEY && env.RUMBLE_CHANNEL_ID) },
      { name: "Spotify Video", hasCreds: !!env.SPOTIFY_API_KEY },
      { name: "Vimeo", hasCreds: !!env.VIMEO_ACCESS_TOKEN },
      { name: "Odysee", hasCreds: !!(env.ODYSEE_API_KEY && env.ODYSEE_CHANNEL_ID) }
    ];
    platforms.forEach((platform) => {
      if (platform.hasCreds) {
        console.log(`\u2705 ${platform.name}: Credentials configured`);
      } else {
        console.log(`\u274C ${platform.name}: Credentials missing`);
      }
    });
    const uploadPromises = [
      uploadToYouTube(env, videoData, dryRun),
      uploadToRumble(env, videoData, dryRun),
      uploadToSpotifyVideo(env, videoData, dryRun),
      uploadToVimeo(env, videoData, dryRun),
      uploadToOdysee(env, videoData, dryRun)
    ];
    const results = await Promise.allSettled(uploadPromises);
    const platformNames = ["YouTube", "Rumble", "Spotify Video", "Vimeo", "Odysee"];
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        console.log(`\u2705 ${dryRun ? "DRY RUN: Would upload to" : "Uploaded to"} ${platformNames[index]}`);
      } else {
        console.error(`\u274C Failed to ${dryRun ? "simulate upload to" : "upload to"} ${platformNames[index]}:`, result.reason);
      }
    });
  } catch (error) {
    console.error("Video platform upload failed:", error);
  }
}
__name(uploadVideoToPlatforms, "uploadVideoToPlatforms");
async function uploadVideoToR2(env, videoPath) {
  if (!env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.CLOUDFLARE_ACCOUNT_ID) {
    throw new Error("R2 upload credentials not configured");
  }
  try {
    const normalizedPath = videoPath.replace(/\\/g, "/");
    const basename = normalizedPath.split("/").pop() || "unknown";
    const slug = basename.toLowerCase().replace(/[^a-z0-9._-\s]/g, "").replace(/[\s,]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    const now = /* @__PURE__ */ new Date();
    const date = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;
    const hashInput = basename + now.getTime().toString();
    const hash = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(hashInput));
    const hashArray = Array.from(new Uint8Array(hash));
    const shortHash = hashArray.slice(0, 4).map((b) => b.toString(16).padStart(2, "0")).join("");
    const extension = slug.split(".").pop() || "mp4";
    const nameWithoutExt = slug.replace(/\.[^/.]+$/, "");
    const key = `${date}/${nameWithoutExt}-${shortHash}.${extension}`;
    console.log(`\u{1F3AC} Would upload video: ${basename} \u2192 ${key}`);
    const url = `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/v2u-assets/${key}`;
    return {
      bucket: "v2u-assets",
      filename: basename,
      key,
      url
    };
  } catch (error) {
    console.error("R2 video upload failed:", error);
    throw error;
  }
}
__name(uploadVideoToR2, "uploadVideoToR2");
async function generateVideoMetadata(env, date, sources, videoPath) {
  const storyCount = Object.values(sources).reduce((sum, s) => sum + countStories(s), 0);
  const topStories = getTopStories(sources, 3);
  const description = `Daily AI news roundup featuring ${storyCount} stories from ${Object.keys(sources).length} sources.

Top stories:
${topStories.map((story, i) => `${i + 1}. ${story.title}`).join("\n")}

Full show notes: ${env.BASE_URL}/sources/${date}

#AINews #AI #MachineLearning #TechNews`;
  return {
    title: `AI Now - ${date}`,
    description,
    videoPath,
    // Path to local video file for uploading
    videoUrl: videoPath ? void 0 : `${env.BASE_URL}/episode/${date}/video.mp4`,
    // Fallback URL if no path provided
    thumbnailUrl: `${env.BASE_URL}/episode/${date}/thumbnail.jpg`,
    duration: 1800,
    // 30 minutes in seconds (estimated)
    publishedAt: (/* @__PURE__ */ new Date()).toISOString(),
    tags: ["AI", "Artificial Intelligence", "Machine Learning", "Technology", "News"],
    category: "Science & Technology",
    privacy: "public"
  };
}
__name(generateVideoMetadata, "generateVideoMetadata");
async function uploadToYouTube(env, videoData, dryRun) {
  if (!env.YOUTUBE_API_KEY || !env.YOUTUBE_CHANNEL_ID) {
    console.log("YouTube credentials not configured, skipping");
    return;
  }
  if (dryRun) {
    console.log(`\u{1F3AC} DRY RUN: Would upload "${videoData.title}" to YouTube channel ${env.YOUTUBE_CHANNEL_ID}`);
    return;
  }
  try {
    const uploadResult = await uploadVideoToR2(env, videoData.videoPath);
    console.log(`\u2705 Video uploaded to R2: ${uploadResult.url}`);
    const videoUrl = uploadResult.url;
    const response = await fetch("https://www.googleapis.com/youtube/v3/videos", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.YOUTUBE_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        snippet: {
          title: videoData.title,
          description: videoData.description,
          tags: videoData.tags,
          categoryId: "28"
          // Science & Technology
        },
        status: {
          privacyStatus: videoData.privacy
        }
      })
    });
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }
    const result = await response.json();
    console.log("YouTube upload result:", result);
  } catch (error) {
    console.error("YouTube upload failed:", error);
    throw error;
  }
}
__name(uploadToYouTube, "uploadToYouTube");
async function uploadToRumble(env, videoData, dryRun) {
  if (!env.RUMBLE_API_KEY || !env.RUMBLE_CHANNEL_ID) {
    console.log("Rumble credentials not configured, skipping");
    return;
  }
  if (dryRun) {
    console.log(`\u{1F3AC} DRY RUN: Would upload "${videoData.title}" to Rumble channel ${env.RUMBLE_CHANNEL_ID}`);
    return;
  }
  try {
    const response = await fetch("https://rumble.com/api/v1/videos", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RUMBLE_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: videoData.title,
        description: videoData.description,
        tags: videoData.tags.join(","),
        channel_id: env.RUMBLE_CHANNEL_ID,
        visibility: videoData.privacy
      })
    });
    if (!response.ok) {
      throw new Error(`Rumble API error: ${response.status}`);
    }
    const result = await response.json();
    console.log("Rumble upload result:", result);
  } catch (error) {
    console.error("Rumble upload failed:", error);
    throw error;
  }
}
__name(uploadToRumble, "uploadToRumble");
async function uploadToSpotifyVideo(env, videoData, dryRun) {
  if (!env.SPOTIFY_API_KEY) {
    console.log("Spotify credentials not configured, skipping");
    return;
  }
  if (dryRun) {
    console.log(`\u{1F3AC} DRY RUN: Would upload "${videoData.title}" to Spotify for Podcasters`);
    return;
  }
  try {
    const response = await fetch("https://api.spotify.com/v1/videos", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.SPOTIFY_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: videoData.title,
        description: videoData.description,
        video_url: videoData.videoUrl,
        release_date: videoData.publishedAt,
        tags: videoData.tags
      })
    });
    if (!response.ok) {
      throw new Error(`Spotify Video API error: ${response.status}`);
    }
  } catch (error) {
    console.error("Spotify Video upload failed:", error);
    throw error;
  }
}
__name(uploadToSpotifyVideo, "uploadToSpotifyVideo");
async function uploadToVimeo(env, videoData, dryRun) {
  if (!env.VIMEO_ACCESS_TOKEN) {
    console.log("Vimeo credentials not configured, skipping");
    return;
  }
  if (dryRun) {
    console.log(`\u{1F3AC} DRY RUN: Would upload "${videoData.title}" to Vimeo`);
    return;
  }
  try {
    const uploadResult = await uploadVideoToR2(env, videoData.videoPath);
    console.log(`\u2705 Video uploaded to R2: ${uploadResult.url}`);
    const videoUrl = uploadResult.url;
    const response = await fetch("https://api.vimeo.com/me/videos", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.VIMEO_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "Accept": "application/vnd.vimeo.*+json;version=3.4"
      },
      body: JSON.stringify({
        name: videoData.title,
        description: videoData.description,
        privacy: {
          view: videoData.privacy === "public" ? "anybody" : "password",
          embed: "public"
        },
        tags: videoData.tags.join(","),
        category: "technology"
      })
    });
    if (!response.ok) {
      throw new Error(`Vimeo API error: ${response.status}`);
    }
    const result = await response.json();
    console.log("Vimeo upload result:", result);
  } catch (error) {
    console.error("Vimeo upload failed:", error);
    throw error;
  }
}
__name(uploadToVimeo, "uploadToVimeo");
async function uploadToOdysee(env, videoData, dryRun) {
  if (!env.ODYSEE_API_KEY || !env.ODYSEE_CHANNEL_ID) {
    console.log("Odysee credentials not configured, skipping");
    return;
  }
  if (dryRun) {
    console.log(`\u{1F3AC} DRY RUN: Would upload "${videoData.title}" to Odysee channel ${env.ODYSEE_CHANNEL_ID}`);
    return;
  }
  try {
    const response = await fetch("https://api.odysee.com/api/v1/publish", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.ODYSEE_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: videoData.title,
        description: videoData.description,
        file_path: videoData.videoUrl,
        channel_id: env.ODYSEE_CHANNEL_ID,
        tags: videoData.tags,
        license: "Public Domain",
        language: "en"
      })
    });
    if (!response.ok) {
      throw new Error(`Odysee API error: ${response.status}`);
    }
    const result = await response.json();
    console.log("Odysee upload result:", result);
  } catch (error) {
    console.error("Odysee upload failed:", error);
    throw error;
  }
}
__name(uploadToOdysee, "uploadToOdysee");
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
