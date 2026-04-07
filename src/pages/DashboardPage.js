import React, { useState, useEffect, useMemo } from "react";
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
    readyForPickup: 0,
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
  }, [delivery?.delivery_id]);

  const loadDashboardData = async () => {
    if (!delivery?.delivery_id) {
      setLoading(false);
      return;
    }

    const [statsResult, earningsResult] = await Promise.all([
      fetchDeliveryStats(delivery.delivery_id),
      fetchEarningsStats(delivery.delivery_id),
    ]);

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

  const completionRate = useMemo(() => {
    const total =
      stats.totalDeliveries + stats.activeDeliveries + stats.readyForPickup;
    if (!total) return 0;
    return Math.round((stats.totalDeliveries / total) * 100);
  }, [stats]);

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
          {
            paddingTop:
              (Platform.OS === "android" ? StatusBar.currentHeight || 0 : 44) +
              spacing.md,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.welcome}>Dispatch Center</Text>
            <Text style={styles.name}>{delivery?.full_name || "Delivery"}</Text>
          </View>
          <View style={styles.ratingPill}>
            <Ionicons name="star" size={16} color={colors.warning} />
            <Text style={styles.ratingText}>{stats.rating.toFixed(1)}</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Ready for Pickup</Text>
          <Text style={styles.heroValue}>{stats.readyForPickup}</Text>
          <Text style={styles.heroSubtext}>
            Orders waiting for collection from vendor locations.
          </Text>
          <TouchableOpacity
            style={styles.heroButton}
            onPress={() => navigation.navigate("Orders")}
          >
            <Text style={styles.heroButtonText}>Open Orders Queue</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.availabilityCard}>
          <View style={styles.availabilityInfo}>
            <Ionicons
              name={
                delivery?.is_available ? "radio-button-on" : "radio-button-off"
              }
              size={18}
              color={
                delivery?.is_available ? colors.success : colors.textSecondary
              }
            />
            <View>
              <Text style={styles.availabilityTitle}>
                {delivery?.is_available ? "Online and receiving" : "Offline"}
              </Text>
              <Text style={styles.availabilitySubtitle}>
                Toggle to control new delivery assignment.
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

        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Today Delivered</Text>
            <Text style={styles.kpiValue}>{stats.todayDeliveries}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>In Transit</Text>
            <Text style={styles.kpiValue}>{stats.activeDeliveries}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Completion</Text>
            <Text style={styles.kpiValue}>{completionRate}%</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Total Delivered</Text>
            <Text style={styles.kpiValue}>{stats.totalDeliveries}</Text>
          </View>
        </View>

        <View style={styles.earningsCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Earnings Snapshot</Text>
            <Ionicons name="wallet-outline" size={18} color={colors.success} />
          </View>
          <View style={styles.earningRow}>
            <Text style={styles.earningLabel}>Today</Text>
            <Text style={styles.earningValue}>
              GH₵{earnings.today.toFixed(2)}
            </Text>
          </View>
          <View style={styles.earningRow}>
            <Text style={styles.earningLabel}>This Week</Text>
            <Text style={styles.earningValue}>
              GH₵{earnings.week.toFixed(2)}
            </Text>
          </View>
          <View style={styles.earningRow}>
            <Text style={styles.earningLabel}>This Month</Text>
            <Text style={styles.earningValue}>
              GH₵{earnings.month.toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate("Orders")}
            >
              <Ionicons name="list-outline" size={20} color={colors.primary} />
              <Text style={styles.actionText}>Orders</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate("Earnings")}
            >
              <Ionicons name="cash-outline" size={20} color={colors.accent} />
              <Text style={styles.actionText}>Earnings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate("Profile")}
            >
              <Ionicons name="person-outline" size={20} color={colors.info} />
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
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  welcome: {
    color: colors.textSecondary,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ratingText: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    padding: spacing.xl,
    ...shadows.md,
  },
  heroLabel: {
    color: colors.gray100,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroValue: {
    color: colors.white,
    fontSize: 48,
    fontWeight: "800",
    lineHeight: 52,
    marginTop: spacing.xs,
  },
  heroSubtext: {
    color: colors.gray100,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  heroButton: {
    marginTop: spacing.md,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
  },
  heroButtonText: {
    color: colors.white,
    fontWeight: "700",
  },
  availabilityCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  availabilityInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexShrink: 1,
  },
  availabilityTitle: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 15,
  },
  availabilitySubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  kpiCard: {
    width: "48%",
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  kpiLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  kpiValue: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
    marginTop: spacing.sm,
  },
  earningsCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  earningRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  earningLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  earningValue: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 15,
  },
  actionsCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  actionsGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
  },
  actionText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
});
