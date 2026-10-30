import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { createCheckpointKey, createTopicFileSlug, decidePublishLocales } from '../generation-identity.mjs';
import { normalizeBoldSpacing, normalizeFaqMarkerProse, validateFaqLayout } from '../markdown-normalizers.mjs';

test('a prompt update invalidates cached drafts but the same version can resume', () => {
  const topics = ['Assigned topic', 'Next topic'];
  const v1 = createCheckpointKey(topics, 'prompt-v1');
  const resumed = createCheckpointKey(topics, 'prompt-v1');
  const v2 = createCheckpointKey(topics, 'prompt-v2');

  assert.equal(resumed, v1);
  assert.notEqual(v2, v1);
});

test('the topic slug is stable when later queue rows change', () => {
  const slug = createTopicFileSlug('Assigned topic');

  assert.equal(createTopicFileSlug('Assigned topic'), slug);
  assert.equal(createTopicFileSlug('Assigned topic').startsWith('post-'), true);
  assert.notEqual(createTopicFileSlug('Different topic'), slug);
});

const publicationTargets = ['ko', 'en', 'ja', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'pl', 'id', 'vi'].map((code) => ({
  code,
}));

test('publication gate allows exactly passing locales at 9/12, 10/12, and 12/12', () => {
  const nine = decidePublishLocales(
    publicationTargets,
    publicationTargets.slice(0, 9).map(({ code }) => code)
  );
  assert.equal(nine.canPublish, false);
  assert.deepEqual(
    nine.passingCodes,
    publicationTargets.slice(0, 9).map(({ code }) => code)
  );
  assert.deepEqual(
    nine.failedCodes,
    publicationTargets.slice(9).map(({ code }) => code)
  );

  const ten = decidePublishLocales(
    publicationTargets,
    publicationTargets.slice(0, 10).map(({ code }) => code)
  );
  assert.equal(ten.canPublish, true);
  assert.deepEqual(ten.passingLocales, publicationTargets.slice(0, 10));
  assert.deepEqual(
    ten.failedCodes,
    publicationTargets.slice(10).map(({ code }) => code)
  );

  const twelve = decidePublishLocales(
    publicationTargets,
    publicationTargets.map(({ code }) => code)
  );
  assert.equal(twelve.canPublish, true);
  assert.deepEqual(twelve.passingLocales, publicationTargets);
  assert.deepEqual(twelve.failedCodes, []);
});

test('split FAQ marker and prose normalize to the validated same-line layout', () => {
  const markdown = [
    '## 5. Questions',
    '**Q1.** Why does the app freeze?',
    '',
    '**A1.**',
    '',
    'Check memory pressure and the affected app version.',
    '',
    '**Q2.** When should I restart?',
    '',
    '**A2.** Restart after saving any open work.',
    '',
    '**Q3.** Should I clear app data?',
    '',
    '**A3.** Clear cache first and back up important data.',
  ].join('\n');

  const normalized = normalizeFaqMarkerProse(markdown);

  assert.match(normalized, /\*\*A1\.\*\* Check memory pressure and the affected app version\./);
  assert.deepEqual(validateFaqLayout(normalized), []);
});

test('FAQ marker normalization does not rewrite code examples or absorb the next marker', () => {
  const markdown = ['## 5. Questions', '```md', '**A1.**', 'example answer', '```', '**Q1.**', '**A1.**'].join('\n');

  const normalized = normalizeFaqMarkerProse(markdown);

  assert.match(normalized, /```md\n\*\*A1\.\*\*\nexample answer\n```/);
  assert.match(normalized, /\*\*Q1\.\*\*\n\*\*A1\.\*\*/);
});

test('FAQ marker-like text outside the FAQ section is unchanged', () => {
  const markdown = [
    '## 2. Example',
    '**A1.**',
    'This is literal sample text and should stay on its own line.',
    '## 5. Questions',
    '**Q1.**',
    'Actual FAQ question?',
    '**A1.**',
    'Actual FAQ answer.',
  ].join('\n');

  const normalized = normalizeFaqMarkerProse(markdown);

  assert.ok(normalized.startsWith('## 2. Example\n**A1.**\nThis is literal sample text'));
  assert.match(normalized, /\*\*Q1\.\*\* Actual FAQ question\?/);
  assert.match(normalized, /\*\*A1\.\*\* Actual FAQ answer\./);
});

test('FAQ normalization preserves continuation lines and paragraph breaks', () => {
  const markdown = [
    '## 5. Questions',
    '**Q1.** Why check the backup?',
    '**A1.**',
    '',
    'A backup protects files before a reset.',
    'Check that the copy opens on another device.',
    '',
    'Keep the original until the restored copy is verified.',
  ].join('\n');

  assert.equal(
    normalizeFaqMarkerProse(markdown),
    [
      '## 5. Questions',
      '**Q1.** Why check the backup?',
      '**A1.** A backup protects files before a reset.',
      'Check that the copy opens on another device.',
      '',
      'Keep the original until the restored copy is verified.',
    ].join('\n')
  );
});

test('generator uses the tested publication plan to gate and select written locales', () => {
  const source = readFileSync(new URL('../generate-all.mjs', import.meta.url), 'utf8');
  assert.match(source, /decidePublishLocales\(TARGET_LANGS, \[\.\.\.generatedPostContents\.keys\(\)\], 10\)/);
  assert.match(source, /if \(!publication\.canPublish\)/);
  assert.match(source, /for \(const lang of publication\.passingLocales\)/);
});

test('the 2ho prompt requires independent locale generation and truthful first-person storytelling', () => {
  const source = readFileSync(new URL('../generate-all.mjs', import.meta.url), 'utf8');
  assert.ok(source.includes('Write concise headings in the target language that fit'));
  assert.ok(source.includes('Do not use generic boilerplate, promise guaranteed resolution times or outcomes'));
  assert.ok(source.includes('never copy their brackets or placeholder text'));
  const requiredDirectives = [
    "const GENERATION_PROMPT_VERSION = '2026-10-30-truthful-first-person-v3';",
    'separate locale-specific generation call, not a translation',
    'Carry a natural, topic-fit first-person storytelling voice throughout the full article.',
    'Keep roughly 30% engaging narrative and narrator reasoning/transitions and 70%',
    'verified explanations, practical steps, and safety information.',
    'Never imply that the author actually performed the repair or experienced the event.',
    'Do not invent customer stories, personal repair experiences,',
    'credentials, quotations, or outcomes.',
    'Do not stage a personal scene.',
    'specific city, date, time, or case.',
    'Do not add a hypothetical-scene disclaimer.',
    'Keep the first-person voice in present reasoning only;',
  ];
  for (const directive of requiredDirectives) {
    assert.ok(source.includes(directive), 'Missing prompt directive: ' + directive);
  }
  const localeStart = source.indexOf('const TARGET_LANGS = [');
  const localeEnd = source.indexOf('const delay =', localeStart);
  assert.notEqual(localeStart, -1);
  assert.notEqual(localeEnd, -1);
  const localeConfig = source.slice(localeStart, localeEnd);
  const localeContexts = localeConfig
    .split('\n')
    .filter((line) => line.includes('localeContext:'))
    .join('\n')
    .toLowerCase();
  for (const place of [
    'seoul',
    'silicon valley',
    'new york',
    'nyc',
    'tokyo',
    'marunouchi',
    'shinagawa',
    'frankfurt',
    'munich',
    'münchen',
    'berlin',
    'paris la défense',
    'madrid',
    'milan',
    'milano',
    'são paulo',
    'amsterdam',
    'zuidas',
    'warsaw',
    'warszawa',
    'jakarta',
    'ho chi minh',
    'quận 1',
    'hà nội',
  ]) {
    assert.equal(localeContexts.includes(place), false, 'locale context must not seed a city: ' + place);
  }
});

const validFaq = [
  '**Q1.** First question?',
  '',
  '**A1.** First answer.',
  '',
  '**Q2.** Second question?',
  '',
  '**A2.** Second answer.',
  '',
  '**Q3.** Third question?',
  '',
  '**A3.** Third answer.',
].join('\n');

test('bold spacing cleanup preserves FAQ marker lines and blank lines', () => {
  const input = [
    '** spaced bold text **',
    '',
    '**Q1.** First question?',
    '',
    '**A1.** First answer.',
    '',
    '**Q2.** Second question?',
    '',
    '**A2.** Second answer.',
  ].join('\n');

  assert.equal(
    normalizeBoldSpacing(input),
    [
      '**spaced bold text**',
      '',
      '**Q1.** First question?',
      '',
      '**A1.** First answer.',
      '',
      '**Q2.** Second question?',
      '',
      '**A2.** Second answer.',
    ].join('\n')
  );
  assert.deepEqual(validateFaqLayout(validFaq), []);
});

test('bold spacing cleanup never joins text across a newline', () => {
  const input = '** opening phrase\ncontinued phrase **';

  assert.equal(normalizeBoldSpacing(input), input);
});

test('collapsed FAQ question and answer markers are rejected', () => {
  const malformed = [
    '**Q1.** First question? **A1.** First answer.',
    '',
    '**Q2.** Second question? **A2.** Second answer.',
    '',
    '**Q3.** Third question? **A3.** Third answer.',
  ].join('\n');

  const errors = validateFaqLayout(malformed);

  assert.ok(errors.some((error) => error.includes('A1') && error.includes('별도 줄')));
  assert.ok(errors.some((error) => error.includes('Q1') && error.includes('빈 줄')));
});

test('generator validates FAQ marker line layout before publishing', () => {
  const source = readFileSync(new URL('../generate-all.mjs', import.meta.url), 'utf8');

  assert.match(source, /errors\.push\(\.\.\.validateFaqLayout\(bodyWithoutCode\)\)/);
});

test('locale personas avoid unsupported credentials or experience claims', () => {
  const source = readFileSync(new URL('../generate-all.mjs', import.meta.url), 'utf8');
  const personas = [...source.matchAll(/persona:\s*(['"])(.*?)\1/g)].map((match) => match[2].toLowerCase());
  assert.equal(personas.length, 12);
  const unsupportedClaim =
    /(experienced|senior|expert|engineer|technician|specialist|professional|consultant|architect|現役|経験|専門家|エンジニア|기술자|전문가|경력|수리 기사|실무 경험|técnico|experto|especialista|technicien|ingénieur|esperto|experiente|techniker|ingenieur|serwisant|inżynier|chuyên gia|kỹ sư|teknisi senior)/i;
  for (const persona of personas) {
    assert.equal(
      unsupportedClaim.test(persona),
      false,
      'Persona must not imply credentials or personal experience: ' + persona
    );
    assert.ok(persona.length > 0);
  }
});

test('repair prompt preserves explicit FAQ markers and blank-line layout', () => {
  const source = readFileSync(new URL('../generate-all.mjs', import.meta.url), 'utf8');
  for (const requirement of [
    '[REQUIRED FAQ LAYOUT]',
    'Keep all FAQ question and answer prose in ${lang.name}; preserve its meaning.',
    'Put each exact marker (**Q1.**, **A1.**, **Q2.**, **A2.**, **Q3.**, **A3.**) at the start of its own line',
    'Put one blank line between each question and its answer, and between FAQ pairs.',
    'Do not place a question and its answer marker on the same line.',
  ]) {
    assert.ok(source.includes(requirement), 'Missing FAQ repair requirement: ' + requirement);
  }
});

