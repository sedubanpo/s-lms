# Account Management Direct Firestore Contract

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

## Recommended Runtime

Default production should be a static web app that uses the Firebase Web SDK directly, the same way S-LMS already writes admin-only student/account documents under Firestore security rules.

This avoids requiring the Blaze plan for simple account/status management.

Cloud Functions or Cloud Run should be treated as an optional later step, only for operations that cannot safely be done from a browser.

Optional future endpoint, not used by the current release:

```text
POST /api/accountManagementBatch
```

If a later paid server path is approved, the direct Cloud Functions URL before Firebase Hosting rewrites would be:

```text
https://asia-northeast3-fir-lms-prod.cloudfunctions.net/accountManagementBatch
```

The current static app does not send this HTTP payload. It signs in with Firebase Auth and writes Firestore documents directly from the browser after admin permission is confirmed.

Current direct-write queue items use this shape locally before commit:

```json
{
  "id": "teacher-...",
  "type": "teacher",
  "summary": "남종언 · 강사 · 01086021065",
  "targets": ["firestore", "sheetSync", "pendingAction"],
  "status": "DRAFT",
  "payload": {}
}
```

The static app has two local modes:

- `apply`: direct Firestore commit
- `dry-run`: local payload validation only

Default production behavior should use direct Firestore writes only after the logged-in user is confirmed as an admin by Firestore rules.

The initial Firebase Functions scaffold is intentionally not required for the first release.

If a future server endpoint is introduced, its `apply` mode should:

1. Validate operator permissions.
2. Save primary data to Firestore and use Admin SDK only for Auth operations that cannot be done safely in the browser.
3. Create a `legacySheetSyncJobs` document for Google Sheets mirroring.
4. Return the Firebase commit result and the sheet sync job status.

The browser must not wait for a slow Sheets write before showing the Firebase commit result.

## No-Blaze First Release

The first production release should avoid Cloud Functions and the Blaze plan.

Use the browser Firebase SDK for:

- `students` create/update/status changes
- `users` metadata updates
- `userProfiles` display name/subject updates
- `userAppAccess` role/app permission updates
- `loginAliases` updates when the current Firestore rules allow admin writes

This is possible because S-LMS already uses admin-only Firestore rules:

- `students`: admin create/update/delete
- `users`: admin create/update/delete
- `userProfiles`: admin create/update/delete
- `userAppAccess`: admin create/update/delete
- `loginAliases`: admin create/update/delete

Do not put Firebase Admin SDK or service account keys in the browser.

Operations that still need a separate privileged path:

- Creating/deleting Firebase Auth users directly
- Force-changing another user's Auth password
- Writing to Google Sheets after leaving Apps Script

For the no-Blaze release, handle those as one of:

- existing S-LMS-compatible Firestore metadata updates only
- manual/admin migration script
- later paid server endpoint if the workflow truly requires it

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
    "requiredCollections": ["students"]
  }
}
```

Expected primary writes:

- Firestore `students`
- Audit log
- Optional pending marker for later Google Sheets sync

The browser should block obvious same name + school + grade duplicates, but name-only matching is not enough for identity. Existing students should be edited by `studentId`.

### Student Identity Merge And Delete

Manual representative ID selection is an administrator-only Firestore operation.

Expected primary writes for representative merge:

- Canonical `students/{representativeId}` with `identityStatus: "CANONICAL"` and merged `studentIdAliases`
- Alias `students/{aliasId}` documents with `identityStatus: "ALIAS"`, `isAlias: true`, `mergedInto`, and inactive/merged status
- `studentIdentityMappings`
- Matching `studentIdentityReviewQueue` items marked `RESOLVED`
- Student reference collections updated from alias IDs to the representative ID

Student deletion deletes only the selected `students/{studentId}` document and writes an audit log. It intentionally does not cascade-delete grades, logs, permissions, or spreadsheet rows.

### Teacher Account Upsert

```json
{
  "id": "teacher-...",
  "type": "teacher",
  "summary": "남종언 · 강사 · 01086021065",
  "targets": ["firestore", "pendingAction"],
  "payload": {
    "action": "upsertTeacherMetadata",
    "teacher": {
      "name": "남종언",
      "loginId": "01086021065",
      "subject": "국어",
      "role": "INSTRUCTOR",
      "status": "ACTIVE",
      "lessonLogUrl": "https://forms...",
      "workPageUrl": "https://west-orangutan...",
      "dailyHoursUrl": "https://docs.google.com/...",
      "profileImageUrl": "https://github.com/...",
      "password": "new-password-when-needed",
      "apps": {
        "sLms": true,
        "teacherPortal": true,
        "deskPortal": false,
        "liveTimetable": true
      },
      "authAction": "CREATE_AUTH_USER",
      "memo": "계정 생성 사유"
    },
    "requiredCollections": ["users", "userProfiles", "userAppAccess", "loginAliases"]
  }
}
```

Expected primary writes:

- Firestore `users`
- Firestore `userProfiles`
- Firestore `userAppAccess`
- Firestore `loginAliases`
- Audit log
- `legacySheetSyncJobs` pending job for the S-edu page spreadsheet mirror
- Optional pending admin action when Auth work is needed

Auth password updates must not be force-applied from the browser. The static app can update account metadata and produce a pending password/admin action for a separate privileged script if needed.

Administrators may retrieve the operational password stored in the S-edu page `Teachers` sheet through the Apps Script action `getAccountManagementTeacherCredentials`. This is not a Firebase Auth password lookup: Firebase Auth never exposes password plaintext. The action must verify an S-LMS admin session or Firebase ID token with account-management permission before returning credentials.

During the mixed Firebase + S-edu page period, teacher sheet sync jobs should target spreadsheet `1ByPeH0bZZrZDvW_yPkCpQCIuk724_Gt7uudUj_Ue8Ho`, tab `Teachers`, using these column names:

- `비밀번호(ID)`
- `선생님성함`
- `과목`
- `수업일지링크`
- `업무페이지링크`
- `일일시수조회링크`
- `비밀번호`
- `프로필 이미지`
- `재직`

## Direct Commit Result

```json
{
  "ok": true,
  "requestId": "teacher-...",
  "committedTargets": ["firebase"],
  "pendingTargets": ["CREATE_AUTH_USER"],
  "auditLogId": "audit-...",
  "dataVersion": "2026-06-12T00:00:00.000Z"
}
```

The static app writes commit metadata to:

- `accountManagementRequests`
- `accountManagementAuditLogs`
- `legacySheetSyncJobs`

If Firebase succeeds but Auth or Sheets work remains, leave the request with a pending admin action rather than trying to use Admin SDK credentials in the browser.

Future server-only mirror failures can use:

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

- Validate admin/operator session before processing direct writes.
- Never expose privileged role escalation outside Firestore rules. The browser UI is not the security boundary.
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

GitHub Pages can serve the no-Blaze static app at:

```text
https://sedubanpo.github.io/s-lms/account-management/
```

Firebase Hosting is optional. It is not required unless we later decide to consolidate hosting under Firebase.

If hosted elsewhere, update the link in:

```text
account-management/sedu_hub_sso_with_account_management.html
```
