# exam.co — Send a link. See every exam.

> **exam.co** is a modern, light-themed, online proctored examination platform built for teachers, professors, and academic invigilators. A teacher creates an exam in seconds, gets a shareable link/QR code, and sends it to candidates. As students take the test, the teacher watches real-time candidate screens, receives instant violation alerts with timestamped evidence frames, and exports tamper-proof audit trails.

---

## 🌟 Key Features

- **One-Click Share Links & QR Codes**: Instant candidate enrollment URL with customizable access codes.
- **Silent In-Browser Proctoring**: Detects tab switches, window blurs, offline drops, fullscreen exits, devtools shortcuts, right-clicks, and clipboard activity with **ZERO warnings or popups** shown to the student.
- **Verified Evidence Capture**: Automatically captures compressed screen & webcam frames stored in MongoDB GridFS (`evidence` bucket) with cryptographic timecodes.
- **Offline Resiliency**: In-browser IndexedDB queue stores violations when the network drops and synchronizes them automatically with original timestamps when restored.
- **Live Invigilator Console**: WebRTC & snapshot video streaming, search, violation filter chips, audible chime alerts (Web Audio API), and quick audit timelines.
- **Instant Demo Mode**: Operates 100% in-browser with zero configuration or external credentials needed, complete with simulated candidate traffic and cross-tab `BroadcastChannel` synchronization.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite 8, Tailwind CSS v4, React Router 7, Lucide Icons, Canvas Confetti |
| **Backend** | Node.js, Express, Socket.IO, PDFKit, Multer GridFS |
| **Database** | MongoDB Atlas with Mongoose (Collections: Teachers, Exams, Attempts, Violations, Notifications, GridFS bucket `evidence`) |
| **Authentication** | Firebase Authentication (Google Provider ONLY for Teacher login). Students never use Firebase. |
| **Realtime & Media**| Socket.IO, WebRTC Signaling (STUN/TURN), Web Audio API |

---

## 🚀 Quick Start (Demo Mode - No Setup Required)

The application comes preconfigured with an instant **Demo Mode**:
1. Open the homepage and click **"Try Instant Demo"** or **"Sign in as Demo Teacher"**.
2. Click **"Open as Student (Demo)"** in the top banner. This opens the real candidate testing interface in a new tab.
3. Switch tabs, copy text, or exit fullscreen in the student window—the teacher console in the first tab will immediately chime, show notification badges, and log screenshot evidence in real time!

---

## ⚙️ Production Setup & Deployment

### 1. MongoDB Atlas Configuration

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Under **Network Access**, add `0.0.0.0/0` (or your deployment server IP) to the IP Access List.
3. Under **Database Access**, create a database user (e.g., `examco_admin`) with read/write privileges.
4. Click **Connect** > **Drivers** > **Node.js** and copy your connection string:
   ```env
   MONGODB_URI=mongodb+srv://examco_admin:<password>@cluster0.mongodb.net/examco?retryWrites=true&w=majority
   ```

### 2. Firebase Google Authentication Setup (Teacher Only)

1. Navigate to the [Firebase Console](https://console.firebase.google.com/) and create a project (e.g., `exam-co-proctor`).
2. Go to **Build** > **Authentication** > **Sign-in method** and enable **Google**.
3. Under **Authentication** > **Settings** > **Authorized domains**, ensure `localhost` and your deployed domain (e.g. `your-app.vercel.app`) are listed.
4. In **Project Settings** > **General** > **Your apps**, register a Web app and copy the public credentials into client `.env`:
   ```env
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=exam-co-proctor.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=exam-co-proctor
   ```
5. In **Project Settings** > **Service accounts**, click **Generate new private key**. Copy the values into `server/.env`:
   ```env
   FIREBASE_PROJECT_ID=exam-co-proctor
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@exam-co-proctor.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

---

### 3. Local Installation & Execution

#### Backend Server
```bash
cd server
npm install
cp .env.example .env
# Fill in MONGODB_URI and JWT secrets
npm run seed     # Seeds Dr. Eleanor Vance + 10 MCQ examination
npm start        # Launches server on http://localhost:5000
```

#### Frontend Client
```bash
npm install
npm run dev      # Launches client on http://localhost:3000
```

---

### 4. Deploying to Cloud Providers

#### Server (Render / Railway)
- **Build Command**: `cd server && npm install`
- **Start Command**: `node server/server.js`
- **Environment Variables**: Add `MONGODB_URI`, `JWT_SECRET`, `ATTEMPT_JWT_SECRET`, `CLIENT_URL`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.

#### Frontend (Vercel / Netlify)
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`
- **Environment Variables**: Add `VITE_API_URL` (pointing to your Render/Railway backend) and `VITE_FIREBASE_*` variables.

---

## 📋 Comprehensive Testing Checklist

- [x] **Teacher Auth Flow**: Sign in with Google (Firebase popup verification) or instant demo mode.
- [x] **Exam Management**: Create exam with MCQ builder, CSV import, custom durations, and fullscreen toggles.
- [x] **Link & QR Distribution**: One-click URL copy, inline QR code preview, WhatsApp, and Email share links.
- [x] **Student Enrollment**: Validates exam status, time windows, and access code. Rejects duplicate roll numbers and emails.
- [x] **Silent Proctoring**:
  - Tab Switch (`visibilitychange`)
  - Window Blur (`window.blur`)
  - Fullscreen Exit (`fullscreenchange`)
  - Offline Heartbeat Drop (`online`/`offline`)
  - Screen Share Termination
  - Clipboard Operations (`copy`, `cut`, `paste`)
  - DevTools Inspection (F12, Ctrl+Shift+I)
- [x] **Offline Queue**: Disconnect Wi-Fi while taking exam; violations queue into IndexedDB and flush automatically with original timestamps when reconnected.
- [x] **Audit Reporting**: Export candidate rankings to CSV or generate printable PDF audit reports with incident evidence snapshots.

---

## 🔒 Truthful Disclosure on Browser Limitations

1. **Hardware & Screen Access**: Browsers strictly forbid silent capture of user screens or webcams without explicit user consent. In exam.co, candidates grant screen sharing and camera permissions once upon entry before starting.
2. **Screen Surface Selection**: While `displaySurface: 'monitor'` is requested, modern browsers present a dialog allowing the user to pick an Application Window, Tab, or Entire Screen.
3. **Mobile Browser Constraints**: Mobile browsers (iOS Safari / Android Chrome) have restricted support for `getDisplayMedia` screen capture. Desktop Chrome, Edge, Brave, or Firefox are recommended for candidates.
