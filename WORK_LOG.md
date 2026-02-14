# Arianrhod 2E Foundry VTT 개발 작업 로그

## 팀 구성

**팀 이름**: `arianrhod2e-dev`

### 팀원 (5명)
1. **team-lead** (메인) - 프로젝트 관리 및 조율
2. **system-dev** - Foundry VTT 시스템 로직 개발
3. **ui-dev** - UI/프론트엔드 개발
4. **tester** - QA 및 테스트
5. **researcher** - TRPG 시스템 조사 및 검증

---

## 프로젝트 정보

- **프로젝트 위치**: `C:\Users\js4u1\arianrhod2e`
- **룰북 PDF**: `C:\Users\js4u1\Desktop\learning\아리안로드2e 기본 룰북.pdf` (388페이지)
- **Foundry VTT 버전**: v13+
- **시스템 버전**: 0.2.0

---

## 완료된 작업 ✅

### Task #5: Arianrhod TRPG 시스템 조사 (researcher)
- 2d6 주사위 시스템 확인
- 7개 능력치 구조
- 페이트 시스템
- 듀얼 클래스 시스템
- 6개 종족
- 크리티컬/펌블 규칙
- 전투 라운드 구조
- Focus System (FS)

### Task #6: 현재 코드 분석 (system-dev)
**구현된 기능:**
- Foundry VTT v13 ApplicationV2 프레임워크
- 7개 능력치 (STR, DEX, AGI, INT, PER, SPI, LUK)
- 능력 보너스 자동 계산 (value ÷ 3)
- 캐릭터/적 데이터 모델
- 5가지 아이템 타입
- 장비 시스템
- 2d6 주사위 시스템
- 페이트 포인트 (+1d6)
- 일/영 이중 언어

**누락된 기능:**
- 전투 자동화
- 스킬 사용 시스템
- 장비 자동 스탯 계산
- 클래스 정의
- 레벨업 자동화
- 상태 효과

### Task #7: 크리티컬 판정 로직 수정 (system-dev) ✅
**수정 완료:**
- 이전: (6,6)만 크리티컬
- 현재: 2개 이상의 6 → 크리티컬
- 페이트 주사위 포함 모든 주사위 카운트
- 6의 개수 표시 (예: "6×3")

**수정된 파일:**
- `C:\Users\js4u1\arianrhod2e\module\dice.mjs`
- `C:\Users\js4u1\arianrhod2e\module\documents\actor.mjs`

---

## 검증 결과: 시스템 정확도 체크

### ✅ 올바른 구현
- 기본 주사위 시스템 (2d6 + 수정치)
- 7개 능력치 구조
- 능력 보너스 계산
- 페이트 포인트 시스템
- 펌블 (1,1)
- 듀얼 클래스 구조
- 크리티컬 판정 (수정 완료)

### ⚠️ 불일치 및 문제점

#### 1. 능력치 명칭 문제
- **실제 규칙**: STR, **SEN**, DEX, **MEN**, AGI, LUK, INT
- **현재 구현**: STR, **PER**, DEX, **SPI**, AGI, LUK, INT
- 수정 필요: PER → SEN, SPI → MEN

#### 2. 종족 목록
- **실제 규칙**: Hurin, Eldanaan, Neverf, Filbor, Varna, Duan (+ Earthian)
- **현재 구현**: 9개 (Exmachina, Dragonet, Arsian 추가)
- 확인 필요: 추가 종족이 확장판인지 확인

#### 3. 페이트 포인트 초기값
- **실제 규칙**: Hurin 6, 나머지 5
- **현재 구현**: 구분 없음
- 수정 필요: 종족별 차별화

#### 4. 파워 테이블 (Power Table)
- **조사 결과**: 온라인에서 정확한 수치 값을 찾지 못함
- **현재 상태**: 룰북 확인 필요
- **중요**: 데미지 계산의 핵심 시스템

---

## 진행 중인 작업 🔄

### Task #8: 파워 테이블 구현 (대기 중)
**현재 상황:**
- researcher가 온라인에서 파워 테이블 값을 찾지 못함
- 룰북 PDF 확인 필요

**확인 사항:**
- 아리안로드 2E에 파워 테이블이 실제로 존재하는가?
- 또는 무기의 공격력(attack)을 직접 사용하는가?

---

## 다음 단계 📋

### 긴급 (Immediate)
1. ✅ **Poppler 설치** - 완료
2. **Claude Code 재시작** - PATH 업데이트 적용 필요
3. **룰북 PDF 읽기** - 목차 확인 → 데미지 계산 섹션 찾기
4. **파워 테이블 확인**
   - 존재: 구현 진행
   - 부재: 시스템 이해 후 대체 방식 적용

### 높음 (High Priority)
5. 능력치 명칭 수정 (PER→SEN, SPI→MEN)
6. 종족별 페이트 포인트 차별화
7. 파워 테이블 구현 (데이터 확보 후)

### 중간 (Medium Priority)
8. 전투 라운드 구조화
9. Focus System (FS) 구현
10. 클래스 정의 및 클래스 스킬
11. 스킬 사용 시스템

---

## 기술 정보

### 설치된 도구
- **Poppler**: v25.07.0 (PDF 처리용)
  - 설치 위치: `C:\Users\js4u1\AppData\Local\Microsoft\WinGet\Packages\oschwartz10612.Poppler_...\poppler-25.07.0\Library\bin`
  - PATH 업데이트됨 (재시작 필요)

### 팀 파일 위치
- 팀 설정: `C:\Users\js4u1\.claude\teams\arianrhod2e-dev\config.json`
- 작업 목록: `C:\Users\js4u1\.claude\tasks\arianrhod2e-dev\`

---

## 재시작 후 작업 순서

1. Claude Code 재시작
2. `cd C:\Users\js4u1\arianrhod2e`
3. 팀 복구 확인 (자동으로 로드되어야 함)
4. PDF 목차 읽기:
   ```
   Read tool 사용
   파일: C:\Users\js4u1\Desktop\learning\아리안로드2e 기본 룰북.pdf
   페이지: 1-10 (목차)
   ```
5. 데미지 계산 섹션 찾아서 읽기
6. 파워 테이블 확인 및 구현 또는 대체 방식 적용

---

## 참고사항

- 사용자 선호: **에이전트 추가 시 항상 허가 확인** (MEMORY.md에 저장됨)
- Windows Terminal 패널 분할로 팀원 작업 모니터링 가능
- 팀원들은 자동으로 idle 상태가 되며, 이것은 정상임

---

## 2026-02-12 세션: 버그 수정 및 스킬 라이브러리 구현 ✅

### 완료된 작업

#### 🐛 버그 수정 (커밋 078fd5f)
**팀**: arianrhod-bugfix-2 (bug-fixer)

1. **라이프 패스 주사위 표기 수정** ✅
   - 문제: 2+4 주사위가 합계 "6"으로 표시됨
   - 해결: 연결 표기 "24"로 올바르게 표시
   - 파일: `module/dice.mjs`

2. **라이프 패스 결과 자동 적용** ✅
   - 문제: 주사위 굴린 결과가 드롭다운에 적용 안됨
   - 해결: actor.update() 구조 수정하여 자동 선택
   - 파일: `module/sheets/actor-sheet.mjs`

3. **종족 능력 보너스 표시** ✅
   - 문제: 종족 보너스가 캐릭터 시트에 표시 안됨
   - 해결: 템플릿에 "+수정치 =합계" 표시 추가
   - 예: 필보르 LUK → "6 +3 =9 [3]"
   - 파일: `templates/actor/parts/abilities.hbs`, `module/sheets/actor-sheet.mjs`

4. **스킬 필터 드롭다운 수정** ✅
   - 문제: 필터 클릭 시 즉시 닫힘
   - 해결: event.stopPropagation() 추가
   - 파일: `module/sheets/actor-sheet.mjs`

#### 🎯 스킬 라이브러리 시스템 구현 (커밋 c06f081)
**팀**: arianrhod-bugfix-2 (skill-dev with Opus)

**구현된 기능:**
- ✅ 일반 스킬 21개 (모든 클래스 사용 가능)
- ✅ 4개 클래스 스킬 샘플 (워리어, 어콜라이트, 메이지, 시프)
- ✅ 스킬 선택 다이얼로그 (ApplicationV2)
- ✅ 클래스별 필터링 (전체/일반/메인/서포트)
- ✅ 이름/설명 검색 기능
- ✅ 중복 획득 방지
- ✅ 한글/영어/일본어 완전 지원

**새로 생성된 파일:**
- `module/apps/skill-selection-dialog.mjs` - 다이얼로그 로직
- `templates/apps/skill-selection-dialog.hbs` - 다이얼로그 UI

**수정된 파일:**
- `module/helpers/config.mjs` - ARIANRHOD.skillLibrary 추가
- `module/sheets/actor-sheet.mjs` - + 버튼에 다이얼로그 연결
- `lang/en.json`, `lang/ja.json`, `lang/ko.json` - 30+ 번역 추가

**사용 방법:**
1. 스킬 탭에서 + 버튼 클릭
2. 캐릭터의 클래스에 맞는 스킬 표시
3. 필터/검색으로 스킬 찾기
4. "선택" 버튼으로 스킬 획득

**미완성 부분:**
- 10개 클래스 스킬 미구현 (건슬링거, 닌자, 댄서, 레인저, 몽크, 바드, 사무라이, 서머너, 세이지, 알케미스트)
- PDF 추출 실패 (인코딩 문제)
- 프레임워크는 준비되어 있어 배열만 채우면 됨

### 현재 시스템 상태

**완전 작동 기능:**
- ✅ 캐릭터 생성/편집
- ✅ 종족 선택 (9개, 능력 보너스 자동 적용 및 표시)
- ✅ 클래스 선택 (14개, 스탯/HP/MP 자동 계산)
- ✅ 라이프 패스 시스템 (2d6 롤, 자동 적용)
- ✅ 레벨업/성장점 시스템
- ✅ 능력치 투자 (성장점 사용)
- ✅ 스킬 획득 시스템 (21+ 일반 스킬)

---

## 다음 세션 시작 가이드 📋

### 즉시 테스트 가능 ✅

**Foundry VTT에서 테스트:**
1. 새 캐릭터 생성
2. 종족 선택 (예: 필보르) → LUK에 "+3" 표시 확인
3. 클래스 선택 (예: 워리어/메이지) → HP/MP 자동 계산 확인
4. 라이프 패스 주사위 굴리기 → "24" 같은 연결 표기 확인
5. 레벨업하고 성장점으로 능력치 올리기
6. **스킬 탭에서 + 버튼** → 스킬 선택 다이얼로그 테스트

### 선택적 작업 (우선순위 낮음)

**나머지 10개 클래스 스킬 추가:**
- 방법 1: 룰북에서 수동으로 스킬 데이터 입력
- 방법 2: PDF 추출 도구 개선 후 자동 추출
- 현재: 일반 스킬로 충분히 플레이 가능

**구현 위치:**
- `module/helpers/config.mjs` 파일의 `ARIANRHOD.skillLibrary` 객체
- 각 클래스 배열에 스킬 객체 추가:
```javascript
{
  id: "skill-id",
  name: "スキル名",
  nameEn: "Skill Name",
  skillClass: "gunslinger",
  timing: "action",
  cost: "3MP",
  range: "10m",
  target: "단체",
  maxLevel: 5,
  description: "효과 설명"
}
```

---

## 커밋 기록

- **078fd5f**: fix: critical bugs found during testing (4개 버그 수정)
- **c06f081**: feat: implement skill library selection system (스킬 라이브러리)
- **2045c61**: feat: add character progression system and fix multiple bugs (이전 세션)

---

**마지막 업데이트**: 2026-02-12 03:00
**작성자**: team-lead
**상태**: 테스트 준비 완료 ✅
