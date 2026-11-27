-- Add CASH to PaymentMethod enum for office counter student fee payments
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'CASH';
