#!/usr/bin/env node
/**
 * Check the workflow files before they reach main.
 *
 * A broken deploy.yml is invisible to every other check here: the pull
 * request suite runs ci.yml, which parses fine, and deploy.yml is only
 * evaluated when it is pushed — by which point it is already on main. That
 * happened, and it cost four deploys: an `if:` reading the `secrets` context
 * is rejected outright, so the workflow ran no jobs at all and the site
 * stopped publishing while every pull request stayed green.
 *
 * No YAML library is installed, and adding one for this would be a large
 * dependency for a small job, so this reads the file as text. That is enough
 * for the failures that actually happen: a context used where GitHub does not
 * allow it, and structure missing from the top of the file.
 */

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORKFLOWS = path.join(ROOT, '.github', 'workflows');

/**
 * Contexts GitHub does not make available to a step or job `if:`.
 * `secrets` is the one that bites: the natural way to write "only when this
 * secret is set" is also the way to fail the whole workflow.
 */
const FORBIDDEN_IN_IF = ['secrets.'];

const problems = [];

function check(file, source) {
  const lines = source.split('\n');

  if (!/^name:\s*\S/m.test(source)) {
    problems.push(`${file}: no top-level "name:" — GitHub falls back to the file path`);
  }
  if (!/^\s*jobs:\s*$/m.test(source)) {
    problems.push(`${file}: no "jobs:" block`);
  }

  lines.forEach((line, index) => {
    if (!/^\s*if:/.test(line)) return;
    for (const context of FORBIDDEN_IN_IF) {
      if (line.includes(context)) {
        problems.push(
          `${file}:${index + 1}: "${context.replace('.', '')}" is not available in an if: condition.\n` +
            `    ${line.trim()}\n` +
            '    GitHub rejects the whole workflow, so no job runs at all. Read it\n' +
            '    through env: on the step and test the variable inside run: instead.'
        );
      }
    }

    // A tab anywhere in YAML is a parse error, and it is invisible in review.
    if (line.includes('\t')) problems.push(`${file}:${index + 1}: tab character in YAML`);
  });

  lines.forEach((line, index) => {
    if (line.includes('\t')) problems.push(`${file}:${index + 1}: tab character in YAML`);
  });
}

const files = (await readdir(WORKFLOWS)).filter((name) => /\.ya?ml$/.test(name));
if (!files.length) {
  console.error('No workflow files found — expected at least the deploy workflow.');
  process.exit(1);
}

for (const name of files) {
  check(name, await readFile(path.join(WORKFLOWS, name), 'utf8'));
}

if (problems.length) {
  console.error('Workflow checks failed:\n');
  for (const problem of [...new Set(problems)]) console.error(`  ${problem}\n`);
  process.exit(1);
}

console.log(`Workflow checks passed for ${files.length} file(s): ${files.join(', ')}.`);
