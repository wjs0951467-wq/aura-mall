// 서버 전용 Prisma 클라이언트. 클라이언트 컴포넌트에서 import하면 빌드 단계에서 오류가 나도록 server-only로 막는다.
import "server-only"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@/generated/prisma/client"
import { readLabDatabaseUrl } from "./labTarget"

const globalForPrisma = globalThis as unknown as { auraLabPrisma?: PrismaClient }

/** 처음 호출될 때 연결을 만든다. 개발 서버의 HMR로 모듈이 다시 로드돼도 연결 풀을 재사용한다. */
export function getPrisma() {
  if (!globalForPrisma.auraLabPrisma) {
    const { url } = readLabDatabaseUrl()
    globalForPrisma.auraLabPrisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) })
  }
  return globalForPrisma.auraLabPrisma
}
