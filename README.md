# Super App — Project Root

## Folder Structure

```
new project/
├── mobile/      ← React Native app  (START HERE for frontend work)
├── backend/     ← Node.js/Express API  (START HERE for backend work)
├── docs/        ← Documentation, notes, status report PDF
└── archive/     ← Read-only reference copies, do not edit
    ├── kefiyat-mirror/    mirror copy of mobile app (reference only)
    ├── old-versions/      archived backups from May 2026
    └── api-backup-2026/   archived API snapshot from May 2026
```

## Where to Start

### Frontend (React Native)
```
cd mobile
npm install
npx react-native run-android   # or run-ios
```
Main source code: `mobile/src/`
- `src/screens/`    — all UI screens organised by module
- `src/navigation/` — app navigation & routing
- `src/store/`      — Redux state management
- `src/component/`  — shared components

### Backend (Node.js / Express)
```
cd backend
npm install
node index.js
```
Main source code: `backend/`
- `routes/`      — API route definitions (40+ routes)
- `controllers/` — business logic (43+ controllers)
- `models/`      — MongoDB schemas (57+ models)
- `middleware/`  — auth, upload, validation
- `socket/`      — Socket.io real-time handlers

## Tech Stack
| Layer    | Technology                                    |
|----------|-----------------------------------------------|
| Mobile   | React Native 0.80, TypeScript, Redux Toolkit  |
| Backend  | Node.js, Express, MongoDB, MySQL              |
| Payments | Stripe                                        |
| Realtime | Socket.io, Agora (live streaming/calls)       |
| Storage  | AWS S3                                        |
| Push     | Firebase FCM + Notifee                        |

## Documentation
See `docs/` for:
- `SuperApp_Status_Report.pdf` — full technical assessment
- `Notes.txt`                  — known issues and TODOs from the client
- `Description.txt`            — build notes and configuration hints
