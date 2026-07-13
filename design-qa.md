# Milestone 2 design QA

## Comparison target

- Source visual truth:
  - `C:\Users\Mitch\Downloads\image-gen-4.png` (Before / Progress / After gallery)
  - `C:\Users\Mitch\Downloads\image-gen-1(1).png` (Capture Before camera)
  - `C:\Users\Mitch\Downloads\image-gen-2(1).png` (Review Photo)
- Browser-rendered implementation evidence: `S:\App Projects\before-after-app\design-qa-artifacts\stage-gallery-390x844.png`
- Viewport: 390 x 844, with an additional overflow check at 320 x 700
- Compared state: Johnson House Interior Repaint, Before gallery, zero saved photos

The gallery mockup contains saved-photo cards while the acceptance flow explicitly requires a useful empty gallery. The comparison therefore evaluates the same gallery shell, hierarchy, navigation, segmented control, action placement, and visual language while treating the empty state as an intentional product state.

## Full-view comparison evidence

The source and rendered screenshot were opened together and compared in the same visual pass.

- Typography: the implementation uses the existing native system-font stack with the same dark, high-weight title hierarchy and muted supporting text. The empty-state headline and bottom action remain readable at the target width.
- Spacing and layout: the header, three-stage segmented control, content region, persistent bottom action, and tab bar follow the source's vertical order and generous spacing. The implementation uses Android safe-area-aware layout rather than the mockup's fake iPhone chrome.
- Colors and tokens: the near-white background, dark text, muted gray labels, subtle borders, and bright blue selected/action states align with the source direction and the existing JobToPost tokens.
- Image quality: the tested state intentionally has no user photo assets. The empty-state camera icon uses the existing Ionicons family; saved-photo items use real local image URIs rather than placeholders.
- Copy and content: stage-specific count, empty-state copy, and `Take Before Photo` action clearly describe the next step. The copy is coherent without relying on the design prompt.
- Responsiveness: at 320 px wide, `window.innerWidth`, `document.body.scrollWidth`, and `document.documentElement.scrollWidth` were all 320 px; no horizontal overflow was present.

## Focused-region comparison evidence

A separate crop was not needed because the segmented control, empty-state typography, primary action, and tab bar are all legible in the 390 x 844 implementation screenshot. The source and implementation show the same high-priority controls at full-view scale.

## Primary interactions tested

- Opened an existing job from Jobs Home.
- Opened the Before gallery from the job dashboard.
- Switched from Before to Progress in the shared segmented control.
- Confirmed the route stage parameter, heading, count, empty-state message, and primary action all changed to Progress.
- Confirmed the 320 px narrow layout has no horizontal overflow.
- Checked captured browser console errors: none.

The real camera preview and the post-capture Review Photo state are intentionally not simulated in the browser. Their remaining visual and hardware validation must be performed in Expo Go on the Pixel 6a so the implementation never substitutes a fake preview for the device camera.

## Findings

No actionable P0, P1, or P2 visual findings remain in the browser-verifiable gallery flow.

## Open questions and physical-device checks

- Verify camera permission grant, denial, retry, and Open Settings behavior in Expo Go.
- Verify the live rear-camera preview, flash availability, camera switching, zoom, portrait/landscape rotation, capture, Review Photo, Retake, Use Photo, and Take Another on the Pixel 6a.
- Verify accepted photos and metadata survive fully closing and reopening Expo Go.

## Comparison history

- Initial pass: no actionable P0/P1/P2 gallery mismatch was found. No visual fix iteration was required.
- Implementation hardening after the visual pass: Android hardware Back now only intercepts when a valid unsaved temporary capture exists, and saved metadata preserves the actual capture timestamp. Lint and TypeScript passed after these changes.

## Follow-up polish

- P3: the long real-world job name truncates in the compact gallery back label. This is an acceptable responsive tradeoff and preserves the centered stage title.
- P3: the reference mockup shows a filter icon, but filtering is not part of Milestone 2 and was intentionally omitted.

## Implementation checklist

- [x] Shared responsive stage gallery
- [x] Stage-specific empty state and capture action
- [x] Segmented stage switching
- [x] Pixel-width and narrow-width browser checks
- [x] No browser console errors in the verified flow
- [x] Native camera/review verification explicitly deferred to physical hardware

final result: passed
