# ChawpDelivery - Comprehensive Delivery Personnel App

## Overview

ChawpDelivery is a complete mobile application for delivery personnel in the Chawp food delivery ecosystem. It provides real-time order management, earnings tracking, GPS navigation, and performance metrics.

## Features

### 1. Authentication & Authorization

- **Secure Login**: Email/password authentication via Supabase
- **Role-Based Access**: Only users with `role='delivery'` can access
- **Persistent Sessions**: AsyncStorage integration for auto-login
- **Profile Caching**: Instant app load with cached delivery profile

### 2. Dashboard

- **Availability Toggle**: Turn online/offline to receive orders
- **Real-Time Stats**:
  - Today's deliveries count
  - Total lifetime deliveries
  - Active deliveries in progress
  - Personal rating (out of 5 stars)
- **Earnings Summary**:
  - Today's earnings
  - This week's earnings
  - This month's earnings
  - All-time earnings
- **Quick Actions**: Navigate to Orders, Map, Earnings, Profile

### 3. Order Management

- **Available Orders**: View all orders ready for pickup
- **Accept Orders**: One-tap to accept and start delivery
- **Active Deliveries**: Track ongoing deliveries
- **Order Details**:
  - Vendor information (name, address, phone)
  - Customer information (name, address, phone)
  - Order items and total amount
  - Delivery instructions
- **Status Updates**:
  - `ready_for_pickup` → `picked_up` (accepted)
  - `picked_up` → `in_transit` (on the way)
  - `in_transit` → `delivered` (completed)
- **Delivery History**: View past completed deliveries

### 4. Earnings Tracking

- **Transaction History**: Complete list of all earnings
- **Earnings Breakdown**:
  - Delivery fee per order
  - Tips received
  - Bonuses and incentives
- **Payment Status**: Track pending vs. paid earnings
- **Analytics**:
  - Daily earnings chart
  - Weekly trends
  - Monthly summary
  - Best performing days/hours

### 5. Navigation & Location

- **GPS Tracking**: Real-time location updates
- **Route Optimization**: Best routes to vendor and customer
- **Map Integration**: React Native Maps with turn-by-turn navigation
- **Distance Calculation**: Accurate distance and ETA
- **Location Sharing**: Admin can track delivery progress

### 6. Profile Management

- **Personal Information**: Name, phone, email, address
- **Vehicle Details**: Type, registration number
- **Documents**: Driver's license, vehicle registration
- **Performance Metrics**:
  - Average rating
  - Total deliveries
  - On-time delivery rate
  - Customer satisfaction score
- **Availability Schedule**: Set working hours
- **Payment Details**: Bank account for earnings payout

### 7. Notifications

- **New Order Alerts**: Push notifications for available orders
- **Status Updates**: Notifications for order state changes
- **Earnings Updates**: Notification when payment is processed
- **Admin Messages**: Important announcements from admin
- **In-App Notifications**: Toast notifications with success/error states

### 8. Real-Time Features

- **Live Order Updates**: Supabase real-time subscriptions
- **Location Streaming**: Continuous GPS updates
- **Order Assignment**: Instant notification when admin assigns order
- **Customer Communication**: Call button to contact customer

## Technical Architecture

### Technology Stack

- **Framework**: React Native 0.74.1 + Expo 51.0.0
- **Navigation**: React Navigation 6.x (Bottom Tabs)
- **Backend**: Supabase (PostgreSQL + Real-time)
- **Authentication**: Supabase Auth with AsyncStorage
- **Maps**: React Native Maps
- **Location**: Expo Location
- **State Management**: React Context API
- **Storage**: AsyncStorage for persistence

### Project Structure

```
ChawpDelivery/
├── src/
│   ├── components/
│   │   ├── DeliveryAuthScreen.js    # Login screen
│   │   ├── Notification.js           # Toast notifications
│   │   ├── OrderCard.js              # Order display component
│   │   ├── MetricCard.js             # Dashboard stat card
│   │   └── EmptyState.js             # Empty state UI
│   ├── config/
│   │   └── supabase.js               # Supabase client config
│   ├── contexts/
│   │   ├── DeliveryAuthContext.js    # Authentication state
│   │   └── NotificationContext.js    # Notification management
│   ├── pages/
│   │   ├── DashboardPage.js          # Home dashboard
│   │   ├── OrdersPage.js             # Order management
│   │   ├── EarningsPage.js           # Earnings tracking
│   │   ├── MapPage.js                # Navigation & map
│   │   └── ProfilePage.js            # Profile settings
│   ├── services/
│   │   └── deliveryApi.js            # API functions
│   └── theme.js                      # App theme (teal/green)
├── migrations/
│   ├── create_delivery_personnel.sql
│   ├── create_delivery_earnings.sql
│   └── update_orders_for_delivery.sql
├── App.js                            # Main app component
├── index.js                          # Entry point
├── package.json                      # Dependencies
└── README.md                         # This file
```

### Database Schema

#### chawp_delivery_personnel

```sql
CREATE TABLE chawp_delivery_personnel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users UNIQUE,
  vehicle_type VARCHAR(50), -- 'bicycle', 'motorcycle', 'car'
  vehicle_registration VARCHAR(50),
  is_available BOOLEAN DEFAULT FALSE,
  rating DECIMAL(3,2) DEFAULT 0.00,
  total_deliveries INTEGER DEFAULT 0,
  current_location GEOGRAPHY(POINT),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### chawp_delivery_earnings

```sql
CREATE TABLE chawp_delivery_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_personnel_id UUID REFERENCES chawp_delivery_personnel,
  order_id UUID REFERENCES chawp_orders,
  amount DECIMAL(10,2) NOT NULL,
  type VARCHAR(50) DEFAULT 'delivery_fee', -- 'delivery_fee', 'tip', 'bonus'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid'
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);
```

#### chawp_orders (updated fields)

```sql
ALTER TABLE chawp_orders ADD COLUMN delivery_personnel_id UUID REFERENCES chawp_delivery_personnel;
ALTER TABLE chawp_orders ADD COLUMN picked_up_at TIMESTAMPTZ;
ALTER TABLE chawp_orders ADD COLUMN in_transit_at TIMESTAMPTZ;
ALTER TABLE chawp_orders ADD COLUMN delivered_at TIMESTAMPTZ;
ALTER TABLE chawp_orders ADD COLUMN delivery_fee DECIMAL(10,2) DEFAULT 5.00;
ALTER TABLE chawp_orders ADD COLUMN delivery_distance DECIMAL(10,2); -- in kilometers
```

## API Functions

### Authentication

- `signIn(email, password)` - Login delivery personnel
- `signOut()` - Logout and clear cache
- `updateAvailability(isAvailable)` - Toggle online/offline status
- `updateLocation(latitude, longitude)` - Update current GPS location

### Order Management

- `fetchAvailableOrders()` - Get orders ready for pickup (not assigned)
- `fetchMyDeliveries()` - Get active deliveries (picked_up, in_transit)
- `fetchDeliveryHistory(limit)` - Get completed deliveries
- `acceptOrder(orderId, deliveryId)` - Accept and assign order
- `updateOrderStatus(orderId, status, data)` - Update order progress

### Earnings

- `fetchEarnings(deliveryId, startDate, endDate)` - Get earnings transactions
- `fetchEarningsStats(deliveryId)` - Get earnings summary (today, week, month, total)

### Statistics

- `fetchDeliveryStats(deliveryId)` - Get delivery metrics
  - Total deliveries
  - Today's deliveries
  - Active deliveries
  - Personal rating

### Profile

- `updateDeliveryProfile(deliveryId, updates)` - Update vehicle, availability, etc.
- `updateUserProfile(userId, updates)` - Update personal information

## User Flow

### 1. Login

```
Enter Email & Password → Verify role='delivery' → Load Profile → Dashboard
```

### 2. Go Online

```
Dashboard → Toggle Availability ON → Receive Order Notifications
```

### 3. Accept Order

```
Orders Tab → View Available Orders → Tap "Accept" → Order Assigned
```

### 4. Complete Delivery

```
View Order Details → Navigate to Vendor → Pick Up Order →
Navigate to Customer → Deliver Order → Mark as Delivered → Earn Money
```

### 5. Track Earnings

```
Earnings Tab → View Today/Week/Month → See Transaction History
```

## Order Status Flow

```
ready_for_pickup (Vendor marks ready)
    ↓
picked_up (Delivery person accepts & picks up)
    ↓
in_transit (Delivery person on the way to customer)
    ↓
delivered (Order completed, earnings recorded)
```

## Notification Types

### Push Notifications (Future Enhancement)

- New order available in your area
- Order assigned by admin
- Customer called you
- Earnings payment processed
- Rating received from customer

### In-App Notifications

- Success: Order accepted, status updated, etc.
- Error: Failed to accept order, network error, etc.
- Info: Tips, best routes, peak hours, etc.

## Performance Metrics

### Tracked Metrics

- **Acceptance Rate**: Orders accepted / Orders offered
- **Completion Rate**: Deliveries completed / Deliveries started
- **Average Delivery Time**: Time from pickup to delivery
- **On-Time Rate**: Deliveries within estimated time
- **Customer Rating**: Average rating from customers
- **Earnings Per Hour**: Total earnings / Hours worked

### Rating System

- Customers rate delivery experience (1-5 stars)
- Rating affects future order assignments
- High-rated delivery personnel get priority
- Rating displayed on dashboard

## Location Tracking

### GPS Features

- **Real-Time Tracking**: Location updated every 30 seconds
- **Route Optimization**: Suggests fastest route
- **Distance Calculation**: Accurate distance to vendor/customer
- **ETA Estimation**: Estimated time of arrival
- **Location History**: Track routes taken
- **Battery Optimization**: Efficient GPS usage

### Privacy

- Location only tracked when on active delivery
- Customer sees delivery person location during delivery
- Location data deleted after delivery completion

## Payment & Earnings

### Earning Structure

- **Base Delivery Fee**: GH₵5.00 per delivery
- **Distance Bonus**: GH₵2.00 per additional km
- **Tips**: Customer can add tip
- **Peak Hour Bonus**: 1.5x during rush hours
- **Completion Bonus**: Extra GH₵10 after 10 deliveries in a day

### Payout Schedule

- **Daily Payouts**: Available for high-performing delivery personnel
- **Weekly Payouts**: Standard schedule (paid every Monday)
- **Monthly Payouts**: Minimum GH₵50.00 threshold
- **Payment Methods**: Bank transfer, Mobile money (MTN, Vodafone, AirtelTigo)

## Security Features

### Authentication Security

- Secure password hashing (Supabase Auth)
- JWT token-based sessions
- Auto-refresh tokens
- Session timeout after 7 days of inactivity

### Data Security

- Row Level Security (RLS) policies
- Delivery personnel can only see their own data
- Admins can view all delivery data
- Encrypted data transmission (HTTPS)

### Privacy Protection

- Customer phone numbers masked until order accepted
- Customer addresses masked until order accepted
- Location data encrypted
- Personal documents stored securely

## Future Enhancements

### Phase 2 Features

- [ ] Chat with customer in-app
- [ ] Photo proof of delivery
- [ ] Digital signature collection
- [ ] Cash collection tracking
- [ ] Multi-language support
- [ ] Dark/light theme toggle

### Phase 3 Features

- [ ] Voice navigation
- [ ] Offline mode for viewing active deliveries
- [ ] Route history and analytics
- [ ] Gamification (badges, achievements)
- [ ] Referral program for recruiting new delivery personnel
- [ ] Weekly leaderboard

## Installation & Setup

### Prerequisites

- Node.js 16+ installed
- Expo CLI installed (`npm install -g expo-cli`)
- Android Studio or Xcode for testing
- Supabase project created

### Steps

1. **Clone and Install**

   ```bash
   cd ChawpDelivery
   npm install
   ```

2. **Configure Supabase**
   Update `src/config/supabase.js`:

   ```javascript
   const supabaseUrl = "YOUR_SUPABASE_URL";
   const supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY";
   ```

3. **Run Migrations**
   Execute SQL files in `migrations/` folder in Supabase SQL Editor

4. **Start App**

   ```bash
   npm start
   ```

5. **Test**
   - Scan QR code with Expo Go app
   - Or run on emulator: `npm run android` / `npm run ios`

## Testing

### Test Accounts

Create test delivery personnel:

```sql
-- Create user
INSERT INTO auth.users (email) VALUES ('delivery@test.com');

-- Create profile
INSERT INTO chawp_user_profiles (id, email, role, full_name, phone)
VALUES (auth.uid(), 'delivery@test.com', 'delivery', 'Test Delivery', '0244123456');

-- Create delivery personnel
INSERT INTO chawp_delivery_personnel (user_id, vehicle_type, vehicle_registration)
VALUES (auth.uid(), 'motorcycle', 'GH-1234-20');
```

### Test Scenarios

1. Login with delivery account
2. Toggle availability to online
3. Create test order in admin panel
4. Accept order in delivery app
5. Update status to in_transit
6. Mark as delivered
7. Check earnings added

## Troubleshooting

### Common Issues

**Login fails with "Not authorized"**

- Verify user has `role='delivery'` in chawp_user_profiles
- Check delivery_personnel record exists

**Orders not showing**

- Verify orders have status `ready_for_pickup`
- Check RLS policies allow delivery personnel to view orders

**Location not updating**

- Enable location permissions in device settings
- Check GPS is enabled
- Verify Expo Location permissions in app.json

**Earnings not calculating**

- Check chawp_delivery_earnings table exists
- Verify delivery_fee is set on orders
- Check RLS policies

## Support

For issues or questions:

- Check documentation in `docs/` folder
- Review database migrations
- Contact admin team

## License

Proprietary - Chawp Food Delivery Platform
