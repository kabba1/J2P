# JobToPost

JobToPost is a mobile workspace for small service businesses that want consistent job documentation without turning every project into a manual marketing task.

## Core workflow

Every job has one organized media library with three stages:

1. **Before** records the starting condition.
2. **Progress** captures useful work-in-progress moments.
3. **After** records the completed result.

## Planned capabilities

The After camera will eventually offer a ghost overlay of the matching Before photo so the user can reproduce the original angle. Completed pairs and progress media will later feed a content-pack workflow that creates social-ready before-and-after layouts, reels, captions, and platform-specific exports.

## Current MVP boundary

The current milestone covers offline job and photo management: users can create jobs, capture Before, Progress, and After photos with the device camera, review and name captures, store originals in app-private local storage, edit photo metadata, move photos between stages, and safely delete photos or entire jobs.

Ghost alignment, before/after pairing, gallery import, cloud sync, authentication, AI, captions, video generation, subscriptions, and content generation remain intentionally out of scope.

## Local media storage

Photo metadata is stored separately from image files. Accepted image files are copied out of the temporary camera cache into the app-private document directory using `jobs/{jobId}/{stage}/{mediaId}.jpg|png`. Metadata drives galleries and counts. Changing a saved photo’s stage currently updates metadata without duplicating or moving the physical file; the URI remains valid and the photo appears only in its selected stage.
