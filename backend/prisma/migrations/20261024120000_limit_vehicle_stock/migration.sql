-- Hand-written: Prisma's schema language cannot express CHECK constraints.
-- A vehicle never holds more than 1,000,000 units (MAX_STOCK in the application). Beyond the
-- business rule, this keeps the INTEGER column far from its limit of about 2.1 billion, where
-- an update would fail with an out-of-range error instead of a clean refusal.
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_quantity_within_limit" CHECK ("quantity" <= 1000000);
