# Dark Camera Utility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved dark, photo-led field-utility direction across JobToPost without changing its working product behavior.

**Architecture:** Keep repositories, contexts, route parameters, and media services untouched. Introduce explicit app-chrome tokens plus pure dashboard presentation helpers, then restyle shared primitives before restructuring the dashboard and propagating the system through the existing screens. Keep generated-post colors explicit so exported PNGs do not inherit app chrome.

**Tech Stack:** Expo SDK 54, React Native 0.81, Expo Router, strict TypeScript, `expo-image`, Ionicons, Node `node:test`.

## Global Constraints

- Stay in Expo managed workflow; do not run `expo prebuild` or create native folders.
- Do not upgrade Expo or React Native.
- Add no dependency.
- Preserve all job, media, ghost capture, pair, generated-asset, save, share, archive, restore, and delete behavior.
- Keep generated PNG rendering visually independent from app-chrome colors.
- Verify Android at 390 by 844 and do not start an EAS/APK build.

---

### Task 1: Lock the visual and navigation contracts

**Files:**
- Create: `tests/job-dashboard-presentation.test.cjs`
- Create: `utils/job-dashboard-presentation.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `selectLatestJobMedia(media, jobId)`.
- Produces: `getNextCaptureStage(counts)`.

- [ ] Write tests for latest-media selection and next-stage selection.
- [ ] Run the focused test and confirm it fails for the missing helper module.
- [ ] Implement only the pure presentation helpers needed to pass.
- [ ] Add the focused test command to `npm test` and confirm the complete task
  finishes green.

### Task 2: Build the shared dark app chrome

**Files:**
- Create: `tests/ui-theme-contract.test.cjs`
- Create: `tests/ui-navigation-contract.test.cjs`
- Modify: `constants/theme.ts`
- Modify: `app/_layout.tsx`
- Modify: `app/(tabs)/_layout.tsx`
- Modify: `components/ui/screen-container.tsx`
- Modify: `components/ui/screen-header.tsx`
- Modify: `components/ui/primary-button.tsx`
- Modify: `components/ui/empty-state.tsx`
- Modify: `components/ui/confirm-dialog.tsx`
- Modify: `components/before-after-post-composition.tsx`

**Interfaces:**
- Consumes: semantic dark colors, typography, radii, and touch-target tokens.
- Preserves: explicit light colors used by exported social images.

- [ ] Write failing contracts for palette contrast, route preservation, three
  visible tabs, Settings reachability, and 44-point touch targets.
- [ ] Run the focused contracts and confirm they fail for the intended missing
  visual/navigation behavior.
- [ ] Add dark app tokens and explicit export-image tokens.
- [ ] Switch React Navigation, status bar, and tabs to the approved dark chrome.
- [ ] Hide only the Settings tab trigger with Expo Router `href: null`; retain
  the route.
- [ ] Restyle shared containers, headers, buttons, dialogs, and empty states.
- [ ] Run UI contracts, TypeScript, and existing generated-asset tests.

### Task 3: Rebuild the job dashboard hierarchy

**Files:**
- Modify: `app/(tabs)/(jobs)/[id]/index.tsx`
- Modify: `components/stage-card.tsx`
- Modify: `tests/job-dashboard-presentation.test.cjs`

**Interfaces:**
- Consumes: `selectLatestJobMedia` and `getNextCaptureStage`.
- Preserves: all gallery, queue, edit, content, archive, restore, and delete
  navigation and handlers.

- [ ] Use the newest real job media as a full-width hero with a fallback state.
- [ ] Place honest job metadata in the hero and keep Edit/Settings reachable.
- [ ] Convert the three stage cards into a unified dark stage rail.
- [ ] Render recent real shots below the stage rail.
- [ ] Add one dominant Continue Capture action using the tested next stage.
- [ ] Keep Match After Photos as the secondary action and move generated content
  and job options below the capture workflow.
- [ ] Run focused tests, lint, and TypeScript.

### Task 4: Propagate the visual system through capture setup

**Files:**
- Modify: `components/job-card.tsx`
- Modify: `components/job-status-filter.tsx`
- Modify: `components/job-form.tsx`
- Modify: `components/stage-segmented-control.tsx`
- Modify: `components/media-grid-item.tsx`
- Modify: `app/(tabs)/(jobs)/index.tsx`
- Modify: `app/(tabs)/(jobs)/gallery.tsx`
- Modify: `app/(tabs)/capture.tsx`
- Modify: `app/job-camera.tsx`

**Interfaces:**
- Preserves all existing route parameters, camera state, photo persistence, and
  visible Manage behavior.

- [ ] Restyle Jobs, search/filter controls, cards, and form fields.
- [ ] Add labeled Settings actions to Jobs and Capture.
- [ ] Make gallery tiles photo-led and keep management discoverable.
- [ ] Darken the camera header and controls without touching capture logic.
- [ ] Run focused UI tests, camera-related source contracts, lint, and TypeScript.

### Task 5: Finish the remaining workflow surfaces

**Files:**
- Modify: `app/(tabs)/(jobs)/after-queue.tsx`
- Modify: `app/pair-review.tsx`
- Modify: `app/(tabs)/(jobs)/pair.tsx`
- Modify: `components/comparison-view.tsx`
- Modify: `components/generated-asset-card.tsx`
- Modify: `app/(tabs)/content.tsx`
- Modify: `app/create-post.tsx`
- Modify: `app/generated-asset.tsx`
- Modify: `app/review.tsx`
- Modify: `app/(tabs)/(jobs)/media.tsx`
- Modify: `components/photo-metadata-form.tsx`
- Modify: `app/(tabs)/settings.tsx`

**Interfaces:**
- Preserves dynamic queue actions, pair rollback behavior, generated-asset
  independence, media-library saving, and system sharing.

- [ ] Apply the dark image-first hierarchy to queue and pair screens.
- [ ] Add a labeled Settings action to Content.
- [ ] Restyle review/media detail, content, post creation, generated-asset detail,
  and Settings.
- [ ] Verify exported post composition remains unchanged.
- [ ] Run the complete test suite, lint, TypeScript, and Expo Doctor.

### Task 6: Android visual QA and handoff

**Files:**
- Modify: `design-qa.md`
- Create: `design-qa-artifacts/dark-camera-dashboard-390x844.png`
- Create: `design-qa-artifacts/dark-camera-comparison.png`

**Interfaces:**
- Compares: selected Option 2 reference against the implemented dashboard at the
  same 390 by 844 state.

- [ ] Start Expo without creating a new APK.
- [ ] Capture the implemented dashboard and exercise the primary navigation.
- [ ] Put source and implementation captures into one comparison artifact.
- [ ] Record and fix every P0/P1/P2 issue; repeat capture and comparison.
- [ ] Mark `design-qa.md` `final result: passed` only when no actionable
  P0/P1/P2 issue remains.
- [ ] Review the diff, commit, and push the finished branch.
