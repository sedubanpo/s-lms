# Account Management Deployment Checklist

Date: 2026-06-12

## Current Deployment Choice

Use GitHub Pages for the operator UI and authenticated Firebase Functions for privileged identity projection.

Student registration/status writes and teacher provisioning must pass through their server functions. The browser must not directly commit the canonical student write and then independently guess a Supabase match.

Firebase Hosting + Cloud Functions is optional later only if we truly need privileged server operations.

## Local Artifacts

- `index.html`: operator UI
- `API_CONTRACT.md`: direct Firestore write contract plus optional future API notes
- `firebase.json`: optional Firebase Hosting and Functions config, not required for no-Blaze release
- `.firebaserc`: optional default project `fir-lms-prod`
- `functions/index.js`: optional `accountManagementBatch` HTTP function, currently not required

## Safety State

The current static app supports:

- `apply`: calls the authenticated student or teacher provisioning function
- `dry-run`: validates queued payloads locally without writing

`apply` relies on Firebase Auth plus `requireAccountAdmin` in Functions. Student projection is Firestore-first and records a retryable `PARTIAL` job if Supabase is unavailable or an immutable ID needs review.

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

## Firebase Function Deployment

Validate and deploy the privileged functions before pushing a UI that calls them:

```bash
cd "/Users/anjongseong/Documents/New project/account-management"
npm --prefix functions install
npm --prefix functions run check
npx firebase-tools login
npm --prefix functions run verify:student-projection
npx firebase-tools deploy --only functions:provisionStudentAccount --project fir-lms-prod
npx firebase-tools deploy --only functions:provisionTeacherAccount --project fir-lms-prod
```

### Runtime baseline

- Runtime: Node.js 22 (`firebase.json` and `functions/package.json` must agree)
- `firebase-functions`: 6.6.0 stable
- `firebase-admin`: 13.10.0 stable
- Avoid release candidates and major-version upgrades during a runtime-only maintenance pass.

Before deployment, run the checks under an actual Node.js 22 process. Deploy the student function first, verify CORS and unauthenticated rejection, then deploy the teacher function. Deploy the batch scaffold only if it is separately enabled for production. If a deployment regression appears, restore the last known package lock and runtime settings from the previous revision and redeploy before making any data-layer changes.

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
- Student create/status update can store `birthYear`, auto-fill the current grade label, and add the request to the pending queue before commit.
- Birth-year managed students with stale `gradeCalculatedForYear` are surfaced in the student status submenu so annual rollover updates can be added to the pending queue.
- Transition grades, especially elementary 6 to middle 1 and middle 3 to high 1, show a school-confirmation warning before rollover.
- New teacher creation creates the Firebase Auth user before writing `users`, `userProfiles`, `userAppAccess`, `loginAliases`, or Sheets sync data.
- Teacher metadata update writes `users`, `userProfiles`, `userAppAccess`, and `loginAliases`.
- Teacher metadata includes S-edu page legacy fields: `수업일지링크`, `업무페이지링크`, `일일시수조회링크`, `프로필 이미지`, and optional password follow-up.
- The teacher list can reveal the password stored in the S-edu page `Teachers` sheet only after Apps Script verifies the Firebase administrator. Confirm that the UI labels this as a sheet-stored password, not a Firebase Auth password.
- Student lists display a representative identity, preferring Synchro-S UUID, then `ROW-*`, then historical `student_*`, while preserving all known aliases.
- Exact duplicate new-student requests are blocked both when adding to the pending queue and when saving selected queue items. Real homonyms must be distinguished in the student name before creation.
- Student ID review starts collapsed, and representative merge hides alias student documents without deleting their audit trail.
- Student document deletion requires explicit confirmation and does not cascade-delete linked grades/logs/permissions.
- Student and teacher changes create `legacySheetSyncJobs` so the S-edu page spreadsheet mirror can be processed by a privileged Apps Script, script runner, or later server worker.
- Auth reset/disable actions are blocked from being marked complete in the browser and must be handled by Firebase Console or a privileged admin script.

## Mixed Firebase + Spreadsheet Constraint

The static browser app cannot safely write Google Sheets or force-change another Firebase Auth user's password because both require privileged credentials. Keep service account keys and Admin SDK out of the browser.

Until a privileged sync path is selected, the app commits Firestore metadata and records pending jobs/actions:

- `accountManagementRequests`: operator request, result, and Auth follow-up state
- `accountManagementAuditLogs`: immutable operation trail
- `legacySheetSyncJobs`: S-edu page spreadsheet mirror payload
