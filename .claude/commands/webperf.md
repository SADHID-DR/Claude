---
description: Run a web performance audit — deep mode with Lighthouse/DevTools data, quick mode from source analysis
---

Invoke the agent-skills:web-performance-auditor subagent.

`/webperf` is a **specialist delegation** command. It hands off to the `web-performance-auditor` persona, which runs the full audit and returns results directly — no synthesis step needed.

## Mode selection

**Deep mode** (preferred) — activates when any of the following are available:
- Lighthouse JSON report
- PageSpeed Insights JSON response
- CrUX API data
- DevTools performance trace
- Live URL + Chrome DevTools MCP server access
- Local Chrome DevTools MCP CLI output

**Quick mode** (fallback) — source-only analysis when no measurement artifacts are present. Findings are marked "potential impact" rather than confirmed.

## How to invoke

Pass the subagent:
- Relevant files, components, or the diff under review
- Any artifact paths or JSON content from measurement tools
- The target URL or page identifier
- Expected mode (Quick or Deep) — if Deep is expected but inputs are missing, the subagent will surface what's needed

## Output

The subagent produces a full audit report: scorecard with sourced metrics, prioritized findings, positive observations, and forward-looking recommendations. The report goes directly to the user — no further processing by this command.

Note: `/webperf` applies to web applications only. For libraries or server-only code, use `/review` instead.
