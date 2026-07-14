# Field Usability Polish Design

## Goal

Make the existing Android alpha easier to use one-handed on a job site without
changing its product scope, storage model, or capture workflow.

## Approved direction

This design implements the issues identified from the July 13 Pixel 6a preview
screenshots and approved for the first polish sprint:

1. The bottom tabs must sit fully above Android gesture and three-button system
   navigation.
2. The matched-After camera must open with the ghost overlay active but its
   opacity controls collapsed so the photo remains the dominant surface.
3. A completed After queue must offer a useful next action instead of a disabled
   `Start Next After Shot` button.
4. Photo management must be visible and discoverable; deletion remains on the
   existing photo-detail screen rather than depending on a hidden long press.
5. Archive and Delete remain available but move behind a compact `Job options`
   disclosure below the primary capture workflow.

## Interaction details

- The collapsed ghost control is a minimum 44-point pill in the lower-right of
  the preview. It displays the current overlay state and opacity. Tapping it
  opens the existing switch and slider; the expanded panel includes an explicit
  collapse control.
- The large centered `Align with Before` badge is removed. The camera title,
  job name, shot name, and visible ghost image already explain the task.
- When every Before photo is matched, the After queue primary action becomes
  `View Latest Before & After` and opens the existing saved-pair screen, where
  the user can create a post.
- Gallery cards expose a visible `Manage` action with an accessible label. Both
  the photo surface and Manage action open the existing detail screen.
- Active jobs show a collapsed `Job options` row. Archived jobs keep Restore
  immediately visible so recovery remains obvious; destructive deletion stays
  inside the disclosure.

## Technical boundaries

- Expo SDK 54 managed workflow and Expo Router remain unchanged.
- No dependency, native project, EAS build, data migration, or service change.
- Pure decision helpers cover tab inset math and the After queue primary action.
- UI-only behavior is verified with lint, TypeScript, the existing test suite,
  Expo Doctor, and a short Pixel 6a Expo Go checklist.

## Explicitly deferred

- Automatic alignment scoring or computer-vision guidance
- Cloud backup, billing, analytics, and crash reporting
- New content formats, captions, or video generation
- APK rebuilding during normal JavaScript and layout iteration
