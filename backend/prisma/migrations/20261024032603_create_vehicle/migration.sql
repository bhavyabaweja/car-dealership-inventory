-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- Hand-written: Prisma's schema language cannot express CHECK constraints.
-- Whatever writes to the table, stock can never go negative (no overselling,
-- even if application code has a bug) and a price must be positive.
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_quantity_non_negative" CHECK ("quantity" >= 0);
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_price_positive" CHECK ("price" > 0);
