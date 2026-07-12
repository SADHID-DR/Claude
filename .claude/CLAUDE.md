# Ejercicios — Premium Personal Coach Gym/CrossFit App

**Repo:** SADHID-DR/Claude  
**Branch:** `claude/exercise-app-folder-96gr5d`  
**Platform:** React Native + Expo (iOS/Android APK via GitHub Actions)

## App Vision

Premium coach inside your phone. A personal-trainer-grade workout logger with:
- **Animated technique demos** (SVG stick-figure, muscle-colored joints, lateral view)
- **Intelligent progression** (double progression: +2.5 kg when you hit all target reps)
- **Coach wisdom** (warmup library ≤15 min per routine, RIR logging, strength goals, BMI)
- **Live metrics** (weekly muscle radar, volume landmarks, calorie burn, streak)
- **Routine architecture** (plans with weekly schedules, swappable exercises mid-session)

---

## Tech Stack

- **React Native 0.74** + Expo SDK 51 (TypeScript strict)
- **Router:** expo-router (folder-based)
- **State:** AsyncStorage + Context (src/lib/store.tsx)
- **Storage keys** (src/lib/storage.ts):
  - `sessions`, `routines`, `plans`, `body` (weight history)
  - `height` (cm), `weightGoal` (kg), `strengthGoals` (e1RM per exercise)
  - `onboarded`, `unit` (kg/lb), `reminders`, `activePlan`
- **Notifications:** expo-notifications (Android channel: `entrenos-v2` @ MAX importance)
- **SVG Demos:** ExerciseDemo (200+ patterns, muscle highlight, reusable 150-size)

---

## Core Screens

### 1. **Home / Today** (`app/(tabs)/index.tsx`)
- **KPIs:** Streak (🔥), workouts (🏋️), volume (📊)
- **Weekly Muscle Radar:** 6 groups (chest, back, legs, shoulders, arms, core)
  - Visual: hexagon chart, 0–max sets/week
  - **Volume Landmarks:** target 10–20 sets/muscle/week
    - ⚠️ Low (<10) and excessive (>20) warnings with muscle names
    - ✅ "Zone optimal" when balanced
- **Mood Chart:** 1–5 emoji history (😫 1 to 💪 5)
- **Top 5 PRs** (best e1RM estimated)
- **Smart Insights** (on-device analysis)
- **Achievements:** 7 unlockable (first, 3-day streak, 7-day, 10 wkts, 25 wkts, 10k kg, 60kg+)

### 2. **Routines** (`app/(tabs)/routines.tsx`)
- **Plans:** Weekly schedule (Mon–Sun), swappable routines per day
- **Reminders:** Time picker, weekly dispatch, test notification
- **⌚ Galaxy Watch hint:** Enable sound+vibration in Galaxy Wearable settings
- **Routine editor** (routine/new.tsx):
  - Muscle filter (6 + "Full-body" + Cardio)
  - Full exercise names (no truncation)
  - Drag-reorder with ▲▼ buttons
  - Set/reps/rest-seconds config
  - 👁 inline demo toggle per exercise

### 3. **Exercise Catalog** (`app/(tabs)/exercises.tsx`)
- **Filter:** Equipment (7) + Muscle (9)
- **Card per exercise:**
  - Name, equipment, category, difficulty
  - 👁 demo toggle (shows ExerciseDemo size 150)
- **Exercise detail** (`app/exercise/[id].tsx`):
  - Animated demo (size 215)
  - **Strength Goal:** target e1RM with % progress bar
  - PR & training zones (60–90%, 75–90%, etc.)
  - Warmup plan (progressive load sets)
  - Progress chart (max weight per session)
  - Instructions + coach tips

### 4. **Session / Live Workout** (`app/session/[id].tsx`)
- **🔥 Warmup Card (≤15 min):**
  - ON/OFF toggle (starts ON)
  - Recommended items per routine (coach-selected)
  - Checkable rows: name, dose, 👁 demo
  - Expandable WARMUPS library (~26 items, selectable via ✎ button)
  - Demos render ExerciseDemo(size 130) when available (via exerciseId)
- **Exercise rows:**
  - Coach hint (first-time text / double-prog prescription)
  - Double-progression prefill + "⬆️ level up" label
  - **Editable rest time:** inline input (default 2 min from routine)
  - Sets grid:
    - Cols: Set#, Weight, Reps, **RIR** (0–5), ✓ done
    - Long-press to delete session
- **Auto-rest timer** (floats during session):
  - Reads override rest or routine restSeconds
  - Audio + haptics in last 5s (beep + vibrate)
  - "Pause/+15s/Skip" buttons
- **Finish alert:**
  - "≈X calorías" + any new PRs
  - Double-prog hint for next time
  - Saves session with `kcal` field
- **Feel meter** (😫 1–5 💪) + notes

### 5. **History / Progress** (`app/(tabs)/history.tsx`)
- **KPIs:** Streak, workouts, volume
- **Body Data Section:**
  - Weight chart (3+ entries)
  - Height (cm), Weight (unit), Cintura (cm), Brazo (cm) inputs
  - **IMC card:** value + OMS category (bajo peso / saludable ✅ / sobrepeso / obesidad)
  - **Weight Goal:** input (saves in kg), progress bar (% remaining)
  - 🗑️ Delete buttons: body data only, or full history
- **Mood Chart** (if 2+ entries)
- **PRs Hall of Fame** (top 5 e1RM)
- **Achievements** grid
- **Session rows:**
  - Name, date, duration, exercise count, sets, volume, **≈X calorías**
  - Set lines: exercise, weight×reps, **@RIR n** (if logged)
  - Share button (summary + last 3 sessions + kcal)

---

## Data Model

### WorkoutSession (`src/lib/types.ts`)
```ts
{
  id: string;
  routineId: string;
  routineName: string;
  date: number; // ms
  durationSeconds: number;
  sets: LoggedSet[];
  feeling?: 1–5;
  note?: string;
  kcal?: number; // estimated calories burned
}

LoggedSet: { exerciseId, weight, reps, rir?: 0–5 }
```

### Routine
```ts
{ id, name, exercises: RoutineExercise[], createdAt }
RoutineExercise: { exerciseId, sets, reps, restSeconds }
```

### Plan
```ts
{ id, name, routineIds: string[], schedule: string[] (days), …  }
```

### BodyEntry
```ts
{ id, date, weight (kg), waist?, arm? }
```

### Exercise
```ts
{
  id, name, muscle: MuscleGroup | 'Full-body' | Cardio,
  category, equipment, difficulty,
  description, instructions[], coachTips[],
  weightGuide, lowImpact?
}
```

---

## Coach Logic

### Double Progression (`src/lib/coach.ts`)
If last session's all sets ≥ target reps → prescribe weight + 2.5 kg today (with "⬆️ level up" label)
Else → repeat same weight

### Warmup System (`src/data/warmups.ts`)
- **26-item library:** pulse (escaladora, bici, remo, cuerda), mobility (fire hydrant, kickback, bird-dog, etc.), activation (glute bridge, face pull, goblet squat, etc.), power (box jump, kipping)
- **Coach recommendation per routine:**
  - Leg day → bike + hip/ankle mobility + goblet squat + RDL + glute bridge
  - Push day → default circuit + shoulder dislocations + rotations
  - Pull day → default circuit + band pull-aparts + scapula work
  - CrossFit/WOD → default + world's greatest stretch + air squat
  - Else → default circuit + world's greatest stretch
- **Default (non-leg days):** 5 min escaladora + 3×10 salto de caja 24" + 3×10 kipping en barra

### Strength Tracking (`src/lib/strength.ts`)
- **e1RM (one-rep max):** Epley formula
- **Training zones** (% of e1RM):
  - Power 75–90%, 1–5 reps
  - Strength 80–90%, 3–6 reps
  - Hypertrophy 70–85%, 6–12 reps
  - Endurance 50–70%, 12–20 reps

### Stats (`src/lib/stats.ts`)
- **Streak:** days from today backwards (alive if yesterday trained)
- **Weekly workout count:** unique days this week (Mon–Sun)
- **Muscle balance:** effective sets per group this week (warns <10 or >20)
- **Weight progress:** max weight per session (for chart)
- **Achievements:** 7 (first, streak 3/7, workouts 10/25, volume 10k kg, weight 60kg+)
- **Calories:** MET × 3.5 × body(kg) / 200 × min (8 MET for CrossFit/WOD, 5.5 else)

### Notifications (`src/lib/notifications.ts`)
- **Channel:** `entrenos-v2` (NEW → bypass frozen old channel settings)
- **Importance:** MAX (all devices)
- **Sound/Vibration:** [0, 300, 200, 300] ms pattern
- **Watch sync:** Heads-up only (Wear OS mirrors these)
- **User guidance:** Enable Galaxy Wearable → Estilo de alerta "Sonido y vibración"

---

## File Structure

```
exercise-app/
├─ app/
│  ├─ (tabs)/
│  │  ├─ index.tsx          (Home: KPIs, radar, landmarks, insights)
│  │  ├─ exercises.tsx      (Catalog: filtered cards w/ demos)
│  │  ├─ routines.tsx       (Plans, reminders, watch hint)
│  │  ├─ history.tsx        (Sessions, body data, BMI, goals, PRs)
│  ├─ exercise/[id].tsx     (Demo, goal, zones, progress)
│  ├─ routine/new.tsx       (Create/edit, full names, demos)
│  ├─ session/[id].tsx      (Live: warmup card, RIR, rest-time edit, kcal at finish)
├─ src/
│  ├─ lib/
│  │  ├─ types.ts           (WorkoutSession, LoggedSet, rir, kcal fields)
│  │  ├─ storage.ts         (AsyncStorage key names)
│  │  ├─ store.tsx          (Context: height, weightGoal, strengthGoals, body, clearAll*)
│  │  ├─ stats.ts           (streak, balance, progress, kcal, achievements)
│  │  ├─ coach.ts           (lastWeightFor, doubleProgression, progressionHint)
│  │  ├─ strength.ts        (e1RM, zones, warmup plan)
│  │  ├─ notifications.ts   (scheduling, testing, channel v2)
│  │  ├─ units.ts           (kg↔lb, display rounding)
│  │  ├─ theme.ts           (colors, spacing, radii)
│  ├─ data/
│  │  ├─ exercises.ts       (+8 full-body: clean & jerk, snatch, DB thruster, man maker, clean & press, burpee box, bear, wall walk)
│  │  ├─ warmups.ts         (WarmupItem[] library w/ exerciseIds)
│  ├─ components/
│  │  ├─ ExerciseDemo.tsx   (200+ patterns, RULES: box jump→burpee, man maker→thruster, wall walk→ohp, etc.)
│  │  ├─ MuscleRadar.tsx
│  │  ├─ LineChart.tsx
│  │  ├─ ui/                (Card, Button, Tag, SectionHeader, etc.)
```

---

## Verification & Build

**Type-check** (run from exercise-app dir):
```bash
npx tsc --noEmit
```

**Android export** (smoke test):
```bash
EXPO_OFFLINE=1 npx expo export --platform android
```

**APK via GitHub Actions:**
- Commits to `claude/exercise-app-folder-96gr5d` trigger `.github/workflows/build-apk.yml`
- Signed APK + release tag `apk-N`
- Download: `https://github.com/SADHID-DR/Claude/releases/download/apk-N/ejercicios.apk`
- In-app updater announces new builds (apk-8+)

---

## UI Conventions

- **Spacing:** sm/xs/md/lg/xl per theme.ts
- **Radii:** sm (4px), md (8px), lg (12px), pill (20px)
- **Colors:** primary (green), accent, warn (orange), streak (red), text, textMuted, bg, surface
- **Emojis:** 🔥 streak, 🏋️ workouts, 📊 volume, 💪 strength, 🎯 goals, 👁 demo, ⬆️ level-up, etc.
- **Demo size:** 215 (detail), 150 (editor card), 130 (warmup), 100 (thumb)

---

## Next Improvements (Future Roadmap)

- Export → PDF history (trending, body data, PRs)
- Supersets / trisets support
- Rest-pause sets
- Video upload (exercise form feedback)
- Leaderboard / social
- AI coach (real-time set form scoring)
- Wearable app (set logging from watch)

---

## Branches & Commits

**Current:** `claude/exercise-app-folder-96gr5d`  
**Style:** English commit bodies + Spanish UI.  
**Template:**
```
[Feature/Fix]: One-line summary

- Bullet 1
- Bullet 2

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: <URL>
```

---

**Last updated:** 2026-07-12  
**Status:** APK-19 live (full coach 2.0 + fix batch)
