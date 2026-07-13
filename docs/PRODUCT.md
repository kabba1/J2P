# JobToPost

JobToPost is a mobile workspace for small service businesses that want consistent job documentation without turning every project into a manual marketing task.

## Core workflow

Every job has one organized media library with three stages:

1. **Before** records the starting condition.
2. **Progress** captures useful work-in-progress moments.
3. **After** records the completed result.

## Planned capabilities

Completed pairs and progress media will later feed a content-pack workflow that creates social-ready before-and-after layouts, reels, captions, and platform-specific exports.

## Current MVP boundary

The current milestone covers offline job and photo management plus matched Before/After capture. Users can create jobs, capture Before, Progress, and ordinary After photos, review and name captures, and store originals in app-private local storage. For repeatable Before/After angles, the After Shot Queue tracks every Before photo, the camera can overlay the selected Before at adjustable opacity, and the user reviews the resulting comparison before approving a persistent pair. Saved pairs can be viewed, replaced, or unpaired without deleting either photo by default.

Gallery import, cloud sync, authentication, AI guidance, captions, video generation, subscriptions, and marketing-content generation remain intentionally out of scope.

## Local media storage

Photo metadata is stored separately from image files. Accepted image files are copied out of the temporary camera cache into the app-private document directory using `jobs/{jobId}/{stage}/{mediaId}.jpg|png`. Metadata drives galleries and counts. Pair relationships are stored separately and reference one Before media ID and one After media ID from the same job. Deleting or moving paired media cleans up its relationship first. Changing a saved photo's stage updates metadata without duplicating or moving the physical file; the URI remains valid and the photo appears only in its selected stage.
