import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Platform,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii } from "../theme";
import { useDeliveryAuth } from "../contexts/DeliveryAuthContext";
import {
  fetchEarningsStats,
  fetchEarnings,
  fetchPendingEarnings,
  fetchPaidEarnings,
} from "../services/deliveryApi";

export default function EarningsPage() {
  const { delivery } = useDeliveryAuth();
  const [stats, setStats] = useState({
    today: 0,
    week: 0,
    month: 0,
    total: 0,
    pending: 0,
    paid: 0,
  });
  const [earnings, setEarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState("all"); // all, pending, paid

  useEffect(() => {
    if (delivery?.delivery_id) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [filterType, delivery?.delivery_id]);

  const loadData = async () => {
    if (!delivery?.delivery_id) {
      setLoading(false);
      return;
    }

    // Load stats
    const statsResult = await fetchEarningsStats(delivery.delivery_id);
    if (statsResult.success) {
      setStats(statsResult.data);
    }

    // Load earnings based on filter
    let earningsResult;
    if (filterType === "pending") {
      earningsResult = await fetchPendingEarnings(delivery.delivery_id);
    } else if (filterType === "paid") {
      earningsResult = await fetchPaidEarnings(delivery.delivery_id);
    } else {
      earningsResult = await fetchEarnings(delivery.delivery_id);
    }

    if (earningsResult.success) {
      setEarnings(earningsResult.data);
    }

    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getEarningStatusColor = (status) => {
    switch (status) {
      case "paid":
        return colors.success;
      case "pending":
        return colors.warning;
      case "cancelled":
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  const getEarningTypeIcon = (type) => {
    switch (type) {
      case "delivery_fee":
        return "bicycle";
      case "tip":
        return "gift";
      case "bonus":
        return "star";
      case "incentive":
        return "trophy";
      default:
        return "cash";
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight : 44) + spacing.md }
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {/* Stats Summary */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Today</Text>
            <Text style={styles.statValue}>GH₵{stats.today.toFixed(2)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>This Week</Text>
            <Text style={styles.statValue}>GH₵{stats.week.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>This Month</Text>
            <Text style={styles.statValue}>GH₵{stats.month.toFixed(2)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={styles.statValue}>GH₵{stats.total.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.statCardPending]}>
            <Text style={styles.statLabel}>Pending</Text>
            <Text style={[styles.statValue, { color: colors.warning }]}>
              GH₵{stats.pending.toFixed(2)}
            </Text>
          </View>
          <View style={[styles.statCard, styles.statCardPaid]}>
            <Text style={styles.statLabel}>Paid</Text>
            <Text style={[styles.statValue, { color: colors.success }]}>
              GH₵{stats.paid.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterType === "all" && styles.filterButtonActive,
            ]}
            onPress={() => setFilterType("all")}>
            <Text
              style={[
                styles.filterText,
                filterType === "all" && styles.filterTextActive,
              ]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterType === "pending" && styles.filterButtonActive,
            ]}
            onPress={() => setFilterType("pending")}>
            <Text
              style={[
                styles.filterText,
                filterType === "pending" && styles.filterTextActive,
              ]}>
              Pending
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterType === "paid" && styles.filterButtonActive,
            ]}
            onPress={() => setFilterType("paid")}>
            <Text
              style={[
                styles.filterText,
                filterType === "paid" && styles.filterTextActive,
              ]}>
              Paid
            </Text>
          </TouchableOpacity>
        </View>

        {/* Earnings List */}
        <Text style={styles.sectionTitle}>
          {filterType === "all"
            ? "All Earnings"
            : filterType === "pending"
            ? "Pending Payouts"
            : "Paid Earnings"}
        </Text>

        {earnings.length > 0 ? (
          earnings.map((earning) => (
            <View key={earning.id} style={styles.earningCard}>
              <View style={styles.earningHeader}>
                <View style={styles.earningIconContainer}>
                  <Ionicons
                    name={getEarningTypeIcon(earning.type)}
                    size={24}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.earningInfo}>
                  <Text style={styles.earningType}>
                    {earning.type.replace("_", " ")}
                  </Text>
                  {earning.description && (
                    <Text style={styles.earningDescription}>
                      {earning.description}
                    </Text>
                  )}
                  <Text style={styles.earningDate}>
                    {new Date(earning.earned_at).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.earningRight}>
                  <Text style={styles.earningAmount}>
                    GH₵{parseFloat(earning.amount).toFixed(2)}
                  </Text>
                  <View
                    style={[
                      styles.earningStatusBadge,
                      {
                        backgroundColor:
                          getEarningStatusColor(earning.status) + "20",
                      },
                    ]}>
                    <Text
                      style={[
                        styles.earningStatusText,
                        { color: getEarningStatusColor(earning.status) },
                      ]}>
                      {earning.status}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons
              name="cash-outline"
              size={60}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyText}>No {filterType} earnings yet</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
  },
  content: {
    padding: spacing.md,
  },
  statsContainer: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statCardPending: {
    borderColor: colors.warning + "40",
    backgroundColor: colors.warning + "10",
  },
  statCardPaid: {
    borderColor: colors.success + "40",
    backgroundColor: colors.success + "10",
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.primary,
  },
  filterContainer: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  filterButton: {
    flex: 1,
    backgroundColor: colors.card,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  filterTextActive: {
    color: colors.white,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  earningCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  earningHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  earningIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  earningInfo: {
    flex: 1,
  },
  earningType: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    textTransform: "capitalize",
    marginBottom: spacing.xs / 2,
  },
  earningDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
  },
  earningDate: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  earningRight: {
    alignItems: "flex-end",
  },
  earningAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  earningStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radii.xs,
  },
  earningStatusText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.md,
  },
});
