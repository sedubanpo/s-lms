# Account Management API Contract

Date: 2026-06-10

## Purpose

The account-management web app is the operator-facing entry point for:

- Student creation and status changes
- Teacher account creation and account updates
- Password reset requests
- App access and role management

Every operator change must use Firebase as the primary source of truth and keep a temporary legacy mirror for:

- Firebase Auth / Firestore used by S-LMS and future services
- Legacy Google Sheets still used by teacher portal, live timetable, and other services during migration

The browser must not contain Firebase Admin SDK credentials or service account keys.

## Recommended Server

Use Firebase Cloud Functions or Cloud Run. Do not use Apps Script as the main runtime for this app.

Recommended first endpoint:

```text
POST /accountManagementBatch
```

The current static app sends:

```json
{
  "action": "accountManagementBatch",
  "mode": "dry-run",
  "operator": "에스에듀",
  "requestedAt": "2026-06-10T00:00:00.000Z",
  "requests": []
}
```

`mode` must be either:

- `dry-run`
- `apply`

Default production behavior should remain `dry-run` until the endpoint is verified.

In `apply` mode, the server should:

1. Validate operator permissions.
2. Save primary data to Firebase Auth / Firestore.
3. Create a `legacySheetSyncJobs` document for Google Sheets mirroring.
4. Return the Firebase commit result and the sheet sync job status.

The browser must not wait for a slow Sheets write before showing the Firebase commit result.

## Request Types

### Student Upsert / Status Change

```json
{
  "id": "student-...",
  "type": "student",
  "summary": "김나린 · 세화여고 3 · 등록",
  "targets": ["firestore", "spreadsheet"],
  "payload": {
    "action": "upsertStudentStatus",
    "student": {
      "name": "김나린",
      "school": "세화여고",
      "grade": "3",
      "status": "ACTIVE",
      "memo": "상태 변경 사유"
    },
    "syncPolicy": "firestore-and-spreadsheet",
    "requiredCollections": ["students"],
    "requiredSheets": ["student"]
  }
}
```

Expected primary server writes:

- Firestore `students`
- Audit log
- Firestore `legacySheetSyncJobs` for Google Sheets `student` mirroring

The server must check duplicates before creating a student. Name-only matching is not enough.

### Teacher Account Upsert

```json
{
  "id": "teacher-...",
  "type": "teacher",
  "summary": "남종언 · 강사 · 01086021065",
  "targets": ["firestore", "spreadsheet"],
  "payload": {
    "action": "upsertTeacherAccount",
    "teacher": {
      "name": "남종언",
      "loginId": "01086021065",
      "subject": "국어",
      "role": "INSTRUCTOR",
      "status": "ACTIVE",
      "password": "optional",
      "apps": {
        "sLms": true,
        "teacherPortal": true,
        "deskPortal": false,
        "liveTimetable": true
      },
      "memo": "계정 생성 사유"
    },
    "syncPolicy": "firebase-auth-firestore-and-spreadsheet",
    "requiredCollections": ["users", "userProfiles", "userAppAccess", "loginAliases"],
    "requiredSheets": ["Teachers"]
  }
}
```

Expected primary server writes:

- Firebase Auth user create/update
- Firestore `users`
- Firestore `userProfiles`
- Firestore `userAppAccess`
- Firestore `loginAliases`
- Audit log
- Firestore `legacySheetSyncJobs` for Google Sheets `Teachers` mirroring

Password updates must be handled server-side. The static app should only submit a request.

## Required Response

```json
{
  "ok": true,
  "requestId": "batch-...",
  "mode": "dry-run",
  "committedTargets": ["firebase"],
  "mirrorTargets": ["spreadsheet"],
  "sheetSyncStatus": "QUEUED",
  "sheetSyncJobIds": [],
  "failedTargets": [],
  "auditLogId": "audit-...",
  "dataVersion": "2026-06-10T00:00:00.000Z",
  "rollbackPlan": [],
  "results": []
}
```

If Firebase succeeds but the legacy mirror cannot be queued, return:

```json
{
  "ok": false,
  "status": "mirror-queue-failed",
  "committedTargets": ["firebase"],
  "failedTargets": ["spreadsheet"],
  "rollbackPlan": [
    { "target": "firebase", "action": "restorePreviousSnapshot" }
  ]
}
```

If Firebase succeeds and sheet sync is queued but later fails, the worker must mark the job:

```json
{
  "status": "FAILED",
  "retryable": true,
  "lastError": "Google Sheets API error"
}
```

## Safety Rules

- Validate admin/operator session before processing.
- Never trust browser-provided role or app permissions without server-side authorization.
- Write the same `requestId` / `migrationRunId` to Firestore and legacy Sheets.
- Save previous field values before update.
- Keep Sheets mirror until teacher portal and live timetable are verified on Firebase.
- Do not expose Firestore Admin credentials to the browser.

## Firestore Collections

Recommended collections:

- `accountManagementRequests`
- `accountManagementAuditLogs`
- `legacySheetSyncJobs`
- `legacySheetSyncErrors`
- Existing identity collections: `students`, `users`, `userProfiles`, `userAppAccess`, `loginAliases`

## Deployment Notes

Temporary GitHub Pages deployment can serve the static app at:

```text
https://sedubanpo.github.io/s-lms/account-management/
```

Final production deployment should move to Firebase Hosting on the same Firebase project as the server API.

If hosted elsewhere, update the link in:

```text
account-management/sedu_hub_sso_with_account_management.html
```
