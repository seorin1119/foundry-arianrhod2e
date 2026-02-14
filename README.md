# Arianrhod RPG 2E - Foundry VTT System

アリアンロッドRPG 2E用 Foundry Virtual Tabletop システム

## 설치

이 폴더를 `arianrhod2e`로 이름을 변경한 뒤, Foundry VTT의 시스템 폴더에 넣습니다.

```
<Foundry 데이터 경로>/Data/systems/arianrhod2e/
```

### Foundry 데이터 경로

| OS | 경로 |
|----|------|
| Windows | `%localappdata%\FoundryVTT\Data\systems\` |
| macOS | `~/Library/Application Support/FoundryVTT/Data/systems/` |
| Linux | `~/.local/share/FoundryVTT/Data/systems/` |

### 심볼릭 링크 (개발용)

별도 복사 없이 개발 폴더와 Foundry를 연결할 수 있습니다.

```bash
# Windows (관리자 권한 CMD)
mklink /D "%localappdata%\FoundryVTT\Data\systems\arianrhod2e" "C:\path\to\FVTT-AR2"

# macOS / Linux
ln -s /path/to/FVTT-AR2 ~/.local/share/FoundryVTT/Data/systems/arianrhod2e
```

## 호환성

- Foundry VTT v13+

## 파일 구조

```
arianrhod2e/
├── system.json                 # 시스템 매니페스트
├── arianrhod2e.mjs             # 진입점
├── module/
│   ├── data/
│   │   ├── actor-data.mjs      # Actor DataModel (character, enemy)
│   │   └── item-data.mjs       # Item DataModel (weapon, armor, accessory, skill, item)
│   ├── documents/
│   │   ├── actor.mjs           # Actor 문서 클래스
│   │   └── item.mjs            # Item 문서 클래스
│   ├── sheets/
│   │   ├── actor-sheet.mjs     # ActorSheetV2 (캐릭터/에너미 시트)
│   │   └── item-sheet.mjs      # ItemSheetV2 (아이템 시트)
│   ├── helpers/
│   │   └── config.mjs          # 시스템 설정 (능력치, 종족, 무기타입 등)
│   └── dice.mjs                # 다이스 시스템 (2d6 + 수정치)
├── templates/
│   ├── actor/parts/            # 캐릭터/에너미 시트 템플릿 (PARTS)
│   └── item/parts/             # 아이템 시트 템플릿 (PARTS)
├── styles/
│   └── arianrhod2e.css         # 스타일시트
└── lang/
    ├── ja.json                 # 일본어
    └── en.json                 # 영어
```

## 시스템 개요

### 능력치 (基本能力値)

| 약어 | 일본어 | 영어 | 용도 |
|------|--------|------|------|
| STR | 筋力 | Strength | HP, 이동력, 물리공격 |
| DEX | 器用 | Dexterity | 명중 |
| AGI | 敏捷 | Agility | 회피, 행동값 |
| INT | 知力 | Intelligence | 마법 |
| PER | 感知 | Perception | 탐색, 지각 |
| SPI | 精神 | Spirit | MP, 마법방어 |
| LUK | 幸運 | Luck | 페이트 |

- **능력 보너스** = floor(능력기본값 / 3)

### 다이스

- 기본 판정: **2d6 + 수정치**
- 크리티컬: 6, 6
- 펌블: 1, 1
- 페이트: 1포인트당 +1d6 추가

### Actor 타입

- **character** — PC 캐릭터 (종족, 메인/서포트 클래스, 능력치, 전투값, 페이트, 소지금)
- **enemy** — 에너미 (능력치, 전투값, 드롭품, 경험치)

### Item 타입

- **weapon** — 무기 (명중, 공격력, 사정거리, 장비슬롯)
- **armor** — 방구 (물리방어, 마법방어, 회피, 장비슬롯)
- **accessory** — 장식품 (효과)
- **skill** — 스킬 (클래스, SL, 타이밍, 대상, 사정, 코스트, 효과)
- **item** — 일반 아이템 (수량, 효과)

### 종족

ヒューリン, エルダナーン, ネヴァーフ, フィルボル, ヴァーナ, ドゥアン, エクスマキナ, ドラゴネット, アーシアン

## 개발

### 실시간 개발

1. 심볼릭 링크 또는 폴더 직접 배치
2. Foundry 서버 실행 → 월드 입장
3. 파일 수정 → **브라우저 F5** → 즉시 반영

> `system.json` 변경 시에만 Foundry 서버 재시작이 필요합니다.

### 디버깅

- **F12** — 브라우저 개발자 도구
- 콘솔에서 `game.arianrhod2e`, `game.actors`, `game.items` 등으로 데이터 확인
- `console.log()`로 코드 흐름 추적

### 기술 스택

- Foundry VTT v13 API (ApplicationV2, DataModel)
- ES Modules (.mjs)
- Handlebars 템플릿 (.hbs)
- 순수 CSS (빌드 도구 없음)
