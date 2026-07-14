# Field Usability Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the five highest-friction issues found in the Pixel 6a Android preview while preserving the working capture, pairing, and content flows.

**Architecture:** Keep all navigation and persistence unchanged. Add two tiny pure helpers for deterministic tab layout and After queue CTA decisions, then make localized UI changes in the existing tab layout, camera, gallery card, gallery, queue, and dashboard screens.

**Tech Stack:** Expo SDK 54, React Native 0.81, Expo Router, strict TypeScript, Node `node:test`.

## Global Constraints

- Stay in the Expo managed workflow; do not run `expo prebuild` or create native folders.
- Do not upgrade Expo or React Native.
- Add no dependencies.
- Preserve all existing media, pairing, generated-asset, and job behavior.
- Test narrow Android layouts, Android back behavior, and system-navigation safe areas.
- Do not start an EAS or APK build.

---

### Task 1: Isolate and test layout and queue decisions

**Files:**
- Create: `utils/tab-bar-layout.ts`
- Create: `utils/after-queue-state.ts`
- Create: `tests/field-usability-polish.test.cjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `getTabBarLayout(bottomInset: number)` returning `height` and `paddingBottom`.
- Produces: `getAfterQueuePrimaryAction(input)` returning one of `add-before`, `start-next`, `view-pair`, or `unavailable` with display copy and disabled state.

- [x] Write tests for zero, negative, and Pixel-style bottom insets and for all four queue states.
- [x] Run the focused test and confirm it fails because the helper modules do not exist.
- [x] Implement the minimal pure helpers.
- [x] Add the focused test to the aggregate test command.
- [x] Re-run the focused test and confirm it passes.

### Task 2: Respect Android bottom safe areas

**Files:**
- Modify: `app/(tabs)/_layout.tsx`

**Interfaces:**
- Consumes: `getTabBarLayout(bottomInset)` from Task 1.

- [x] Read the bottom inset with `useSafeAreaInsets()`.
- [x] Apply deterministic tab height and bottom padding while preserving the existing icon, label, color, and top-padding choices.
- [x] Run the focused helper test and TypeScript check.

### Task 3: Make ghost controls camera-first

**Files:**
- Modify: `app/job-camera.tsx`

**Interfaces:**
- Preserves the existing `ghostEnabled`, `ghostOpacity`, capture, zoom, flash,
  and camera-facing state.

- [x] Add a collapsed-by-default ghost-controls state.
- [x] Replace the always-open panel with a compact 44-point control that shows
  `Off` or the current opacity percentage.
- [x] Let the compact control expand the existing switch and slider and include
  an explicit collapse button.
- [x] Remove the redundant large centered alignment badge.
- [x] Add accessible names, hints, and expanded/checked states.
- [x] Run lint and TypeScript checking for the screen.

### Task 4: Remove dead ends and hidden management

**Files:**
- Modify: `app/(tabs)/(jobs)/after-queue.tsx`
- Modify: `components/media-grid-item.tsx`
- Modify: `app/(tabs)/(jobs)/gallery.tsx`
- Modify: `app/(tabs)/(jobs)/[id]/index.tsx`

**Interfaces:**
- Consumes: `getAfterQueuePrimaryAction(input)` from Task 1.
- Reuses: existing pair detail, media detail, archive, restore, and delete flows.

- [x] Render `View Latest Before & After` when the queue is complete and route
  it to the newest saved pair.
- [x] Remove gallery long-press deletion and expose a visible Manage action that
  opens the existing media detail screen.
- [x] Replace the always-visible Archive/Delete stack with a compact accessible
  `Job options` disclosure; keep Restore visible for archived jobs.
- [x] Preserve every existing confirmation and failure message.
- [x] Run the focused helper test, lint, and TypeScript checking.

### Task 5: Align launch documentation and verify

**Files:**
- Modify: `docs/ANDROID_LAUNCH_PLAN.md`
- Modify: `docs/LAUNCH_CHECKLIST.md` only if preview-build status is stale.

- [x] Record that EAS is linked, `com.kabba1.jobtopost` is configured, and the
  preview APK was installed and audited on the Pixel 6a.
- [x] State that Expo Go remains the rapid UI/JavaScript loop and preview APKs
  are checkpoint builds, not per-edit builds.
- [x] Run `npm run lint`.
- [x] Run `npx tsc --noEmit`.
- [x] Run `npm test` and confirm the exact test count.
- [x] Run `npx expo-doctor`.
- [x] Review the full diff for scope and accidental changes.
- [x] Perform a final code-review pass and document the Pixel 6a Expo Go checks
  that still require the user's device.
