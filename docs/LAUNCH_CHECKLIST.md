# JobToPost Launch Checklist

This is the durable product roadmap for JobToPost. It replaces one-off milestone prompts.

See [ANDROID_LAUNCH_PLAN.md](ANDROID_LAUNCH_PLAN.md) for the phased Android
execution order, beta evidence, pricing hypothesis, and production go/no-go
gates.

Status rules:

- `[x]` means the behavior exists in the current repository.
- `[ ]` means it is not complete enough to claim.
- A **Partial** or **Verification** note records useful work without overstating launch readiness.
- Physical-device, scale, store-account, legal, and beta gates remain open until their evidence exists.

**Pixel evidence, 2026-07-13:** the complete golden path passed on a Pixel 6a:
job creation -> Before/Progress -> ghost-aligned After -> pair approval -> static
post generation -> Save to Photos/share -> force-close/reopen with persisted
job, photos, pair, and post. Detailed edge and quality checks remain open.

## Paid MVP

### 1. Job organization

- [x] Create, edit, and delete jobs
- [x] Separate Before, Progress, and After media
- [x] Persist photos across app restarts
- [x] Show accurate photo counts
- [x] Archive completed jobs and restore them later
- [x] Search jobs and filter Active, Archived, or All
- [x] Clearly show where originals are stored and warn about local-only loss
- [ ] Export all original media from a job

### 2. Fast field capture

- [x] Capture directly into the active job
- [x] Take several photos consecutively
- [x] Retake or approve photos
- [x] Optional shot name and note
- [x] One-tap access to the most recent active job from Capture
- [ ] Import photos and videos from the normal phone gallery
- [ ] Handle offline capture reliably
  **Verification:** the implementation is local-first and works without a backend, but longer real-job offline testing remains part of the beta gate.
- [ ] Handle low-storage and missing-file errors clearly
  **Partial:** missing files have recovery states; low-storage-specific detection and guidance are not complete.

### 3. Matching Before and After shots

- [x] Show all Before photos in an After Shot Queue
- [x] Indicate which ones have matching After photos
- [x] Select a Before photo
- [x] Open the real camera with that photo ghosted over it
- [x] Adjust ghost opacity
- [x] Toggle the overlay
- [x] Capture an After photo
- [x] Review Before and After together
- [x] Retake or approve
- [x] Save the pairing across app restarts
- [x] Safely unpair or replace an After photo

### 4. Content generation

- [x] One square 1:1 Before/After post
- [x] One portrait 4:5 Instagram/Facebook post
- [ ] Optional logo and business-name branding
  **Partial:** each static post can include a short business-name footer; there is no saved business profile or logo yet.

### 5. Static-post export

- [x] Preview generated static assets
- [ ] Select a different Before/After pair inside the builder
- [x] Change split direction with Side by Side or Stacked layouts
- [ ] Toggle logo
- [x] Save generated static images to the phone
- [x] Share generated images through Android's native share sheet
- [x] Reopen previously generated static content
- [x] Retry failed static generation without duplicate output

### 6. Content library

- [x] Show generated static posts with their job names
- [x] Reopen a generated asset
- [x] Delete generated assets without deleting original job photos

### 7. Business branding

- [ ] Business name
- [ ] Logo
- [ ] Phone number
- [ ] Website
- [ ] Service area
- [ ] Primary brand color
- [ ] Watermark position

### 8. Backup and data safety

- [ ] Save original copy to device gallery option
- [ ] Export all job originals
- [ ] Export a complete job archive
- [x] Clearly explain that uninstalling may erase local-only media
- [x] Confirm before deleting a job or original photo
- [x] Do not delete originals when deleting generated content
- [x] Recover gracefully from interrupted approved-photo and generated-post saves
  **Verification:** transactional rollback is covered by automated tests; force-kill timing still needs beta stress testing.

### 9. Onboarding

- [ ] Three onboarding screens at most
- [ ] Explain Jobs, Before/Progress/After, and Ghost Alignment
- [x] Ask for camera permission only when capture begins
- [x] Ask for photo-library access only when importing or exporting
  **Current behavior:** only generated-post export exists; gallery import remains deferred.
- [ ] Provide a sample project or short walkthrough
- [x] Let the user reach the first camera quickly

### 10. Reliability

- [ ] No known photo-loss bug
  **Verification:** no known loss bug exists today, but this remains open until beta usage provides evidence.
- [x] No duplicate saves from double-tapping
- [x] Force-closing during capture does not modify existing accepted media
  **Verification:** interruption during the new temporary capture itself still needs device stress testing.
- [x] Works without internet after the Expo Go development bundle is loaded
- [ ] Works during a multi-week job
- [ ] Handles at least 100–200 photos in one job
- [ ] Works on several Android screen sizes
- [ ] Camera permission recovery works in all denial/settings states
- [ ] Android back gesture works on every screen
- [x] Clear user-facing errors instead of raw stack traces for implemented workflows
- [ ] Crash reporting is configured
- [ ] Support email is visible in Settings

### Field-usability Pixel pass

- [ ] Bottom tabs remain fully above gesture and three-button navigation in portrait and landscape
- [ ] TalkBack announces Ghost overlay controls as collapsed and expanded, and the slider remains adjustable
- [ ] A completed After queue opens the newest saved Before/After pair
- [ ] Every gallery photo exposes Manage, and edit/delete still work from photo detail
- [ ] Job options stay collapsed by default; Archive, Restore, and their failure messages remain discoverable

## Deferred after Android V1

These are roadmap ideas, not launch blockers:

- [ ] Vertical 9:16 Story/Reel asset
- [ ] Before -> Progress -> After video and video reliability testing
- [ ] AI captions and calls to action
- [ ] Complete multi-asset content packs
- [ ] Draft/Ready/Exported workflow and content filters
- [ ] Caption defaults and editing

## Google Play Launch

- [x] EAS project and Android preview-build profiles configured
- [x] Preview APK installed and audited on the Pixel 6a
- [ ] Google Play developer account
- [ ] Production Android App Bundle
- [ ] App icon and adaptive icon
- [ ] Store description
- [ ] Store screenshots
- [ ] Feature graphic
- [ ] Privacy policy
- [ ] Data Safety form
- [ ] Content rating questionnaire
- [ ] Support email
- [ ] Subscription products configured
- [ ] Purchase restoration tested
- [ ] Internal test
- [ ] Closed test
- [ ] Production application
- [ ] Recruit at least 12 closed-test users
- [ ] Keep testers continuously opted in for the required testing period

## iOS Launch Later

- [ ] Apple Developer membership
- [ ] Physical iPhone testing
- [ ] EAS iOS build
- [ ] TestFlight beta
- [ ] App Store screenshots
- [ ] Privacy labels
- [ ] In-app subscription
- [ ] Restore purchases
- [ ] Privacy policy inside the app
- [ ] Privacy policy in App Store Connect
- [ ] In-app account deletion if accounts are offered

## Beta Validation Gate

- [ ] At least 10 real service businesses invited
- [ ] At least 5 businesses use the app on three real jobs
- [ ] At least 20 complete jobs captured
- [ ] No accepted original photos lost
- [ ] At least 70% of testers generate a branded static Before/After post
- [ ] At least half of testers export or post something
- [ ] Users can complete the workflow without live assistance
- [ ] At least 3 testers say they would pay at the quoted price
- [ ] At least 2 testers continue using it after the initial novelty
- [ ] Users reach for the app on their next job without being reminded

## Dependency-aware implementation order

Unless new evidence changes the priority, remaining product work should proceed in this order:

1. Original-media import/export and job backup safety.
2. Business profile and reusable branding.
3. Onboarding, permissions recovery, support, and privacy surfaces.
4. Standalone-build pipeline, crash reporting, and multi-device hardening.
5. Google Play Billing, store assets, policy declarations, and closed beta.

After launch, reassess captions, video, vertical assets, and complete content
packs using real retention and export evidence.

Do not mark store, legal, scale, or beta gates complete based only on local automated tests.
