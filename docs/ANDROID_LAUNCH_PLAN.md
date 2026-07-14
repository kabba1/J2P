# JobToPost Android Launch Plan

Last updated: 2026-07-13

This is the execution plan for taking the current local alpha to a reliable,
paid Android release. `LAUNCH_CHECKLIST.md` remains the complete product and
store inventory; this document defines scope, order, evidence, and go/no-go
gates.

## Executive decision

Android is the first development, beta, and public-launch platform. The shared
Expo codebase must remain iOS-compatible, but an iPhone, Apple membership, and
an iOS release are not Android launch blockers.

The Android V1 promise is deliberately narrow:

> Keep every job's photos organized, recreate the same Before/After angle, and
> publish a branded post in minutes.

Short version:

> Match the angle. Make the post.

V1 succeeds when a service-business owner can create a job, capture its stages,
return days or weeks later, reproduce each Before shot with the ghost overlay,
generate a branded static post, and save or share it without hunting through a
camera roll or opening a design tool.

## Current baseline

The current Milestone 4/5 checkpoint contains:

- Square and portrait static-post generation
- Side-by-Side and Stacked layouts
- Persistent generated PNGs
- Content library, Save to Photos, sharing, versioning, and deletion
- Job archive/restore, search, lifecycle filters, and quick Capture access
- Clearer local-storage and uninstall-risk explanations

Checkpoint evidence:

- `npm run lint` passes
- `npx tsc --noEmit` passes
- `npm test` passes all 121 tests
- `npx expo-doctor` passes 18/18 checks
- The complete Pixel 6a golden path was confirmed on 2026-07-13: job creation,
  Before/Progress capture, ghost-aligned After approval, post generation, Save
  to Photos, Android sharing, and force-close/reopen persistence

Remaining risk:

- Detailed output-quality, permission-denial, stress, deletion, archive/search,
  keyboard, narrow-layout, and navigation device cases remain open
- There is no EAS configuration, permanent Android package ID, standalone build,
  billing, crash reporting, gallery import, job backup, or Play listing

Passing local checks proves code health; it does not prove camera, storage,
permissions, rendering, billing, update safety, or real-job usability.

## Paid Android V1 boundary

### Must ship

- Job create, edit, archive, restore, search, filter, and delete
- Before, Progress, and After capture organized by job
- Fast consecutive capture with optional shot name and note
- Durable app-private originals and correct stage counts
- After Shot Queue, ghost overlay, pair review, replace, and unpair
- Square 1080 x 1080 and portrait 1080 x 1350 static posts
- Side-by-Side and Stacked layouts
- Persistent Content library
- Save generated posts to Photos and share through Android
- Import photos taken with the normal camera into a job and stage
- Export all originals for one job
- Versioned full-job backup and restore
- Optional safety copies in a JobToPost device album
- One reusable business profile: name, logo, primary color, and optional contact
  details
- Contextual onboarding, permission recovery, storage explanation, privacy,
  support, and feedback surfaces
- Production crash reporting with job media and customer details excluded
- Production-like Android builds, Google Play Billing, entitlement restoration,
  store assets, and policy declarations
- Real-device, multi-device, update, scale, and closed-beta evidence

### Explicitly deferred

- AI captions and caption backend
- Progress reels or video rendering
- Carousels and complete multi-asset content packs
- Cloud backup, accounts, teams, or web dashboard
- Direct social posting or scheduling
- Automatic alignment scores or movement instructions
- AR, LiDAR, Meta glasses, or wearable integrations
- CRM, estimates, invoicing, customer portals, or crew tracking
- Multiple brand profiles and advanced template editing

Progress media remains useful job documentation in V1. Store copy must not
promise videos, captions, cloud backup, or complete content packs until they
exist.

## Non-negotiable launch gates

The release is an immediate no-go if any of these are true:

- An accepted original photo can be lost without a clear, tested recovery path
- Media or deletion can cross job boundaries
- Backup/restore fails or an app update makes existing media inaccessible
- Capture, pairing, generation, or export regularly crashes or dead-ends
- Denied permissions can trap the user
- Existing jobs or originals become inaccessible after a subscription lapses
- A P0 or P1 issue remains open
- Privacy, Data Safety, billing, or store declarations are uncertain
- Marketing claims exceed implemented and verified behavior

Definitions:

- **P0:** photo loss, privacy exposure, wrong-job media, cross-job deletion, or
  unrecoverable data corruption. Stop distribution immediately.
- **P1:** capture, pairing, backup, restore, generation, export, or billing is
  blocked for a normal user. Fix before expanding the cohort.
- **P2:** confusing or broken behavior with a safe workaround. Fix in the next
  beta release.
- **P3:** polish or feature request. Backlog only.

## Phase 0 - Preserve and prove the current work

Estimate: 1-2 focused days.

### Work

- Review the complete local diff for accidental scope or partially written code
- Run lint, tests, type-check, Expo Doctor, and `git diff --check`
- Record the completed Pixel 6a golden-path smoke test
- Complete the remaining items in the Milestone 4 Pixel checklist
- Exercise Milestone 5 keyboard, archive/restore, search, quick capture, narrow
  layout, and Android back behavior
- Confirm no Expo server is left running after validation
- Align README, PRODUCT, milestone docs, and checklist with verified reality
- Commit and push the current Milestone 4/5 checkpoint
- Work from a clean, backed-up branch after the checkpoint

### Exit gate

- Clean, pushed checkpoint exists on GitHub
- All automated validation is green
- Current native flow has a written Pixel result
- Known limitations and failures are recorded as issues
- No required launch work relies only on uncommitted local files

## Phase 1 - Establish the production build pipeline

Estimate: 2-4 focused days.

### Business and identity decisions

- Decide whether the Play developer account is Personal or Organization
- Run app-name, Play listing, trademark, domain, and social-handle collision
  checks before choosing the permanent product identity
- Budget the one-time $25 Google Play developer registration fee
- If Organization, prepare the verified legal entity, website, and D-U-N-S
  information
- Reserve the product domain and separate public support email
- Choose the permanent Android package ID before the first Play upload
- Create the Play Console account early and complete identity verification
- If this is a Personal account created after November 13, 2023, complete Play's
  physical-device verification using a non-rooted Android 10+ phone
- Register the package when Play Console requests it

Package IDs are permanent in Play. Do not upload a placeholder identity.

### Engineering work

- Create an Expo account/project for JobToPost
- Add a permanent `android.package` and explicit versioning
- Add `eas.json` profiles:
  - development: development client, installable APK
  - preview: production-like internal APK
  - production: signed AAB with automatic version-code increments
- Move routine native testing from Expo Go to a standalone development/preview
  build; keep Expo Go only for quick compatible smoke tests
- Keep the managed workflow and do not commit native `android` or `ios` folders
- Add CI for lint, tests, type-check, Expo Doctor, and diff checks
- Build and install the preview APK on the Pixel
- Build a production AAB and upload it to Play internal testing manually once
- Verify the uploaded artifact:
  - Expo SDK 54's API 36 compile/target configuration and Android 7+ support
  - Play's rolling target-API requirement, checked again immediately before
    submission
  - 16 KB memory-page compatibility
  - no `READ_MEDIA_IMAGES` or `READ_MEDIA_VIDEO` when the system picker is
    sufficient
  - `expo-image-picker` uses `microphonePermission: false` unless audio capture
    is actually implemented
  - `expo-media-library` requests only the narrowest permission required
  - Expo Camera uses `recordAudioAndroid: false` because V1 captures photos only
  - no unexplained `RECORD_AUDIO` permission in the uploaded AAB
  - Play App Signing and upload-key custody
  - package name and version code

### Exit gate

- Reproducible preview APK and production AAB
- Preview build completes the existing core flow on the Pixel
- Play Console accepts the AAB without target-API, page-size, signing, or
  manifest-permission blockers
- CI is green from a clean checkout
- Build credentials are recoverable and are not committed to Git

## Phase 2 - Make original media safe

Estimate: 2-4 weeks. Backup and restore is a launch-critical subsystem, not a
small export button.

Media safety precedes more marketing features. JobToPost cannot charge users
while valuable customer originals depend only on an opaque app-private folder.

### Work

- Add photo import through Android's system picker without broad library read
  permission
- Import into a selected job and Before/Progress/After stage
- Add a safety-copy mode that writes accepted originals to a clearly named
  JobToPost album; default it on for first-run users and let them make an
  informed choice during onboarding
- If a user turns safety copies off, show persistent backup status and timely
  reminders until a verified job backup exists
- Add Export All Originals for one job
- Export backups through Android's system document picker to user-controlled
  storage, and import them through the same picker; a backup left only in
  app-private storage does not survive uninstall or Clear Storage
- Define a versioned full-job archive containing:
  - job metadata
  - original media
  - shot metadata
  - pair relationships
  - generated assets
  - business-profile snapshot where relevant
- Add backup creation, file-hash integrity verification, restore preview, and
  restore results
- Restore an archive as a new job with a new ID in V1; do not merge it into an
  existing job or silently overwrite current data
- Remap every job, media, pair, and generated-asset ID during restore
- Reject path traversal, recursive or oversized archives, unsupported schema
  versions, duplicate IDs, unsafe file names, and invalid hashes
- Disable Android Auto Backup for V1, or explicitly exclude the entire managed
  metadata/media tree, then verify the final manifest and reinstall behavior;
  the custom verified archive is the only restore path the product claims
- Add schema migration tests before changing persisted records
- Add explicit low-storage, missing-file, corrupt-archive, and partial-operation
  recovery
- Ensure original export, backup/restore, viewing, and deletion are never gated
  by a subscription

### Required stress cases

- Force-kill during capture, approval, generation, export, restore, and deletion
- Remain offline for 48 hours
- Operate with storage nearly full
- Remove or corrupt one managed file
- Install a new build over populated existing data
- Load and use a job with 200 photos
- Perform 10 backup -> uninstall/clear data -> reinstall -> restore cycles
- Delete one populated job and verify another job has the same semantic
  metadata and original-file hashes; do not require storage serialization or
  unrelated timestamps to remain byte-for-byte identical

### Exit gate

- Zero accepted-photo loss in all scripted tests
- Zero cross-job mixing or deletion
- 10/10 successful backup/restore cycles
- Existing data survives an app update
- Missing or corrupt data produces a safe recovery state
- No open P0/P1 media-safety issue

## Phase 3 - Turn the working flow into a coherent product

Estimate: 1-2 weeks.

### Branding and output

- Add one reusable business profile
- Apply business name, logo, and primary color consistently to both static sizes
- Keep editing template-based and fast; do not build a general design canvas
- Preserve the unbranded option
- Verify exact pixels, useful cropping, orientation, label sharpness, and footer
  or brand safe areas on device

### Onboarding and recovery

Use at most three short explanations:

1. Every job gets its own organized media library
2. Ghost the Before image to reproduce the After angle
3. Generate and share the finished post

Also add:

- Contextual permission requests, denial recovery, and Open Settings actions
- Clear local-storage, safety-copy, backup, export, and uninstall explanations
- Support email, privacy link, feedback action, version, and build number
- A sample/demo job that contains no real customer data, if testing shows it
  improves activation
- Accessibility labels, contrast, large targets, keyboard reachability, narrow
  layouts, and screen-reader sanity checks
- Predictive-back evaluation and complete back-navigation audit
- SDK 54 edge-to-edge audit on every route, modal, camera control, keyboard
  state, bottom tab, and bottom action so content never hides behind system bars

### Exit gate

- A new user can install the preview build and complete:
  `job -> Before -> ghosted After -> pair -> branded post -> save/share`
  without live help
- Median pair-to-export time is under two minutes in observed tests
- Original media remains unchanged by branding and generation
- Every user-facing claim matches working behavior

## Phase 4 - Founder design-partner alpha

Estimate: 2-4+ weeks. The gate is completed real jobs and repeat use, not the
calendar. Some service jobs naturally span multiple weeks.

Before inviting participants:

- Add crash/ANR reporting with media, customer names, addresses, notes, and
  other job content excluded from diagnostics
- Complete a Pixel smoke pass of every core flow
- Provide backup/export instructions, support contact, build number, and a
  direct feedback path

Start with three businesses:

- Painter friend
- Detailer friend
- One cleaner, pressure washer, landscaper, or similar visual service business

Each participant should already take job photos, complete at least two eligible
jobs during the test, use Android, and agree to a short setup and debrief.

### Protocol

1. Record their existing capture/post workflow and approximate time.
2. Observe the first JobToPost job and help only when genuinely blocked.
3. Require the second job to be self-directed.
4. Watch whether they voluntarily use it on the next eligible job.
5. Record every switch to the normal camera, abandoned shot, failed match,
   navigation hesitation, and unshared output.
6. Request generated posts only; never collect customer originals without
   explicit permission.

### Exit gate

- At least six real completed jobs
- No photo loss or wrong-job data
- At least two businesses use it again without a reminder
- Users understand the workflow without repeated explanation
- At least two users produce a post they consider publishable

## Phase 5 - Release-quality hardening

Estimate: 1-2 weeks after founder feedback, then continuous.

### Observability and data inventory

- Keep production crash/ANR reporting narrowly configured
- Document every SDK and every field that can leave the device
- Distinguish job data and photos that remain solely on-device from diagnostics,
  identifiers, billing data, and any future off-device information
- Make the privacy policy, Data Safety answers, and uploaded release artifact
  agree exactly
- Track only the minimum product funnel needed for launch decisions, or use a
  manual beta log if analytics would add more privacy risk than value

### Device matrix

Test at minimum:

- Pixel 6a, primary development device
- One Samsung budget or midrange device
- One current Samsung flagship
- One Motorola or other lower-memory device
- At least three Android versions including an older supported version and the
  current version
- Narrow phone, ordinary phone, and large-screen layout

Use Play's device catalog, pre-launch report, and tester devices to fill gaps.

### Core matrix

- Fresh install, update install, reinstall, and restored install
- Camera first grant, denial, permanent denial, and Settings recovery
- Portrait/landscape sources, rotation, front/rear camera, flash, and zoom
- SDK 54 edge-to-edge behavior on every route, modal, camera control, keyboard
  state, tab, and bottom action
- Android gesture/hardware/predictive back on every route
- Online, airplane mode, intermittent connection, and long offline use
- Low storage, missing file, corrupt metadata, and interrupted operations
- 1, 20, 100, and 200 photos in one job
- Several jobs with similar names and overlapping dates
- Repeated Generate, Save, Share, import, backup, restore, and delete actions
- Accessibility, keyboard, text scaling, touch targets, and contrast

### Exit gate

- No open P0/P1 issue and no reproducible core-flow crash
- At least 200 observed sessions and 50 completed core flows before treating a
  crash-free percentage as meaningful
- At least 99.5% crash-free sessions once the denominator is large enough
- User-perceived crash rate remains below Play's 1.09% overall bad-behavior
  threshold and user-perceived ANR rate remains below its 0.47% threshold
- Zero accepted-original loss
- Exact 1080 x 1080 and 1080 x 1350 outputs verified
- No blocking Play pre-launch report result

## Phase 6 - Monetization implementation

Start only after founder testing shows real repeated use and at least three
businesses say they would pay the quoted price.

### Initial offer hypothesis

- First three generated posts free; no card and no short countdown
- Founding Pro: $9.99/month or $79.99/year
- No watermark and no ads
- No lifetime plan or per-export credits
- Grandfather founding subscribers while subscribed

A finished-post allowance is better than a short trial because service jobs can
last several weeks. When captions, video, and cloud backup are real, test a
standard price around $14.99/month or $119.99/year.

Let every user capture and organize unlimited jobs, then present the upgrade
when they try to generate the fourth post. Never gate capture, an active job,
viewing originals, exporting originals, backup, restore, safety copies, or
deletion. Until user accounts exist, treat the local three-post allowance as a
practical conversion prompt rather than pretending it is tamper-proof across
reinstalls.

### Billing rules

- Use Google Play Billing for Play-distributed digital functionality
- Use a maintained Expo-compatible integration resolving to a currently
  Play-supported Billing Library version at submission time
- Default to RevenueCat or another audited managed entitlement service after a
  short Expo SDK 54 development-build spike; this supports the future iOS launch
  without putting purchase validation into the app
- If a custom backend is chosen instead, it must implement server-side token
  verification, Real-time Developer Notifications, idempotent refund/revocation
  handling, identity/authentication policy, monitoring, retention, and recovery
- Store purchase/entitlement state only; customer job media remains local
- Verify purchase tokens server-side or through the managed entitlement service
- Grant access only after a purchase reaches `PURCHASED`, never while `PENDING`
- Acknowledge purchases within three days
- Reconcile entitlements on startup and after reinstall
- Provide Restore Purchases and Manage Subscription
- Clearly show price, billing period, renewal, trial/offer terms, and included
  features
- Test purchase, pending, cancel, refund, revocation, expiration, grace period,
  account hold, restoration, reinstall, and offline behavior
- Test billing in a signed development/production build installed through a
  Play testing track; Play Billing cannot be validated in Expo Go
- Cache the last verified entitlement and its expiration. Honor it offline until
  the known paid-period end plus a short documented outage grace window
- If Pro was verified when an active job began, allow that job's next post to be
  generated even when entitlement refresh is temporarily unavailable
- Backend or entitlement-service downtime must not block capture, viewing,
  original export, backup/restore, or deletion
- A lapsed subscription may block new Pro generation, but it must never block
  viewing, exporting, backing up, restoring, or deleting existing customer data

### Exit gate

- Two testers complete the full test-purchase and restoration flow
- Entitlements survive reinstall and reconcile correctly
- Billing failure cannot lose or lock user data
- Pricing and paywall language pass Play review requirements
- Treat license-test purchases as integration proof, not willingness-to-pay
  evidence; retain the three explicit price commitments from founder testing

## Phase 7 - Google Play closed beta

Expected product-learning window: 4-8 weeks, or until the evidence gates pass.
For a Personal Play account created after November 13, 2023, Play requires at
least 12 continuously opted-in testers for 14 days before the production-access
application. Recruit at least 18 people to protect that cohort from drop-off.
Aim for at least 10 real service businesses rather than random installers.

Before releasing the closed-testing track, complete the privacy policy, Data
Safety, Ads, App Access, Target Audience, IARC, and minimum required store-listing
setup from Phase 8. Internal testing can begin earlier.

### Tester mission

- Capture a real job
- Take at least three Before photos
- Create at least two ghost-aligned pairs
- Generate a branded post
- Save or share it
- Use JobToPost on the next eligible job

An installation alone does not count as active testing.

### Evidence to retain

- Tester/business type, device, Android version, and build number
- Jobs attempted and completed
- Funnel completion and failures
- Support issues and resolution
- Weekly release notes
- Interview notes and willingness-to-pay response
- Permission to quote or use generated output

### Production-access and product gates

- At least 12 testers remain continuously opted in for the required period
- At least 10 real service businesses invited
- At least five businesses complete three real jobs each
- At least 20 complete jobs total
- At least 70% of completed paired jobs generate a post
- At least 50% of generated posts are saved or shared
- At least 50% of businesses return for another eligible job
- At least 85% complete the core flow without assistance
- Zero accepted-original loss
- No open P0/P1 issue
- At least three testers choose the quoted paid plan
- At least two complete a license-test purchase and restoration to prove billing
  integration; this does not count as willingness-to-pay evidence

The primary product metric is:

> Percentage of businesses that reach for JobToPost on their next eligible job
> without being reminded.

## Phase 8 - Store, policy, and production release

Complete the declarations and listing fields required for closed testing before
Phase 7 begins. Finish production-specific material in parallel with the beta,
then re-audit everything after the final SDK and billing choices.

### Play Console and policy

- Developer identity verification
- Physical-device verification on a non-rooted Android 10+ phone only when a
  Personal account created after November 13, 2023 is subject to that
  requirement
- Organization-account business verification and D-U-N-S evidence when an
  Organization account is used
- Permanent package registration
- Play App Signing
- Current target-API and 16 KB compatibility result
- Final manifest permission audit
- Privacy policy on a public, active, non-geofenced HTML page, not a PDF,
  accessible without login, naming JobToPost/developer and explaining retention
  and deletion practices
- Privacy link/text inside the app
- Accurate Data Safety form covering every SDK and agreeing with the final AAB:
  on-device-only job/photos are distinguished from diagnostics, identifiers,
  billing, or any other off-device data
- Ads declaration
- App Access instructions that let reviewers reach every paywalled or restricted
  feature, with working credentials or steps when applicable
- Target Audience declaration
- IARC content rating
- Merchant profile, subscription, base plan, regions, and test configuration
- Account-deletion paths only if accounts are later introduced

### Store listing

- App title, maximum 30 characters
- Short description, maximum 80 characters
- Full description, maximum 4,000 characters
- 512 x 512 32-bit PNG store icon, maximum 1 MB
- 1024 x 500 JPEG or 24-bit PNG feature graphic without alpha
- At least two phone screenshots; target four or more strong 1080 px 9:16 or
  16:9 screenshots
- Category, tags, countries, support email, website, and privacy URL
- Synthetic demo jobs only: no real names, addresses, plates, homes, or customer
  media without written permission
- Store copy centered on organized capture, ghost alignment, and branded static
  posts

### Release process

- Upload the first AAB manually to Play internal testing
- Use EAS Submit for later builds only after service-account configuration
- Resolve all blocking pre-launch report and policy findings
- For a Personal account created after November 13, 2023, submit the
  production-access application with closed-test evidence
- For that account type, allow roughly seven days after the closed-test gate for
  production-access review, plus more time if Google asks for additional
  testing or information
- Freeze the release candidate except for launch blockers
- Publish the first production release to 100% of a deliberately limited set of
  launch countries; Play does not support percentage staged rollout for an
  app's first production release
- Control first-release exposure through the closed/open-test cohorts, limited
  marketing, and support capacity
- Use 10% -> 25% -> 50% -> 100% staged rollouts, with 24-48 hours of observation
  between stages, for subsequent production updates
- Halt on P0/P1, meaningful crash/ANR regression, billing failure, or repeated
  media-safety complaint
- Hotfix with a new version code; never attempt to downgrade production data

### Final go gate

- Signed AAB accepted by Play
- All product, safety, beta, billing, privacy, and store gates pass
- No open P0/P1 issue
- At least three real businesses have made an explicit price commitment; actual
  paid conversion is measured in the first controlled production cohort
- Support and incident response are ready
- Marketing claims only verified Android V1 behavior

## Phase 9 - First 30 days and controlled growth

Production availability is the beginning of validation, not the finish line.

### Launch material

- Publish a simple landing page with the same narrow store promise
- Show one short, real-device demo:
  `Before capture -> ghost alignment -> branded post -> Share`
- Prepare painter, detailer, cleaner, and pressure-washing examples using
  synthetic or explicitly approved media
- Turn founder results into two concise case studies with time saved and actual
  posting behavior
- Email the waitlist and closed-test cohort with direct install and support links
- Ask for a Play review only after a successful repeated outcome, never on first
  open or after an error

### Acquisition discipline

- Start with direct outreach and referrals to visual service businesses
- Speak in the customer's workflow language; do not lead with AI or photo editing
- Do not buy broad ads until activation, export, repeat use, and payment are
  healthy in organic traffic
- Track acquisition source without collecting customer media
- Interview churned or inactive businesses before adding more features

### First-30-day targets

- 25 businesses create a real job
- 15 complete at least one matched job
- 10 save or share a generated post
- Five use JobToPost on another eligible job
- Three become paying subscribers
- Zero accepted-original loss or privacy incident
- Crash-free sessions remain at or above 99.5%

If activation is weak, fix onboarding and the first-job experience. If pairing
is strong but exports are weak, improve the output and sharing flow. If users
export once but do not return, investigate job frequency and recurring value
before adding a larger feature set.

## Launch operating cadence

- One planned beta release per week
- Immediate hotfix only for P0/P1
- Every release has a build number, changelog, migration note, and rollback plan
- No persisted-schema change during live multi-week jobs without backup and
  tested migration coverage
- Beta support response target: one business day
- Support reports request device, Android version, build, screen, action, and
  error; they never automatically attach job media
- Review crash/ANR reports, funnel results, support issues, and beta notes weekly

## Immediate execution queue

1. Preserve, review, test, commit, and push the current Milestone 4/5 work.
2. Complete the remaining Pixel 6a Milestone 4 edge-case and Milestone 5 device
   checks.
3. Run product-name/store/trademark checks, then choose Play account ownership,
   product domain/support email, and permanent package ID.
4. Configure EAS development, preview, and production profiles.
5. Produce a standalone preview APK and production AAB.
6. Upload the first AAB to Play internal testing and audit its manifest and
   compatibility reports.
7. Write the detailed data-safety/backup milestone spec.
8. Implement system-picker import, original export, safety copies, and
   versioned backup/restore.
9. Add one reusable business profile and apply it to static posts.
10. Run the founder alpha before expanding feature scope.

## Timeline expectation

A realistic path is approximately 10-16+ weeks of focused work, but real
eligible jobs and beta evidence - not an arbitrary date - control the launch.
For a Personal account created after November 13, 2023, the Google Play gate
requires 14 continuous days of closed testing, followed by roughly seven days
for production-access review and additional time if Google requests more
evidence.

Critical path:

> Preserve current work -> establish standalone builds -> secure customer media
> -> finish the narrow branded-post promise -> founder alpha -> harden the real
> workflow -> billing -> closed beta and store readiness -> staged Android launch

## Official references

- Expo SDK 54 platform versions: https://docs.expo.dev/versions/v54.0.0/
- Expo SDK 54 Android changes: https://expo.dev/changelog/sdk-54
- EAS build configuration: https://docs.expo.dev/build/eas-json/
- EAS Android production build: https://docs.expo.dev/tutorial/eas/android-production-build/
- EAS Submit: https://docs.expo.dev/submit/introduction/
- Expo in-app purchases: https://docs.expo.dev/guides/in-app-purchases/
- Play developer account: https://support.google.com/googleplay/android-developer/answer/6112435
- New personal-account testing gate: https://support.google.com/googleplay/android-developer/answer/14151465
- Play testing tracks: https://support.google.com/googleplay/android-developer/answer/9845334
- Play staged rollouts: https://support.google.com/googleplay/android-developer/answer/6346149
- Play app/package setup: https://support.google.com/googleplay/android-developer/answer/9859152
- Target API requirements: https://support.google.com/googleplay/android-developer/answer/11926878
- Android 16 KB page sizes: https://developer.android.com/guide/practices/page-sizes
- Android backup behavior: https://developer.android.com/identity/data/autobackup
- Photo/video permission policy: https://support.google.com/googleplay/android-developer/answer/16935362
- Privacy and user data policy: https://support.google.com/googleplay/android-developer/answer/17105854
- Data Safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Payments policy: https://support.google.com/googleplay/android-developer/answer/9858738
- Subscription policy: https://support.google.com/googleplay/android-developer/answer/9900533
- Billing version deadlines: https://developer.android.com/google/play/billing/deprecation-faq
- Store preview assets: https://support.google.com/googleplay/android-developer/answer/9866151
- Pre-launch reports: https://support.google.com/googleplay/android-developer/answer/9842757
- Android Vitals: https://developer.android.com/topic/performance/vitals/
