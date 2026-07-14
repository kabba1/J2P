# JobToPost dark camera utility design QA

Reference: `C:\Users\Mitch\.codex\generated_images\019f5dcd-7a3f-7f20-91a8-dc067fca713a\exec-527e391d-4325-4770-96d3-08637305c73e.png`

Android capture: `design-qa-artifacts/dark-camera-dashboard-390x844.png`

Combined comparison: `design-qa-artifacts/dark-camera-comparison.png`

Viewport: Pixel 6a emulator, 1080 x 2400 physical pixels (approximately 390 x 844 dp).

## Pass 1

- P0: none.
- P1: The hero and separate metadata block consume most of the first viewport, so the stage rail, recent shots, and capture actions fall below the fold. The selected reference intentionally exposes the complete capture hierarchy in the first viewport.
- P1: Job notes appear before capture progress and interrupt the primary field workflow. Notes must remain reachable but should follow capture/content actions.
- P2: Header and job metadata are visually detached from the job image. The reference treats the image, title, and job context as one compact composition.
- Environment note: the Android emulator's virtual-scene live preview is valid, but both captured stills reproduce as black images with the emulator timestamp. The same black still appears on Review, Gallery, Jobs, and Dashboard, proving this is the captured emulator file rather than a dashboard rendering failure. A physical Pixel check is still required for real-photo color/crop quality.

## Pass 2

- The job title and compact metadata now sit inside the fixed-height photo hero.
- Back and Edit actions are integrated into the hero instead of consuming a second navigation row.
- The redundant capture-progress explainer was removed; the stage rail now follows the hero directly.
- Job notes were moved below Generated Content so they no longer interrupt the capture path.
- Stage spacing was tightened enough to expose the stage rail, recent shot, Continue capture, and Match after photos actions in the initial Pixel 6a viewport.
- Android font scale was raised to 1.4x; capped hero typography kept the two fixed overlays separated and readable, then the emulator was restored to 1.0x.
- A real empty job was created in Expo Go and confirmed that `No job photos yet` stays visible in the foreground hero panel; the temporary QA job was deleted afterward.
- The same-size combined comparison shows the implementation preserving the reference hierarchy and camera-led visual language.
- P0: none.
- P1: none.
- P2: none.
- Environment note remains: Expo Go on the Android emulator captures a black still from the virtual camera even though its live preview renders correctly. Physical-device verification is required for real-photo crop, color, and orientation; this does not block the layout QA result.

final result: passed
