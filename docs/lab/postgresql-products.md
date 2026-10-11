# PostgreSQL 상품 연동 실험 (/lab/products, /lab/products/[slug])

> **실험용 경로입니다. 공개 서비스에 그대로 배포하지 마세요.**
> `/lab/products`(목록)와 `/lab/products/[slug]`(상세)는 DB 연동 동작을 확인하기 위한 내부 화면입니다. 운영 빌드(`next start`)에서는
> 환경변수 `ENABLE_DB_LAB=true`가 없으면 404를 반환하며, 검색엔진 색인도 막아 두었습니다(`robots: noindex`).
> 기존 홈·상품 목록·상세는 계속 `data/products.ts`(Mock)를 사용하며 이 실험의 영향을 받지 않습니다.

- 브랜치: `feature/yejin-db`
  - 1단계(저장·목록 조회): 기준 커밋 `f568aea` → `98cb51e`
  - 2단계(DB 기반 상세·관련 상품): 기준 커밋 `98cb51e` → `155d795`
  - 3단계(DB 목록에 기존 탐색 기능 연결): 기준 커밋 `155d795`
- 범위: 상품 6종 저장, 목록·상세 조회와 목록 탐색만. 회원·장바구니·포인트·교환 DB는 포함하지 않음
- DB 스키마: 2·3단계에서 변경 없음 (`slug`에 이미 unique 인덱스가 있어 단건 조회에 그대로 사용)
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
   │  DB 행 → Product 타입 변환 (lib/db/productMapping.ts)
   ├─▶ /lab/products          getProductsFromDb()  ← 항상 전체 6종 (3단계부터 서버에서 계열로 거르지 않음)
   │      조회 정보 패널 + 기존 ProductCollection (products = DB 전체, basePath="/lab/products")
   │        └ 브라우저에서: 검색·향 계열 필터(?family=)·포인트 정렬·빈 결과·조건 초기화·Quick View
   │      상품 클릭 / Quick View '상세 보기' ↓
   └─▶ /lab/products/[slug]   getProductBySlugFromDb(slug) + getProductsFromDb()
          기존 ProductDetail (catalog = DB 전체 상품, basePath="/lab/products")
            ├ 상세 정보·노트·이미지·필요 포인트 = DB 상품
            ├ 관련 상품 = 기존 getRelatedProducts(DB 상품, DB 목록) → 실험 상세 링크
            ├ 브레드크럼 → /lab/products, /lab/products?family=계열 (목록이 브라우저에서 계열 필터)
            └ 로그인 안내 → /login?next=/lab/products/[slug]
```

- 두 화면 모두 `connection()`으로 요청 시점에만 렌더링합니다. 빌드할 때 DB를 조회하거나 상세를 정적 생성하지 않습니다(`generateStaticParams` 없음).
- 상세의 `generateMetadata`(제목·설명)도 DB 상품명 기준입니다. 페이지 본문과 같은 요청 안에서 React `cache`로 단건 조회를 공유해 DB를 한 번만 조회합니다.
- 상태 구분: DB 정상 + slug 없음 → **404** / DB 장애 → **DB ERROR 화면**(오류 코드 표시, Mock 대체 없음). DB 장애 중에는 slug 존재 여부를 알 수 없으므로 없는 slug도 오류 화면이 됩니다.

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
| `lib/db/products.ts` | 서버 전용 조회 함수: 목록(`getProductsFromDb`, 계열 필터 선택), slug 단건(`getProductBySlugFromDb`, 2단계 추가). 실패 시 Mock으로 대체하지 않고 오류를 던짐 |
| `app/lab/products/page.tsx`, `lab-products.css` | 실험 목록. DB 전체 상품을 조회해 기존 `ProductCollection`에 전달(3단계). 빈 테이블·오류 상태는 실험 화면이 직접 표시 |
| `app/lab/products/[slug]/page.tsx` | (2단계) DB 기반 상세. 기존 상세 UI 재사용, 상품별 metadata, 404·DB 오류 구분 |
| `app/lab/products/labAccess.ts` | (2단계) 목록·상세 공통: 요청 시점 렌더링 + 운영 접근 제한(`ENABLE_DB_LAB`), DB 오류 분류 |
| `app/lab/products/LabDbErrorPanel.tsx`, `LabSourceInfo.tsx`, `labRoutes.ts` | (2단계) 오류 화면·조회 정보 표시를 목록·상세가 공유하도록 분리, 실험 경로 상수 |
| `components/products/ProductDetail.tsx`, `ProductCard.tsx`, `QuickView.tsx`, `components/AuraSite.tsx` | (2단계) 공유 컴포넌트에 선택 props 추가. 아래 "공유 컴포넌트 변경" 참고 |
| `package.json`, `package-lock.json` | Prisma 등 의존성과 `db:*` 스크립트 추가 |
| `.gitignore` | `!.env.example`(예시 파일은 커밋 대상), `/generated/`(Prisma 생성 코드 제외) 추가 |
| `.env.example` | 가짜 값만 담은 연결 정보 형식 안내 |

변경하지 않은 것: `data/`, `types/`, `app/globals.css`, 기존 `app/` 경로 파일, `prisma/schema.prisma`(2단계), `README.md`, `PRD.md`, 이미지 파일.

## 공유 컴포넌트 변경 (2단계)

기존 상세 화면은 관련 상품 후보로 Mock 배열(`data/products.ts`)을 직접 쓰고, 상세·컬렉션·로그인 복귀 링크가 `/products`로 고정되어 있었습니다.
새 상세 UI를 중복 작성하지 않기 위해, 이 두 가지만 바깥에서 주입할 수 있게 **선택 props**를 추가했습니다.

| 컴포넌트 | 추가한 props | 기본값 (기존 동작) |
| --- | --- | --- |
| `ProductDetail` | `catalog`(관련 상품 후보), `basePath`(브레드크럼·로그인 복귀·관련 상품·Quick View 링크 기준) | Mock `products`, `"/products"` |
| `RelatedProducts` | `catalog`, `basePath` | 위와 같음 |
| `ProductCard` | `basePath` (상세 링크) | `"/products"` |
| `QuickView` | `basePath` ('상세 보기' 링크) | `"/products"` |
| `ProductDetailPage` (AuraSite) | `catalog`, `basePath`를 `ProductDetail`에 전달만 함 | 생략 시 기존과 동일 |

- 링크 규칙을 함수가 아닌 문자열(`basePath`)로 받는 이유: 실험 상세는 서버 컴포넌트이고, 서버 컴포넌트는 클라이언트 컴포넌트에 함수를 props로 넘길 수 없기 때문입니다.
- 기존 `/products` 목록·상세는 새 props를 넘기지 않으므로 기본값이 적용되어 동작이 같습니다. (회귀 확인 결과는 아래 표)
- 관련 상품 선정 규칙(같은 계열 우선 → 기본 순서로 보충, 자신·중복 제외, 최대 3개)은 기존 `getRelatedProducts`를 그대로 사용합니다.

## 장바구니 경계 (2단계)

- 실험 상세의 **장바구니 담기는 기존 브라우저 장바구니(localStorage `aura_cart_v1`)를 그대로 사용**합니다.
  DB에 저장되는 장바구니가 아니며, 서버 교환·포인트 차감도 아닙니다.
- 보유 포인트·부족 포인트 표시와 로그인도 기존 브라우저 로컬 계정 로직 그대로입니다. 포인트·회원·교환·재고 정책은 변경하지 않았습니다.
- 담긴 상품의 값은 DB에서 조회한 상품 객체이지만, 현재 DB 값이 Mock과 동일하므로 장바구니 화면에서는 차이가 없습니다.
  장바구니·헤더 등 사이트 공통 링크는 기존 `/products` 경로로 이동합니다.

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
| 화면 정리 (UI만) | 상단 여백 축소, DB 정보 PC 3열·태블릿 2열·모바일 1열, 375/768/1440px 가로 넘침 없음 |

### 2단계 검증 (2026-10-11, DB 기반 상세)

브라우저 자동 점검(Playwright + 설치된 Chrome, 별도 임시 폴더에서 실행 · 프로젝트 의존성에 추가하지 않음) 32/32 통과.

| 항목 | 결과 |
| --- | --- |
| 6종 실험 목록 → 상세 이동 | 6/6 `/lab/products/[slug]`로 이동 |
| 목록·상세 값 일치 | 6/6 이름·포인트(목록·상세)·노트 3종·이미지 경로가 기존 데이터와 일치 |
| 상품별 metadata | 6/6 `<상품명> — AURA LAB` (DB 상품명), `noindex` |
| 관련 상품 | 6/6 3개, 자신 제외, 중복 없음, 모두 `/lab/products/...` 링크. 클릭 시 실험 상세로 이동, Quick View '상세 보기'도 실험 경로 |
| 브레드크럼 계열 링크 | `/lab/products?family=Woody` → Woody 3개만 표시 (2단계: 서버 필터 → 3단계: 브라우저 필터로 변경, 결과 동일) |
| 수량 1→2→3 필요 포인트 | Bergamot Veil 38,000P → 76,000P → 114,000P |
| 로그인 복귀 | 로그인 안내 링크 `?next=%2Flab%2Fproducts%2Fbergamot-veil` → 로그인 후 실험 상세로 복귀. 보유 10,000P(Dew 가입 보너스) · 부족 28,000P 표시 |
| 장바구니 담기 | 기존 브라우저 장바구니(localStorage)에 저장됨 (DB 아님) |
| 없는 slug (dev, 운영+허용) | 404 |
| DB 장애 (운영+허용, 가짜 URL 포트 5999) | 상세·없는 slug 모두 `DB ERROR · ECONNREFUSED` 화면, 제목 `DB 오류 — AURA LAB` (404와 구분) |
| 운영 접근 제한 | `ENABLE_DB_LAB` 없음 → 상세 404 / `true` → 200 |
| 기존 `/products` 회귀 | 목록 링크 6개·Quick View·상세 브레드크럼·관련 상품·로그인 복귀가 모두 `/products` 기준 유지, 실험 안내 띠 없음. 상세는 여전히 빌드 시 정적 생성(●) |
| 화면 렌더링 | 375/768/1440px 상세 가로 넘침 없음, 기존 상세 디자인 그대로 + 상단 실험 안내 띠 |
| `npm run db:verify` | 통과 · 6행 전 필드 일치 |
| `npm run lint` | 오류 0 · 경고 5 (모두 기존 파일, 1단계와 동일) |
| `npm run build` | 성공. `/lab/products/[slug]` `ƒ (Dynamic)` |
| 브라우저 번들 검사 | `.next/static`에 DB 관련 문자열·`PrismaClient` 없음 |

알려진 제약:
- DB 장애 화면의 HTTP 상태 코드는 200입니다. App Router 페이지는 렌더링 중 응답 코드를 503 등으로 지정할 수 없어, 화면 내용(오류 코드·제목)으로 구분합니다.
- ~~실험 목록에는 기존 컬렉션의 검색·정렬·Quick View UI가 없습니다.~~ → 3단계에서 해결

미실행: 실제 사용자 브라우저(Chrome 외)·실기기 확인, 장바구니 → 교환까지의 흐름(이번 범위 밖), 자동화 테스트의 프로젝트 내 정식 도입(프로젝트에 테스트 도구 없음).

## 3단계: DB 목록에 기존 탐색 기능 연결 (2026-10-11)

### 역할 구분

| 위치 | 하는 일 |
| --- | --- |
| 서버 (`app/lab/products/page.tsx`) | 실험 접근 제한 확인 → DB에서 **전체 상품**을 요청마다 조회 → 조회 정보 패널 렌더링 → 상품 배열을 `ProductCollection`에 전달. DB 장애 시 오류 화면(Mock 대체 없음) |
| 브라우저 (`ProductCollection`) | 전달받은 배열만으로 검색·향 계열 필터·포인트 정렬·결과 수·빈 결과·조건 칩·조건 초기화·Quick View 처리. 향 계열은 URL `?family=`와 동기화 |

- 서버가 `?family=`로 거르지 않는 이유: 서버가 Woody 3개만 넘기면 브라우저에서 '전체'를 눌러도 3개만 남는 문제가 생깁니다. 항상 6종을 넘기고 필터는 브라우저 한 곳에서만 처리합니다.
- 상품이 6종뿐이라 전체 조회 후 브라우저 처리로 충분합니다. 상품이 많아지면 서버 검색·페이지네이션을 검토해야 합니다.

### 공유 컴포넌트 변경

| 파일 | 변경 | 기본값 (기존 /products 동작) |
| --- | --- | --- |
| `components/products/ProductCollection.tsx` | 선택 props `products`(탐색 대상 배열), `basePath`(카드·Quick View 링크 기준). 향 계열 탭과 상단 용량 문구를 전달받은 배열에서 계산 | Mock `products`, 기본 향 계열 목록, `"/products"` |
| `components/products/catalog.ts` | `parseFamily(value, families?)`에 허용 계열 목록 인자 추가, `familiesOf(products)` 추가(배열에 있는 계열을 처음 등장 순서로) | `families` 생략 시 기존과 같이 기본 향 계열 목록 |

- 검색·정렬 로직(`filterProducts`), 카드(`ProductCard`), Quick View는 그대로 재사용했고 복제하지 않았습니다.
- 실험 화면에서는 상품 목록·결과 수·향 계열 탭·`?family=` 해석·Quick View가 모두 서버가 넘긴 DB 배열에서 나옵니다. Mock 배열과 Mock 계열 목록은 기본값 경로(`/products`)에서만 쓰입니다.
- 기존 `AuraSite`의 `CollectionPage`는 `<ProductCollection />`을 props 없이 호출하므로 변경하지 않았습니다.
- 실험 전용 스타일: 실험 헤더 제목을 `h2`로 바꾸고(페이지 `h1`은 기존 컬렉션 영역의 "Find Your Scent Veil."), DB 정보 패널 바로 아래의 컬렉션 상단 여백만 `.lab-products .collection-hero`로 줄였습니다. `globals.css`는 변경하지 않았습니다.

### 검증 결과

브라우저 자동 점검(Playwright + 설치된 Chrome, 임시 폴더) **59/59 통과**, 2단계 점검 재실행 **29/29 통과**.

| 항목 | 결과 |
| --- | --- |
| `/products`와 동일 동작 (같은 조작을 두 화면에서 실행해 결과 비교) | 12/12 일치: 한글 '우디'·'플로럴', 영문 'musk', 대문자 'BERGAMOT', 공백 '  fig   leaf  ', 복수 단어 'woody amber', 낮은 순, 높은 순, Woody+낮은 순, Woody+'amber'+높은 순, 빈 결과 2종 |
| 초기 상태 | DB 6종, 기본순(id 순), 탭 전체/Fresh/Floral/Woody/Musk(DB 상품에서 도출), "여섯 가지", DB 정보 패널 유지 |
| 정렬 | 낮은 순 38,000→52,000P, 높은 순 52,000→38,000P, 기본순 복귀 |
| 필터 ↔ URL | Woody 클릭 → `?family=Woody` 3종 / 전체 → URL 정리, 6종 복귀 / 직접 URL `?family=Woody` 진입 후 전체 → 6종(서버 필터 중복 없음) / `?family=floral` → Floral / `?family=citrus` → 전체 6종 |
| 뒤로/앞으로 | `?family=Woody` 목록 → 상세 → 뒤로: Woody 3종 복원 → 앞으로: 실험 상세 |
| 조건 칩·초기화 | Woody+'fig'+높은 순에서 칩 3개+조건 초기화 표시, 검색어·정렬·계열 칩 개별 삭제 각각 정상, '조건 초기화'와 빈 결과의 '전체 향 보기' → 6종·검색/정렬/URL 초기화 |
| 빈 결과 | Floral+'cedar' → "조건에 맞는 향을 찾지 못했어요." + 조건 문구 |
| Quick View | 6/6 이름·포인트·설명·노트·이미지가 DB 값과 일치, '상세 보기' 링크 `/lab/products/[slug]`. Esc·닫기 버튼·배경 클릭으로 닫힘, 세 경우 모두 미리보기 버튼으로 포커스 복귀. '상세 보기' 클릭 → 실험 상세(이름 일치) |
| 실험 상세 이동 | 필터된 목록의 카드, Quick View, 상세 브레드크럼 계열 링크 모두 실험 경로 |
| 화면 | 375/768/1440px 실험 목록·Quick View·기존 목록 모두 가로 넘침 없음 |
| 기존 `/products` 회귀 | 6종·탭·카드/Quick View 링크 `/products`, 필터 URL `/products?family=Musk`, 실험 패널 없음. 2단계 점검(상세·관련 상품·로그인 복귀 경로) 재실행 통과 |
| 운영 모드 | `ENABLE_DB_LAB` 없음 → 404 / `true` → 200, 서버 HTML에 카드 6개(`?family=Woody`는 3개·Woody 탭 선택) / DB 장애(가짜 URL) → `DB ERROR · ECONNREFUSED`, 카드 0개 |
| `db:verify` · lint · build | 통과 · 오류 0/기존 경고 5 · 성공(`/lab/products` ƒ, `/products` ○, 기존 상세 ● 유지) |
| 브라우저 번들 검사 | `.next/static`에 DB 관련 문자열 없음 |

참고 (기존 동작, 이번 변경과 무관):
- 768px Quick View에서 BASE 노트 'Cedarwood'가 'Cedarwo/od'로 줄바꿈됩니다. 기존 `/products`에서도 같은 높이로 재현되어 공통 디자인 영역으로 판단해 수정하지 않았습니다.
- 기존 `/products`는 정적 페이지에서 `useSearchParams`를 써서 서버 HTML에는 상품 카드가 없고 브라우저에서 그려집니다. 실험 목록은 요청 시 렌더링이라 서버 HTML에 카드가 포함됩니다.
- 향 계열 필터는 기존과 같이 `router.replace`를 써서 필터 변경 자체는 방문 기록에 쌓이지 않습니다. 뒤로/앞으로는 상세 이동 전후의 URL 상태를 복원합니다.

미실행: Chrome 외 브라우저·실기기, 스크린리더 실사용 점검, 상품이 많을 때의 성능.

## npm audit (2026-10-11, `audit fix --force` 미실행)

| 패키지 | 경로 | 영향 | 상태 |
| --- | --- | --- | --- |
| braces 3.0.3 (high, 5건 묶음) | `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` | 개발 도구(ESLint)만. 앱 실행 코드와 무관 | 기존 문제. braces 최신이 3.0.3이라 수정판 없음. 자동 수정 시 `eslint-config-next@14`로 다운그레이드(호환 깨짐) |
| deepmerge-ts 7.1.5 (high) | `prisma` → `@prisma/config` | Prisma CLI 설정 병합. 앱 런타임에서 import하지 않음 | 신규. 안정 버전 수정판 없음(8.1.0-dev 이상). 자동 수정 시 Prisma 6으로 다운그레이드 |
| mysql2 3.15.3 (high) | `prisma` CLI 의존성 | MySQL용. PostgreSQL 연결에서는 사용하지 않음 | 신규. 위와 동일 |

- `@prisma/client`가 `prisma`를 선택적 peer로 선언해서 `npm audit --omit=dev`에도 Prisma CLI 항목이 집계됩니다.
- 설치 스크립트 경고(`prisma` preinstall, `@prisma/engines`·`esbuild` postinstall, 기존 `unrs-resolver`)는 내용을 확인했습니다. 실행 파일이 이미 설치돼 있어 추가 승인 없이 CLI가 정상 동작합니다.

## 기존 서비스에 통합하려면 (다음 단계 제안)

1. 상품 목록: 3단계에서 `ProductCollection`이 상품 배열을 받을 수 있게 되었으므로, `/products` 서버 페이지에서 DB를 조회해 넘기면 됩니다.
   이때 `/products`가 정적 페이지에서 요청 시 렌더링(또는 캐시·재검증)으로 바뀌는 점과 DB 장애 화면 정책을 함께 결정해야 합니다.
   상품 수가 늘면 서버 검색·페이지네이션 검토
2. 상품 상세: 2단계의 `catalog`·`basePath` 주입 구조를 `/products/[id]`에 적용. `generateStaticParams`·`generateMetadata`의
   데이터 출처와 렌더링 방식(빌드 시 생성 vs 요청 시 조회, 캐시·재검증) 결정
3. 홈 쇼케이스·장바구니·Quick View 등 `products` 배열을 직접 쓰는 곳 정리 (장바구니 저장 데이터 호환 포함)
4. DB 장애 시 사용자 화면 정책 결정 (오류 화면 / 재시도 / 캐시 사용). 현재 실험은 오류 화면만 표시
5. 팀원용 DB 준비 절차(.env, 마이그레이션, 시드)와 CI·배포 환경의 `DATABASE_URL`·`prisma generate` 단계 정의
6. Prisma CLI 관련 audit 항목은 안정 버전 수정판이 나오면 업그레이드 검토
7. 통합 후 `/lab/products`와 `ENABLE_DB_LAB` 제거
