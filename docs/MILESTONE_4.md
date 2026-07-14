# Milestone 4: Static Before/After Post Generation and Export

## Goal

Milestone 4 proves JobToPost's first complete product outcome: a business owner can turn a saved Before/After pair into a finished social-ready image, keep it in the app, save a copy to the device photo library, or share it through the native share sheet.

```text
Saved Before/After Pair
  → Create Post
  → Choose Format and Layout
  → Preview
  → Generate Image
  → Save to Photos or Share
  → Reopen from Content
```

This milestone supports one content type only: **Before/After Static Post**.

## User-facing scope

### Entry points and builder

A saved pair exposes **Create Post**. The builder validates the route, job, pair, source media records, source stages, and local files before allowing generation. It shows the job and source shot, a live post preview, and these controls:

- Square 1:1 or Portrait 4:5
- Side by Side or Stacked
- BEFORE and AFTER labels on or off
- Optional short footer text
- Generate Post

Defaults are Portrait 4:5, Side by Side, labels on, and no footer. The builder is keyboard-aware so the primary action remains reachable while editing footer text. Repeated generation taps are rejected while a render for the pair is already in flight.

### Generated asset detail

After a successful render, the app opens the generated asset. The detail experience shows the generated image, job and source-shot snapshot, format, layout, and creation date. It provides:

- Save to Photos
- Share
- Create Another Version
- Delete Generated Post

Creating another version returns to the same source pair without overwriting the existing asset. Deleting a generated post removes only that generated record and its managed PNG. It does not delete the job, pair, Before photo, or After photo.

### Content library and job integration

The Content tab is the local generated-post library. It has an empty state before the first post and otherwise lists newest assets first with a thumbnail, job name, source shot, format, layout, and creation date. Selecting an item opens its detail screen; deletion requires confirmation.

Pair Detail provides the Create Post entry point and access to generated versions for that pair. The Job Dashboard provides a compact job-specific generated-post summary and a path to the Content library without redesigning the existing job workflow.

The Expo Router surfaces are intentionally focused:

- `app/(tabs)/(jobs)/pair.tsx` — source pair, Create Post entry, and generated-version summary
- `app/create-post.tsx` — live preview, format/layout controls, and generation
- `app/generated-asset.tsx` — persistent asset detail, Save, Share, versioning, and deletion
- `app/(tabs)/content.tsx` — newest-first local generated-post library

## Exact output formats

| Format | Aspect ratio | Output pixels |
| --- | ---: | ---: |
| Square | 1:1 | 1080 × 1080 |
| Portrait | 4:5 | 1080 × 1350 |

The renderer requests the target dimensions in the units used by `react-native-view-shot` on each platform: Android and web receive the target pixel dimensions directly, while iOS receives point dimensions derived from `PixelRatio`. After capture, the temporary PNG is decoded with `expo-image`; its logical dimensions and scale are converted to physical pixels, and generation is rejected unless those decoded dimensions exactly match the selected format. Unit tests cover the platform sizing policy and decoded-dimension handling. The physical Pixel 6a checklist remains required to verify the native capture path end to end.

## Layouts and visual rules

| Layout | Before placement | After placement |
| --- | --- | --- |
| Side by Side | Left half | Right half |
| Stacked | Top half | Bottom half |

Both layouts use proportional cover cropping rather than stretching. A subtle divider separates the images. Labels render inside their corresponding image areas only when enabled. Footer text is whitespace-normalized, limited to 60 characters, and kept within a compact safe area.

One reusable composition component drives both the on-screen preview and the captured export. Navigation, safe-area backgrounds, controls, and other unrelated screen UI are outside the captured view.

## Architecture

Milestone 4 follows the existing typed repository and service boundaries.

### Metadata model and repository

Each generated asset stores:

- Unique generated asset ID
- Job ID and source pair ID
- Asset type (`before-after-image`)
- Persistent local PNG URI
- Format and layout
- Exact width and height
- Label visibility
- Optional normalized footer text
- Source shot name snapshot
- Creation and update timestamps

The generated-asset repository validates every record loaded from local metadata storage, rejects unsupported formats/layouts and duplicate IDs, serializes mutations, isolates job queries, and returns newest assets first. It exposes list, get, create, update, individual delete, and delete-for-job operations.

No image binary or base64 data is stored in metadata.

### Renderer

`BeforeAfterPostRenderer` is a typed interface. The Expo implementation captures only the ready composition target with `react-native-view-shot` using:

- PNG output
- Temporary-file result
- Quality 1
- Platform-specific capture sizing (target pixels on Android/web and `PixelRatio`-adjusted points on iOS)
- Decoded PNG dimension inspection before persistence
- A render-in-progress guard
- Readiness checks before and after waiting for the preview to paint

The renderer never writes to either source photo.

### Generation transaction

The generated-asset service performs the transaction in this order:

1. Validate the job and saved pair.
2. Load the Before and After media records and require their correct stages and job ownership.
3. Verify both source files exist.
4. Render to a separate temporary PNG.
5. Decode the temporary PNG and verify that its physical pixel dimensions exactly match the selected format.
6. Revalidate that the source pair and files did not change during rendering.
7. Copy the render into persistent generated storage.
8. Verify the persistent file.
9. Revalidate the sources once more.
10. Commit generated-asset metadata.
11. Remove the temporary render when practical.

If metadata creation fails, the newly persisted PNG is removed when practical. Metadata is never created for an unverified file. The context adds an atomic per-pair guard so repeated taps cannot create simultaneous duplicate transactions.

### State and cleanup

The generated-assets context provides all-assets and per-job refresh, in-memory newest-first state, lookup, generation, individual deletion, job deletion, and file-existence checks.

Individual asset deletion tolerates a file that is already missing. Job cleanup removes only that job's generated metadata and attempts to delete its generated directory without blocking the overall job deletion if a file is already missing or cleanup fails. Other jobs and their assets are untouched.

## Generated file storage

Approved generated files live outside temporary cache:

```text
{documentDirectory}/
  jobs/
    {jobId}/
      before/
        {mediaId}.jpg|png
      progress/
        {mediaId}.jpg|png
      after/
        {mediaId}.jpg|png
      generated/
        {assetId}.png
```

IDs are validated before they can become path segments. Generated-file deletion is restricted to PNG files inside a managed `jobs/{jobId}/generated/` directory. Temporary cleanup is restricted to cache files. These checks prevent generated-asset operations from deleting arbitrary or original media files.

## Independence from source pairs

A generated asset is a finished snapshot, not a live view of its source pair:

- Unpairing the source does not delete or change an existing generated post.
- Replacing the pair's After photo does not update an existing generated post.
- Deleting one source media file does not automatically delete an existing generated post.
- Deleting a generated post does not affect its source media or pair.
- Deleting the entire job removes that job's generated metadata and managed files.

The source-shot-name snapshot allows asset detail to remain understandable after the pair relationship changes.

## Save to Photos

Saving is explicit; generation does not automatically copy anything into the user's photo library.

On **Save to Photos**, the export service:

1. Verifies that the URI is a local PNG.
2. Checks that the media-library API is available.
3. Requests write-only access with no granular read permissions.
4. Saves a copy with `expo-media-library`.
5. Keeps the app-private original intact.

The permission is not requested at startup, during preview, during generation, or for sharing. Denial is handled in the UI. When the operating system will not show the prompt again, the user can open device Settings.

The app config supplies add-only permission copy and blocks Android photo, video, audio, selected-visual-media, and legacy external-storage read permissions. Expo Go owns its native permission manifest, so custom permission copy is fully represented only in a standalone or development build.

## Share

Sharing is explicit and does not require photo-library permission. The export service checks `expo-sharing` availability and opens the native share sheet with:

- The persistent app-private PNG
- MIME type `image/png`
- iOS UTI `public.png`
- A useful dialog title where supported

Sharing keeps the generated file. This milestone does not include direct Instagram/Facebook APIs, uploads, scheduling, or automatic posting.

The browser build supports navigation plus empty and error-state smoke tests. A saved-photo composition cannot be opened reliably on web because this milestone's source and generated media use Expo's native document storage. The builder, persistent PNG generation, Save to Photos, and local-file sharing therefore require Expo Go on Android or iOS.

## Offline and Expo Go behavior

Generation, metadata persistence, the Content library, save-to-device, and native sharing do not use a JobToPost backend and do not upload images. Once the JavaScript bundle is loaded, the product workflow has no server dependency.

During Expo Go development, the phone normally connects to the local Expo/Metro server to load or refresh the app. That development connection is separate from the product's local-only media workflow. The required native modules are Expo SDK 54-compatible and available in Expo Go.

Launch from the repository with:

```bash
npm start
```

Then scan the QR code with Expo Go on the Pixel 6a while the phone and computer can reach the same development server.

## Automated validation

Run:

```bash
npm run lint
npm test
npx tsc --noEmit
npx expo-doctor
```

The test suite covers generated metadata operations, record validation, output configuration, safe path construction, generated-file deletion boundaries, transactional persistence/rollback, job-scoped cleanup, and independence from pair deletion. Unit tests do not claim to exercise native view capture, Google Photos, Android permission dialogs, or the native share sheet.

Before handoff, also confirm:

- Expo and React Native versions did not change.
- No `android` or `ios` folders were generated.
- Original Before and After files are never overwritten.
- Approved generated output is outside temporary cache.
- No Expo server is left running.

## Pixel 6a device checklist

The following require verification on the physical Pixel 6a through Expo Go:

On 2026-07-13, the user confirmed this complete golden-path smoke test on the
Pixel 6a: create a job, capture Before and Progress photos, capture and approve a
ghost-aligned After, generate a post, save it to Photos, open Android sharing,
force-close/reopen Expo Go, and recover the job, photos, pair, and generated
post. This proves the end-to-end happy path; unchecked edge and quality cases
below still require their own explicit exercise.

- [ ] Square output is exactly 1080 × 1080 pixels.
- [ ] Portrait output is exactly 1080 × 1350 pixels.
- [ ] Portrait and landscape source photos render with the correct orientation.
- [ ] Cover cropping is useful and does not stretch either source.
- [ ] BEFORE and AFTER labels are sharp and correctly positioned.
- [ ] Footer text is sharp, positioned safely, and does not obscure too much of the photos.
- [ ] Save to Photos requests only the expected access when tapped.
- [ ] Denial, permanent denial, and Open Settings recovery are understandable.
- [x] A saved copy appears in Google Photos while the app-private original remains.
- [x] The Android share sheet opens with the PNG.
- [ ] Canceling the share sheet does not produce an error.
- [ ] Repeated Generate, Save, and Share taps do not create duplicate operations.
- [ ] Multiple sequential renders do not cause obvious memory growth or crashes.
- [ ] Android gesture/hardware back navigation does not leave broken routes.
- [x] Generated assets persist after force-closing and reopening Expo Go.
- [ ] Existing generated assets remain after unpairing or replacing source photos.
- [ ] Deleting a job removes only that job's generated posts.
- [x] The full workflow completes without red-screen errors.

## Known limitations and deferred work

- Static Before/After PNG is the only generated content type.
- Only Square and Portrait formats are supported.
- Only Side by Side and Stacked layouts are supported.
- There is no arbitrary drag-and-drop editing.
- There are no logos, filters, automatic enhancement, or background removal.
- Captions, reels, story videos, music, carousels, and full content packs are deferred.
- Cloud sync, authentication, teams, subscriptions, analytics, scheduling, and direct social posting are deferred.

## Pre-launch hardening notes

These do not block the current alpha checkpoint, but must be resolved or
explicitly accepted before public launch:

- Individual generated-post deletion removes the managed PNG before its
  metadata. If the later metadata write fails, the retained record can point to
  a missing file.
- Job deletion treats final managed-file cleanup as best-effort after the job
  record is removed, so a storage failure can leave an inaccessible orphan file.
- Individual generated-post deletion is not yet serialized through the same
  per-job operation queue used by generation and job deletion.
- Generated posts do not update when their source pair changes; this is intentional snapshot behavior.
- Native rendering and export quality must be evaluated on the target Android device.
