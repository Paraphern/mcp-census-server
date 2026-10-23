#!/usr/bin/env node
// Recomputes every figure in RECONCILIATION-RUGSNARE.md from the dated artifact.
// Zero dependencies. Same contract as tools/denominator_frames.mjs and
// tools/reconcile_agentnexus.mjs: the document may not carry a number this file
// cannot reproduce.
//
//   node tools/reconcile_rugsnare.mjs            # print the table
//   node tools/reconcile_rugsnare.mjs selftest   # known-answer checks
import { readFileSync } from 'node:fs';

const SRC = new URL('../reconciliation/rugsnare-2026-10-22.json', import.meta.url);
const doc = JSON.parse(readFileSync(SRC, 'utf8'));
const rows = doc.rows;
const endpoints = rows.flatMap((r) => r.endpoints);

export const mapped = () => rows.filter((r) => r.registry_id);
export const unmapped = () => rows.filter((r) => !r.registry_id);
// A mapped slug whose registry record declares no remote endpoint. This is a fact
// about the REGISTRY RECORD, not a finding about the vendor — six of eleven, which is
// why an anonymous-vantage drift rate over this corpus is a slice of unknown size.
export const noDeclaredEndpoint = () => mapped().filter((r) => r.declared_remote_endpoints === 0);
export function states() {
  const c = {};
  for (const e of endpoints) c[e.stillos_state] = (c[e.stillos_state] || 0) + 1;
  return c;
}
export const withEvents = () => rows.filter((r) => r.endpoints.some((e) => e.surface_events > 0));
export const silentTotal = () => endpoints.reduce((a, e) => a + e.silent_changes, 0);
export const eventTotal = () => endpoints.reduce((a, e) => a + e.surface_events, 0);
// The rows where NEITHER side can see the artifact: our prober is walled AND their
// scanner could not scan it. Paraphern flagged sentry as exactly this.
export const bothMiss = () => mapped().filter((r) =>
  r.endpoints.some((e) => e.stillos_state === 'WAF' || e.stillos_state === 'TOOLS_DENIED'));

function main() {
  console.log(`subject      ${doc.subject}`);
  console.log(`measured_at  ${doc.measured_at_utc}  (is_current_state=${doc.is_current_state})`);
  console.log(`snapshot     ${doc.census_snapshot}`);
  console.log(`\ntheir slugs ${rows.length} | mapped to a registry id ${mapped().length} | in our census ${rows.filter((r) => r.in_our_census).length}`);
  console.log(`declaring a remote endpoint: ${rows.filter((r) => r.declared_remote_endpoints > 0).length} of ${mapped().length} mapped`);
  console.log('\nper mapped slug:');
  for (const r of mapped()) {
    if (!r.endpoints.length) { console.log(`  ${r.slug.padEnd(16)} NO_DECLARED_ENDPOINT`); continue; }
    for (const e of r.endpoints) {
      console.log(`  ${r.slug.padEnd(16)} ${e.stillos_state.padEnd(16)} ev=${e.surface_events} silent=${e.silent_changes}  ${e.url}`);
    }
  }
  console.log(`\nendpoint states: ${JSON.stringify(states())}`);
  console.log(`surface events: ${eventTotal()} | SILENT changes: ${silentTotal()}`);
  console.log(`slugs with any event: ${withEvents().map((r) => r.slug).join(', ') || '(none)'}`);
  console.log(`\nunmapped (their null rows, with their stated reason): ${unmapped().length}`);
  for (const r of unmapped()) console.log(`  ${r.slug.padEnd(16)} ${String(r.their_note).slice(0, 72)}`);
}

function selftest() {
  let pass = 0; let fail = 0;
  const t = (name, got, want) => {
    JSON.stringify(got) === JSON.stringify(want)
      ? pass++
      : (fail++, console.log(`  FAIL ${name}\n    got  ${JSON.stringify(got)}\n    want ${JSON.stringify(want)}`));
  };
  t('their corpus size', rows.length, 22);
  t('mapped to a registry id', mapped().length, 11);
  t('unmapped', unmapped().length, 11);
  t('mapped + unmapped partitions the corpus', mapped().length + unmapped().length, rows.length);
  t('every mapped slug resolves in our census', mapped().every((r) => r.in_our_census), true);
  t('only 5 of the 11 declare a remote endpoint', mapped().filter((r) => r.declared_remote_endpoints > 0).length, 5);
  t('6 mapped slugs declare NO remote endpoint', noDeclaredEndpoint().length, 6);
  t('endpoint state distribution', states(), { WAF: 2, NOT_UNDER_CLOCK: 1, LIVE: 1, TOOLS_DENIED: 1 });
  t('exactly one endpoint is LIVE to an anonymous prober', states().LIVE, 1);
  t('the one LIVE endpoint is context7', withEvents().map((r) => r.slug), ['context7']);
  t('2 surface events total', eventTotal(), 2);
  // THE HEADLINE, and it is a negative result: we have no silent drift to contribute
  // on this corpus. Reporting it as a finding rather than burying it is the point.
  t('ZERO silent changes — nothing to contribute on this corpus', silentTotal(), 0);
  t('both context7 events are version-visible, not silent',
    rows.find((r) => r.slug === 'context7').endpoints[0].events.every((e) => e.silent === false), true);
  t('both context7 events are the same 4.2.0 -> 4.3.0 transition',
    [...new Set(rows.find((r) => r.slug === 'context7').endpoints[0].events.map((e) => `${e.from_version}->${e.to_version}`))],
    ['4.2.0->4.3.0']);
  t('sentry is a both-miss (walled to us, unscannable for them)',
    bothMiss().map((r) => r.slug).includes('sentry'), true);
  // NOT_UNDER_CLOCK must never be read as a verdict.
  t('NOT_UNDER_CLOCK is defined as absence of a verdict',
    /absence of a verdict/.test(doc.definitions.NOT_UNDER_CLOCK), true);
  t('NO_DECLARED_ENDPOINT is defined as a registry-record property',
    /property of the registry record/.test(doc.definitions.NO_DECLARED_ENDPOINT), true);
  // Dated, not current — the whole asset.
  t('artifact does not claim to be current state', doc.is_current_state, false);
  t('artifact carries a measurement timestamp', /^\d{4}-\d{2}-\d{2}T/.test(doc.measured_at_utc), true);
  t('artifact names the census snapshot it was built from', /^census-\d{4}-/.test(doc.census_snapshot), true);
  t('every state used is defined', Object.keys(states()).every((k) => k in doc.definitions), true);
  // The substring trap that would have manufactured two fake Sentry rows.
  t('exact-match law is recorded in the artifact', /never by substring/.test(doc.exact_match_law), true);
  t('no endpoint url is a non-vendor sentry lookalike',
    endpoints.every((e) => !/regsentry|sdsentry/.test(e.url)), true);
  t('every mapped row carries their stated note', mapped().every((r) => typeof r.their_note === 'string'), true);
  console.log(`selftest: ${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
}

process.argv[2] === 'selftest' ? selftest() : main();
