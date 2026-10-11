-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ScentFamily" AS ENUM ('Fresh', 'Floral', 'Woody', 'Musk');

-- CreateTable
CREATE TABLE "products" (
    "id" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "family" "ScentFamily" NOT NULL,
    "price" INTEGER NOT NULL,
    "volume" TEXT NOT NULL,
    "concentration" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "story" TEXT NOT NULL,
    "note_top" TEXT NOT NULL,
    "note_heart" TEXT NOT NULL,
    "note_base" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "accent" TEXT NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");
