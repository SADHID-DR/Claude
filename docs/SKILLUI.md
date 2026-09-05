# SkillUI — extracting design systems into Claude-readable skills

[`skillui`](https://github.com/amaancoderx/npxskillui) is a CLI that reverse-engineers a
design system (colors, typography, spacing grid, components, animations) out of a website,
a git repo, or a local directory, and writes it as a folder Claude Code reads
automatically: `CLAUDE.md`, `SKILL.md`, `references/DESIGN.md`, plus a `.skill` ZIP.

Pure static analysis. No AI, no API keys.

## Install

Global (one machine, all projects):

```bash
npm install -g skillui
skillui --version        # 1.3.4
```

Ultra mode additionally needs Playwright and a browser:

```bash
npm install -g playwright
npx playwright install chromium
```

In this repo, no install is needed — the npm scripts pin the version via `npx`:

```bash
npm run design:self                                   # scan this codebase
npm run design -- --url https://notion.so             # crawl a live site
npm run design -- --url https://notion.so --mode ultra --screens 7
npm run design -- --repo https://github.com/org/repo  # clone + scan
```

Output lands in `./design/<name>-design/`.

## Modes

| Mode | Flag | What it reads | Needs network | Needs Playwright |
|---|---|---|---|---|
| dir | `--dir ./path` | local `.css/.scss/.ts/.tsx/.js/.jsx`, Tailwind config, CSS vars | no | no |
| repo | `--repo <git url>` | clones, then runs dir mode | git only | no |
| url | `--url <site>` | fetched HTML + linked CSS | yes | no |
| ultra | `--url <site> --mode ultra` | url mode + scroll screenshots, hover/focus diffs, keyframes, flex/grid layout, DOM component fingerprints | yes | yes |

Only `ultra` produces screenshots. If the goal is to reproduce the *look of a specific page*,
`ultra` is the only mode worth running — the others give you tokens, not layout.

## Known behaviour worth knowing before you trust the output

1. **It exits 0 even when extraction found nothing.** A blocked or failed fetch still prints
   `Extraction Complete`. Read the counters, not the banner: `Colors 0 · Fonts 0 ·
   Components 0` means the run failed, regardless of what the box says.
2. **`--url` and `--mode ultra` do not work from Claude Code on the web.** The remote
   sandbox's egress proxy denies CONNECT to arbitrary hosts (HTTP 403), so every site fetch
   returns empty. `--dir` and `--repo` work fine there (git and npm are allowed). Run URL
   and ultra modes from a local machine.
3. **It extracts a design system, not a page.** You get tokens, component style
   fingerprints, and (in ultra) screenshots. Claude then rebuilds a page in that visual
   language. It is not an HTML scraper and will not hand you a 1:1 copy.
4. **Upstream has no `LICENSE` file.** `package.json` declares MIT and the README badge
   links to a `LICENSE` that does not exist in the repo. The grant is asserted but not
   perfected — relevant if this ever gets vendored rather than consumed as a dependency.

## Using the output

```bash
cd design/notion-design && claude
```

Claude auto-reads `CLAUDE.md` and `SKILL.md` from that folder. Or copy the folder into
`.claude/skills/` to have it available repo-wide.

## Baseline for this repo

`npm run design:self` on the current tree extracts: 9 colors (`#1a2332` dark ground,
`#1a3a52` surface, `#d4af37` gold, `#2c5aa0` accent), a 6px spacing grid, 12 component
patterns, Tailwind CSS 4 + React 19, Lucide icons, no typography tokens (no font family is
declared anywhere — worth fixing).
