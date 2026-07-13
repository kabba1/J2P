# JobToPost contributor guide

JobToPost helps small service businesses organize each customer's Before, Progress, and After job media, then eventually turn that media into ready-to-share marketing content.

## Stack and commands

- Expo SDK 54, React Native 0.81, React 19, Expo Router, and strict TypeScript.
- `npm start` starts Expo; `npm run android`, `npm run ios`, and `npm run web` target a platform.
- `npm run lint` runs the repository lint configuration.
- `npx tsc --noEmit` type-checks the project.
- `npx expo-doctor` checks Expo project health.

## Project rules

- Expo has changed. Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing code.
- Stay in the Expo managed workflow. Do not run `expo prebuild` or add native `android` or `ios` projects.
- Do not upgrade Expo or React Native as part of feature work.
- Preserve Expo Router and use TypeScript throughout.
- Do not add dependencies unless the feature genuinely requires them; use `npx expo install` for Expo-compatible packages.
- Test responsive behavior and navigation on Android, including narrow screens and the software keyboard.
- Keep camera, media storage, and future backend behavior behind typed service or repository interfaces.
- Do not implement unrelated roadmap features while completing a scoped milestone.
