# Reconciliation — rugsnare drift-watch corpus

Our dated column for the 22-slug corpus in [snyk/agent-scan#482](https://github.com/snyk/agent-scan/issues/482),
joined on the MCP Registry id from
[`registry-mapping.json`](https://github.com/Paraphern/rugsnare/blob/main/audits/drift-watch/registry-mapping.json).

- Artifact: [`reconciliation/rugsnare-2026-10-22.json`](reconciliation/rugsnare-2026-10-22.json)
- Reproduce every number below: `node tools/reconcile_rugsnare.mjs`
- Known-answer checks: `node tools/reconcile_rugsnare.mjs selftest` (24 cases, zero deps)

Same contract as [`DENOMINATORS.md`](DENOMINATORS.md) — and as the Agent Nexus column in
[PR #2](https://github.com/stillmarcus24/mcp-census-server/pull/2), still open at the
time of writing: **this document may not carry a figure the tool cannot reproduce from
the artifact.**

## The headline is a negative result

**Zero silent changes. We have no silent drift to contribute on this corpus.**

The chain that gets you there, and every step is in the artifact:

| | count |
|---|---|
| their corpus | 22 slugs |
| mapped to a registry id (their work) | 11 |
| of those, present in our census | 11 |
| **of those, declaring any remote endpoint** | **5** |
| of those, `LIVE` to an anonymous prober | **1** |
| surface events on it | 2 |
| **of those, silent** | **0** |

Both `context7` events are the same `4.2.0 → 4.3.0` transition and both carry
`silent: false` — a version moved, so a per-release pin already catches them. Their
version-indexed pins are not missing anything our clock saw.

## Per mapped slug

| slug | our state | endpoint |
|---|---|---|
| `context7` | **`LIVE`** · 2 events, 0 silent | `mcp.context7.com/mcp` |
| `hostinger` | `WAF` | `mcp.hostinger.com` |
| `sentry` | `WAF` | `mcp.sentry.dev/mcp` |
| `currents` | `TOOLS_DENIED` | `gateway.pipeworx.io/currents/mcp` |
| `browserstack` | `NOT_UNDER_CLOCK` | `mcp.browserstack.com/mcp` |
| `chrome-devtools` `mongodb` `figma` `sap-fiori` `ui5` `firebase` | `NO_DECLARED_ENDPOINT` | — |

Two definitions that must not be misread as verdicts:

- **`NOT_UNDER_CLOCK`** — declared in the registry but not in our probe set at that time.
  Absence of a verdict, **not** a verdict of absence.
- **`NO_DECLARED_ENDPOINT`** — the registry record declares no remote endpoint, so there
  is nothing for an anonymous prober to reach. A property of **the registry record**,
  not a finding about the vendor. **Six of eleven.**

## Why the overlap is one row, and why that is the finding

Our column is **clock-indexed**: what an anonymous prober saw at a stated time. Theirs is
**version-indexed**: per-release package pins. The corpus is 22 slugs and the two vantage
points intersect on **one** — so a drift rate computed from either vantage alone is a
slice of unknown size. That disjointness is more publishable than a wider overlap would
have been, and it is not an artifact of either scanner being wrong.

**`sentry` is a both-miss**: WAF-walled to our prober, and on their could-not-scan list.
Zero *exposure*, not zero drift — collapsing those two understates the rate, in both
columns.

## Exact-match law

Endpoint URLs are matched **exactly, never by substring**. A substring search for
`sentry` in our event series returns `regsentry.com` and `sdsentry.0xpi.com`, **neither
of which is Sentry**. That would have manufactured two fake Sentry rows that looked like
corroboration. The artifact records the law and a selftest case asserts no lookalike URL
is present.

## Dated, not current

`measured_at_utc: 2026-10-22T19:40:08.749Z`, built from census snapshot
`census-2026-10-22T19-10-03-335Z.json`, and `is_current_state` is `false` in the artifact
itself. A column that silently updates to match today is not a record of anything.
