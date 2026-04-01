-- AlterTable: Add missing job_id column to integration_logs
-- This column was added to schema.prisma but never migrated to the production database.
ALTER TABLE `integration_logs` ADD COLUMN `job_id` VARCHAR(191) NULL;
