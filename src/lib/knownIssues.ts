/**
 * Known Issues (#152): pure helpers that turn GitHub issue JSON into the short
 * user-facing text shown on the Known Issues tab of the patch notes page.
 *
 * No imports on purpose (type annotations only) so `node --test` can load this
 * file directly. The privacy rules below matter: the repo is public and issues
 * filed from the app carry the reporter's user ID and email further up the body.
 *
 * Contract for issue bodies (also in SPEC Slice 14): the issue carries the
 * `known-issue` label and a "User-facing blurb" section (## or ###) that is the
 * LAST section of the body. Only that section is ever shown, never the title or
 * number. The section ends at the next heading, a horizontal rule or the end.
 */

export interface KnownIssue {
  /** Used only as a React key. Never shown to users. */
  number: number;
  paragraphs: string[];
}

export type KnownIssuesResult =
  | { status: 'ok'; issues: KnownIssue[] }
  | { status: 'unavailable' };

const MAX_BLURB_CHARS = 600;
const BLURB_HEADING = /^#{2,3}\s*User-facing blurb\s*$/i;
const ANY_HEADING = /^#{1,6}\s/;
const HORIZONTAL_RULE = /^\s*([-*_])\s*(\1\s*){2,}$/;
const SETEXT_EQUALS = /^\s*=+\s*$/;

function cleanInline(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links -> link text
    .replace(/<[^>]*>/g, '') // any remaining HTML tags
    .replace(/(\*\*|__|`)/g, '')
    .replace(/(^|\s)#\d+\b/g, '$1') // bare issue refs
    .replace(/(^|\s)@[\w-]+/g, '$1') // bare @mentions
    .replace(/\s+/g, ' ')
    .trim();
}

/** Returns the cleaned paragraphs of the "User-facing blurb" section, or null. */
export function extractBlurb(body: unknown): string[] | null {
  if (typeof body !== 'string') return null;

  // Strip comments from the WHOLE body first so a multi-line comment cannot hide
  // (or fake) a heading.
  const text = body.replace(/\r\n?/g, '\n').replace(/<!--[\s\S]*?-->/g, '');
  const lines = text.split('\n');

  // The LAST matching heading wins: a user-written description could contain a
  // fake one, and Claude always appends the real blurb at the very end.
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (BLURB_HEADING.test(lines[i].trim())) start = i;
  }
  if (start === -1) return null;

  const section: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (ANY_HEADING.test(line.trim())) break;
    if (HORIZONTAL_RULE.test(line) || SETEXT_EQUALS.test(line)) {
      // A rule directly under a text line is a setext heading, so that line is
      // a heading too, not blurb text.
      if (section.length > 0 && section[section.length - 1].trim() !== '') section.pop();
      break;
    }
    section.push(line);
  }

  // Group lines into paragraphs (blank-line separated), stripping list markers
  // and quote markers per line.
  const rawParagraphs: string[] = [];
  let current: string[] = [];
  const flush = () => {
    if (current.length > 0) rawParagraphs.push(current.join(' '));
    current = [];
  };
  for (const line of section) {
    if (line.trim() === '') {
      flush();
      continue;
    }
    current.push(line.replace(/^\s*(?:[-*+]|\d+\.)\s+/, '').replace(/^\s*>\s?/, ''));
  }
  flush();

  const paragraphs: string[] = [];
  let used = 0;
  for (const raw of rawParagraphs) {
    const cleaned = cleanInline(raw);
    if (cleaned === '') continue;
    const room = MAX_BLURB_CHARS - used;
    if (cleaned.length > room) {
      const cut = cleaned.slice(0, Math.max(room, 0)).trimEnd();
      if (cut !== '') paragraphs.push(`${cut}…`);
      break;
    }
    paragraphs.push(cleaned);
    used += cleaned.length;
  }

  return paragraphs.length > 0 ? paragraphs : null;
}

/** Turns the GitHub issues JSON into displayable known issues (GitHub order kept). */
export function parseKnownIssues(json: unknown): KnownIssue[] {
  if (!Array.isArray(json)) return [];
  const issues: KnownIssue[] = [];
  for (const item of json) {
    if (typeof item !== 'object' || item === null) continue;
    const rec = item as Record<string, unknown>;
    if (typeof rec.number !== 'number') continue;
    if ('pull_request' in rec) continue;
    if (rec.state !== 'open') continue;
    const paragraphs = extractBlurb(rec.body);
    if (paragraphs === null) continue;
    issues.push({ number: rec.number, paragraphs });
  }
  return issues;
}
