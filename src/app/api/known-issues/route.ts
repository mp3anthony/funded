import { NextResponse } from 'next/server';
import { getKnownIssues } from '@/lib/knownIssuesFetch';

/**
 * Known Issues feed (#152). Public data, so no auth. Always responds 200; the
 * body's `status` says whether GitHub could be reached. The result is cached
 * by `getKnownIssues` (about 15 minutes, 5 on failure).
 *
 * Why an API route and not server-rendered page data: the service worker
 * serves same-origin GETs cache-first for a whole build, so data baked into a
 * page would stay frozen until the next deploy. The worker bypasses `/api/`.
 *
 * No `runtime` export: incompatible with `cacheComponents` (SPEC A2; see
 * src/app/api/bug-report/route.ts).
 */
export async function GET() {
  return NextResponse.json(await getKnownIssues());
}
