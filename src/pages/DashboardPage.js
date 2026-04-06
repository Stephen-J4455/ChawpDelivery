import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Platform,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors, spacing, radii, shadows } from "../theme";
import { useDeliveryAuth } from "../contexts/DeliveryAuthContext";
import { useNotification } from "../contexts/NotificationContext";
import {
  fetchDeliveryStats,
  fetchEarningsStats,
} from "../services/deliveryApi";

export default function DashboardPage() {
  const navigation = useNavigation();
  const { delivery, updateAvailability } = useDeliveryAuth();
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalDeliveries: 0,
    todayDeliveries: 0,
    activeDeliveries: 0,
    rating: 0,
  });
  const [earnings, setEarnings] = useState({
    today: 0,
    week: 0,
    month: 0,
    total: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, [delivery]);

  const loadDashboardData = async () => {
    if (!delivery?.delivery_id) return;

    const statsResult = await fetchDeliveryStats(delivery.delivery_id);
    const earningsResult = await fetchEarningsStats(delivery.delivery_id);

    if (statsResult.success) {
      setStats(statsResult.data);
    }
    if (earningsResult.success) {
      setEarnings(earningsResult.data);
    }

    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleAvailabilityToggle = async (value) => {
    const result = await updateAvailability(value);
    if (result.success) {
      showSuccess(value ? "You are now available" : "You are now offline");
    } else {
      showError(result.error || "Failed to update availability");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight : 44) + spacing.md }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.name}>{delivery?.full_name || "Delivery"}</Text>
          </View>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={20} color={colors.warning} />
            <Text style={styles.ratingText}>{stats.rating.toFixed(1)}</Text>
          </View>
        </View>

        {/* Availability Toggle */}
        <View style={styles.availabilityCard}>
          <View style={styles.availabilityInfo}>
            <Ionicons
              name={
                delivery?.is_available ? "checkmark-circle" : "close-circle"
              }
              size={24}
              color={delivery?.is_available ? colors.success : colors.error}
            />
            <View style={styles.availabilityText}>
              <Text style={styles.availabilityTitle}>
                {delivery?.is_available ? "Available for Orders" : "Offline"}
              </Text>
              <Text style={styles.availabilitySubtitle}>
                {delivery?.is_available
                  ? "You can receive new orders"
                  : "Turn on to receive orders"}
              </Text>
            </View>
          </View>
          <Switch
            value={delivery?.is_available || false}
            onValueChange={handleAvailabilityToggle}
            trackColor={{ false: colors.gray600, true: colors.success }}
            thumbColor={colors.white}
          />
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View
            style={[
              styles.statCard,
              { backgroundColor: colors.primary + "20" },
            ]}>
            <Ionicons name="bicycle" size={32} color={colors.primary} />
            <Text style={styles.statValue}>{stats.todayDeliveries}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View
            style={[
              styles.statCard,
              { backgroundColor: colors.secondary + "20" },
            ]}>
            <Ionicons
              name="checkmark-done"
              size={32}
              color={colors.secondary}
            />
            <Text style={styles.statValue}>{stats.totalDeliveries}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View
            style={[
              styles.statCard,
              { backgroundColor: colors.warning + "20" },
            ]}>
            <Ionicons name="time" size={32} color={colors.warning} />
            <Text style={styles.statValue}>{stats.activeDeliveries}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </View>

        {/* Earnings Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Earnings</Text>
            <Ionicons name="cash-outline" size={24} color={colors.success} />
          </View>
          <View style={styles.earningsGrid}>
            <View style={styles.earningItem}>
              <Text style={styles.earningLabel}>Today</Text>
              <Text style={styles.earningValue}>
                GH₵{earnings.today.toFixed(2)}
              </Text>
            </View>
            <View style={styles.earningItem}>
              <Text style={styles.earningLabel}>This Week</Text>
              <Text style={styles.earningValue}>
                GH₵{earnings.week.toFixed(2)}
              </Text>
            </View>
            <View style={styles.earningItem}>
              <Text style={styles.earningLabel}>This Month</Text>
              <Text style={styles.earningValue}>
                GH₵{earnings.month.toFixed(2)}
              </Text>
            </View>
            <View style={styles.earningItem}>
              <Text style={styles.earningLabel}>All Time</Text>
              <Text style={[styles.earningValue, { color: colors.success }]}>
                GH₵{earnings.total.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("Orders")}>
              <Ionicons name="list-outline" size={24} color={colors.primary} />
              <Text style={styles.actionText}>View Orders</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => showSuccess('Navigation feature coming soon!')}>
              <Ionicons
                name="location-outline"
                size={24}
                color={colors.secondary}
              />
              <Text style={styles.actionText}>Navigation</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("Earnings")}>
              <Ionicons
                name="stats-chart-outline"
                size={24}
                color={colors.warning}
              />
              <Text style={styles.actionText}>Earnings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("Profile")}>
              <Ionicons name="person-outline" size={24} color={colors.info} />
              <Text style={styles.actionText}>Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  greeting: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    gap: spacing.xs,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  availabilityCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    padding: spacing.lg,
    borderRadius: radii.md,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  availabilityInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  availabilityText: {
    flex: 1,
  },
  availabilityTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  availabilitySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  statsGrid: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    padding: spacing.lg,
    borderRadius: radii.md,
    ...shadows.sm,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  earningsGrid: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.lg,
    ...shadows.md,
  },
  earningItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  earningLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  earningValue: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: colors.card,
    padding: spacing.lg,
    borderRadius: radii.md,
    alignItems: "center",
    gap: spacing.sm,
    ...shadows.sm,
  },
  actionText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: "500",
  },
});
