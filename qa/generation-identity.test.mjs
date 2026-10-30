import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  createCheckpointKey,
  createLegacyCheckpointKey,
  createTopicFileSlug,
  decidePublishLocales,
} from "../generation-identity.mjs";
import {
  normalizeBoldSpacing,
  validateFaqLayout,
} from "../markdown-normalizers.mjs";

test("checkpoint identity follows the current topic and prompt version, not later queue rows", () => {
  const topics = ["Assigned topic", "Next topic"];
  const v1 = createCheckpointKey(topics, "prompt-v1");
  const resumed = createCheckpointKey(topics, "prompt-v1");
  const changedTail = createCheckpointKey(
    ["Assigned topic", "Edited next topic"],
    "prompt-v1",
  );
  const addedTail = createCheckpointKey(
    ["Assigned topic", "Next topic", "Another topic"],
    "prompt-v1",
  );
  const changedCurrentTopic = createCheckpointKey(
    ["Different topic", "Next topic"],
    "prompt-v1",
  );
  const v2 = createCheckpointKey(topics, "prompt-v2");

  assert.equal(resumed, v1);
  assert.equal(changedTail, v1);
  assert.equal(addedTail, v1);
  assert.notEqual(changedCurrentTopic, v1);
  assert.notEqual(v2, v1);
});

test("the topic slug is stable when later queue rows change", () => {
  const slug = createTopicFileSlug("Assigned topic");

  assert.equal(createTopicFileSlug("Assigned topic"), slug);
  assert.equal(createTopicFileSlug("Assigned topic").startsWith("post-"), true);
  assert.notEqual(createTopicFileSlug("Different topic"), slug);
});

test("legacy full-queue checkpoints remain identifiable only for an unchanged queue", () => {
  const topics = ["Assigned topic", "Next topic"];
  const legacy = createLegacyCheckpointKey(topics, "prompt-v1");

  assert.equal(createLegacyCheckpointKey([...topics], "prompt-v1"), legacy);
  assert.notEqual(
    createLegacyCheckpointKey(
      ["Assigned topic", "Edited next topic"],
      "prompt-v1",
    ),
    legacy,
  );
  assert.notEqual(
    createLegacyCheckpointKey(["Different topic", "Next topic"], "prompt-v1"),
    legacy,
  );
});

test("generator migrates an exact-queue legacy cache before removing other keys", () => {
  const source = readFileSync(
    new URL("../generate-all.mjs", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /const legacyCheckpointDir = path\.join\(checkpointRoot, legacyCheckpointKey\)/,
  );
  assert.match(
    source,
    /fs\.existsSync\(legacyCheckpointDir\)[\s\S]*?fs\.renameSync\(legacyCheckpointDir, checkpointDir\)/,
  );
});

const publicationTargets = [
  "ko",
  "en",
  "ja",
  "de",
  "fr",
  "es",
  "it",
  "pt",
  "nl",
  "pl",
  "id",
  "vi",
].map((code) => ({
  code,
}));

test("publication gate allows exactly passing locales at 9/12, 10/12, and 12/12", () => {
  const nine = decidePublishLocales(
    publicationTargets,
    publicationTargets.slice(0, 9).map(({ code }) => code),
  );
  assert.equal(nine.canPublish, false);
  assert.deepEqual(
    nine.passingCodes,
    publicationTargets.slice(0, 9).map(({ code }) => code),
  );
  assert.deepEqual(
    nine.failedCodes,
    publicationTargets.slice(9).map(({ code }) => code),
  );

  const ten = decidePublishLocales(
    publicationTargets,
    publicationTargets.slice(0, 10).map(({ code }) => code),
  );
  assert.equal(ten.canPublish, true);
  assert.deepEqual(ten.passingLocales, publicationTargets.slice(0, 10));
  assert.deepEqual(
    ten.failedCodes,
    publicationTargets.slice(10).map(({ code }) => code),
  );

  const twelve = decidePublishLocales(
    publicationTargets,
    publicationTargets.map(({ code }) => code),
  );
  assert.equal(twelve.canPublish, true);
  assert.deepEqual(twelve.passingLocales, publicationTargets);
  assert.deepEqual(twelve.failedCodes, []);
});

test("generator uses the tested publication plan to gate and select written locales", () => {
  const source = readFileSync(
    new URL("../generate-all.mjs", import.meta.url),
    "utf8",
  );
  assert.match(
    source,
    /decidePublishLocales\s*\([\s\S]*?TARGET_LANGS,[\s\S]*?\.\.\.generatedPostContents\.keys\(\)[\s\S]*?\b10,?\s*\)/,
  );
  assert.match(source, /if \(!publication\.canPublish\)/);
  assert.match(source, /for \(const lang of publication\.passingLocales\)/);
});

test("the 2ho prompt requires independent locale generation and truthful first-person storytelling", () => {
  const source = readFileSync(
    new URL("../generate-all.mjs", import.meta.url),
    "utf8",
  );
  const requiredDirectives = [
    "separate locale-specific generation call, not a translation",
    "Carry a natural, topic-fit first-person storytelling voice throughout the full article.",
    "Keep roughly 30% engaging narrative and narrator reasoning/transitions and 70%",
    "verified explanations, practical steps, and safety information.",
    "Never imply that the author actually performed the repair or experienced the event.",
    "Do not invent customer stories, personal repair experiences,",
    "credentials, quotations, or outcomes.",
  ];

  assert.match(
    source,
    /const GENERATION_PROMPT_VERSION\s*=\s*[\"']2026-10-30-first-person-story-v3[\"'];/,
  );

  for (const directive of requiredDirectives) {
    assert.ok(
      source.includes(directive),
      `Missing prompt directive: ${directive}`,
    );
  }
});

const validFaq = [
  "**Q1.** First question?",
  "",
  "**A1.** First answer.",
  "",
  "**Q2.** Second question?",
  "",
  "**A2.** Second answer.",
  "",
  "**Q3.** Third question?",
  "",
  "**A3.** Third answer.",
].join("\n");

test("bold spacing cleanup preserves FAQ marker lines and blank lines", () => {
  const input = [
    "** spaced bold text **",
    "",
    "**Q1.** First question?",
    "",
    "**A1.** First answer.",
    "",
    "**Q2.** Second question?",
    "",
    "**A2.** Second answer.",
  ].join("\n");

  assert.equal(
    normalizeBoldSpacing(input),
    [
      "**spaced bold text**",
      "",
      "**Q1.** First question?",
      "",
      "**A1.** First answer.",
      "",
      "**Q2.** Second question?",
      "",
      "**A2.** Second answer.",
    ].join("\n"),
  );
  assert.deepEqual(validateFaqLayout(validFaq), []);
});

test("bold spacing cleanup never joins text across a newline", () => {
  const input = "** opening phrase\ncontinued phrase **";

  assert.equal(normalizeBoldSpacing(input), input);
});

test("collapsed FAQ question and answer markers are rejected", () => {
  const malformed = [
    "**Q1.** First question? **A1.** First answer.",
    "",
    "**Q2.** Second question? **A2.** Second answer.",
    "",
    "**Q3.** Third question? **A3.** Third answer.",
  ].join("\n");

  const errors = validateFaqLayout(malformed);

  assert.ok(
    errors.some((error) => error.includes("A1") && error.includes("별도 줄")),
  );
  assert.ok(
    errors.some((error) => error.includes("Q1") && error.includes("빈 줄")),
  );
});

test("generator validates FAQ marker line layout before publishing", () => {
  const source = readFileSync(
    new URL("../generate-all.mjs", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /errors\.push\(\.\.\.validateFaqLayout\(bodyWithoutCode\)\)/,
  );
});
