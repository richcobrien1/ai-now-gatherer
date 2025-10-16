import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src';

describe('AI-Now Dashboard API', () => {
	describe('Dashboard API endpoints', () => {
		it('GET /api/status returns automation status', async () => {
			const request = new Request('http://example.com/api/status');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(200);
			expect(response.headers.get('Content-Type')).toBe('application/json');
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');

			const data = await response.json();
			expect(data).toHaveProperty('isRunning');
			expect(data).toHaveProperty('nextScheduledRun');
			expect(data).toHaveProperty('totalRuns');
			expect(data).toHaveProperty('successRate');
		});

		it('GET /api/runs returns recent runs', async () => {
			const request = new Request('http://example.com/api/runs');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(200);
			expect(response.headers.get('Content-Type')).toBe('application/json');
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');

			const data = await response.json();
			expect(Array.isArray(data)).toBe(true);
		});

		it('GET /api/config returns configuration status', async () => {
			const request = new Request('http://example.com/api/config');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(200);
			expect(response.headers.get('Content-Type')).toBe('application/json');
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');

			const data = await response.json();
			expect(data).toHaveProperty('socialMedia');
			expect(data).toHaveProperty('videoPlatforms');
			expect(data).toHaveProperty('podcastPlatforms');
			expect(data).toHaveProperty('other');
		});

		it('GET /api/logs returns recent logs', async () => {
			const request = new Request('http://example.com/api/logs');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(200);
			expect(response.headers.get('Content-Type')).toBe('application/json');
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');

			const data = await response.json();
			expect(Array.isArray(data)).toBe(true);
		});

		it('POST /api/trigger triggers manual run', async () => {
			const request = new Request('http://example.com/api/trigger', { method: 'POST' });
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(200);
			expect(response.headers.get('Content-Type')).toBe('application/json');
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');

			const data = await response.json();
			expect(data).toHaveProperty('runId');
			expect(data).toHaveProperty('message');
		});

		it('OPTIONS requests return CORS headers', async () => {
			const request = new Request('http://example.com/api/status', { method: 'OPTIONS' });
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(200);
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
			expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS');
		});

		it('Invalid API endpoint returns 404', async () => {
			const request = new Request('http://example.com/api/invalid');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(404);
			expect(response.headers.get('Content-Type')).toBe('application/json');
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');

			const data = await response.json();
			expect(data).toHaveProperty('error');
		});
	});

	describe('Legacy endpoints', () => {
		it('GET / responds with default message', async () => {
			const request = new Request('http://example.com/');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(200);
			const text = await response.text();
			expect(text).toContain('AI-Now Source Gatherer');
		});
	});
});
