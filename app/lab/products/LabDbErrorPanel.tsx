import type { LabDbError } from "./labAccess"

/** DB 장애 화면. 404(상품 없음)와 구분되도록 오류 코드와 원인을 표시한다. */
export function LabDbErrorPanel({ error, children }: { error: LabDbError; children?: React.ReactNode }) {
  return (
    <section aria-live="polite" className="lab-products-error" role="alert">
      <p className="eyebrow">DB ERROR · {error.code}</p>
      <h2>{error.title}</h2>
      <p>{error.detail}</p>
      <p>Mock 데이터로 대체하지 않았습니다. 기존 /products 화면은 영향을 받지 않습니다.</p>
      {children}
    </section>
  )
}
