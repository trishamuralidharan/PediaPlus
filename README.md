# PediaPlus — Complete Project Guide

## Project Structure

```
pediaplus-project/
│
├── backend/                    ← Node.js + Express + MySQL API
│   ├── server.js               ← Entry point
│   ├── package.json
│   ├── .env                    ← ⚠️ Edit this first!
│   ├── database/
│   │   ├── schema.sql          ← Run once to create all tables
│   │   └── db.js               ← MySQL connection pool
│   ├── middleware/
│   │   └── auth.js             ← JWT verification
│   └── routes/
│       ├── auth.js             ← Register / Login / Me
│       ├── children.js         ← Child profiles (full CRUD)
│       ├── parent.js           ← Parent profile details
│       ├── meals.js            ← Daily meal logs
│       └── tracking.js        ← Mood, checklist, growth, vaccines,
│                                  appointments, milestones, points
│
├── frontend/
│   └── index.html              ← The complete PediaPlus app
│
├── capacitor.config.json       ← APK build config
├── package.json                ← Capacitor dependencies
└── README.md                   ← This file
```

---

## Database Tables (14 relational tables)

| Table                    | Stores |
|--------------------------|--------|
| `users`                  | Login credentials, email, phone |
| `parent_profiles`        | Mom & Dad name, phone, DOB, address |
| `children`               | Child details, blood group, school, doctor |
| `child_allergies`        | Each allergy with severity per child |
| `child_diet_preferences` | Diet tags (Vegetarian etc.) per child |
| `growth_records`         | Weight/height/BMI history over time |
| `meal_logs`              | Every food item logged per day with nutrition |
| `mood_logs`              | Daily mood per child |
| `checklist_logs`         | Daily health task completion |
| `vaccine_records`        | Vaccination status, date, clinic |
| `appointments`           | Doctor appointments |
| `milestones`             | Developmental milestones status |
| `health_points`          | Gamification points log |
| `sessions`               | Active JWT sessions |

---

## ─────────────────────────────────────
## PART 1 — Run as a Web App (PC/Browser)
## ─────────────────────────────────────

### Prerequisites
- Node.js v18+  →  https://nodejs.org
- MySQL v8+     →  https://dev.mysql.com/downloads/mysql/

### Step 1 — Create the database
```bash
mysql -u root -p < backend/database/schema.sql
```

### Step 2 — Configure environment
Edit `backend/.env`:
```
DB_PASSWORD=your_actual_mysql_password
JWT_SECRET=any_long_random_string_here
```

### Step 3 — Install backend dependencies
```bash
cd backend
npm install
```

### Step 4 — Start the backend server
```bash
npm start
```
✅ You should see:
```
✅  MySQL connected → pediaplus
🚀  PediaPlus API  →  http://localhost:3001
```

### Step 5 — Open the app
Just open `frontend/index.html` in your browser.
> Double-click it, or drag it into Chrome/Firefox/Edge.

The app auto-connects to `http://localhost:3001`.

---

## ─────────────────────────────────────
## PART 2 — Build Android APK
## ─────────────────────────────────────

### Prerequisites (install these first)
| Tool | Download | Why |
|------|----------|-----|
| Node.js v18+ | https://nodejs.org | Build tooling |
| Android Studio | https://developer.android.com/studio | Android SDK + build tools |
| JDK 17+ | Bundled with Android Studio | Java build tools |

### Step 1 — Set up Android Studio
1. Download and install Android Studio
2. Open Android Studio → More Actions → SDK Manager
3. Install: **Android SDK Platform 34** and **Android Build Tools 34.0.0**
4. Note your Android SDK path (e.g. `C:\Users\You\AppData\Local\Android\Sdk`)

### Step 2 — Set ANDROID_HOME environment variable
**Windows:**
```
setx ANDROID_HOME "C:\Users\YourName\AppData\Local\Android\Sdk"
setx PATH "%PATH%;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools"
```
**Mac/Linux:**
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### Step 3 — Install Capacitor
```bash
# From the pediaplus-project root folder:
npm install
```

### Step 4 — Update API URL for Android
Before building, update the API URL in `frontend/index.html`.

Find this line (near the top of the `<script>` section):
```javascript
const API = 'http://localhost:3001/api';
```
Change it to your computer's local network IP so Android can reach it:
```javascript
const API = 'http://192.168.1.XXX:3001/api';
```
> To find your IP: run `ipconfig` (Windows) or `ifconfig` (Mac/Linux) and use the IPv4 address.

### Step 5 — Add Android platform and sync
```bash
npx cap add android
npx cap sync android
```

### Step 6 — Build the APK
```bash
npx cap build android
```
This opens Android Studio. In Android Studio:
1. Wait for Gradle sync to complete
2. Go to **Build → Build Bundle(s) / APK(s) → Build APK(s)**
3. Click **Build APK(s)**
4. When done, click **locate** to find your APK file

### Step 7 — Install on Android phone
1. Enable **Developer Options** on your phone:
   - Settings → About Phone → tap "Build Number" 7 times
2. Enable **USB Debugging** in Developer Options
3. Connect phone via USB
4. Run: `adb install android/app/build/outputs/apk/debug/app-debug.apk`

Or transfer the APK file to your phone and tap to install
(you may need to allow "Install from unknown sources" in Settings).

---

## ─────────────────────────────────────
## PART 3 — Build Windows Desktop App (EXE)
## ─────────────────────────────────────

You can also package PediaPlus as a Windows desktop EXE using **Electron**.

### Step 1 — Install Electron
```bash
npm install --save-dev electron electron-builder
```

### Step 2 — Create electron main file
Create `electron/main.js`:
```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(() => {
  const win = new BrowserWindow({ width:1200, height:800,
    icon: path.join(__dirname, '../frontend/icon.png'),
    webPreferences: { nodeIntegration: false }
  });
  win.loadFile('frontend/index.html');
  win.setTitle('PediaPlus');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
```

### Step 3 — Add to package.json scripts
```json
"main": "electron/main.js",
"scripts": {
  "electron": "electron .",
  "build:win": "electron-builder --win --x64"
}
```

### Step 4 — Build EXE
```bash
npm run build:win
```
Find the installer in `dist/`.

---

## API Quick Reference

All routes except register/login require:
```
Authorization: Bearer <your_jwt_token>
```

### Auth
```
POST /api/auth/register   { email, password, phone, location }
POST /api/auth/login      { email, password }
GET  /api/auth/me
```

### Parent Profile
```
GET  /api/parent
PUT  /api/parent          { momName, momPhone, momDob, dadName, dadPhone, dadDob, address, city, state, pincode }
```

### Children
```
GET    /api/children
POST   /api/children      { name, gender, dob, age, weight, height, blood, allergies[], diet[] }
PUT    /api/children/:id
DELETE /api/children/:id
```

### Meals
```
GET    /api/meals/:childId?date=YYYY-MM-DD
POST   /api/meals/:childId   { food_name, emoji, qty, unit, kcal, protein, calcium, iron, vit_c, fat }
DELETE /api/meals/:childId/:logId
DELETE /api/meals/:childId   (clear today)
```

### Tracking
```
POST/GET /api/tracking/mood/:childId
POST/GET /api/tracking/checklist/:childId
GET/POST /api/tracking/growth/:childId
GET/POST/PUT /api/tracking/vaccines/:childId
GET/POST /api/tracking/appointments/:childId
GET/PUT  /api/tracking/milestones/:childId
POST/GET /api/tracking/points/:childId
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `MySQL connection failed` | Check `.env` DB_PASSWORD, ensure MySQL is running |
| `Cannot connect to API` | Make sure backend server is running on port 3001 |
| CORS error in browser | Set `CORS_ORIGIN=*` in `.env` |
| APK can't reach server | Use your PC's local IP, not `localhost` |
| `ANDROID_HOME not set` | Set environment variable as shown above |
| APK install blocked | Enable "Unknown sources" in Android Settings |
