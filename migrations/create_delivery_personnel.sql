-- Create delivery personnel table
-- Migration: create_delivery_personnel.sql

-- Enable PostGIS extension for geography/geometry types
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS public.chawp_delivery_personnel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Vehicle information
    vehicle_type VARCHAR(50) NOT NULL, -- 'bicycle', 'motorcycle', 'car'
    vehicle_registration VARCHAR(50),
    vehicle_color VARCHAR(50),
    
    -- Availability and status
    is_available BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    
    -- Performance metrics
    rating DECIMAL(3, 2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
    total_deliveries INTEGER DEFAULT 0,
    completed_deliveries INTEGER DEFAULT 0,
    cancelled_deliveries INTEGER DEFAULT 0,
    
    -- Location tracking
    current_location GEOGRAPHY(POINT),
    last_location_update TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_vehicle_type CHECK (vehicle_type IN ('bicycle', 'motorcycle', 'car', 'scooter'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_delivery_personnel_user_id ON public.chawp_delivery_personnel(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_personnel_is_available ON public.chawp_delivery_personnel(is_available);
CREATE INDEX IF NOT EXISTS idx_delivery_personnel_rating ON public.chawp_delivery_personnel(rating DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_personnel_location ON public.chawp_delivery_personnel USING GIST(current_location);

-- Enable Row Level Security
ALTER TABLE public.chawp_delivery_personnel ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Delivery personnel can view and update their own record
CREATE POLICY "Delivery personnel can view own record"
    ON public.chawp_delivery_personnel
    FOR SELECT
    USING (
        auth.uid() = user_id
    );

CREATE POLICY "Delivery personnel can insert own record"
    ON public.chawp_delivery_personnel
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
    );

CREATE POLICY "Delivery personnel can update own record"
    ON public.chawp_delivery_personnel
    FOR UPDATE
    USING (
        auth.uid() = user_id
    );

-- Admins can view all delivery personnel
CREATE POLICY "Admins can view all delivery personnel"
    ON public.chawp_delivery_personnel
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.chawp_user_profiles
            WHERE id = auth.uid()
            AND role IN ('super_admin', 'admin')
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_delivery_personnel_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_delivery_personnel_updated_at
    BEFORE UPDATE ON public.chawp_delivery_personnel
    FOR EACH ROW
    EXECUTE FUNCTION update_delivery_personnel_updated_at();

-- Comments for documentation
COMMENT ON TABLE public.chawp_delivery_personnel IS 'Stores delivery personnel information, vehicle details, and performance metrics';
COMMENT ON COLUMN public.chawp_delivery_personnel.vehicle_type IS 'Type of vehicle: bicycle, motorcycle, car, scooter';
COMMENT ON COLUMN public.chawp_delivery_personnel.is_available IS 'Whether delivery person is currently available to accept orders';
COMMENT ON COLUMN public.chawp_delivery_personnel.rating IS 'Average customer rating out of 5';
COMMENT ON COLUMN public.chawp_delivery_personnel.current_location IS 'Current GPS location of delivery person';
