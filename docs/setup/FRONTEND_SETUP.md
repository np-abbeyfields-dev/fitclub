# FitClub Frontend Setup

## Prerequisites

- Node.js >= 20
- Expo CLI (or use `npx expo`)

## Local development

1. **Install**
   ```bash
   cd frontend
   npm install
   ```

2. **API URL**
   - For local backend: set `EXPO_PUBLIC_API_URL=http://YOUR_IP:8080/api` in `.env` or `app.json` extra
   - Or use `EXPO_PUBLIC_LOCAL_IP` for `http://{IP}:8080/api`

3. **Run**
   ```bash
   npx expo start
   ```
   Then open in iOS Simulator, Android emulator, or Expo Go.

## Production build

- Set `EXPO_PUBLIC_API_URL` to your Cloud Run API URL (e.g. `https://fitclub-api-488901.run.app/api`).
- Build with EAS or `expo run:ios` / `expo run:android` as needed.
