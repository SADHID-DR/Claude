# Cross-repo design divergence — SADHID-DR/Claude vs SADHID-DR/maresgestion-sistema

Generated from `skillui --dir` runs on both repositories (see `docs/SKILLUI.md`).
Extractions live in `design/sadhid-claude-design/` and `design/maresgestion-design/`.

## Summary

The two repositories are effectively the same application — 11 of 12 extracted component
patterns are identical by name (`DashboardTab`, `ParametersTab`, `ContractorsTab`,
`ProductionSheetsTab`, `ResumenTab`, `UsersTab`, `AiChatTab`, `GoogleDriveTab`,
`MeasurementGrid`, `LoginScreen`, `AppLogo`). Same stack: Tailwind CSS 4.1.14 + React 19.0.1,
Lucide icons, 6px spacing grid, dark theme, expressive motion.

**Their colour systems have diverged.** They are no longer the same product visually.

## Palette conflict

| Role | maresgestion-sistema | Claude | Status |
|---|---|---|---|
| background | `#000000` | `#1a2332` | **conflict** |
| surface | `#0f172a` | `#1a3a52` (`#0f172a` also present, untokenised) | **conflict** |
| text-primary | `#f1f5f9` | `#f8f9fa` | drift |
| accent | `#00aeef` | `#2c5aa0` (`#00aeef` still present) | **conflict** |
| gold | — | `#d4af37` | Claude only |
| danger | `#f37021` | `#f37021` | aligned |
| info | `#0060a9` | `#0060a9` | aligned |

`#00aeef` / `#f37021` / `#0060a9` are the shared corporate triad. The Claude repo's
"redesign corporativo elegante" (commit `365674e`) layered a gold/navy system
(`#d4af37`, `#2c5aa0`, `#1a2332`, `#1a3a52`) **on top of** the old one without removing it —
`#00aeef` and `#0f172a` still appear in the tree. Nine colours where six are defined.

The extractor labels `#d4af37` as `text-muted` because it is bound to `--color-secondary`.
Gold is being used as an emphasis colour but is tokenised as a de-emphasis role. That naming
is wrong and will mislead anything generating from these tokens.

## Shared defect: no typography

Both repos extract **0 font families**. No `font-family` is declared anywhere — every surface
inherits the browser default sans-serif. For a system that produces printed deliverables
(`PrintSettingsModal`, `react-to-print`, `jspdf`), the print output typeface is currently
whatever the rendering browser picks. This is the single highest-value fix in either repo.

## Component delta

- `SyncStatusIndicator` — Claude only (Firestore realtime sync, commit `b4eb22a`)
- `PrintSettingsModal` — maresgestion only

Each repo carries a component the other lacks. Neither is a superset.

## Recommended order of work

1. Declare a font stack in the Tailwind theme of both repos. Fixes the print pipeline.
2. Decide which palette is canonical — gold/navy or cyan/black. Running both is not a style, it
   is an unresolved merge.
3. Delete the losing palette's hexes rather than leaving them resident.
4. Re-tokenise `#d4af37` off `--color-secondary` onto an accent role.
5. Port `SyncStatusIndicator` and `PrintSettingsModal` so the two trees converge.
