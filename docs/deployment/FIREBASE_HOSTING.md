# FitClub: Enable Firebase Hosting and deploy the marketing site

The **public** folder contains the FitClub marketing website (mission, features, screenshots). This doc describes how to enable Firebase Hosting in the FitClub GCP project and deploy it.

**If you see:** `404, Requested entity was not found` or **No Hosting site detected** — the Hosting site does not exist yet. Create it in the Firebase Console first (steps 1–2 below), then run `firebase deploy --only hosting`.

---

## 1. Link GCP project to Firebase (one-time)

Firebase uses the same project as GCP. If the project is not yet a Firebase project:

1. Open [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** (or **Select** an existing one).
3. Choose **Use an existing Google Cloud project** and select **fitclub-488901** (or your FitClub project ID).
4. Complete the steps (Google Analytics optional). Your GCP project is now a Firebase project.

---

## 2. Create the Hosting site (required before first deploy)

You must create at least one Hosting site in the Console before the CLI can deploy. Otherwise you get **404 Requested entity was not found**.

1. In [Firebase Console](https://console.firebase.google.com/), select the FitClub project.
2. Go to **Build → Hosting**.
3. Click **Get started**.
4. Follow the prompts (you can skip “Install Firebase CLI” and “Deploy” for now). This creates the default Hosting site (e.g. `fitclub-488901`).
5. Once you see the Hosting dashboard with a site and a **Hosting URL**, the site exists. You can now deploy from the CLI.

---

## 3. Install Firebase CLI and login

```bash
npm install -g firebase-tools
firebase login
```

---

## 4. Use the correct Firebase project

Use the project where your web app lives (e.g. "Fitclub Global"). The **project ID** is in Firebase Console → Project settings (gear) → General, or run `firebase projects:list`.

At the repo root (where `firebase.json` and `.firebaserc` live):

```bash
cd /path/to/FitClub
firebase use YOUR_PROJECT_ID
```

If you use a different project ID than `fitclub-488901`, edit `.firebaserc` and set `"default": "YOUR_PROJECT_ID"`.

---

## 5. Deploy the public site

From the FitClub repo root:

```bash
firebase deploy --only hosting
```

Your site will be live at:

- **Hosting URL:** `https://fitclub-488901.web.app` (or `https://fitclub-488901.firebaseapp.com`)
- You can add a **custom domain** in Firebase Console → Hosting → Add custom domain.

---

## 6. Project layout

- **`firebase.json`** — Hosting config: `public` directory = `public/`. The CLI uses the default Hosting site for the project once it exists (created in step 2).
- **`.firebaserc`** — Default Firebase project (e.g. `fitclub-488901`).
- **`public/`** — Static site: `index.html`, `styles.css`, `screenshots/`. No build step required.

---

## Summary

| Step | Action |
|------|--------|
| 1 | In Firebase Console, add/select project and link GCP project (e.g. fitclub-488901). |
| 2 | In Firebase Console → Build → Hosting → Get started (enables Hosting). |
| 3 | `npm install -g firebase-tools` and `firebase login`. |
| 4 | `firebase use fitclub-488901` at repo root. |
| 5 | `firebase deploy --only hosting`. |
| 6 | Open `https://fitclub-488901.web.app` (or your custom domain). |
