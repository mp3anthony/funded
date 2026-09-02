import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const GITHUB_REPO_OWNER = 'mp3anthony';
const GITHUB_REPO_NAME = 'funded';
const BUG_REPORT_LABEL = 'from-app';
const BUG_REPORT_LABEL_COLOR = 'C8FF00'; // matches this app's --color-primary fluoro-green accent

/**
 * In-app bug reporting (Slice 15, #114). Authenticates the caller via their
 * Supabase session, then creates a real GitHub issue on this repo using a
 * server-only PAT (`GITHUB_BUG_REPORT_TOKEN`) — never exposed to the client.
 *
 * Note: route handlers already run on the Node.js runtime by default. An
 * explicit `export const runtime` is omitted because it is incompatible with
 * this project's Next.js `cacheComponents` config (see
 * src/app/api/cron/push-reminders/route.ts for the same note).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    const description = typeof body?.description === 'string' ? body.description.trim() : '';
    const screenshotUrl = typeof body?.screenshotUrl === 'string' ? body.screenshotUrl.trim() : '';

    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required.' }, { status: 400 });
    }

    // ── Auth: re-derive the user from their session token, never trust a client-supplied identity ──
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Supabase configuration is missing on the server.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const githubToken = process.env.GITHUB_BUG_REPORT_TOKEN;
    if (!githubToken) {
      console.error('GITHUB_BUG_REPORT_TOKEN is not configured on the server');
      return NextResponse.json(
        { error: 'Bug reporting is not configured on the server. Please try again later.' },
        { status: 500 }
      );
    }

    const githubHeaders = {
      Authorization: `Bearer ${githubToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    };

    // ── Ensure the `from-app` label exists before referencing it on the new issue.
    // GitHub's "create an issue" endpoint does NOT auto-create labels that don't
    // already exist on the repo (verified against GitHub's REST docs) — a
    // reference to a missing label fails the request rather than creating it.
    // Creating it here is idempotent: a 422 "already_exists" is expected and safe
    // to ignore once the label has been created once.
    try {
      const labelResponse = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/labels`,
        {
          method: 'POST',
          headers: githubHeaders,
          body: JSON.stringify({
            name: BUG_REPORT_LABEL,
            color: BUG_REPORT_LABEL_COLOR,
            description: 'Filed from the in-app bug report form',
          }),
        }
      );
      if (!labelResponse.ok && labelResponse.status !== 422) {
        // Non-fatal: log and continue without the label rather than blocking the
        // whole report on a label-creation hiccup.
        console.error('Failed to ensure from-app label exists:', labelResponse.status, await labelResponse.text());
      }
    } catch (labelErr) {
      console.error('Error ensuring from-app label exists:', labelErr);
    }

    // ── Build the issue body ──
    const bodyParts = [
      description,
      '',
      '---',
      `Submitted from the app by user ID \`${user.id}\`${user.email ? ` (${user.email})` : ''}.`,
    ];
    if (screenshotUrl) {
      bodyParts.push('', `![Screenshot](${screenshotUrl})`);
    }

    const issueResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/issues`,
      {
        method: 'POST',
        headers: githubHeaders,
        body: JSON.stringify({
          title,
          body: bodyParts.join('\n'),
          labels: [BUG_REPORT_LABEL],
        }),
      }
    );

    if (!issueResponse.ok) {
      const errText = await issueResponse.text().catch(() => '');
      console.error('GitHub issue creation failed:', issueResponse.status, errText);
      return NextResponse.json(
        { error: `Failed to file the bug report with GitHub (status ${issueResponse.status}).` },
        { status: 502 }
      );
    }

    const issue = await issueResponse.json();
    return NextResponse.json({ success: true, issueUrl: issue.html_url, issueNumber: issue.number });
  } catch (error) {
    console.error('Bug report API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
