# 강사 포털 시수 DB 연결 보완 (2026-09-22)

기준: sedubanpo/t-portal 09d9fe6. 시수 DB는 wfgtqajdkwzuqkwygcft이며, 기존 싱크로에스 instructors 연결과 별개다.

## 동작
- 모든 강사·실무자 생성/수정 요청을 provisionTeacherAccount로 보낸다.
- Auth → claim → Firestore → 강사 포털 시수 DB → 기존 싱크로에스 DB의 완료를 구분한다.
- 시수 DB는 teachers 및 portal_identities의 UID/teacher_id, 이름, 전화번호, 활성 상태, 다른 소유자 및 과도한 권한을 검증한다.
- INSTRUCTOR만 일반 강사 연결 대상이다. 실무자/관리자/기타 역할에 강사나 전역 권한을 자동 부여하지 않는다.
- 비활성·앱 해제 또는 일반 강사 역할 해제 시 해당 UID의 portal_identities.active만 해제한다. teachers 및 시수·수업일지·동의 자료를 변경하지 않는다.
- 기존 비활성 연결을 자동 재활성화하지 않는다. 동명이인, 전화번호 불일치, 다른 소유자, 과도한 권한은 검토가 필요하다.
- 연결 오류는 PARTIAL/teacherPortal 실패로 기록한다. 재시도는 Firestore 완료 후의 오래된 프로필/권한을 재저장하지 않고 현재 서버 원장을 읽는다.
- 연동 상태 화면의 연결 점검은 읽기 전용이다. 안전한 누락 또는 권한 해제 대상만 개별 복구 버튼을 표시한다. 서버가 복구 직전에 다시 검사한다.
- repairTeacherPortalAccess는 authenticated claim이 이미 있어도 DB 연결 검사를 수행한다.

## 검증
- node --test functions/backend.test.js functions/teacherPortalIdentity.test.js: 31 통과.
- verify-portal-identity-ui.cjs: 읽기 전용 조회, 충돌 계정 복구 제외, 개별 복구, 브라우저 오류 없음.
- 브라우저 검증은 합성 계정과 API 경계 대체 사용. 실제 계정 생성/동의 제출 없이 확인.

## 배포
서버 세 함수만 배포: provisionTeacherAccount, repairTeacherPortalAccess, inspectTeacherPortalAccounts.
INTRANET_PORTAL_SERVICE_KEY Secret Manager 바인딩. 키는 프런트엔드에 포함하지 않는다.
프런트엔드는 기존 GitHub Pages account-management/index.html만 갱신한다.
