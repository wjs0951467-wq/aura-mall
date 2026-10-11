// Prisma ORM 7.10+ 설정 파일. Prisma 7은 .env를 자동으로 읽지 않으므로 dotenv로 직접 불러온다.
// env("DATABASE_URL") 대신 process.env를 쓰는 이유: 값이 없어도 `prisma generate`(DB 불필요)는 실행되게 하기 위함.
import "dotenv/config"
import { defineConfig } from "prisma/config"

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
})
