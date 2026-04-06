-- Fix RLS policy for delivery earnings auto-creation
-- Migration: fix_delivery_earnings_rls.sql
-- This allows the trigger to create earnings when delivery personnel complete orders

-- Drop the restrictive admin-only insert policy
DROP POLICY IF EXISTS "Admins can create earnings" ON public.chawp_delivery_earnings;

-- Create new insert policy that allows:
-- 1. Admins to manually create earnings
-- 2. System/trigger to auto-create earnings when the delivery personnel is updating their own order
CREATE POLICY "Allow earnings creation"
    ON public.chawp_delivery_earnings
    FOR INSERT
    WITH CHECK (
        -- Allow admins to create earnings
        EXISTS (
            SELECT 1 FROM public.chawp_user_profiles
            WHERE id = auth.uid()
            AND role IN ('super_admin', 'admin')
        )
        OR
        -- Allow system to create earnings for delivery personnel
        -- This allows the trigger to work when a delivery person updates their order
        delivery_personnel_id IN (
            SELECT id FROM public.chawp_delivery_personnel
            WHERE user_id = auth.uid()
        )
    );

-- Comments
COMMENT ON POLICY "Allow earnings creation" ON public.chawp_delivery_earnings IS 
'Allows admins and the system trigger to create earnings. The trigger creates earnings automatically when delivery personnel mark orders as delivered.';
