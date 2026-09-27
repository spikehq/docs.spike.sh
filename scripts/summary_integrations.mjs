#!/usr/bin/env node
// Keeps the "Integrations guidelines" section of SUMMARY.md sorted and complete.
//
// GitBook needs every page listed in SUMMARY.md, so each new integration guide
// adds one line to that section. Appending at the end meant two guides written
// at the same time always conflicted on the same line; a sorted section puts
// each new line where its name falls, so two guides conflict only when they are
// alphabetical neighbours, and `--fix` settles that by re-sorting.
//
//   node scripts/summary_integrations.mjs --check   fail if unsorted or a guide is unlisted
//   node scripts/summary_integrations.mjs --fix     rewrite the section sorted
//
// The general pages at the top of the section (how to create, set up and
// archive an integration, webhooks) stay first, in their order; every
// "Integrate Spike with X" line below them is sorted by X.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SUMMARY = path.join(ROOT, 'SUMMARY.md');
const GUIDES_FOLDER = path.join(ROOT, 'integrations-guideline');
const SECTION_HEADING = '## Integrations guidelines';
const GUIDE_LINE = /^\* \[Integrate Spike with (.+)\]\((integrations-guideline\/[^)]+)\)$/;
// Guides that are deliberately not in the navigation.
const UNLISTED_GUIDES = new Set(['resolve-timer-for-incidents.md']);

const collator = new Intl.Collator('en', { sensitivity: 'base' });

function readSection(lines) {
  const start = lines.findIndex((line) => line.startsWith(SECTION_HEADING));
  if (start === -1) throw new Error(`SUMMARY.md has no "${SECTION_HEADING}" section`);
  let end = start + 1;
  while (end < lines.length && !lines[end].startsWith('## ')) end += 1;
  return { start, end };
}

function sortedSection(sectionLines) {
  const pinned = sectionLines.filter((line) => line.startsWith('* ') && !GUIDE_LINE.test(line));
  const guides = sectionLines.filter((line) => GUIDE_LINE.test(line));
  const blanks = sectionLines.filter((line) => line.trim() === '');
  guides.sort((first, second) => collator.compare(first.match(GUIDE_LINE)[1], second.match(GUIDE_LINE)[1]));
  return [...pinned, ...guides, ...blanks.slice(0, 1)];
}

function unlistedGuides(sectionLines) {
  const listed = new Set(sectionLines.map((line) => (line.match(/\]\(integrations-guideline\/([^)]+)\)/) || [])[1]).filter(Boolean));
  return fs.readdirSync(GUIDES_FOLDER)
    .filter((file) => file.endsWith('.md') && !UNLISTED_GUIDES.has(file) && !listed.has(file));
}

const mode = process.argv[2];
const lines = fs.readFileSync(SUMMARY, 'utf8').split('\n');
const { start, end } = readSection(lines);
const section = lines.slice(start + 1, end);
const sorted = sortedSection(section);
const unlisted = unlistedGuides(section);
const inOrder = JSON.stringify(section) === JSON.stringify(sorted);

if (mode === '--fix') {
  fs.writeFileSync(SUMMARY, [...lines.slice(0, start + 1), ...sorted, ...lines.slice(end)].join('\n'));
  console.log(inOrder ? 'SUMMARY.md integrations section already sorted' : 'SUMMARY.md integrations section sorted');
  if (unlisted.length) console.log(`still unlisted: ${unlisted.join(', ')}`);
  process.exit(unlisted.length ? 1 : 0);
}

if (mode === '--check') {
  if (!inOrder) console.error('SUMMARY.md: integrations section is not sorted; run `node scripts/summary_integrations.mjs --fix`');
  if (unlisted.length) console.error(`SUMMARY.md: guides not listed: ${unlisted.join(', ')}`);
  process.exit(inOrder && unlisted.length === 0 ? 0 : 1);
}

console.error('usage: node scripts/summary_integrations.mjs --check | --fix');
process.exit(2);
