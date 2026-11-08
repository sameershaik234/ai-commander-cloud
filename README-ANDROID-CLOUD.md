# AI Commander — Android-only Cloud Build Edition

This package is prepared for a user who has an Android phone but no PC. The APK is built by Expo's cloud build service. The AI backend runs in a separate HTTPS cloud service; the Android app stores its backend URL and login token securely on the phone.

## Important before you start

- You cannot safely put an OpenAI API key inside an APK. Put it only in your backend host's encrypted environment-variable settings.
- The app requires an internet connection to reach the cloud backend and OpenAI.
- A persistent cloud backend is required for SQLite task history. The included Render blueprint uses a persistent disk on a paid Render service.
- An APK has **not** been compiled by this source package. You must complete the cloud deployment and EAS build steps below before an installable APK exists.

## Part A — Deploy the AI backend from your Android phone

1. Create a private GitHub repository at https://github.com/new.
2. Use Termux to push the project to that private repository. Install Termux from F-Droid (if not already installed), then run:

```bash
pkg update -y
pkg install git unzip nodejs-lts -y
termux-setup-storage
cd ~/storage/downloads
unzip ai-commander-android-cloud-build.zip
cd ai-commander-cloud-mobile
git init -b main
git add .
git commit -m "Add AI Commander cloud backend and Android app"
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

Replace the ZIP name, GitHub username, and repository name with your actual values. GitHub may ask for a Personal Access Token instead of your password; create a fine-grained token with access to this private repository only. Do not paste the token into ChatGPT or save it in the project.
3. Open https://dashboard.render.com/ and create a Blueprint from that GitHub repository. Keep `render.yaml` at the repository root and the `server/` folder at the root.
4. Review the blueprint. It creates `ai-commander-api` with a persistent disk mounted at `/var/data`. A paid persistent-disk service is required; review Render's current pricing before confirming.
5. In the Render service environment settings, add `OPENAI_API_KEY` with your own OpenAI API key. Do not add the key to GitHub, this ZIP, or the mobile app.
6. Keep the generated `JWT_SECRET` and `OWNER_SETUP_KEY` values. Do not publish them. The one-time `OWNER_SETUP_KEY` is needed only to create your owner account.
7. Wait for deployment to finish. Open `https://YOUR-SERVICE.onrender.com/api/health`. It should return JSON with `ok: true` and `apiConfigured: true`.
8. Copy your service's HTTPS base URL, for example `https://ai-commander-api.onrender.com`. Do not include `/api/health`.

## Part B — Build the APK using Expo cloud build

1. Create an Expo account at https://expo.dev/signup.
2. On your Android phone, install Termux from its official F-Droid page: https://f-droid.org/packages/com.termux/ . Do not use an unofficial APK mirror.
3. Open Termux and run:

```bash
pkg update -y
pkg install nodejs-lts git unzip -y
```

4. Download this project ZIP to your phone and note its location. In Android Settings, allow Termux file access if prompted. Then run:

```bash
termux-setup-storage
cd ~/storage/downloads
unzip ai-commander-cloud-mobile.zip -d ai-commander
cd ai-commander/mobile
npm install
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --platform android --profile preview
```

If the ZIP filename differs, replace it in the unzip command. EAS will upload the mobile project and build the APK in the cloud. Follow the build URL printed by EAS. When the build succeeds, open the artifact link on your phone and install the APK. Android may ask you to allow installation from that browser.

## Part C — First launch

1. Open AI Commander.
2. Paste your Render HTTPS base URL and tap **Save server address**.
3. Select **First time? Create owner account**.
4. Enter your email, a strong password (at least 12 characters), and the one-time `OWNER_SETUP_KEY` from your Render service environment settings.
5. After account creation, sign in with your owner email and password.
6. Use the owner console to manage agents, send text instructions, and start live voice. Allow microphone permission.

## Troubleshooting

- `Network request failed`: check the HTTPS backend URL and confirm `/api/health` is reachable.
- `apiConfigured: false`: add `OPENAI_API_KEY` to the Render service environment and redeploy.
- Voice fails: check that your OpenAI account has access to the configured Realtime model and that microphone permission is allowed.
- Build fails: open the EAS build logs; check Expo SDK compatibility and the `react-native-webrtc` config plugin installation.
- Never paste API keys, JWT secrets, or owner setup keys into ChatGPT, GitHub source files, or screenshots.

## Security and scope

This is an owner-controlled starter application, not a fully audited commercial security product. The API key stays server-side; the mobile app stores only the HTTPS backend URL and JWT in Android secure storage. Use a unique owner password. Do not expose administrative endpoints or secrets publicly. Back up the persistent database regularly.
