# 공통 아이콘 연동 요청 프롬프트

아래 내용을 데스크포털, 라이브시간표, 싱크로에스, S-LMS 작업 요청에 그대로 사용하세요.

```text
Firebase 프로젝트 `fir-lms-prod`의 공통 아이콘 체계를 이 웹앱에 연동해 주세요.

목표
- 계정 관리에서 업로드한 인물, 학교, 과목 아이콘을 이 앱에서도 동일하게 표시합니다.
- 기존 텍스트와 기능은 유지하며, 아이콘이 없거나 로드에 실패해도 이름이 사라지지 않게 기본 배지를 표시합니다.

데이터 원본
- Firestore 컬렉션: `sharedIconAssets`
- 주요 필드: `category`, `targetType`, `lookupKey`, `displayName`, `aliases`, `imageUrl`, `storagePath`, `contentType`, `status`, `updatedAt`
- 분류: `PERSON`, `SCHOOL`, `SUBJECT`
- 활성 문서만 사용: `status == "ACTIVE"`

공통 연결 키
- 개별 사용자: `user:{Firebase Auth uid}`
- 실무자 직급: `staff-position:{직급}`
- 학교: `school:{학교명을 trim하고 연속 공백을 하나로 줄인 뒤 소문자 처리}`
- 과목: `subject:{과목명을 trim하고 연속 공백을 하나로 줄인 뒤 소문자 처리}`

조회 우선순위
1. 사람은 `user:{uid}`를 먼저 찾습니다.
2. 실무자는 개별 아이콘이 없을 때 `staff-position:{staffPosition}`을 찾습니다.
3. 학교와 과목은 정규화한 이름으로 찾고, 없으면 각 문서의 `aliases`도 같은 방식으로 비교합니다.
4. 아이콘이 없거나 이미지가 깨지면 기존 텍스트/이니셜 배지를 유지합니다.

구현 요구
- Firebase 로그인 완료 후 `sharedIconAssets`를 한 번 읽어 lookupKey 기반 Map으로 캐시합니다.
- 계정이 바뀌거나 관리자가 새로고침할 때 캐시를 갱신합니다.
- 목록 렌더마다 Firestore를 다시 조회하지 마세요.
- `<img>`는 20~28px 정사각형, `object-fit: contain`, 작은 모서리 반경을 사용하고 이름 바로 앞에 배치합니다.
- 학교 로고는 기존 정적 로고 매핑보다 공통 아이콘을 우선하고, 공통 아이콘이 없을 때 기존 매핑을 fallback으로 사용합니다.
- 이미지에는 `{displayName}`을 반영한 alt를 제공하되, 바로 뒤 텍스트와 중복 낭독되면 `alt=""`로 장식 처리합니다.
- 이미지 로드 오류 시 `onerror` 또는 컴포넌트 오류 상태로 fallback 배지를 복원합니다.
- 인증 전에는 보호된 아이콘 데이터를 노출하지 않습니다.

권장 어댑터 API
- `loadSharedIcons(): Promise<Map<string, SharedIconAsset>>`
- `normalizeSharedIconName(value: string): string`
- `resolvePersonIcon({ uid, staffPosition }): SharedIconAsset | null`
- `resolveSchoolIcon(schoolName): SharedIconAsset | null`
- `resolveSubjectIcon(subjectName): SharedIconAsset | null`

검증
- 직급이 서로 다른 실무자 2명에게 서로 다른 아이콘이 표시되는지 확인합니다.
- 개별 사용자 아이콘이 직급 아이콘을 덮어쓰는지 확인합니다.
- 학교명 별칭과 정규 이름이 같은 로고를 찾는지 확인합니다.
- 아이콘 문서가 없거나 URL이 실패해도 행 높이, 이름, 클릭 동작이 유지되는지 확인합니다.
- 데스크톱과 모바일에서 아이콘이 텍스트를 밀어내거나 겹치지 않는지 스크린샷으로 확인합니다.
```

