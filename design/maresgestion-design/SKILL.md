---
name: maresgestion-design
description: Design system skill for maresgestion. Activate when building UI components, pages, or any visual elements. Provides exact color tokens, typography scale, spacing grid, component patterns, and craft rules. Read references/DESIGN.md before writing any CSS or JSX.
---

# maresgestion Design System

You are building UI for **maresgestion**. Dark-themed, cool palette, sans-serif typography (sans-serif), standard density on a 6px grid, flat elevation (no shadows), expressive motion.

## Design Philosophy

- **Flat elevation** — depth through color shifts and borders, never shadows. Surfaces get progressively lighter to indicate elevation.
- **Gradient accents** — gradients are used thoughtfully for emphasis, not decoration.
- **standard density** — 6px base grid. Every dimension is a multiple of 6.
- **cool palette** — the color temperature runs cool, matching the sans-serif typography.
- **Restrained accent** — `#00aeef` is the only pop of color. Used exclusively for CTAs, links, focus rings, and active states.
- **Expressive motion** — animations are an integral part of the experience. Use spring physics and layout animations.
- **Lucide icons** — use Lucide for all iconography. Do not mix icon libraries.

## Color System

### Core Palette

| Role | Token | Hex | Use |
|------|-------|-----|-----|
| Background | `--background` | `#000000` | Page/app background |
| Surface | `--surface` | `#0f172a` | Cards, panels, modals |
| Text Primary | `--text-primary` | `#f1f5f9` | Headings, body text |
| Accent | `--accent` | `#00aeef` | CTAs, links, focus rings |

### Status Colors

| Status | Hex | Use |
|--------|-----|-----|
| Danger | `#f37021` | Errors, destructive actions |

### Extended Palette

- `#0060a9`

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

### Breakpoints

| Name | Value |
|------|-------|
| breakpoint-1280px | 1280px |

Mobile-first: design for small screens, layer on responsive overrides.

## Component Patterns

### Card

```css
.card {
  background: #0f172a;
  border-radius: 8px;
  padding: 24px;
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
  background: #00aeef;
  color: #f1f5f9;
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
  color: #f1f5f9;
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
  background: #000000;
  border: 1px solid #444444;
  border-radius: 8px;
  padding: 12px 18px;
  color: #f1f5f9;
  font-size: 14px;
}
.input:focus { border-color: #00aeef; outline: none; }
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
  background: #0f172a;
  color: #858789;
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
  background: #0f172a;
  border-radius: 16px;
  padding: 30px;
  max-width: 480px;
  width: 90vw;
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
  color: #858789;
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
  color: #858789;
  padding: 12px 18px;
  border-radius: 8px;
  transition: color 150ms;
}
.nav-link:hover { color: #f1f5f9; }
.nav-link.active { color: #00aeef; }
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
- Variants: `id`, `name`, `document`, `type`, `bank`, `asc`, `Activo`, `Todos`, `status`, `desc`, `General`, `Inactivo`
- Props: `projects`, `activeProjectId`, `params`, `contractors`, `onAddContractor`, `newC`
- Styles: `bg-white`, `border`, `space-x-1`, `text-blue-600`, `opacity-60`

**DashboardTab** (`src/components/DashboardTab.tsx`)
- Variants: `dashboard`, `params`, `contractors`, `sheets`, `create`, `edit`, `ABIERTO`, `corte`, `vencimiento`, `all`, `warning`, `info`, `resumen`, `view`, `CERRADO`, `estimada`, `danger`, `Inicio`, `General`
- Props: `projects`, `activeProjectId`, `onSelectProject`, `projectId`, `params`, `contractors`
- Styles: `bg-slate-800`, `rounded`, `px-4`, `text-slate-200`, `shadow-md`

**GoogleDriveTab** (`src/components/GoogleDriveTab.tsx`)
- Variants: `replace_all`, `General`, `MaresNominas`, `keep_both`, `Contratista`, `Reporte`, `Activo`, `DOP`
- Props: `projects`, `contractors`, `generalPriceGuide`, `includeItbisInNet`, `activeProjectId`, `onRestoreSystem`
- Styles: `bg-indigo-50`, `border`, `px-1.5`, `text-indigo-600`

**LoginScreen** (`src/components/LoginScreen.tsx`)
- Props: `onLogin`, `username`
- Styles: `bg-slate-900`, `rounded-2xl`, `p-4`, `text-center`, `shadow-2xl`

**MeasurementGrid** (`src/components/MeasurementGrid.tsx`)
- Variants: `left`, `center`, `ERR`, `amber`, `blue`, `copy`, `col`, `SUM`, `cut`, `paste`, `delete`, `clear`, `Delete`, `insert_before`, `insert_after`, `generico`, `3d`, `2d`, `simple`, `touch`, `Backspace`, `right`, `emerald`, `row`, `0`, `clear_formats`
- Props: `key`, `initialData`, `isReadOnly`, `manualFormula`, `onChange`, `gridJson`
- Styles: `bg-white`, `border`, `mt-1`, `text-left`, `shadow-xl`

**ParametersTab** (`src/components/ParametersTab.tsx`)
- Variants: `123`
- Props: `params`, `onUpdateParams`, `newParams`, `includeItbisInNet`, `onToggleItbisInNet`, `onResetParams`
- Styles: `bg-white`, `border`, `p-6`, `text-lg`, `shadow-sm`

**PrintSettingsModal** (`src/components/PrintSettingsModal.tsx`)
- Props: `isOpen`, `onClose`, `onConfirm`, `settings`, `format`, `orientation`
- Styles: `bg-black/60`, `rounded-xl`, `p-4`, `text-blue-400`, `backdrop-blur-sm`

**ProductionSheetsTab** (`src/components/ProductionSheetsTab.tsx`)
- Variants: `defecto`, `nombre`, `todos`, `select`, `actual`, `contractor`, `company`, `letter`, `legal`, `a4`, `15d`, `21d`, `unid`, `punit`, `actions`, `discount1`, `discount2`, `advancePayment`, `discount1Label`, `discount2Label`, `priceUnit`, `quantity`, `quantityActual`, `description`, `unit`, `subchapter`, `CERRADO`, `actividad`, `cubicados`, `deselect`, `historico`, `both`, `a3`, `30d`, `Contratista`, `Corte`, `123`, `General`, `ABIERTO`, `DOP`, `ACTUAL`, `Ajustero`, `Desconocido`
- Props: `activeProjectId`, `params`, `contractors`, `sheets`, `activeSheetId`, `onUpdateSheet`
- Styles: `bg-slate-700/20`, `rounded-lg`, `p-2.5`, `text-slate-500`, `shadow-xl`

**ResumenTab** (`src/components/ResumenTab.tsx`)
- Variants: `dashboard`, `params`, `contractors`, `sheets`, `detallado`, `contratista`, `letter`, `legal`, `a4`, `number`, `resumen`, `hoja`, `a3`, `General`
- Props: `params`, `contractors`, `sheets`, `includeItbisInNet`, `onNavigate`, `tab`
- Styles: `bg-white`, `border`, `p-5`, `text-sm`, `shadow-xs`

## Animation & Motion

This project uses **expressive motion**. Animations are part of the design language.

### CSS Animations

- `march`
- `animate-fade-in`
- `animate-slide-in`
- `animate-pulse`
- `animate-spin`

### Motion Guidelines

- **Duration:** 150-300ms for micro-interactions, 300-500ms for page transitions
- **Easing:** `ease-out` for enters, `ease-in` for exits
- **Direction:** Elements enter from bottom/right, exit to top/left
- **Reduced motion:** Always respect `prefers-reduced-motion` — disable animations when set

## Depth & Elevation

This design uses **flat elevation** — no box-shadows anywhere.

### Elevation Strategy

| Level | Technique | Use |
|-------|-----------|-----|
| 0 — Base | Background color | Page background |
| 1 — Raised | Lighter surface + subtle border | Cards, panels |
| 2 — Floating | Even lighter surface + stronger border | Dropdowns, popovers |
| 3 — Overlay | Backdrop + modal surface | Modals, dialogs |

## Anti-Patterns (Never Do)

- **No box-shadow** on any element — use borders and surface colors for depth
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
6. **Apply elevation** — flat, surface color shifts only
7. **Validate** — every value traces back to a design token. No magic numbers.

## Brand Spec

- **Brand color:** `#00aeef`

## Quick Reference

```
Background:     #000000
Surface:        #0f172a
Text:           #f1f5f9 / (not extracted)
Accent:         #00aeef
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
- Creating new components, pages, or visual elements for maresgestion
- Writing CSS, Tailwind classes, styled-components, or inline styles
- Building page layouts, templates, or responsive designs
- Reviewing UI code for design consistency
- The user mentions "maresgestion" design, style, UI, or theme
- Generating mockups, wireframes, or visual prototypes

---

# Full Reference Files

> Every output file is embedded below. Claude has full design system context from /skills alone.

## Design System Tokens (DESIGN.md)

# maresgestion DESIGN.md

> Auto-generated design system — reverse-engineered via static analysis by skillui.
> Frameworks: Tailwind CSS 4.1.14 + React 19.0.1
> Colors: 6 · Fonts: 0 · Components: 12
> Icon library: Lucide · State: not detected
> Primary theme: dark · Dark mode toggle: no · Motion: expressive

---

## 1. Visual Theme & Atmosphere

This is a **dark-themed** interface with a flat, cool visual language. Elevation is achieved through color and border shifts rather than shadows — a clean, industrial aesthetic. Typography uses **sans-serif** throughout — a clean, modern choice that maintains consistency. Spacing follows a **6px base grid** (standard density), with scale: 6, 12, 18, 24, 30, 36, 42, 48px. The palette is predominantly monochromatic with **#00aeef** as the single accent color — used sparingly for interactive elements and emphasis. Motion is expressive — spring physics, layout animations, and staggered reveals are part of the visual language.

---

## 2. Color Palette & Roles

| Token | Hex | Role | Use |
|---|---|---|---|
| background | `#000000` | background | Page background, darkest surface |
| surface | `#0f172a` | surface | Card and panel backgrounds |
| text-primary | `#f1f5f9` | text-primary | Headings and body text |
| accent | `#00aeef` | accent | CTAs, links, focus rings, active states |
| danger | `#f37021` | danger | Error states, destructive actions |
| info | `#0060a9` | info | Informational highlights |


---

## 3. Typography Rules

No typography tokens detected.

---

## 4. Component Stylings

### Layout (2)

**LoginScreen** — `src/components/LoginScreen.tsx`
- Props: `onLogin`, `username`
- Key Styles: `rounded-2xl`, `border-slate-100`, `bg-slate-900`, `p-4`, `text-2xl`, `font-black`, `shadow-2xl`, `hover:bg-slate-50`
- Animation: tw-animate-in, tw-animate-spin, tw-transitions: duration-200, transition-all
- State: useState

```tsx
<div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 border border-slate-100 flex flex-col space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center">
          <div className="mx-auto mb-4 w-16 flex items-center justify-center">
            <AppLogo className="w-full h-auto" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800">MaresNominas</h2>
          <p className="text-xs text-slate-500 font-bold mt-1 uppercase">Inicio de Sesión</p>
        </div>

        <button
          type="button"
```

**PrintSettingsModal** — `src/components/PrintSettingsModal.tsx`
- Props: `isOpen`, `onClose`, `onConfirm`, `settings`, `format`, `orientation`, `isPdfExport`
- Key Styles: `rounded-xl`, `border-slate-800`, `bg-black/60`, `p-4`, `text-lg`, `font-bold`, `backdrop-blur-sm`, `hover:text-white`
- Animation: tw-animate-in, tw-transitions: duration-200, transition-colors, transition-all
- State: useState

```tsx
<div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-slate-900 px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Printer size={18} className="text-blue-400" />
            <h3 className="text-white font-bold text-lg font-sans tracking-tight">Opciones de Impresión</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg"
          >
            <X size={16} />
```

### Navigation (1)

**DashboardTab** — `src/components/DashboardTab.tsx`
- Variants: `dashboard`, `params`, `contractors`, `sheets`, `create`, `edit`, `ABIERTO`, `corte`, `vencimiento`, `all`, `warning`, `info`, `resumen`, `view`, `CERRADO`, `estimada`, `danger`, `Inicio`, `General`
- Props: `projects`, `activeProjectId`, `onSelectProject`, `projectId`, `params`, `contractors`, `sheets`, `includeItbisInNet` (+12 more)
- Key Styles: `rounded`, `border-slate-600`, `bg-slate-800`, `px-4`, `text-xs`, `font-bold`, `shadow-md`, `hover:bg-blue-500`
- Animation: tw-animate-in, tw-animate-pulse, tw-animate-fade-in
- State: useState, useRef

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
- Variants: `left`, `center`, `ERR`, `amber`, `blue`, `copy`, `col`, `SUM`, `cut`, `paste`, `delete`, `clear`, `Delete`, `insert_before`, `insert_after`, `generico`, `3d`, `2d`, `simple`, `touch`, `Backspace`, `right`, `emerald`, `row`, `0`, `clear_formats`
- Props: `key`, `initialData`, `isReadOnly`, `manualFormula`, `onChange`, `gridJson`, `computedTotal`, `formulaText` (+5 more)
- Key Styles: `rounded`, `border-slate-200`, `bg-white`, `mt-1`, `text-xs`, `font-bold`, `shadow-xl`, `hover:bg-amber-500/50`
- Animation: tw-animate-fade-in, tw-animate-pulse, tw-transitions: transition-colors, transition-opacity, transition-all
- State: useState, useRef

**ResumenTab** — `src/components/ResumenTab.tsx`
- Variants: `dashboard`, `params`, `contractors`, `sheets`, `detallado`, `contratista`, `letter`, `legal`, `a4`, `number`, `resumen`, `hoja`, `a3`, `General`
- Props: `params`, `contractors`, `sheets`, `includeItbisInNet`, `onNavigate`, `tab`, `sheetId`, `onMassCloseReports`
- Key Styles: `rounded-xl`, `border-slate-200`, `bg-white`, `p-5`, `text-sm`, `font-semibold`, `shadow-xs`, `hover:bg-slate-50`
- Animation: tw-animate-ping, tw-animate-fade-in, tw-animate-pulse
- State: useState, useRef

### Data Input (5)

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
- Variants: `id`, `name`, `document`, `type`, `bank`, `asc`, `Activo`, `Todos`, `status`, `desc`, `General`, `Inactivo`
- Props: `projects`, `activeProjectId`, `params`, `contractors`, `onAddContractor`, `newC`, `onUpdateContractor`, `updatedC` (+5 more)
- Key Styles: `rounded-xl`, `border-slate-200`, `bg-white`, `space-x-1`, `text-xs`, `font-bold`, `opacity-60`, `group-hover:opacity-100`
- Animation: tw-animate-in, tw-animate-fade-in, tw-animate-pulse
- State: useState, useRef

```tsx
<th 
        onClick={(
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
- Variants: `defecto`, `nombre`, `todos`, `select`, `actual`, `contractor`, `company`, `letter`, `legal`, `a4`, `15d`, `21d`, `unid`, `punit`, `actions`, `discount1`, `discount2`, `advancePayment`, `discount1Label`, `discount2Label`, `priceUnit`, `quantity`, `quantityActual`, `description`, `unit`, `subchapter`, `CERRADO`, `actividad`, `cubicados`, `deselect`, `historico`, `both`, `a3`, `30d`, `Contratista`, `Corte`, `123`, `General`, `ABIERTO`, `DOP`, `ACTUAL`, `Ajustero`, `Desconocido`
- Props: `activeProjectId`, `params`, `contractors`, `sheets`, `activeSheetId`, `onUpdateSheet`, `updatedSheet`, `onAddSheet` (+16 more)
- Key Styles: `rounded-lg`, `border-slate-200`, `bg-slate-700/20`, `p-2.5`, `text-xs`, `font-semibold`, `shadow-xl`, `group-hover:bg-slate-700/55`
- Animation: tw-animate-pulse, tw-animate-fade-in, tw-animate-spin
- State: useState, useRef, forwardRef, memo

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
- Animation: tw-animate-in, tw-animate-slide-up, tw-transitions: transition-all, duration-200, transition-colors
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
<svg viewBox="0 0 150 95" className={`${className} overflow-visible`} xmlns="http://www.w3.org/2000/svg">
      {/* Exact geometric replica of the MaresNominas logo under perfect symmetric alignment to avoid clipping */}
      <polygon points="10,85 45,10 80,85" fill="#0060A9" />
      <polygon points="55,10 75,10 110,85 90,85" fill="#00AEEF" />
      <polygon points="85,10 105,10 140,85 120,85" fill="#F37021" />
    </svg>
```



---

## 5. Layout Principles

- **Base spacing unit:** 6px
- **Spacing scale:** 6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72
- **Border radius:** 2px, 4px, 6px, 8px, 12px, 16px
- **Max content width:** 100%
- **Grid usage:** `grid-cols-1`, `grid-cols-3`, `grid-cols-2`
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

No box-shadow values detected. The design uses a **flat visual style** — elevation is conveyed through background color shifts and borders rather than shadows.

**Elevation Strategy:**
| Level | Technique | Use |
|---|---|---|
| 0 — Base | Background color | Page background |
| 1 — Raised | Lighter surface + subtle border | Cards, panels |
| 2 — Floating | Even lighter surface + stronger border | Dropdowns, popovers |
| 3 — Overlay | Backdrop + modal surface | Modals, dialogs |


---

## 7. Animation & Motion

This project uses **expressive motion**. Animations are an integral part of the experience.

### CSS Animations

- `@keyframes march`
- `@keyframes animate-fade-in`
- `@keyframes animate-slide-in`
- `@keyframes animate-pulse`
- `@keyframes animate-spin`
- `@keyframes animate-bounce`
- `@keyframes animate-ping`
- `@keyframes animate-in`

### Animated Components

- **AiChatTab**: tw-animate-fade-in, tw-animate-slide-in, tw-animate-pulse
- **ContractorsTab**: tw-animate-in, tw-animate-fade-in, tw-animate-pulse
- **DashboardTab**: tw-animate-in, tw-animate-pulse, tw-animate-fade-in
- **GoogleDriveTab**: tw-animate-spin, tw-animate-pulse, tw-animate-in
- **LoginScreen**: tw-animate-in, tw-animate-spin, tw-transitions: duration-200, transition-all

### Motion Guidelines

- Duration: 150-300ms for micro-interactions, 300-500ms for page transitions
- Easing: `ease-out` for enters, `ease-in` for exits
- Always respect `prefers-reduced-motion`


---

## 8. Do's and Don'ts

### Do's

- Use `#00aeef` for interactive elements (buttons, links, focus rings)
- Use `#000000` as the primary page background
- Follow the **6px** spacing grid for all margins, padding, and gaps
- Use border and background shifts for elevation — not shadows
- Use border-radius from the scale: 2px, 4px, 6px, 8px, 12px
- Reuse existing components from Section 4 before creating new ones
- Use **Lucide** for all icons

### Don'ts

- Don't introduce colors outside this palette — extend the design tokens first
- Don't use arbitrary spacing values — stick to multiples of 6px
- Don't add box-shadow — this design system uses flat elevation
- Don't use arbitrary border-radius values — pick from the defined scale
- Don't duplicate component patterns — check Section 4 first
- Don't mix icon libraries — consistency matters

### Anti-Patterns (detected from codebase)

- No box-shadow on any element
- No zebra striping on tables/lists


---

## 9. Responsive Behavior

| Name | Value | Source |
|---|---|---|
| breakpoint-1280px | 1280px | css |

**Approach:** Mobile-first using Tailwind responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`).
Always design for mobile first, then layer on responsive overrides.


---

## 10. Agent Prompt Guide

Use these as starting points when building new UI:

### Build a Card

```
Background: #0f172a
Border: 1px solid var(--border)
Radius: 8px
Padding: 24px
Font: sans-serif
No shadows — use borders and surface colors for depth.
```

### Build a Button

```
Primary: bg #00aeef, text white
Ghost: bg transparent, border var(--border)
Padding: 12px 24px
Radius: 8px
Hover: opacity 0.9 or lighter shade
Focus: ring with #00aeef
```

### Build a Page Layout

```
Background: #000000
Max-width: 100%, centered
Grid: 6px base
Responsive: mobile-first, breakpoints from Section 9
```

### Build a Stats Card

```
Surface: #0f172a
Label: var(--text-muted) (muted, 12px, uppercase)
Value: #f1f5f9 (primary, 24-32px, bold)
Status: use success/warning/danger from Section 2
```

### Build a Form

```
Input bg: #000000
Input border: 1px solid var(--border)
Focus: border-color #00aeef
Label: var(--text-muted) 12px
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
6. Elevation: flat, surface shifts
```

