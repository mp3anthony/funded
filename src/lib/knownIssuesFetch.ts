import { cacheLife } from 'next/cache';
import { parseKnownIssues, type KnownIssuesResult } from './knownIssues';

const ISSUES_URL =
  'https://api.github.com/repos/mp3anthony/funded/issues?labels=known-issue&state=open&per_page=50&sort=created&direction=desc';

/**
 * Server-only (#152). Reads open issues labelled `known-issue` from the public
 * GitHub API (no token: 60 requests/hour per IP, shared on Vercel; see
 * docs/environment.md). Cached about 15 minutes on success, 5 on failure.
 * Exactly one `cacheLife` call per invocation. Never throws, because a
 * build-time throw would fail the Vercel build.
 */
export async function getKnownIssues(): Promise<KnownIssuesResult> {
  'use cache';

  try {
    const res = await fetch(ISSUES_URL, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'funded-app',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.error(
        `[known-issues] GitHub responded ${res.status}`,
        `ratelimit-remaining=${res.headers.get('x-ratelimit-remaining')}`,
        `ratelimit-reset=${res.headers.get('x-ratelimit-reset')}`,
      );
      cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
      return { status: 'unavailable' };
    }

    const issues = parseKnownIssues(await res.json());
    cacheLife({ stale: 300, revalidate: 900, expire: 86400 });
    return { status: 'ok', issues };
  } catch (err) {
    console.error('[known-issues] fetch failed', err);
    cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
    return { status: 'unavailable' };
  }
}
