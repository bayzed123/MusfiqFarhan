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

/**
 * Jobs, with what each one needs and whether it carries its own `if:`.
 *
 * Indentation is the parse: a job is a two-space key under `jobs:`, and its
 * own keys sit four spaces in. Enough for the one question below.
 */
function readJobs(source) {
  const lines = source.split('\n');
  const start = lines.findIndex((line) => /^jobs:\s*$/.test(line));
  if (start === -1) return [];

  const jobs = [];
  let current = null;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim() || /^\s*#/.test(line)) continue;
    if (/^\S/.test(line)) break; // back to a top-level key: jobs are done

    const job = line.match(/^ {2}([A-Za-z0-9_-]+):\s*$/);
    if (job) {
      current = { name: job[1], line: index + 1, needs: [], hasIf: false };
      jobs.push(current);
      continue;
    }
    if (!current) continue;

    if (/^ {4}if:/.test(line)) current.hasIf = true;
    const needs = line.match(/^ {4}needs:\s*(.+)$/);
    if (needs) {
      current.needs = needs[1]
        .replace(/[[\]]/g, '')
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean);
    }
  }
  return jobs;
}

/**
 * A job with no `if:` defaults to success(), which GitHub evaluates over every
 * ancestor in the needs graph rather than the direct dependency alone. So one
 * conditional job upstream — skipped rather than failed — silently skips
 * everything downstream of it, while the run still reports green.
 *
 * That shipped: `deploy-api` is skipped on a scheduled run by design, and it
 * took the publish step with it. The site was rebuilt and verified every six
 * hours and never published, so everything posted from the dashboard waited
 * for the next code push instead.
 */
function checkSkipPropagation(file, jobs) {
  const byName = new Map(jobs.map((job) => [job.name, job]));

  const reachesConditional = (job, seen = new Set()) =>
    job.needs.some((name) => {
      if (seen.has(name)) return false;
      seen.add(name);
      const parent = byName.get(name);
      if (!parent) return false;
      return parent.hasIf || reachesConditional(parent, seen);
    });

  for (const job of jobs) {
    if (job.hasIf || !job.needs.length) continue;
    if (!reachesConditional(job)) continue;
    problems.push(
      `${file}:${job.line}: job "${job.name}" has no if:, but a job it depends on does.\n` +
        '    A bare job defaults to success(), which covers every ancestor — so when\n' +
        '    that upstream job is skipped this one is skipped too, and the run still\n' +
        '    reports green. Give it an explicit condition on what it actually needs,\n' +
        `    e.g. if: needs.${job.needs[0]}.result == 'success'`
    );
  }
}

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

  checkSkipPropagation(file, readJobs(source));
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
