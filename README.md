# AI Commander — Local Edition

An owner-controlled, local-first AI assistant with a React web dashboard, Electron desktop shell, Expo mobile client, OpenAI Responses API text chat, Realtime voice sessions, JWT owner authentication, and persistent SQLite storage.

## Requirements
- Node.js 20+ (Node 22 LTS recommended)
- npm
- OpenAI API key with Responses API and Realtime API access
- For mobile native builds: Android Studio / Xcode and Expo prebuild toolchain

## 1. Configure secrets (first run)
```bash
cd server
cp .env.example .env
```
Edit `server/.env` and set:
- `OPENAI_API_KEY`: your secret OpenAI API key (server only)
- `JWT_SECRET`: long random secret (32+ characters)
- `OWNER_SETUP_KEY`: separate long random first-run key
- `HOST=127.0.0.1` for computer-only access; for phone-on-same-Wi-Fi access use `HOST=0.0.0.0` and set `CLIENT_ORIGIN` to your exact web origin. Restrict access with your OS firewall; do not expose this development server directly to the public internet.

Generate random secrets:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
Use a different generated value for each secret. Never commit `.env` or share your API key.

## 2. Install dependencies
From the project root:
```bash
npm install
npm run install:all
```

## 3. Start local server and web app
```bash
npm run dev
```
Open `http://localhost:5173`. On first launch, create your owner account using the email, a password of at least 12 characters, and `OWNER_SETUP_KEY` from `server/.env`. Setup is allowed only once. Sign-in uses a bcrypt password hash and a 12-hour signed JWT.

The SQLite database is created at `server/data/commander.sqlite` and contains the owner, agents, task history and activity log. Back up this folder while the server is stopped. The database file is local to this computer.

## 4. Voice
The web dashboard uses browser microphone access and OpenAI Realtime over WebRTC. Sign in, press **Start voice**, and allow microphone access. Voice requires a valid API key with Realtime model access. Browsers require localhost or HTTPS for microphone permission. The permanent OpenAI API key stays on the server; only a short-lived Realtime client secret is returned to the signed-in owner.

## 5. Desktop build
Start the API and web app first, then in another terminal:
```bash
cd desktop
npm install
npm start
```
To package for the current OS:
```bash
npm run dist
```
Build Windows, macOS and Linux packages on their respective supported build hosts using electron-builder.

## 6. Mobile build
For Android/iOS, set the API URL to the computer's LAN IP if connecting over Wi-Fi. Example:
```bash
cd mobile
# create mobile/.env with EXPO_PUBLIC_API_URL=http://192.168.1.20:8787
npm install
npx expo prebuild
npx expo run:android
# or npx expo run:ios on macOS with Xcode
```
The mobile client uses Expo SecureStore for its JWT and currently provides owner sign-in, agent controls and text chat. Native live voice needs a development build with react-native-webrtc; the web/desktop browser voice path is implemented in this release. Do not use Expo Go for native WebRTC modules.

## Security model and limits
- API key is server-side only; never add it to Vite or Expo public environment variables.
- Owner password is hashed with bcryptjs; API routes require a signed JWT.
- Auth endpoints are rate-limited; Helmet security headers are enabled.
- Server binds to loopback by default. LAN access is opt-in with `HOST=0.0.0.0`; use a firewall and trusted private network.
- This is a local development application, not a hardened public multi-user service. Before internet exposure add HTTPS/reverse proxy, CSRF strategy for cookie auth, backup/restore testing, OS-level access controls, audit log retention, and security review.
- Agents do not have unrestricted shell, browser, file, payment or account access. Sensitive external actions require a separately implemented approval-gated tool.
- Pause/stop prevents new requests; it does not forcibly terminate an already-running model response.

## Main API
- `GET /api/health`
- `POST /api/auth/setup` (one-time setup key)
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/agents`
- `POST /api/agents/:id/toggle`
- `POST /api/control`
- `POST /api/chat`
- `GET /api/tasks`
- `POST /api/voice/session` (short-lived Realtime secret)

## 7. Build an installable Android APK with Expo EAS

The repository includes `mobile/eas.json` with an internal-preview APK profile. From the `mobile/` directory:

```bash
npm install
npx eas-cli login
npx eas-cli build:configure
npm run build:apk
```

EAS builds the APK in Expo's cloud and provides a download link when complete. This step requires your own Expo account and acceptance of any applicable build-service terms. Configure the mobile app's API base URL to a reachable address for your computer/server; `localhost` on the phone refers to the phone itself. For a local server, use the computer's LAN IP and keep both devices on the same trusted Wi-Fi network. Do not expose the local server to the public internet without TLS, authentication, and firewall rules.

The current native mobile UI includes owner sign-in, agent controls, and text chat. Native realtime WebRTC voice still requires completing and testing the native voice screen in an Android development build; the APK profile alone does not make that feature complete.


## Android-only cloud setup
See [README-ANDROID-CLOUD.md](README-ANDROID-CLOUD.md) for deploying the backend and building an APK from an Android phone using Expo cloud builds.
