# Dark Camera Utility Design

## Goal

Make JobToPost feel like a polished professional field tool while preserving
every working job, camera, ghost-alignment, pairing, content, and local-storage
workflow.

## Approved visual direction

The selected Option 2 mockup is the visual source of truth. Job photography is
the dominant surface, app chrome is dark and restrained, and cobalt blue is
reserved for the primary action and active navigation. The result should feel
closer to a dependable camera utility than a collection of generic white cards.

Reference image:

`C:\Users\Mitch\.codex\generated_images\019f5dcd-7a3f-7f20-91a8-dc067fca713a\exec-527e391d-4325-4770-96d3-08637305c73e.png`

## Visual system

- App background: `#0F141B`
- Main surface: `#151B23`
- Raised surface: `#1B2430`
- Border/divider: `#2A323C`
- Primary text: `#F7F9FC`
- Secondary text: `#A5AFBD`
- Tertiary text: `#737E8C`
- Primary/Before blue: `#0868F7`
- Progress orange: `#FF941A`
- After green: `#42B963`
- Danger red: `#F04438`
- Minimum touch target: 44 points
- Primary button height: 56 points
- Page padding: 20 points on phone layouts
- Surface radii: 12 points for controls and 16 points for larger regions

The app uses the native system font. Tonal separation and borders replace the
existing stack of white cards and visible shadows. Generated Before/After PNGs
keep their existing light export palette; only app chrome becomes dark.

## Navigation and shared chrome

- The visible tab bar contains Jobs, Capture, and Content.
- The existing Settings route remains available from a clearly labeled gear
  action on the three tab roots; no Settings content is removed.
- Status bar, tab bar, headers, dialogs, empty states, buttons, and form fields
  use the dark field-utility tokens.
- Existing safe-area behavior remains unchanged.

## Primary screens

### Jobs

Use a smaller wordmark, compact dark search and filters, one strong New Job
action, and dense job rows. Stage counts stay visible. Avoid decorative icon
circles unless they convey state.

### New and Edit Job

Group the form into one calm workspace instead of placing every field in a
separate white card. Preserve validation, keyboard behavior, optional fields,
and submit behavior.

### Job Dashboard

This screen follows the selected mockup most closely:

1. A photo-led hero uses the newest real photo from the current job.
2. A deliberate dark fallback appears when the job has no media.
3. Job name and available metadata sit over or directly beneath the hero.
4. Before, Progress, and After appear as one unified stage rail.
5. Recent real shots appear in a compact image-first list.
6. One primary Continue Capture action chooses a valid next stage.
7. Match After Photos is the lower-emphasis secondary action.
8. Generated content and job options remain available below the core flow.

Continue Capture uses the existing galleries: Before when none exist, Progress
after Before is established, After after Progress is established, then Progress
for ongoing documentation once all stages contain media. Every stage rail item
remains directly tappable.

### Gallery and capture

The gallery becomes image-first with compact metadata and visible management.
The fixed capture action remains above system navigation. The camera keeps all
working capture, ghost, zoom, flash, orientation, and cleanup behavior; only its
remaining light header and control styling change.

### After queue, pair, and content

These screens inherit the dark visual system. Photos and comparisons remain the
largest regions. Matched, missing, and available states retain their honest
behavior and accessible labels. Generated content remains independent of source
pairs and is never recolored by this app-chrome redesign.

## Technical boundaries

- Expo SDK 54 managed workflow and Expo Router remain unchanged.
- No Expo or React Native upgrade, native project generation, EAS build, data
  migration, cloud work, or camera-alignment algorithm is included.
- No new dependency is required.
- Repositories, storage services, and media/pair lifecycle logic remain intact.
- New pure presentation helpers cover latest-media selection and the next valid
  capture stage.
- Android 390 by 844 is the primary visual QA viewport.

## Success criteria

- The dashboard visibly matches the selected dark camera-led direction.
- Jobs, forms, galleries, camera, queue, pair, content, dialogs, and tabs feel
  like one coherent product.
- The three-stage capture and ghost-alignment flows remain fully reachable.
- Settings remains discoverable despite leaving the primary tab bar.
- Existing tests continue to pass; new UI contracts, lint, TypeScript, and Expo
  Doctor pass.
- Android screenshot QA finds no actionable P0, P1, or P2 mismatch against the
  selected reference at the equivalent dashboard state.

