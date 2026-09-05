---
name: sadhid-claude-design
description: Design system skill for sadhid-claude. Activate when building UI components, pages, or any visual elements. Provides exact color tokens, typography scale, spacing grid, component patterns, and craft rules. Read references/DESIGN.md before writing any CSS or JSX.
---

# sadhid-claude Design System

You are building UI for **sadhid-claude**. Dark-themed, cool palette, sans-serif typography (sans-serif), standard density on a 6px grid, expressive motion.

## Design Philosophy

- **Layered depth** — use shadow tokens to create a sense of physical layering. Each elevation level has a specific shadow.
- **Gradient accents** — gradients are used thoughtfully for emphasis, not decoration.
- **standard density** — 6px base grid. Every dimension is a multiple of 6.
- **cool palette** — the color temperature runs cool, matching the sans-serif typography.
- **Restrained accent** — `#2c5aa0` is the only pop of color. Used exclusively for CTAs, links, focus rings, and active states.
- **Expressive motion** — animations are an integral part of the experience. Use spring physics and layout animations.
- **Lucide icons** — use Lucide for all iconography. Do not mix icon libraries.

## Color System

### Core Palette

| Role | Token | Hex | Use |
|------|-------|-----|-----|
| Background | `--background` | `#1a2332` | Page/app background |
| Surface | `--surface` | `#1a3a52` | Cards, panels, modals |
| Text Primary | `--text-primary` | `#f8f9fa` | Headings, body text |
| Text Muted | `--text-muted` | `#d4af37` | Captions, placeholders |
| Accent | `--accent` | `#2c5aa0` | CTAs, links, focus rings |

### Status Colors

| Status | Hex | Use |
|--------|-----|-----|
| Danger | `#f37021` | Errors, destructive actions |

### Extended Palette

- `#0060a9`
- `#0f172a` — Deep background layer or shadow color

### CSS Variable Tokens

```css
--color-primary: #1a3a52;
--color-secondary: #d4af37;
--color-accent: #2c5aa0;
```

## Typography

### Font Stack


### Type Scale

| Role | Family | Size | Weight |
|------|--------|------|--------|

### Typography Rules

- All text uses **sans-serif** — never add another font family
- Max 3-4 font sizes per screen
- Headings: weight 600-700, body: weight 400
- Use color and opacity for text hierarchy, not additional font sizes
- Line height: 1.5 for body, 1.2 for headings

## Spacing & Layout

### Base Grid: 6px

Every dimension (margin, padding, gap, width, height) must be a multiple of **6px**.

### Spacing Scale

`6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72` px

### Spacing as Meaning

| Spacing | Use |
|---------|-----|
| 3-6px | Tight: related items within a group |
| 12px | Medium: between groups |
| 18-24px | Wide: between sections |
| 36px+ | Vast: major section breaks |

### Border Radius

Scale: `2px, 4px, 6px, 8px, 12px, 16px`
Default: `8px`

### Container

Max-width: `100%`, centered with auto margins.

## Component Patterns

### Card

```css
.card {
  background: #1a3a52;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 8px 16px rgba(26,58,82,0.15);
}
```

```html
<div class="card">
  <h3>Card Title</h3>
  <p>Card content goes here.</p>
</div>
```

### Button

```css
/* Primary */
.btn-primary {
  background: #2c5aa0;
  color: #f8f9fa;
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 500;
  transition: opacity 150ms ease;
}
.btn-primary:hover { opacity: 0.9; }

/* Ghost */
.btn-ghost {
  background: transparent;
  border: 1px solid #444444;
  color: #f8f9fa;
  border-radius: 8px;
  padding: 12px 24px;
}
```

```html
<button class="btn-primary">Get Started</button>
<button class="btn-ghost">Learn More</button>
```

### Input

```css
.input {
  background: #1a2332;
  border: 1px solid #444444;
  border-radius: 8px;
  padding: 12px 18px;
  color: #f8f9fa;
  font-size: 14px;
}
.input:focus { border-color: #2c5aa0; outline: none; }
```

```html
<input class="input" type="text" placeholder="Search..." />
```

### Badge / Chip

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
  background: #1a3a52;
  color: #d4af37;
}
```

```html
<span class="badge">New</span>
<span class="badge">Beta</span>
```

### Modal / Dialog

```css
.modal-backdrop { background: rgba(0, 0, 0, 0.6); }
.modal {
  background: #1a3a52;
  border-radius: 16px;
  padding: 30px;
  max-width: 480px;
  width: 90vw;
  box-shadow: 0 8px 16px rgba(26,58,82,0.15);
}
```

```html
<div class="modal-backdrop">
  <div class="modal">
    <h2>Dialog Title</h2>
    <p>Dialog content.</p>
    <button class="btn-primary">Confirm</button>
    <button class="btn-ghost">Cancel</button>
  </div>
</div>
```

### Table

```css
.table { width: 100%; border-collapse: collapse; }
.table th {
  text-align: left;
  padding: 12px 18px;
  font-weight: 500;
  font-size: 12px;
  color: #d4af37;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #444444;
}
.table td {
  padding: 18px;
  border-bottom: 1px solid #444444;
}
```

```html
<table class="table">
  <thead><tr><th>Name</th><th>Status</th><th>Date</th></tr></thead>
  <tbody>
    <tr><td>Item One</td><td>Active</td><td>Jan 1</td></tr>
    <tr><td>Item Two</td><td>Pending</td><td>Jan 2</td></tr>
  </tbody>
</table>
```

### Navigation

```css
.nav {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 24px;
}
.nav-link {
  color: #d4af37;
  padding: 12px 18px;
  border-radius: 8px;
  transition: color 150ms;
}
.nav-link:hover { color: #f8f9fa; }
.nav-link.active { color: #2c5aa0; }
```

```html
<nav class="nav">
  <a href="/" class="nav-link active">Home</a>
  <a href="/about" class="nav-link">About</a>
  <a href="/pricing" class="nav-link">Pricing</a>
  <button class="btn-primary" style="margin-left: auto">Get Started</button>
</nav>
```

### Extracted Components

These components were found in the codebase:

**AiChatTab** (`src/components/AiChatTab.tsx`)
- Variants: `user`, `assistant`, `image`, `excel`, `CREATE_SHEET`, `DELETE_SHEET`, `success`, `warn`, `error`, `quantity`, `system`, `pdf`, `UPDATE_PARAMS`, `000000`, `m2`, `Variada`, `00000`, `quantityActual`, `Varios`, `IA`
- Props: `contractors`, `sheets`, `params`, `onAddContractor`, `newContractor`, `onUpdateContractor`
- Styles: `bg-slate-900`, `border`, `space-y-6`, `text-xs`, `blur-3xl`

**ContractorsTab** (`src/components/ContractorsTab.tsx`)
- Variants: `id`, `name`, `document`, `type`, `bank`, `asc`, `Activo`, `Todos`, `status`, `desc`, `Inactivo`
- Props: `projects`, `activeProjectId`, `params`, `contractors`, `onAddContractor`, `newC`
- Styles: `bg-white`, `border`, `space-x-1`, `text-blue-600`, `opacity-60`

**DashboardTab** (`src/components/DashboardTab.tsx`)
- Variants: `dashboard`, `params`, `contractors`, `sheets`, `all`, `warning`, `info`, `resumen`, `danger`, `Inicio`
- Props: `params`, `contractors`, `sheets`, `includeItbisInNet`, `onNavigate`, `tab`
- Styles: `bg-slate-800`, `rounded`, `px-4`, `text-slate-200`, `shadow-md`

**GoogleDriveTab** (`src/components/GoogleDriveTab.tsx`)
- Variants: `replace_all`, `General`, `MaresNominas`, `keep_both`, `Contratista`, `Reporte`, `Activo`, `DOP`
- Props: `projects`, `contractors`, `generalPriceGuide`, `includeItbisInNet`, `activeProjectId`, `onRestoreSystem`
- Styles: `bg-indigo-50`, `border`, `px-1.5`, `text-indigo-600`

**LoginScreen** (`src/components/LoginScreen.tsx`)
- Variants: `admin`, `Administrador`, `123`
- Props: `onLogin`, `username`
- Styles: `bg-slate-900`, `rounded-2xl`, `p-4`, `text-center`, `shadow-2xl`

**MeasurementGrid** (`src/components/MeasurementGrid.tsx`)
- Variants: `left`, `center`, `ERR`, `amber`, `blue`, `col`, `cut`, `copy`, `paste`, `delete`, `clear`, `Delete`, `insert_before`, `insert_after`, `generico`, `3d`, `2d`, `simple`, `right`, `emerald`, `row`, `0`, `clear_formats`, `SUM`
- Props: `key`, `initialData`, `isReadOnly`, `manualFormula`, `onChange`, `gridJson`
- Styles: `bg-slate-100`, `border-b`, `pb-2`, `text-[8px]`, `opacity-40`

**ParametersTab** (`src/components/ParametersTab.tsx`)
- Variants: `123`
- Props: `params`, `onUpdateParams`, `newParams`, `includeItbisInNet`, `onToggleItbisInNet`, `onResetParams`
- Styles: `bg-white`, `border`, `p-6`, `text-lg`, `shadow-sm`

**ProductionSheetsTab** (`src/components/ProductionSheetsTab.tsx`)
- Variants: `defecto`, `nombre`, `todos`, `actual`, `contractor`, `company`, `letter`, `legal`, `a4`, `unid`, `punit`, `actions`, `discount1`, `discount2`, `advancePayment`, `discount1Label`, `discount2Label`, `priceUnit`, `quantity`, `quantityActual`, `CERRADO`, `actividad`, `cubicados`, `historico`, `both`, `a3`, `123`, `General`, `ABIERTO`, `DOP`, `ACTUAL`, `Ajustero`, `Desconocido`
- Props: `activeProjectId`, `params`, `contractors`, `sheets`, `activeSheetId`, `onUpdateSheet`
- Styles: `bg-slate-700/20`, `rounded-lg`, `p-2.5`, `text-slate-500`

**ResumenTab** (`src/components/ResumenTab.tsx`)
- Variants: `dashboard`, `params`, `contractors`, `sheets`, `detallado`, `contratista`, `letter`, `legal`, `a4`, `all`, `resumen`, `hoja`, `a3`
- Props: `params`, `contractors`, `sheets`, `includeItbisInNet`, `onNavigate`, `tab`
- Styles: `bg-white`, `border`, `p-5`, `text-sm`, `shadow-xs`

**SyncStatusIndicator** (`src/components/SyncStatusIndicator.tsx`)
- Variants: `syncing`, `synced`, `offline`, `local`, `error`, `remote`
- Props: `status`, `conflicts`, `onResolveConflict`, `conflict`, `resolution`, `onDismiss`
- Styles: `bg-red-50`, `border`, `space-y-2`, `text-sm`

## Animation & Motion

This project uses **expressive motion**. Animations are part of the design language.

### CSS Animations

- `fadeIn`
- `slideInLeft`
- `slideInRight`
- `animate-fade-in`
- `animate-slide-in`

### Motion Tokens

- **Duration scale:** `200ms`
- **Easing functions:** `ease`

### Motion Guidelines

- **Duration:** Use values from the duration scale above. Short (200ms) for micro-interactions, long (200ms) for page transitions
- **Easing:** Use `ease` as the default easing curve
- **Direction:** Elements enter from bottom/right, exit to top/left
- **Reduced motion:** Always respect `prefers-reduced-motion` — disable animations when set

## Depth & Elevation

### Shadow Tokens

- Floating (dropdowns, popovers): `0 8px 16px rgba(26,58,82,0.15)`
- Floating (dropdowns, popovers): `0 4px 12px rgba(26,58,82,0.08)`
- Overlay (modals, dialogs): `0 12px 24px rgba(26,58,82,0.12)`

## Anti-Patterns (Never Do)

- **No zebra striping** — tables and lists use borders for separation
- **No invented colors** — every hex value must come from the palette above
- **No arbitrary spacing** — every dimension is a multiple of 6px
- **No arbitrary border-radius** — use the scale: 2px, 4px, 6px, 8px, 12px, 16px
- **No opacity for disabled states** — use muted colors instead
- **No pill shapes** — this design doesn't use rounded-full / 9999px radius

## Workflow

1. **Read** `references/DESIGN.md` before writing any UI code
2. **Pick colors** from the Color System section — never invent new ones
3. **Set typography** — project font only, using the type scale
4. **Build layout** on the 6px grid — check every margin, padding, gap
5. **Match components** to patterns above before creating new ones
6. **Apply elevation** — use shadow tokens
7. **Validate** — every value traces back to a design token. No magic numbers.

## Brand Spec

- **Brand color:** `#2c5aa0`

## Quick Reference

```
Background:     #1a2332
Surface:        #1a3a52
Text:           #f8f9fa / #d4af37
Accent:         #2c5aa0
Border:         (not extracted)
Font:           sans-serif
Spacing:        6px grid
Radius:         8px
Frameworks:     Tailwind CSS, React
Icons:          Lucide
Components:     12 detected
```

## When to Trigger

Activate this skill when:
- Creating new components, pages, or visual elements for sadhid-claude
- Writing CSS, Tailwind classes, styled-components, or inline styles
- Building page layouts, templates, or responsive designs
- Reviewing UI code for design consistency
- The user mentions "sadhid-claude" design, style, UI, or theme
- Generating mockups, wireframes, or visual prototypes

---

# Full Reference Files

> Every output file is embedded below. Claude has full design system context from /skills alone.

## Design System Tokens (DESIGN.md)

# sadhid-claude DESIGN.md

> Auto-generated design system — reverse-engineered via static analysis by skillui.
> Frameworks: Tailwind CSS 4.1.14 + React 19.0.1
> Colors: 9 · Fonts: 0 · Components: 12
> Icon library: Lucide · State: not detected
> Primary theme: dark · Dark mode toggle: no · Motion: expressive

---

## 1. Visual Theme & Atmosphere

This is a **dark-themed** interface with a cool tone. Depth is expressed through layered shadows and subtle surface color variation. Typography uses **sans-serif** throughout — a clean, modern choice that maintains consistency. Spacing follows a **6px base grid** (standard density), with scale: 6, 12, 18, 24, 30, 36, 42, 48px. The accent color **#2c5aa0** anchors interactive elements (buttons, links, focus rings). Motion is expressive — spring physics, layout animations, and staggered reveals are part of the visual language.

---

## 2. Color Palette & Roles

| Token | Hex | Role | Use |
|---|---|---|---|
| color-dark | `#1a2332` | background | Page background, darkest surface |
| color-primary | `#1a3a52` | surface | Card and panel backgrounds |
| color-light | `#f8f9fa` | text-primary | Headings and body text |
| color-secondary | `#d4af37` | text-muted | Captions, placeholders, secondary info |
| color-accent | `#2c5aa0` | accent | CTAs, links, focus rings, active states |
| accent | `#00aeef` | accent | CTAs, links, focus rings, active states |
| danger | `#f37021` | danger | Error states, destructive actions |
| info | `#0060a9` | info | Informational highlights |
| unknown | `#0f172a` | unknown | Palette color |

### CSS Variable Tokens

```css
--color-primary: #1a3a52;
--color-secondary: #d4af37;
--color-accent: #2c5aa0;
```


---

## 3. Typography Rules

No typography tokens detected.

---

## 4. Component Stylings

### Layout (2)

**DashboardTab** — `src/components/DashboardTab.tsx`
- Variants: `dashboard`, `params`, `contractors`, `sheets`, `all`, `warning`, `info`, `resumen`, `danger`, `Inicio`
- Props: `params`, `contractors`, `sheets`, `includeItbisInNet`, `onNavigate`, `tab`, `sheetId`, `onAddNewSheet` (+6 more)
- Key Styles: `rounded`, `border-slate-600`, `bg-slate-800`, `px-4`, `text-xs`, `font-bold`, `shadow-md`, `hover:bg-blue-500`
- Animation: tw-animate-pulse, tw-transitions: transition-all, transition-colors, duration-200, hover-transforms
- State: useState

```tsx
<div id="dashboard-tab" className={showPrintPreview ? "fixed inset-0 z-[100] bg-slate-50 overflow-auto space-y-6 pt-16 px-4 pb-4 print:p-0 print:bg-white" : "space-y-6 print:bg-white print:p-0"}>
      {showPrintPreview && (
          <div className="fixed top-0 left-0 right-0 z-[110] bg-slate-800 text-slate-200 text-xs px-4 py-2 flex items-center justify-between shadow-md print:hidden">
             <div className="flex items-center gap-2">
                 <Printer size={13} className="text-amber-400" />
                 <span className="font-bold text-white">Vista Previa de Impresión: Dashboard</span>
             </div>
             <div className="flex items-center gap-2">
                 <button onClick={(
```

**SyncStatusIndicator** — `src/components/SyncStatusIndicator.tsx`
- Variants: `syncing`, `synced`, `offline`, `local`, `error`, `remote`
- Props: `status`, `conflicts`, `onResolveConflict`, `conflict`, `resolution`, `onDismiss`
- Key Styles: `rounded-lg`, `border-red-300`, `bg-red-50`, `space-y-2`, `text-sm`, `font-medium`, `hover:bg-blue-200`
- Animation: tw-animate-spin
- State: useState

```tsx
<div className="fixed bottom-4 right-4 z-50 space-y-2">
      {/* Main Status Badge */}
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${config.color} cursor-pointer`}
        onClick={(
```

### Data Display (3)

**GoogleDriveTab** — `src/components/GoogleDriveTab.tsx`
- Variants: `replace_all`, `General`, `MaresNominas`, `keep_both`, `Contratista`, `Reporte`, `Activo`, `DOP`
- Props: `projects`, `contractors`, `generalPriceGuide`, `includeItbisInNet`, `activeProjectId`, `onRestoreSystem`, `data`, `file` (+7 more)
- Key Styles: `rounded`, `border-indigo-100`, `bg-indigo-50`, `px-1.5`, `text-xs`, `font-bold`, `hover:bg-slate-50`
- Animation: tw-animate-spin, tw-animate-pulse, tw-animate-in
- State: useState

```tsx
<div className="flex flex-col">
      <div
        className="group p-3 bg-white hover:bg-slate-50 border border-transparent hover:border-slate-100 flex items-center justify-between gap-4 transition-all duration-150 relative mb-1 rounded-xl hover:shadow-xs"
        style={{ paddingLeft: `${Math.max(0.75, depth * 1.5 + 0.75
```

**MeasurementGrid** — `src/components/MeasurementGrid.tsx`
- Variants: `left`, `center`, `ERR`, `amber`, `blue`, `col`, `cut`, `copy`, `paste`, `delete`, `clear`, `Delete`, `insert_before`, `insert_after`, `generico`, `3d`, `2d`, `simple`, `right`, `emerald`, `row`, `0`, `clear_formats`, `SUM`
- Props: `key`, `initialData`, `isReadOnly`, `manualFormula`, `onChange`, `gridJson`, `computedTotal`, `formulaText` (+1 more)
- Key Styles: `rounded-lg`, `border-r`, `bg-slate-100`, `pb-2`, `text-xs`, `font-bold`, `opacity-40`, `select-none`
- Animation: tw-animate-fade-in, tw-animate-pulse, tw-transitions: transition-colors, transition-opacity, transition-all
- State: useState, useRef

**ResumenTab** — `src/components/ResumenTab.tsx`
- Variants: `dashboard`, `params`, `contractors`, `sheets`, `detallado`, `contratista`, `letter`, `legal`, `a4`, `all`, `resumen`, `hoja`, `a3`
- Props: `params`, `contractors`, `sheets`, `includeItbisInNet`, `onNavigate`, `tab`, `sheetId`, `onMassCloseReports`
- Key Styles: `rounded-xl`, `border-slate-200`, `bg-white`, `p-5`, `text-sm`, `font-semibold`, `shadow-xs`, `hover:bg-slate-50`
- Animation: tw-animate-ping, tw-animate-pulse, tw-transitions: transition-all, duration-250, transition-colors
- State: useState, useRef

```tsx
<div id="resumen-tab" className={isFullscreen ? "fixed inset-0 z-[100] bg-slate-50 overflow-auto space-y-6 px-4 py-4 print:p-0 print:bg-white" : "space-y-6 print:bg-white print:p-0"}>
      {/* 1. Filter Control header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-slate-900">
              Criterio de Consolidación
            </h2>
            <p className="text-xs text-slate-500">
              Verifique histórico de avances. Filtre y descargue reportes
              limpios correspondientes al reporte de corte elegido.
            </p>
```

### Data Input (6)

**AiChatTab** — `src/components/AiChatTab.tsx`
- Variants: `user`, `assistant`, `image`, `excel`, `CREATE_SHEET`, `DELETE_SHEET`, `success`, `warn`, `error`, `quantity`, `system`, `pdf`, `UPDATE_PARAMS`, `000000`, `m2`, `Variada`, `00000`, `quantityActual`, `Varios`, `IA`
- Props: `contractors`, `sheets`, `params`, `onAddContractor`, `newContractor`, `onUpdateContractor`, `updatedContractor`, `onDeleteContractor` (+12 more)
- Key Styles: `rounded-2xl`, `border-slate-800`, `bg-slate-900`, `space-y-6`, `text-xs`, `font-semibold`, `blur-3xl`, `hover:text-slate-700`
- Animation: tw-animate-fade-in, tw-animate-slide-in, tw-animate-pulse
- State: useState, useRef

```tsx
<div className="space-y-6 animate-fade-in relative">
      {/* Dynamic Inline Notification Banner (Iframe / sandbox compliant UI
```

**ContractorsTab** — `src/components/ContractorsTab.tsx`
- Variants: `id`, `name`, `document`, `type`, `bank`, `asc`, `Activo`, `Todos`, `status`, `desc`, `Inactivo`
- Props: `projects`, `activeProjectId`, `params`, `contractors`, `onAddContractor`, `newC`, `onUpdateContractor`, `updatedC` (+5 more)
- Key Styles: `rounded-xl`, `border-slate-200`, `bg-white`, `space-x-1`, `text-xs`, `font-bold`, `opacity-60`, `group-hover:opacity-100`
- Animation: tw-animate-in, tw-animate-fade-in, tw-animate-pulse
- State: useState, useRef

```tsx
<th 
        onClick={(
```

**LoginScreen** — `src/components/LoginScreen.tsx`
- Variants: `admin`, `Administrador`, `123`
- Props: `onLogin`, `username`
- Key Styles: `rounded-2xl`, `border-slate-100`, `bg-slate-900`, `p-4`, `text-2xl`, `font-black`, `shadow-2xl`, `hover:bg-slate-50`
- Animation: tw-animate-in, tw-animate-spin, tw-transitions: duration-200, transition-all
- State: useState

```tsx
<div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 border border-slate-100 flex flex-col space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center">
          <div className="mx-auto mb-4 w-10 flex items-center justify-center">
            <AppLogo className="w-full" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800">MaresNominas</h2>
          <p className="text-xs text-slate-500 font-bold mt-1 uppercase">Inicio de Sesión</p>
        </div>

        <button
          type="button"
```

**ParametersTab** — `src/components/ParametersTab.tsx`
- Variants: `123`
- Props: `params`, `onUpdateParams`, `newParams`, `includeItbisInNet`, `onToggleItbisInNet`, `onResetParams`, `hasAnyClosedReport`, `auditLogs`
- Key Styles: `rounded-xl`, `border-slate-200`, `bg-white`, `p-6`, `text-lg`, `font-bold`, `shadow-sm`, `select-none`
- Animation: tw-transitions: transition-all, transition-colors
- State: useState

```tsx
<div id="parameters-tab" className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm max-w-4xl mx-auto space-y-6">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>Tabla de Parámetros de Ley</span>
            <span className="text-xs bg-slate-100 font-mono text-slate-500 font-semibold px-2 py-0.5 rounded-sm">
              tblParametros
            </span>
          </h2>
          <p className="text-xs text-slate-500">Configura las tasas impositivas y retenciones de seguridad social del proyecto.</p>
```

**ProductionSheetsTab** — `src/components/ProductionSheetsTab.tsx`
- Variants: `defecto`, `nombre`, `todos`, `actual`, `contractor`, `company`, `letter`, `legal`, `a4`, `unid`, `punit`, `actions`, `discount1`, `discount2`, `advancePayment`, `discount1Label`, `discount2Label`, `priceUnit`, `quantity`, `quantityActual`, `CERRADO`, `actividad`, `cubicados`, `historico`, `both`, `a3`, `123`, `General`, `ABIERTO`, `DOP`, `ACTUAL`, `Ajustero`, `Desconocido`
- Props: `activeProjectId`, `params`, `contractors`, `sheets`, `activeSheetId`, `onUpdateSheet`, `updatedSheet`, `onAddSheet` (+6 more)
- Key Styles: `rounded-lg`, `border-slate-200`, `bg-slate-700/20`, `p-2.5`, `text-xs`, `font-semibold`, `group-hover:bg-slate-700/55`
- Animation: tw-animate-pulse, tw-animate-fade-in, tw-animate-spin
- State: useState, useRef, forwardRef

```tsx
<textarea
      ref={localRef}
      value={renderedValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={className}
      {...props}
    />
```

**UsersTab** — `src/components/UsersTab.tsx`
- Variants: `success`, `info`, `admin`, `supervisor`, `warn`, `auditor`
- Props: `currentUser`, `onUpdateCurrentUser`, `name`, `showAppToast`, `msg`, `type`, `projects`, `isGlobalAdmin`
- Key Styles: `rounded-2xl`, `border-slate-200`, `bg-[#0F172A]`, `space-y-6`, `text-lg`, `font-extrabold`, `shadow-xs`, `hover:bg-blue-500`
- Animation: tw-animate-in, tw-transitions: transition-all, duration-200, transition-colors
- State: useState

```tsx
<div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Title section */}
      <div className="bg-[#0F172A] text-white p-6 rounded-2xl shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-600 rounded-lg text-white">
              <Shield size={18} />
            </span>
            <h2 className="text-lg font-extrabold uppercase tracking-wide">Base de Usuarios y Permisos</h2>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
```

### Other (1)

**AppLogo** — `src/components/AppLogo.tsx`
- Props: `className`

```tsx
<svg viewBox="0 0 150 120" className={className} style={{ overflow: 'visible' }} xmlns="http://www.w3.org/2000/svg">
      {/* Shifted down to provide guaranteed padding at the top */}
      <polygon points="10,105 45,30 80,105" fill="#0060A9" />
      <polygon points="55,30 75,30 110,105 90,105" fill="#00AEEF" />
      <polygon points="85,30 105,30 140,105 120,105" fill="#F37021" />
    </svg>
```



---

## 5. Layout Principles

- **Base spacing unit:** 6px
- **Spacing scale:** 6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72
- **Border radius:** 2px, 4px, 6px, 8px, 12px, 16px
- **Max content width:** 100%
- **Grid usage:** `grid-cols-1`, `grid-cols-3`
- **Container:** Tailwind `container` class with responsive padding

**Spacing as Meaning:**
| Spacing | Use |
|---|---|
| 3-6px | Tight: related items within a group |
| 12px | Medium: between groups |
| 18-24px | Wide: between sections |
| 36px+ | Vast: major section breaks |


---

## 6. Depth & Elevation

### Floating — dropdowns, popovers, modals

- `0 8px 16px rgba(26,58,82,0.15)`
- `0 4px 12px rgba(26,58,82,0.08)`

### Overlay — full-screen overlays, top-level dialogs

- `0 12px 24px rgba(26,58,82,0.12)`



---

## 7. Animation & Motion

This project uses **expressive motion**. Animations are an integral part of the experience.

### CSS Animations

- `@keyframes fadeIn`
- `@keyframes slideInLeft`
- `@keyframes slideInRight`
- `@keyframes animate-fade-in`
- `@keyframes animate-slide-in`
- `@keyframes animate-pulse`
- `@keyframes animate-spin`
- `@keyframes animate-bounce`

### Animated Components

- **AiChatTab**: tw-animate-fade-in, tw-animate-slide-in, tw-animate-pulse
- **ContractorsTab**: tw-animate-in, tw-animate-fade-in, tw-animate-pulse
- **DashboardTab**: tw-animate-pulse, tw-transitions: transition-all, transition-colors, duration-200, hover-transforms
- **GoogleDriveTab**: tw-animate-spin, tw-animate-pulse, tw-animate-in
- **LoginScreen**: tw-animate-in, tw-animate-spin, tw-transitions: duration-200, transition-all

### Motion Guidelines

- Duration: 150-300ms for micro-interactions, 300-500ms for page transitions
- Easing: `ease-out` for enters, `ease-in` for exits
- Always respect `prefers-reduced-motion`


---

## 8. Do's and Don'ts

### Do's

- Use `#2c5aa0` for interactive elements (buttons, links, focus rings)
- Use `#1a2332` as the primary page background
- Follow the **6px** spacing grid for all margins, padding, and gaps
- Use the defined shadow tokens for elevation — see Section 6
- Use border-radius from the scale: 2px, 4px, 6px, 8px, 12px
- Reuse existing components from Section 4 before creating new ones
- Use **Lucide** for all icons

### Don'ts

- Don't introduce colors outside this palette — extend the design tokens first
- Don't use arbitrary spacing values — stick to multiples of 6px
- Don't create custom box-shadow values outside the system tokens
- Don't use arbitrary border-radius values — pick from the defined scale
- Don't duplicate component patterns — check Section 4 first
- Don't mix icon libraries — consistency matters


---

## 9. Responsive Behavior

No breakpoints detected. Consider adding responsive breakpoints to the design system.

---

## 10. Agent Prompt Guide

Use these as starting points when building new UI:

### Build a Card

```
Background: #1a3a52
Border: 1px solid var(--border)
Radius: 8px
Padding: 24px
Font: sans-serif
Use shadow tokens from Section 6.
```

### Build a Button

```
Primary: bg #2c5aa0, text white
Ghost: bg transparent, border var(--border)
Padding: 12px 24px
Radius: 8px
Hover: opacity 0.9 or lighter shade
Focus: ring with #2c5aa0
```

### Build a Page Layout

```
Background: #1a2332
Max-width: 100%, centered
Grid: 6px base
Responsive: mobile-first, breakpoints from Section 9
```

### Build a Stats Card

```
Surface: #1a3a52
Label: #d4af37 (muted, 12px, uppercase)
Value: #f8f9fa (primary, 24-32px, bold)
Status: use success/warning/danger from Section 2
```

### Build a Form

```
Input bg: #1a2332
Input border: 1px solid var(--border)
Focus: border-color #2c5aa0
Label: #d4af37 12px
Spacing: 24px between fields
Radius: 8px
```

### General Component

```
1. Read DESIGN.md Sections 2-6 for tokens
2. Colors: only from palette
3. Font: sans-serif, type scale from Section 3
4. Spacing: 6px grid
5. Components: match patterns from Section 4
6. Elevation: shadow tokens
```

