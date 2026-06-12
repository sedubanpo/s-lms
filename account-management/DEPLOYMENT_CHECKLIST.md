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
- Auth follow-up actions create pending request metadata instead of trying to create/delete Auth users in the browser.
