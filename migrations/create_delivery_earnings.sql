-- Create delivery earnings table
-- Migration: create_delivery_earnings.sql

CREATE TABLE IF NOT EXISTS public.chawp_delivery_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_personnel_id UUID NOT NULL REFERENCES public.chawp_delivery_personnel(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.chawp_orders(id) ON DELETE SET NULL,
    
    -- Earning details
    amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
    type VARCHAR(50) NOT NULL DEFAULT 'delivery_fee', -- 'delivery_fee', 'tip', 'bonus', 'incentive'
    description TEXT,
    
    -- Payment status
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
    payment_method VARCHAR(50), -- 'bank_transfer', 'mobile_money'
    reference_number VARCHAR(100),
    
    -- Timestamps
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_earning_type CHECK (type IN ('delivery_fee', 'tip', 'bonus', 'incentive', 'surge')),
    CONSTRAINT valid_earning_status CHECK (status IN ('pending', 'paid', 'cancelled'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_delivery_earnings_personnel_id ON public.chawp_delivery_earnings(delivery_personnel_id);
CREATE INDEX IF NOT EXISTS idx_delivery_earnings_order_id ON public.chawp_delivery_earnings(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_earnings_status ON public.chawp_delivery_earnings(status);
CREATE INDEX IF NOT EXISTS idx_delivery_earnings_earned_at ON public.chawp_delivery_earnings(earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_earnings_paid_at ON public.chawp_delivery_earnings(paid_at DESC);

-- Enable Row Level Security
ALTER TABLE public.chawp_delivery_earnings ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Delivery personnel can view their own earnings
CREATE POLICY "Delivery personnel can view own earnings"
    ON public.chawp_delivery_earnings
    FOR SELECT
    USING (
        delivery_personnel_id IN (
            SELECT id FROM public.chawp_delivery_personnel
            WHERE user_id = auth.uid()
        )
    );

-- Admins can view all earnings
CREATE POLICY "Admins can view all earnings"
    ON public.chawp_delivery_earnings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chawp_user_profiles
            WHERE id = auth.uid()
            AND role IN ('super_admin', 'admin')
        )
    );

-- Admins can insert earnings
CREATE POLICY "Admins can create earnings"
    ON public.chawp_delivery_earnings
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chawp_user_profiles
            WHERE id = auth.uid()
            AND role IN ('super_admin', 'admin')
        )
    );

-- Admins can update earnings
CREATE POLICY "Admins can update earnings"
    ON public.chawp_delivery_earnings
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.chawp_user_profiles
            WHERE id = auth.uid()
            AND role IN ('super_admin', 'admin')
        )
    );

-- Function to automatically create earning when order is delivered
CREATE OR REPLACE FUNCTION create_delivery_earning()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create earning when order status changes to 'delivered'
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' AND NEW.delivery_personnel_id IS NOT NULL THEN
        INSERT INTO public.chawp_delivery_earnings (
            delivery_personnel_id,
            order_id,
            amount,
            type,
            description,
            status
        ) VALUES (
            NEW.delivery_personnel_id,
            NEW.id,
            COALESCE(NEW.delivery_fee, 5.00), -- Default GH₵5.00 if not set
            'delivery_fee',
            'Delivery fee for order #' || NEW.id,
            'pending'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create earnings
CREATE TRIGGER trigger_create_delivery_earning
    AFTER UPDATE ON public.chawp_orders
    FOR EACH ROW
    EXECUTE FUNCTION create_delivery_earning();

-- Comments for documentation
COMMENT ON TABLE public.chawp_delivery_earnings IS 'Stores delivery personnel earnings from orders, tips, and bonuses';
COMMENT ON COLUMN public.chawp_delivery_earnings.type IS 'Type of earning: delivery_fee, tip, bonus, incentive, surge';
COMMENT ON COLUMN public.chawp_delivery_earnings.status IS 'Payment status: pending, paid, cancelled';
COMMENT ON COLUMN public.chawp_delivery_earnings.earned_at IS 'When the earning was earned (usually delivery completion time)';
COMMENT ON COLUMN public.chawp_delivery_earnings.paid_at IS 'When the earning was paid out to delivery person';
