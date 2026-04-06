-- Create delivery personnel bank details table with mobile money support
-- Migration: create_delivery_bank_details.sql

-- Create table for delivery personnel bank and payment details
CREATE TABLE IF NOT EXISTS public.chawp_delivery_bank_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_personnel_id UUID NOT NULL REFERENCES public.chawp_delivery_personnel(id) ON DELETE CASCADE,
    
    -- Payment method type
    payment_method VARCHAR(50) NOT NULL DEFAULT 'mobile_money', -- 'bank', 'mobile_money'
    
    -- Bank account details
    account_name VARCHAR(255),
    account_number VARCHAR(50),
    bank_name VARCHAR(255),
    routing_number VARCHAR(50),
    swift_code VARCHAR(20),
    
    -- Mobile money details
    mobile_money_provider VARCHAR(50), -- 'mtn', 'vodafone', 'airtel', 'tigo', etc.
    mobile_money_number VARCHAR(20),
    mobile_money_name VARCHAR(255),
    
    -- Status and verification
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_delivery_payment UNIQUE(delivery_personnel_id),
    CONSTRAINT valid_payment_method CHECK (payment_method IN ('bank', 'mobile_money'))
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_delivery_bank_details_personnel_id ON public.chawp_delivery_bank_details(delivery_personnel_id);
CREATE INDEX IF NOT EXISTS idx_delivery_bank_details_payment_method ON public.chawp_delivery_bank_details(payment_method);

-- Enable Row Level Security
ALTER TABLE public.chawp_delivery_bank_details ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Delivery personnel can view their own bank details
CREATE POLICY "Delivery personnel can view own bank details"
    ON public.chawp_delivery_bank_details
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.chawp_delivery_personnel WHERE id = delivery_personnel_id
        )
    );

-- Delivery personnel can insert their own bank details
CREATE POLICY "Delivery personnel can insert own bank details"
    ON public.chawp_delivery_bank_details
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM public.chawp_delivery_personnel WHERE id = delivery_personnel_id
        )
    );

-- Delivery personnel can update their own bank details
CREATE POLICY "Delivery personnel can update own bank details"
    ON public.chawp_delivery_bank_details
    FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.chawp_delivery_personnel WHERE id = delivery_personnel_id
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM public.chawp_delivery_personnel WHERE id = delivery_personnel_id
        )
    );

-- Admins can view all bank details
CREATE POLICY "Admins can view all delivery bank details"
    ON public.chawp_delivery_bank_details
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chawp_user_profiles
            WHERE id = auth.uid()
            AND role IN ('super_admin', 'admin')
        )
    );

-- Admins can update verification status
CREATE POLICY "Admins can update delivery bank verification"
    ON public.chawp_delivery_bank_details
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.chawp_user_profiles
            WHERE id = auth.uid()
            AND role IN ('super_admin', 'admin')
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_delivery_bank_details_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS set_delivery_bank_details_updated_at ON public.chawp_delivery_bank_details;
CREATE TRIGGER set_delivery_bank_details_updated_at
    BEFORE UPDATE ON public.chawp_delivery_bank_details
    FOR EACH ROW
    EXECUTE FUNCTION update_delivery_bank_details_updated_at();

-- Comments for documentation
COMMENT ON TABLE public.chawp_delivery_bank_details IS 'Stores bank account and mobile money payment details for delivery personnel payouts';
COMMENT ON COLUMN public.chawp_delivery_bank_details.payment_method IS 'Payment method: bank (traditional bank account) or mobile_money (MTN, Vodafone, etc.)';
COMMENT ON COLUMN public.chawp_delivery_bank_details.mobile_money_provider IS 'Mobile money provider: mtn, vodafone, airtel, tigo, etc.';
COMMENT ON COLUMN public.chawp_delivery_bank_details.is_verified IS 'Whether the payment details have been verified by admin';
