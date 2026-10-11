// PostgreSQL 연동 실험 화면. 공개 서비스 배포 대상이 아니다. (docs/lab/postgresql-products.md 참고)
// DB 조회 실패 시 Mock 데이터로 대체하지 않고 오류 상태를 보여 준다.
import type { Metadata } from "next"
import Link from "next/link"
import { parseFamily } from "@/components/products/catalog"
import { ProductCard } from "@/components/products/ProductCard"
import { getProductsFromDb } from "@/lib/db/products"
import { LabDbErrorPanel } from "./LabDbErrorPanel"
import { LabSourceInfo } from "./LabSourceInfo"
import { requireLabAccess, tryDb } from "./labAccess"
import { LAB_PRODUCTS_PATH } from "./labRoutes"
import "./lab-products.css"

export const metadata: Metadata = {
  title: "DB 상품 실험 — AURA LAB",
  robots: { index: false, follow: false },
}

export default async function LabProductsPage({ searchParams }: { searchParams: Promise<{ family?: string | string[] }> }) {
  await requireLabAccess()
  // 상세 화면의 향 계열 링크(?family=)를 받아 DB에서 해당 계열만 조회한다. 알 수 없는 값은 전체 조회.
  const { family: rawFamily } = await searchParams
  const family = parseFamily(typeof rawFamily === "string" ? rawFamily : null) ?? undefined
  const result = await tryDb("lab/products", () => getProductsFromDb({ family }))

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
          <LabSourceInfo rows={result.data.products.length} source={result.data.source} />
          {family && (
            <p className="lab-products-filter">
              <strong>{family}</strong> 계열만 표시 중 · <Link href={LAB_PRODUCTS_PATH}>전체 보기</Link>
            </p>
          )}
          {result.data.products.length ? (
            <div className="product-grid">
              {result.data.products.map((product, index) => (
                <ProductCard basePath={LAB_PRODUCTS_PATH} index={index} key={product.slug} product={product} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p className="eyebrow">NO ROWS</p>
              <h2>{family ? `${family} 계열 상품이 없습니다.` : "products 테이블이 비어 있습니다."}</h2>
              <p>{family ? <Link href={LAB_PRODUCTS_PATH}>전체 상품 보기</Link> : "npm run db:seed로 상품 6종을 저장하세요."}</p>
            </div>
          )}
        </>
      ) : (
        <LabDbErrorPanel error={result.error} />
      )}
    </main>
  )
}
