# FitClub Frontend Tests

## Setup

- **Jest** + **jest-expo** preset
- **@testing-library/react-native** and **@testing-library/react** for rendering and hooks
- **@testing-library/jest-native** for extra matchers

Dependencies are in `devDependencies`; run `npm install` in `frontend/`.

## Running tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

## Layout

- **`jest.config.js`** – preset jest-expo, transform ignore, setup files, coverage, test match
- **`jest.setup.js`** – mocks for AsyncStorage, expo-secure-store, expo modules, safe-area, gesture-handler, useAppTheme, vector icons, fetch
- **`src/__tests__/`**
  - **`helpers/test-utils.tsx`** – custom `render()` that wraps with `ThemeProvider`; use for components that call `useTheme()`
  - **`constants/`** – rank.test.ts
  - **`config/`** – workoutInputMap.test.ts
  - **`store/`** – authStore, themeStore, dashboardStore (use `@jest-environment jsdom` for renderHook)
  - **`components/`** – LeaderboardRow, Button, MetricCard, RankBadge, Input
  - **`screens/`** – LoginScreen, LeaderboardScreen

## Guidelines

- **Components using `useTheme()`**: use `render()` from `../helpers/test-utils` so they run under `ThemeProvider`.
- **Components using `useAppTheme()`**: no wrapper needed; `useAppTheme` is mocked in setup to return `lightTheme`.
- **Store tests** that use `renderHook` from `@testing-library/react`: add `/** @jest-environment jsdom */` at the top of the file so `document` is defined.
- **Screens**: mock navigation, context, and services (e.g. `useClub`, `clubService`, `authService`) and assert on visible text and service calls.

## Coverage

`npm run test:coverage` reports coverage for `src/**/*.{ts,tsx}` excluding `__tests__` and `__mocks__`. Aim to cover stores, config/constants, and key components/screens.
