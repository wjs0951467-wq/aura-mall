# PostgreSQL 상품 연동 실험 (/lab/products)

> **실험용 경로입니다. 공개 서비스에 그대로 배포하지 마세요.**
> `/lab/products`는 DB 연동 동작을 확인하기 위한 내부 화면입니다. 운영 빌드(`next start`)에서는
> 환경변수 `ENABLE_DB_LAB=true`가 없으면 404를 반환하며, 검색엔진 색인도 막아 두었습니다(`robots: noindex`).
> 기존 홈·상품 목록·상세는 계속 `data/products.ts`(Mock)를 사용하며 이 실험의 영향을 받지 않습니다.

- 브랜치: `feature/yejin-db` (기준 커밋 `f568aea`)
- 범위: 상품 6종 저장·조회만. 회원·장바구니·포인트·교환 DB는 포함하지 않음
- 환경: Windows · Node.js v24.19.0 · npm 11.17.0 · PostgreSQL 18.4 · Next.js 16.4.0
- 사용 도구: Prisma ORM **7.10.0** (`prisma`, `@prisma/client`, `@prisma/adapter-pg` 버전 고정)
  - npm의 `prisma@latest` 태그는 8.0.0-rc(릴리스 후보)를 가리키므로 안정 버전 7.10.0을 직접 지정했습니다.
  - 설정은 Prisma 7 공식 문서(PostgreSQL 퀵스타트, Prisma Config 레퍼런스)를 따랐습니다.

## 데이터 흐름

```text
data/products.ts (기존 Mock 6종, 변경 없음)
   │  npm run db:seed  →  prisma/seed.ts (id 기준 upsert, 삭제 없음)
   ▼
PostgreSQL  aura_mall_lab.public.products  (prisma/migrations로 생성)
   │  서버에서만 실행: lib/db/products.ts → lib/db/prisma.ts (server-only)
   ▼
app/lab/products/page.tsx (서버 컴포넌트, 요청마다 조회)
   │  DB 행 → Product 타입 변환 (lib/db/productMapping.ts)
   ▼
기존 ProductCard 컴포넌트로 표시 + 조회 정보(current_database, 행 수, 조회 시각)
```

브라우저에는 완성된 HTML과 상품 값만 전달됩니다. DB 연결 문자열과 Prisma·pg 코드는 서버 번들에만 포함됩니다.

## 변경 파일

| 파일 | 역할 |
| --- | --- |
| `prisma/schema.prisma` | `Product` 모델 정의. `types/product.ts` 필드를 그대로 옮김. 노트는 `note_top/heart/base` 세 컬럼 |
| `prisma7.config.ts` | Prisma 7 설정. `dotenv`로 `.env`를 읽고 스키마·마이그레이션·시드 경로 지정 |
| `prisma/migrations/20261011000000_init_products/` | `products` 테이블·`ScentFamily` enum 생성 SQL |
| `prisma/labClient.ts` | 스크립트용 DB 연결. 연결 전후로 대상이 `aura_mall_lab`인지 두 번 확인 |
| `prisma/check-target.ts` | 읽기 전용 점검: 연결 대상과 기존 테이블 목록 출력 |
| `prisma/seed.ts` | 기존 6종을 upsert. 반복 실행해도 행 수 유지 |
| `prisma/verify.ts` | 읽기 전용 검증: 행 수와 모든 필드가 `data/products.ts`와 같은지 비교 |
| `lib/db/labTarget.ts` | `DATABASE_URL` 해석·대상 DB 확인. 비밀번호는 출력하지 않음 |
| `lib/db/productMapping.ts` | `Product` ↔ DB 행 변환 |
| `lib/db/prisma.ts` | 서버 전용 Prisma 클라이언트 (`import "server-only"`) |
| `lib/db/products.ts` | 서버 전용 상품 조회 함수. 실패 시 Mock으로 대체하지 않고 오류를 던짐 |
| `app/lab/products/page.tsx`, `lab-products.css` | 실험 화면. 성공·빈 테이블·오류 상태 표시 |
| `package.json`, `package-lock.json` | Prisma 등 의존성과 `db:*` 스크립트 추가 |
| `.gitignore` | `!.env.example`(예시 파일은 커밋 대상), `/generated/`(Prisma 생성 코드 제외) 추가 |
| `.env.example` | 가짜 값만 담은 연결 정보 형식 안내 |

변경하지 않은 것: `data/`, `types/`, `components/`, 기존 `app/` 경로, `README.md`, `PRD.md`, 이미지 파일.

## 실행 방법

1. 루트에 `.env`를 만들고 `.env.example` 형식대로 `DATABASE_URL`을 입력합니다. (`.env`는 Git에서 제외됨)
2. 명령 실행:

```powershell
npm ci                 # 의존성 설치
npm run db:generate    # Prisma 클라이언트 생성 (generated/ 폴더, DB 불필요)
npm run db:check       # 읽기 전용: 연결 대상이 aura_mall_lab인지, 기존 테이블 확인
npm run db:migrate     # db:check 후 prisma migrate deploy (적용만 함. reset·drop 없음)
npm run db:seed        # 상품 6종 upsert (여러 번 실행해도 6행 유지)
npm run db:verify      # 행 수·필드 일치 검증
npm run dev            # http://localhost:3000/lab/products
```

운영 빌드로 확인할 때만 `ENABLE_DB_LAB=true`를 설정합니다.

```powershell
npm run build
$env:ENABLE_DB_LAB = "true"; npm run start
```

> `npm run build`는 `generated/` 폴더가 있어야 합니다. 새로 클론했다면 `npm run db:generate`를 먼저 실행하세요.
> 스키마를 바꿀 때는 `prisma migrate dev` 대신 `npx prisma migrate diff`로 SQL을 만든 뒤 검토하고
> `db:migrate`로 적용하는 방식을 권장합니다. (`migrate dev`는 상황에 따라 DB reset을 제안할 수 있음)

## 안전장치

- `DATABASE_URL`의 DB 이름이 `aura_mall_lab`이 아니면 시드·검증·화면 모두 실행을 거부합니다.
- 스크립트는 연결 후 `SELECT current_database()`로 한 번 더 확인합니다.
- 오류 화면에는 분류된 안내와 오류 코드만 표시하고, 원본 메시지와 연결 문자열은 노출하지 않습니다.
- reset, drop, 전체 삭제 명령은 스크립트에 없습니다.

## 검증 결과 (2026-10-11)

| 항목 | 결과 |
| --- | --- |
| 연결 대상 확인 (`db:check`) | `localhost:5432/aura_mall_lab`, 마이그레이션 전 public 테이블 없음 |
| 마이그레이션 | `20261011000000_init_products` 적용 완료 |
| 시드 1회차 | 실행 전 0행 → 6행 |
| 시드 2회차 | 실행 전 6행 → 6행 (중복 없음) |
| 필드 일치 (`db:verify`) | 6행, 전 필드(id·slug·이름·포인트·설명·스토리·계열·노트·이미지 경로 등) 일치 |
| `/lab/products` (dev) | 200, 상품 6개 표시, `current_database()=aura_mall_lab`, 요청마다 조회 시각 변경 |
| 오류: 서버 연결 불가 (포트 5999) | `ECONNREFUSED` 오류 화면, 상품 0개 (Mock 대체 없음) |
| 오류: 인증 실패 | `P1000` 오류 화면 |
| 오류: 다른 DB 지정 | `LabDatabaseConfigError` 오류 화면 (연결 시도 전 차단) |
| 운영 빌드 차단 | `ENABLE_DB_LAB` 없음 → 404 / `true` → 200 |
| 기존 `/`, `/products`, `/products/amber-dusk`, `/products/bergamot-veil`, `/cart` | 200 (Mock 기반 동작 유지) |
| 브라우저 번들 검사 | `.next/static`에 `DATABASE_URL`·`postgresql://`·`aura_mall_lab`·`adapter-pg` 문자열 없음 |
| `npm run lint` | 오류 0 · 경고 5 (모두 기존 파일: `AuraSite.tsx` 4, `postcss.config.mjs` 1) |
| `npm run build` | 성공. `/lab/products`는 `ƒ (Dynamic)` |

미실행: 브라우저 화면 캡처·시각 QA, 모바일 화면 확인, 자동화 테스트(프로젝트에 테스트 도구 없음).

## npm audit (2026-10-11, `audit fix --force` 미실행)

| 패키지 | 경로 | 영향 | 상태 |
| --- | --- | --- | --- |
| braces 3.0.3 (high, 5건 묶음) | `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` | 개발 도구(ESLint)만. 앱 실행 코드와 무관 | 기존 문제. braces 최신이 3.0.3이라 수정판 없음. 자동 수정 시 `eslint-config-next@14`로 다운그레이드(호환 깨짐) |
| deepmerge-ts 7.1.5 (high) | `prisma` → `@prisma/config` | Prisma CLI 설정 병합. 앱 런타임에서 import하지 않음 | 신규. 안정 버전 수정판 없음(8.1.0-dev 이상). 자동 수정 시 Prisma 6으로 다운그레이드 |
| mysql2 3.15.3 (high) | `prisma` CLI 의존성 | MySQL용. PostgreSQL 연결에서는 사용하지 않음 | 신규. 위와 동일 |

- `@prisma/client`가 `prisma`를 선택적 peer로 선언해서 `npm audit --omit=dev`에도 Prisma CLI 항목이 집계됩니다.
- 설치 스크립트 경고(`prisma` preinstall, `@prisma/engines`·`esbuild` postinstall, 기존 `unrs-resolver`)는 내용을 확인했습니다. 실행 파일이 이미 설치돼 있어 추가 승인 없이 CLI가 정상 동작합니다.

## 기존 서비스에 통합하려면 (다음 단계 제안)

1. 상품 목록·상세가 `data/products.ts` 대신 `getProductsFromDb()`를 쓰도록 서버 컴포넌트에서 데이터를 받아
   `ProductCollection`(현재 클라이언트에서 Mock을 직접 import)에 props로 넘기는 구조로 바꾸기
2. 상세 페이지 `generateStaticParams`·`generateMetadata`의 데이터 출처와 렌더링 방식(빌드 시 생성 vs 요청 시 조회, 캐시) 결정
3. 홈 쇼케이스·장바구니·Quick View 등 `products` 배열을 직접 쓰는 곳 정리 (장바구니 저장 데이터 호환 포함)
4. DB 장애 시 사용자 화면 정책 결정 (오류 화면 / 재시도 / 캐시 사용). 현재 실험은 오류 화면만 표시
5. 팀원용 DB 준비 절차(.env, 마이그레이션, 시드)와 CI·배포 환경의 `DATABASE_URL`·`prisma generate` 단계 정의
6. Prisma CLI 관련 audit 항목은 안정 버전 수정판이 나오면 업그레이드 검토
7. 통합 후 `/lab/products`와 `ENABLE_DB_LAB` 제거
