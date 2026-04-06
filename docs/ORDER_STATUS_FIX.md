# Order Status Check Constraint Error Fix

## Problem

The ChawpDelivery app was encountering this error:

```
ERROR Error updating order status: {
  "code": "23514",
  "details": null,
  "hint": null,
  "message": "new row for relation \"chawp_orders\" violates check constraint \"chawp_orders_status_check\""
}
```

## Root Cause

The `chawp_orders` table has a CHECK constraint that only allowed these status values:

- 'pending'
- 'confirmed'
- 'preparing'
- 'ready'
- 'out_for_delivery'
- 'delivered'
- 'cancelled'

However, the ChawpDelivery app code was trying to use these new statuses:

- **'picked_up'** - When delivery person picks up order from vendor
- **'in_transit'** - When delivery person is en route to customer
- **'ready_for_pickup'** - When order is ready for delivery person to collect

These new statuses were NOT in the original CHECK constraint.

## Solution

The migration file `update_orders_for_delivery.sql` has been updated to:

1. **Drop the old constraint:**

   ```sql
   ALTER TABLE public.chawp_orders
   DROP CONSTRAINT IF EXISTS chawp_orders_status_check;
   ```

2. **Add new constraint with delivery statuses:**
   ```sql
   ALTER TABLE public.chawp_orders
   ADD CONSTRAINT chawp_orders_status_check
   CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'ready_for_pickup', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled'));
   ```

## Status Flow for Delivery

The complete order status flow is now:

1. **pending** - Order placed
2. **confirmed** - Vendor confirms order
3. **preparing** - Vendor is preparing the food
4. **ready** or **ready_for_pickup** - Order ready for pickup
5. **picked_up** - Delivery person collected order
6. **in_transit** or **out_for_delivery** - On the way to customer
7. **delivered** - Order delivered successfully
8. **cancelled** - Order cancelled (can happen at any stage)

## How to Apply

Run the updated migration file in your Supabase database:

```bash
psql -h your-supabase-host -U postgres -d postgres -f migrations/update_orders_for_delivery.sql
```

Or run it directly in the Supabase SQL Editor.

## Notes
- The migration now uses `DROP IF EXISTS` for triggers and policies to make it idempotent (can be run multiple times safely)
- This ensures the migration won't fail if it's run again on the same database
