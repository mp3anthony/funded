// Unit tests for src/lib/knownIssues.ts (#152).
// Run with `npm run test` (node --test, Node's built-in TS type stripping).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractBlurb, parseKnownIssues } from './knownIssues.ts';

test('## and ### headings, any case', () => {
  assert.deepEqual(extractBlurb('x\n\n## User-facing blurb\n\nHello there.'), ['Hello there.']);
  assert.deepEqual(extractBlurb('x\n\n### user-FACING Blurb\n\nHello there.'), ['Hello there.']);
});

test('CRLF line endings', () => {
  assert.deepEqual(extractBlurb('desc\r\n\r\n## User-facing blurb\r\n\r\nLine one.\r\n\r\nLine two.\r\n'), [
    'Line one.',
    'Line two.',
  ]);
});

test('next heading ends the section', () => {
  assert.deepEqual(extractBlurb('## User-facing blurb\n\nShown.\n\n## Notes\n\nHidden.'), ['Shown.']);
});

test('horizontal rule ends the section and the email line is absent', () => {
  const out = extractBlurb('## User-facing blurb\n\nShown.\n\n---\nSubmitted from the app by user ID abc (a@b.com)');
  assert.deepEqual(out, ['Shown.']);
});

test('last heading wins over a fake heading earlier in the body', () => {
  const body = '## User-facing blurb\n\nFake text.\n\n## More\n\nstuff\n\n## User-facing blurb\n\nReal text.';
  assert.deepEqual(extractBlurb(body), ['Real text.']);
});

test('missing or empty section is null', () => {
  assert.equal(extractBlurb('no blurb here'), null);
  assert.equal(extractBlurb('## User-facing blurb\n\n\n'), null);
  assert.equal(extractBlurb('## User-facing blurb\n\n## Next'), null);
  assert.equal(extractBlurb(null), null);
  assert.equal(extractBlurb(42), null);
});

test('<script> becomes plain text, never markup', () => {
  const out = extractBlurb('## User-facing blurb\n\n<script>alert(1)</script>Safe <b>bold</b> text.');
  assert.deepEqual(out, ['alert(1)Safe bold text.']);
});

test('HTML comments removed', () => {
  assert.deepEqual(extractBlurb('## User-facing blurb\n\nA <!-- hidden --> B.'), ['A B.']);
});

test('multi-line comment cannot hide a fake heading or a rule', () => {
  const body = '<!--\n## User-facing blurb\nFake\n-->\n\n## User-facing blurb\n\nReal.';
  assert.deepEqual(extractBlurb(body), ['Real.']);
  assert.equal(extractBlurb('<!--\n## User-facing blurb\nFake\n-->'), null);
});

test('images removed, links become link text', () => {
  const out = extractBlurb('## User-facing blurb\n\n![shot](http://x/y.png)See [the guide](http://x/g) now.');
  assert.deepEqual(out, ['See the guide now.']);
});

test('bold, underscore and backticks stripped; list and quote markers removed', () => {
  const out = extractBlurb('## User-facing blurb\n\n- **One** thing\n- `Two` things\n\n> quoted');
  assert.deepEqual(out, ['One thing Two things', 'quoted']);
});

test('inner lines joined with a space; paragraphs split on blank lines', () => {
  assert.deepEqual(extractBlurb('## User-facing blurb\n\nfirst\nsecond\n\nthird'), ['first second', 'third']);
});

test('600 character cap truncates with an ellipsis', () => {
  const long = 'a'.repeat(700);
  const out = extractBlurb(`## User-facing blurb\n\n${long}`);
  assert.equal(out.length, 1);
  assert.equal(out[0].length, 601);
  assert.ok(out[0].endsWith('…'));
});

test('setext-style heading line is not blurb text', () => {
  const out = extractBlurb('## User-facing blurb\n\nKept.\n\nHeading line\n---\nafter');
  assert.deepEqual(out, ['Kept.']);
});

test('*** ___ and "- - -" rules end the section', () => {
  for (const rule of ['***', '___', '- - -', '* * *']) {
    assert.deepEqual(extractBlurb(`## User-facing blurb\n\nShown.\n\n${rule}\nSecret footer`), ['Shown.'], rule);
  }
});

test('real from-app shape: only the blurb comes out', () => {
  const body = [
    'Pushes do not arrive.',
    '',
    '---',
    'Submitted from the app by user ID 4200aca8-1111 (someone@example.com)',
    '',
    '## User-facing blurb',
    '',
    'Some reminders may not arrive on your phone. We are looking into it.',
  ].join('\n');
  const out = extractBlurb(body);
  assert.deepEqual(out, ['Some reminders may not arrive on your phone. We are looking into it.']);
  assert.ok(!JSON.stringify(out).includes('example.com'));
  assert.ok(!JSON.stringify(out).includes('4200aca8'));
});

test('fake heading in the description, real one last', () => {
  const body = 'desc\n\n## User-facing blurb\n\nFake.\n\n---\nSubmitted from the app by user ID x (e@x.com)\n\n## User-facing blurb\n\nReal.';
  assert.deepEqual(extractBlurb(body), ['Real.']);
});

test('bare #123 and @user references are stripped', () => {
  assert.deepEqual(extractBlurb('## User-facing blurb\n\nSee #145 and ask @someone please.'), ['See and ask please.']);
});

test('parseKnownIssues: drops PRs, closed, no-blurb; keeps order; non-array is []', () => {
  const blurb = (t) => `## User-facing blurb\n\n${t}`;
  const json = [
    { number: 3, state: 'open', body: blurb('Three.') },
    { number: 2, state: 'open', body: blurb('PR.'), pull_request: {} },
    { number: 4, state: 'closed', body: blurb('Closed.') },
    { number: 5, state: 'open', body: 'no blurb' },
    { number: 6, state: 'open', body: null },
    { state: 'open', body: blurb('No number.') },
    null,
    { number: 1, state: 'open', body: blurb('One.') },
  ];
  assert.deepEqual(parseKnownIssues(json), [
    { number: 3, paragraphs: ['Three.'] },
    { number: 1, paragraphs: ['One.'] },
  ]);
  assert.deepEqual(parseKnownIssues({}), []);
  assert.deepEqual(parseKnownIssues(null), []);
});
