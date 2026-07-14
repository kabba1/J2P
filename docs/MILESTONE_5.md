# Milestone 5: Job Access and Local-Data Clarity

## Goal

Make the daily job workflow easier to navigate while clearly explaining what archiving and local-only storage mean. This milestone does not change original photo files, pair records, or generated post files.

## Implemented behavior

- Jobs can be archived and restored.
- Existing records without archive metadata remain Active.
- Jobs can be searched by name, customer, address, service, or notes.
- Jobs can be filtered by Active, Archived, or All.
- The Capture tab surfaces the newest-created active job and direct stage shortcuts.
- Settings explains private app storage, the lack of automatic cloud backup, uninstall risk, archive behavior, deletion behavior, and current permission timing.

## Archive data model

Archive state is represented by an optional ISO timestamp:

```ts
archivedAt?: string;
```

Missing `archivedAt` means Active. This additive field keeps the existing `@jobtopost/jobs/v1` storage key and loads legacy jobs without migration or data loss.

Archive and restore are explicit repository methods rather than editable form fields. Both operations are serialized with other job mutations. Repeating Archive or Restore is idempotent.

Archiving is organizational only:

- It does not move or delete original media.
- It does not remove Before/After pairs.
- It does not remove generated posts.
- Archived jobs can still be opened, searched, restored, or deliberately deleted.

## Repository hardening

The job repository now:

- Accepts an injectable storage adapter for focused tests.
- Serializes create, edit, archive, restore, and delete mutations.
- Validates complete stored records and ISO timestamps.
- Rejects malformed JSON and duplicate job IDs rather than silently dropping records.
- Preserves creation timestamps and all media-count compatibility fields through archive/restore.
- Continues accepting valid work after an earlier queued mutation fails.

## Search and quick access

Search and filtering operate on the already-loaded in-memory job list; hidden jobs are not removed from context or media-count caches. Search is trimmed and case-insensitive.

For this milestone, “latest active job” means the newest-created job that is not archived. True last-used ordering would require a separate persisted activity timestamp and touchpoints throughout capture, which is deliberately deferred.

## Local-storage disclosure

Settings accurately tells users that originals are copied into JobToPost’s private app storage, are not automatically uploaded or added to Google Photos, and may be lost if the app is uninstalled or its storage is cleared.

Export All Originals, complete job archives, gallery import, automatic original-photo copies, cloud backup, and cloud sync remain deferred.

## Verification

Automated tests cover:

- Legacy job compatibility
- Archive and restore persistence
- Idempotent lifecycle actions
- Concurrent edit/archive safety
- Malformed and duplicate stored records
- Active/Archived/All filtering
- Search normalization and combined filters
- Deterministic newest-active selection

Physical Android verification remains open:

- [ ] Software keyboard does not hide important actions.
- [ ] Jobs and controls fit narrow Android layouts.
- [ ] Archive/restore persists through force-close and does not alter media.
- [ ] Search and Active/Archived/All filters remain correct after lifecycle changes.
- [ ] Quick Capture selects the expected newest active job and handles no active job.
- [ ] Android gesture/hardware back navigation does not leave broken routes.
