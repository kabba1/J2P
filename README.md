# JobToPost

JobToPost helps small service businesses document customer work and turn a matched Before/After pair into a finished social-ready image.

The current Expo MVP provides:

- Offline job management and Before, Progress, and After galleries
- Real device-camera capture with persistent app-private photo storage
- A matched After queue and adjustable Before-photo ghost overlay
- Durable Before/After pairs with review, replacement, and unpairing
- Static Before/After post generation
- Square 1080 × 1080 and Portrait 1080 × 1350 output
- Side by Side and Stacked layouts
- Optional BEFORE/AFTER labels and a short footer
- A persistent generated-post Content library
- Explicit Save to Photos, native Share, versioning, and deletion actions

Original job photos are never overwritten. Each generated post is an independent PNG stored under its job, so it remains available if the source pair is later changed or removed. Deleting the job removes that job's managed photos and generated posts.

AI captions, video/reels, cloud sync, authentication, subscriptions, direct social posting, and the complete Content Pack workflow remain future milestones.

## Run the app

```bash
npm install
npm start
```

Scan the QR code with Expo Go on an Android device connected to the same network, or press `a` for an Android emulator and `w` for the web preview.

## Standalone Android builds

The repository is linked to EAS project `@kabba94/jobtopost`. Use the production-like preview APK for device audits:

```bash
npx eas-cli@latest build --platform android --profile preview
```

For development-client builds that connect to Metro:

```bash
npx eas-cli@latest build --platform android --profile development
```

The `production` profile intentionally produces an Android App Bundle for Google Play and is not used for direct Pixel installation.

The Pixel 6a through Expo Go is the primary device target. The product workflow stores and processes media locally; the Expo/Metro connection is still needed to load and refresh the app during development. The browser build is useful for navigation plus empty and error-state smoke tests. The saved-photo builder, native document storage, persistent post generation, Save to Photos, and local-file sharing require Expo Go on Android or iOS.

On 2026-07-13, the complete Pixel 6a golden path passed: create a job, capture Before and Progress photos, capture and approve a ghost-aligned After, generate a static post, Save to Photos, open Android sharing, and force-close/reopen with the job, photos, pair, and generated post still present. Detailed rendering-quality, permission-denial, destructive, navigation, and scale checks remain open.

## Validate

```bash
npm run lint
npm test
npx tsc --noEmit
npx expo-doctor
```

The golden path has physical-device evidence. Exact image dimensions and visual quality, permission denial/settings recovery, destructive cases, repeated-operation stress, and complete Android back behavior still require focused device verification; automated tests do not claim to cover them.

See [docs/PRODUCT.md](docs/PRODUCT.md) for the current boundary, [docs/MILESTONE_4.md](docs/MILESTONE_4.md) and [docs/MILESTONE_5.md](docs/MILESTONE_5.md) for implementation evidence, [docs/LAUNCH_CHECKLIST.md](docs/LAUNCH_CHECKLIST.md) for the inventory, and [docs/ANDROID_LAUNCH_PLAN.md](docs/ANDROID_LAUNCH_PLAN.md) for the gated Android release plan.
