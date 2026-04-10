# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Clock App (`artifacts/clock`)

Fullscreen clock web app built with React + Vite. Designed for Chrome on Android.

### Features
- **4 clock styles**: Apple (thin numerals), Analog (SVG), Digital (monospace), Flip (card-flip animation)
- **5 themes**: Black, Night, Matrix, Amber, Day — persisted to localStorage
- **Side panel UI**: Left panel = theme color dots; Right panel = style buttons (A/○/D/F) + controls
- **Header**: Date (left) + Battery indicator (right)
- **Timer**: 5-minute countdown → 3-beep alert (Web Audio API) → auto-transitions to stopwatch
- **Stopwatch**: counts up with tenths display (MM:SS.d)
- **Wake Lock API**: keeps screen on
- **Fullscreen API**: expand/exit fullscreen
- **Double-tap** clock area to open timer overlay
- **Settings persisted**: style, theme, showSeconds, showDate

### Key files
- `src/App.tsx` — main layout, mode switching
- `src/hooks.ts` — all hooks (useTime, useWakeLock, useFullscreen, useBattery, useSetting, useTimer, useStopwatch)
- `src/types.ts` — ClockStyle, ClockTheme, THEME_COLORS, STYLE_LABELS, etc.
- `src/TimerOverlay.tsx` — timer + stopwatch overlay components
- `src/clocks/` — AppleClock, AnalogClock, DigitalClock, FlipClock
- `src/index.css` — full CSS with CSS custom properties for themes, safe-area-insets, responsive sizing
