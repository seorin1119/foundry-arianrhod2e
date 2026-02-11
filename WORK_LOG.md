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

**마지막 업데이트**: 2026-02-11 23:30
**작성자**: team-lead
