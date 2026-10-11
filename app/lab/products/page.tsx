// PostgreSQL 연동 실험 화면. 공개 서비스 배포 대상이 아니다. (docs/lab/postgresql-products.md 참고)
// DB 조회 실패 시 Mock 데이터로 대체하지 않고 오류 상태를 보여 준다.
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { ProductCard } from "@/components/products/ProductCard"
import { LabDatabaseConfigError } from "@/lib/db/labTarget"
import { type DbProductsResult, getProductsFromDb } from "@/lib/db/products"
import "./lab-products.css"

export const metadata: Metadata = {
  title: "DB 상품 실험 — AURA LAB",
  robots: { index: false, follow: false },
}

/** "2026-10-11T10:25:31.835Z" → "2026-10-11 10:25:31 UTC" (공백 위치에서 자연스럽게 줄바꿈되도록) */
const formatQueriedAt = (iso: string) => iso.replace("T", " ").replace(/\.\d+Z$/, " UTC")

type LoadResult = { ok: true; data: DbProductsResult } | { ok: false; title: string; detail: string; code: string }

/** 오류 원인을 초보자가 알아볼 수 있게 분류한다. 원본 메시지(연결 정보 포함 가능)는 화면에 그대로 노출하지 않는다. */
function describeError(error: unknown): Extract<LoadResult, { ok: false }> {
  if (error instanceof LabDatabaseConfigError) {
    return { ok: false, title: "DB 연결 설정을 확인해 주세요.", detail: error.message, code: error.name }
  }
  const code = (error as { code?: unknown })?.code
  const name = error instanceof Error ? error.name : "UnknownError"
  const label = typeof code === "string" ? code : name
  const text = error instanceof Error ? error.message : ""
  if (label === "P2021" || /does not exist/i.test(text)) {
    return { ok: false, title: "products 테이블이 없습니다.", detail: "마이그레이션(npm run db:migrate)과 시드(npm run db:seed)를 먼저 실행하세요.", code: label }
  }
  if (label === "P1000" || /authentication|password/i.test(text)) {
    return { ok: false, title: "DB 인증에 실패했습니다.", detail: ".env의 DATABASE_URL 사용자·비밀번호를 확인하세요.", code: label }
  }
  if (label === "ECONNREFUSED" || label === "P1001" || /ECONNREFUSED|reach|connect/i.test(text)) {
    return { ok: false, title: "PostgreSQL 서버에 연결할 수 없습니다.", detail: "PostgreSQL 서비스가 실행 중인지, 호스트·포트가 맞는지 확인하세요.", code: label }
  }
  return { ok: false, title: "DB에서 상품을 불러오지 못했습니다.", detail: "서버 터미널 로그에서 오류 코드를 확인하세요.", code: label }
}

async function loadProducts(): Promise<LoadResult> {
  try {
    return { ok: true, data: await getProductsFromDb() }
  } catch (error) {
    const result = describeError(error)
    console.error(`[lab/products] DB 조회 실패 (${result.code}): ${result.title}`)
    return result
  }
}

export default async function LabProductsPage() {
  // 빌드 시 미리 렌더링하지 않고 요청마다 실행한다. (아래 환경변수 검사도 요청 시점에 해야 하므로 가장 먼저 호출)
  await connection()
  // 운영 빌드에서는 명시적으로 켠 경우에만 연다. (개발 서버에서는 항상 열림)
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_DB_LAB !== "true") notFound()
  const result = await loadProducts()

  return (
    <main className="lab-products page-shell">
      <header className="lab-products-header">
        <p className="eyebrow">AURA LAB · POSTGRESQL</p>
        <h1>DB 상품 목록 실험</h1>
        <p>이 화면의 상품은 data/products.ts가 아니라 PostgreSQL products 테이블에서 서버가 직접 조회한 결과입니다.</p>
        <p className="lab-products-warning">내부 실험용 경로입니다. 공개 서비스에 그대로 배포하지 마세요.</p>
      </header>

      {result.ok ? (
        <>
          <dl aria-label="DB 조회 정보" className="lab-products-source">
            <div><dt>데이터 출처</dt><dd>PostgreSQL · products 테이블</dd></div>
            <div><dt>연결 대상</dt><dd>{result.data.source.target}</dd></div>
            <div><dt>current_database()</dt><dd>{result.data.source.currentDatabase}</dd></div>
            <div><dt>서버 버전</dt><dd>PostgreSQL {result.data.source.serverVersion}</dd></div>
            <div><dt>조회 행 수</dt><dd>{result.data.products.length}개</dd></div>
            <div>
              <dt>조회 시각 · 소요</dt>
              <dd>
                <time dateTime={result.data.source.queriedAt}>{formatQueriedAt(result.data.source.queriedAt)}</time>{" "}
                <span className="lab-products-duration">· {result.data.source.durationMs}ms</span>
              </dd>
            </div>
          </dl>
          {result.data.products.length ? (
            <div className="product-grid">
              {result.data.products.map((product, index) => (
                <ProductCard index={index} key={product.slug} product={product} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p className="eyebrow">NO ROWS</p>
              <h2>products 테이블이 비어 있습니다.</h2>
              <p>npm run db:seed로 상품 6종을 저장하세요.</p>
            </div>
          )}
        </>
      ) : (
        <section aria-live="polite" className="lab-products-error" role="alert">
          <p className="eyebrow">DB ERROR · {result.code}</p>
          <h2>{result.title}</h2>
          <p>{result.detail}</p>
          <p>Mock 데이터로 대체하지 않았습니다. 기존 /products 화면은 영향을 받지 않습니다.</p>
        </section>
      )}
    </main>
  )
}
