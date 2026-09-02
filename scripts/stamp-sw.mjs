#!/usr/bin/env node
/**
 * Stamps public/sw.js's CACHE_NAME with a build-unique identifier before every build.
 *
 * public/sw.js is served as a static file (Next.js copies the public/ directory
 * as-is; it is not run through the Next build pipeline), so there is no other
 * build-time hook that touches its contents. Running this as an npm "prebuild"
 * script (auto-invoked by npm before "build") rewrites the CACHE_NAME line in
 * place, in the ephemeral build checkout, before `next build` runs.
 *
 * On Vercel, VERCEL_GIT_COMMIT_SHA is populated automatically for every
 * production and preview build, so each real deploy gets a distinct cache
 * name. Locally (no Vercel env vars present) it falls back to a timestamp so
 * dev builds still produce a fresh identifier.
 *
 * Idempotent: matches the CACHE_NAME assignment by pattern, not by a
 * placeholder token, so it can run against its own previous output on repeat
 * local builds without needing to be reset first.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const swPath = path.join(__dirname, '..', 'public', 'sw.js');

const buildId =
  (process.env.VERCEL_GIT_COMMIT_SHA && process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 10)) ||
  (process.env.VERCEL_DEPLOYMENT_ID && process.env.VERCEL_DEPLOYMENT_ID.slice(0, 10)) ||
  `dev-${Date.now()}`;

const cacheName = `funded-pwa-cache-${buildId}`;

let contents = fs.readFileSync(swPath, 'utf8');

const cacheNamePattern = /const CACHE_NAME = '[^']*';/;
if (!cacheNamePattern.test(contents)) {
  console.error('stamp-sw.js: could not find CACHE_NAME assignment in public/sw.js — aborting build.');
  process.exit(1);
}

contents = contents.replace(cacheNamePattern, `const CACHE_NAME = '${cacheName}';`);

fs.writeFileSync(swPath, contents);

console.log(`stamp-sw.js: stamped public/sw.js with CACHE_NAME = '${cacheName}'`);
