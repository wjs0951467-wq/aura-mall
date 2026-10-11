// PostgreSQL 연동 실험 화면. 공개 서비스 배포 대상이 아니다. (docs/lab/postgresql-products.md 참고)
// 서버: DB 전체 상품을 요청마다 조회한다. 클라이언트: 기존 ProductCollection이 그 배열만으로 검색·필터·정렬·Quick View를 처리한다.
// DB 조회 실패 시 Mock 데이터로 대체하지 않고 오류 상태를 보여 준다.
import type { Metadata } from "next"
import { Suspense } from "react"
import { ProductCollection } from "@/components/products/ProductCollection"
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

export default async function LabProductsPage() {
  await requireLabAccess()
  // ?family= 등 탐색 조건은 서버에서 거르지 않는다. 항상 전체를 넘겨야 '전체'로 돌아갈 때 6종이 모두 남는다.
  const result = await tryDb("lab/products", () => getProductsFromDb())

  return (
    <main className="lab-products">
      <div className="page-shell">
        <header className="lab-products-header">
          <p className="eyebrow">AURA LAB · POSTGRESQL</p>
          {/* 페이지의 h1은 아래 컬렉션 영역(기존 디자인)이 갖는다. */}
          <h2 className="lab-products-title">DB 상품 목록 실험</h2>
          <p>이 화면의 상품은 data/products.ts가 아니라 PostgreSQL products 테이블에서 서버가 직접 조회한 결과입니다. 검색·필터·정렬은 조회된 상품 안에서 브라우저가 처리합니다.</p>
          <p className="lab-products-warning">내부 실험용 경로입니다. 공개 서비스에 그대로 배포하지 마세요.</p>
        </header>
        {result.ok && <LabSourceInfo rows={result.data.products.length} source={result.data.source} />}
      </div>

      {!result.ok ? (
        <div className="page-shell">
          <LabDbErrorPanel error={result.error} />
        </div>
      ) : result.data.products.length ? (
        <Suspense fallback={<p className="eyebrow page-shell">AURA COLLECTION</p>}>
          <ProductCollection basePath={LAB_PRODUCTS_PATH} products={result.data.products} />
        </Suspense>
      ) : (
        <div className="empty-state page-shell">
          <p className="eyebrow">NO ROWS</p>
          <h2>products 테이블이 비어 있습니다.</h2>
          <p>npm run db:seed로 상품 6종을 저장하세요.</p>
        </div>
      )}
    </main>
  )
}
