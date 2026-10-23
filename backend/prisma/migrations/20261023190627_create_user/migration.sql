-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- Hand-written: Prisma's schema language cannot express CHECK constraints.
-- Together with the unique index above, this makes email uniqueness
-- case-insensitive for every writer, not just code that normalizes first.
ALTER TABLE "User" ADD CONSTRAINT "User_email_is_lowercase" CHECK ("email" = lower("email"));
