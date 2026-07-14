# JobToPost

JobToPost is a mobile workspace for small service businesses that want consistent job documentation without turning every project into a manual marketing task.

## Core workflow

Every job has one organized media library with three stages:

1. **Before** records the starting condition.
2. **Progress** captures useful work-in-progress moments.
3. **After** records the completed result.

## Current MVP boundary

The current milestone proves the first complete path from documenting work to producing a reusable marketing asset:

1. Create a job and capture Before, Progress, and After photos.
2. Match an After photo to a Before photo with the adjustable ghost overlay.
3. Review and save the Before/After pair.
4. Build a static Before/After post from that saved pair.
5. Generate a persistent PNG, then save it to Photos or share it with Android's native share sheet.
6. Reopen or delete the generated post from the Content library.

The post builder supports two formats—square 1:1 at 1080 × 1080 and portrait 4:5 at 1080 × 1350—and two layouts: Side by Side and Stacked. BEFORE and AFTER labels can be shown or hidden, and the user may add a short optional footer such as a business name. These controls update one shared composition used for preview and export. Before persistence, the rendered PNG is decoded and its physical pixel dimensions must exactly match the selected format.

Generated posts are finished, independent files. Unpairing the source photos, replacing the matched After photo, or deleting one source photo does not rewrite or automatically delete an existing post. Deleting the job removes that job's generated-post metadata and managed files.

The app remains local-first and works without a backend. It does not upload job photos or generated posts.

## Verified device path

On 2026-07-13, the user completed the commercial golden path on a Pixel 6a:
create a job, capture Before and Progress photos, capture and approve a
ghost-aligned After, generate a static post, Save to Photos, open Android
sharing, and force-close/reopen with the job, photos, pair, and generated post
still present. This is happy-path evidence, not a claim that every permission,
rendering-quality, destructive, navigation, or scale edge case has passed.

## Deliberately deferred

The current Content experience is a generated static-post library, not the complete Content Builder or Content Pack shown in the long-term mockups. The following remain out of scope:

- AI captions or caption generation
- Progress reels, story videos, music, or video editing
- Carousels or additional post templates
- Automatic photo enhancement, filters, or generative editing
- Logos and multiple brand profiles
- Cloud storage, cloud sync, authentication, or team accounts
- Subscriptions, analytics, scheduling, or direct social-network posting
- Gallery import and automatic visual-alignment scoring

## Local data and file storage

Metadata is stored separately from image files. Accepted camera images are copied from temporary camera storage into the app-private document directory:

```text
jobs/{jobId}/{stage}/{mediaId}.jpg|png
```

Generated posts are separate PNG files under the same managed job tree:

```text
jobs/{jobId}/generated/{assetId}.png
```

Photo metadata drives galleries and stage counts. Pair records reference one Before media ID and one After media ID from the same job. Generated-asset records reference the job and source pair while retaining their own local URI, format, layout, dimensions, label setting, optional footer, source-shot-name snapshot, and timestamps.

Temporary render files are verified and copied into persistent app-private storage before generated-asset metadata is committed. A failed metadata commit rolls back the persistent generated file when practical. Original Before and After files are never overwritten.

## Permissions and export

Camera permission is requested only for capture. Saving a finished post is an explicit action that requests write-only photo-library access; the app does not request broad read access to the user's photo library. Sharing uses the generated app-private PNG and does not require photo-library permission. Neither action sends the image to JobToPost servers.

See [MILESTONE_4.md](MILESTONE_4.md) for the exact static-post architecture, storage, validation, and Pixel 6a device checklist.
