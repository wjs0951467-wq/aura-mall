import type { DbQuerySource } from "@/lib/db/products"

/** "2026-10-11T10:25:31.835Z" → "2026-10-11 10:25:31 UTC" (공백 위치에서 자연스럽게 줄바꿈되도록) */
const formatQueriedAt = (iso: string) => iso.replace("T", " ").replace(/\.\d+Z$/, " UTC")

/** 실제 DB 조회임을 확인하는 정보 6개 (PC 3열 · 태블릿 2열 · 모바일 1열) */
export function LabSourceInfo({ source, rows }: { source: DbQuerySource; rows: number }) {
  return (
    <dl aria-label="DB 조회 정보" className="lab-products-source">
      <div><dt>데이터 출처</dt><dd>PostgreSQL · products 테이블</dd></div>
      <div><dt>연결 대상</dt><dd>{source.target}</dd></div>
      <div><dt>current_database()</dt><dd>{source.currentDatabase}</dd></div>
      <div><dt>서버 버전</dt><dd>PostgreSQL {source.serverVersion}</dd></div>
      <div><dt>조회 행 수</dt><dd>{rows}개</dd></div>
      <div>
        <dt>조회 시각 · 소요</dt>
        <dd>
          <time dateTime={source.queriedAt}>{formatQueriedAt(source.queriedAt)}</time>{" "}
          <span className="lab-products-duration">· {source.durationMs}ms</span>
        </dd>
      </div>
    </dl>
  )
}
