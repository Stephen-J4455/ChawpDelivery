-- Update orders table for delivery management
-- Migration: update_orders_for_delivery.sql

-- Drop the old status check constraint
ALTER TABLE public.chawp_orders 
DROP CONSTRAINT IF EXISTS chawp_orders_status_check;

-- Add new status check constraint with delivery-specific statuses
ALTER TABLE public.chawp_orders
ADD CONSTRAINT chawp_orders_status_check 
CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'ready_for_pickup', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled'));

-- Add delivery-related columns to orders table
ALTER TABLE public.chawp_orders 
ADD COLUMN IF NOT EXISTS delivery_personnel_id UUID REFERENCES public.chawp_delivery_personnel(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10, 2) DEFAULT 5.00,
ADD COLUMN IF NOT EXISTS delivery_distance DECIMAL(10, 2), -- in kilometers
ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS in_transit_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivery_notes TEXT,
ADD COLUMN IF NOT EXISTS delivery_rating INTEGER CHECK (delivery_rating >= 1 AND delivery_rating <= 5);

-- Create indexes for delivery queries
CREATE INDEX IF NOT EXISTS idx_orders_delivery_personnel ON public.chawp_orders(delivery_personnel_id);
CREATE INDEX IF NOT EXISTS idx_orders_picked_up_at ON public.chawp_orders(picked_up_at);
CREATE INDEX IF NOT EXISTS idx_orders_delivered_at ON public.chawp_orders(delivered_at);

-- Function to update delivery personnel stats
CREATE OR REPLACE FUNCTION update_delivery_personnel_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update total deliveries when order is picked up
    IF NEW.status = 'picked_up' AND OLD.status != 'picked_up' THEN
        UPDATE public.chawp_delivery_personnel
        SET total_deliveries = total_deliveries + 1
        WHERE id = NEW.delivery_personnel_id;
    END IF;
    
    -- Update completed deliveries when order is delivered
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
        UPDATE public.chawp_delivery_personnel
        SET completed_deliveries = completed_deliveries + 1
        WHERE id = NEW.delivery_personnel_id;
    END IF;
    
    -- Update cancelled deliveries
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' AND NEW.delivery_personnel_id IS NOT NULL THEN
        UPDATE public.chawp_delivery_personnel
        SET cancelled_deliveries = cancelled_deliveries + 1
        WHERE id = NEW.delivery_personnel_id;
    END IF;
    
    -- Update rating when delivery rating is added
    IF NEW.delivery_rating IS NOT NULL AND OLD.delivery_rating IS NULL THEN
        UPDATE public.chawp_delivery_personnel
        SET rating = (
            SELECT AVG(delivery_rating)::DECIMAL(3,2)
            FROM public.chawp_orders
            WHERE delivery_personnel_id = NEW.delivery_personnel_id
            AND delivery_rating IS NOT NULL
        )
        WHERE id = NEW.delivery_personnel_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update delivery personnel stats
DROP TRIGGER IF EXISTS trigger_update_delivery_personnel_stats ON public.chawp_orders;
CREATE TRIGGER trigger_update_delivery_personnel_stats
    AFTER UPDATE ON public.chawp_orders
    FOR EACH ROW
    WHEN (NEW.delivery_personnel_id IS NOT NULL)
    EXECUTE FUNCTION update_delivery_personnel_stats();

-- Update RLS policies to allow delivery personnel to view assigned orders
DROP POLICY IF EXISTS "Delivery personnel can view assigned orders" ON public.chawp_orders;
CREATE POLICY "Delivery personnel can view assigned orders"
    ON public.chawp_orders
    FOR SELECT
    USING (
        delivery_personnel_id IN (
            SELECT id FROM public.chawp_delivery_personnel
            WHERE user_id = auth.uid()
        )
    );

-- Delivery personnel can update status of assigned orders
DROP POLICY IF EXISTS "Delivery personnel can update assigned orders" ON public.chawp_orders;
CREATE POLICY "Delivery personnel can update assigned orders"
    ON public.chawp_orders
    FOR UPDATE
    USING (
        delivery_personnel_id IN (
            SELECT id FROM public.chawp_delivery_personnel
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        delivery_personnel_id IN (
            SELECT id FROM public.chawp_delivery_personnel
            WHERE user_id = auth.uid()
        )
    );

-- Delivery personnel can view available orders (ready for pickup, no delivery assigned)
DROP POLICY IF EXISTS "Delivery personnel can view available orders" ON public.chawp_orders;
CREATE POLICY "Delivery personnel can view available orders"
    ON public.chawp_orders
    FOR SELECT
    USING (
        status = 'ready_for_pickup' 
        AND delivery_personnel_id IS NULL
        AND EXISTS (
            SELECT 1 FROM public.chawp_user_profiles
            WHERE id = auth.uid() AND role = 'delivery'
        )
    );

-- Comments
COMMENT ON COLUMN public.chawp_orders.delivery_personnel_id IS 'ID of delivery person assigned to this order';
COMMENT ON COLUMN public.chawp_orders.delivery_fee IS 'Fee charged for delivery';
COMMENT ON COLUMN public.chawp_orders.delivery_distance IS 'Distance in kilometers from vendor to customer';
COMMENT ON COLUMN public.chawp_orders.picked_up_at IS 'When delivery person picked up order from vendor';
COMMENT ON COLUMN public.chawp_orders.in_transit_at IS 'When delivery person started traveling to customer';
COMMENT ON COLUMN public.chawp_orders.delivered_at IS 'When order was delivered to customer';
COMMENT ON COLUMN public.chawp_orders.delivery_rating IS 'Customer rating of delivery service (1-5)';
