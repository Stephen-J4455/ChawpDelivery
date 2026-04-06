-- Add Paystack subaccount lifecycle columns for delivery personnel

ALTER TABLE IF EXISTS public.chawp_delivery_personnel
  ADD COLUMN IF NOT EXISTS payment_platform TEXT,
  ADD COLUMN IF NOT EXISTS payment_account TEXT,
  ADD COLUMN IF NOT EXISTS account_code TEXT,
  ADD COLUMN IF NOT EXISTS payment_provider TEXT,
  ADD COLUMN IF NOT EXISTS payment_currency TEXT DEFAULT 'GHS',
  ADD COLUMN IF NOT EXISTS account_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS subaccount_created_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_delivery_personnel_payment_account_unique
  ON public.chawp_delivery_personnel(payment_account)
  WHERE payment_account IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_personnel_account_verified
  ON public.chawp_delivery_personnel(account_verified);
