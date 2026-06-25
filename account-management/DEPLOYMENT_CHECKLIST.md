# Account Management Deployment Checklist

Date: 2026-06-12

## Current Deployment Choice

Use GitHub Pages or other static hosting for the first production release.

Do not require Firebase Blaze for the first release. S-LMS already handles admin-only student/account document writes from the browser through Firebase Web SDK + Firestore security rules, so Account Management should follow that no-Blaze path first.

Firebase Hosting + Cloud Functions is optional later only if we truly need privileged server operations.

## Local Artifacts

- `index.html`: operator UI
- `API_CONTRACT.md`: direct Firestore write contract plus optional future API notes
- `firebase.json`: optional Firebase Hosting and Functions config, not required for no-Blaze release
- `.firebaserc`: optional default project `fir-lms-prod`
- `functions/index.js`: optional `accountManagementBatch` HTTP function, currently not required

## Safety State

The current static app supports:

- `apply`: writes admin-approved changes directly to Firestore through Firebase Web SDK
- `dry-run`: validates queued payloads locally without writing

`apply` relies on Firebase Auth and Firestore security rules. Do not deploy until admin-only writes for the required collections are confirmed.

## No-Blaze Deployment

Deploy the static files through the existing GitHub Pages flow:

```bash
cp "/Users/anjongseong/Documents/New project/account-management/index.html" \
  "/Users/anjongseong/Documents/s-lms-github/account-management/index.html"

cd "/Users/anjongseong/Documents/s-lms-github"
git add account-management/index.html
git commit -m "Update account management static app"
git push
```

## Optional Firebase Commands

Do not run these for the current release. Only use them if we later choose Firebase Hosting / Cloud Functions and accept the Blaze requirement for Functions:

```bash
cd "/Users/anjongseong/Documents/New project/account-management"
npm --prefix functions install
npm --prefix functions run check
npx firebase-tools login
npx firebase-tools deploy --only functions:accountManagementBatch,hosting
```

## Required Approvals / Permissions

- Firebase Web SDK config already used by S-LMS
- Firestore rules confirming admin-only writes for `students`, `users`, `userProfiles`, `userAppAccess`, and `loginAliases`
- Firestore rules confirming admin-only writes for `accountManagementRequests` and `accountManagementAuditLogs`, or a decision to keep those local only
- A decision that teacher Auth user creation/deletion/password resets remain pending admin actions in this app
- If Google Sheets mirroring must continue without Apps Script, a later privileged sync path is still required
- Confirmation that login alias documents can be maintained by admin users from the browser

## Current Release Gate

Before copying to GitHub Pages, verify:

- Login succeeds with a Firebase admin account.
- Non-admin accounts cannot write through Firestore rules.
- Student create/status update writes the expected `students` fields.
- Teacher metadata update writes `users`, `userProfiles`, `userAppAccess`, and `loginAliases`.
- Teacher metadata includes S-edu page legacy fields: `수업일지링크`, `업무페이지링크`, `일일시수조회링크`, `프로필 이미지`, and optional password follow-up.
- The teacher list can reveal the password stored in the S-edu page `Teachers` sheet only after Apps Script verifies the Firebase administrator. Confirm that the UI labels this as a sheet-stored password, not a Firebase Auth password.
- Student lists display a representative identity, preferring Synchro-S UUID, then `ROW-*`, then historical `student_*`, while preserving all known aliases.
- Student and teacher changes create `legacySheetSyncJobs` so the S-edu page spreadsheet mirror can be processed by a privileged Apps Script, script runner, or later server worker.
- Auth follow-up actions create pending request metadata instead of trying to create/delete Auth users in the browser.

## Mixed Firebase + Spreadsheet Constraint

The static browser app cannot safely write Google Sheets or force-change another Firebase Auth user's password because both require privileged credentials. Keep service account keys and Admin SDK out of the browser.

Until a privileged sync path is selected, the app commits Firestore metadata and records pending jobs/actions:

- `accountManagementRequests`: operator request, result, and Auth follow-up state
- `accountManagementAuditLogs`: immutable operation trail
- `legacySheetSyncJobs`: S-edu page spreadsheet mirror payload
