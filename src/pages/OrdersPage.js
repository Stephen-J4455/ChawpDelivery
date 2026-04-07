import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Platform,
  StatusBar,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, shadows } from "../theme";
import { useDeliveryAuth } from "../contexts/DeliveryAuthContext";
import { fetchMyDeliveries, updateOrderStatus } from "../services/deliveryApi";
import { useNotification } from "../contexts/NotificationContext";

const READY_STATUSES = ["ready", "ready_for_pickup"];
const ACTIVE_STATUSES = ["picked_up", "in_transit", "out_for_delivery"];

export default function OrdersPage() {
  const { delivery } = useDeliveryAuth();
  const { showSuccess, showError } = useNotification();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    if (delivery?.delivery_id) {
      loadOrders();
    } else {
      setLoading(false);
    }
  }, [delivery?.delivery_id]);

  const loadOrders = async () => {
    if (!delivery?.delivery_id) {
      setLoading(false);
      return;
    }

    const result = await fetchMyDeliveries(delivery.delivery_id);
    if (result.success) {
      setOrders(result.data || []);
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setModalVisible(true);
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    setUpdatingStatus(true);
    const result = await updateOrderStatus(orderId, newStatus);

    if (result.success) {
      await loadOrders();
      setModalVisible(false);
      showSuccess(`Order marked as ${newStatus.replaceAll("_", " ")}`);
    } else {
      showError(result.error || "Failed to update order");
    }

    setUpdatingStatus(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return colors.textSecondary;
      case "confirmed":
        return colors.info || "#0EA5E9";
      case "preparing":
        return colors.warning;
      case "ready":
      case "ready_for_pickup":
        return colors.primary;
      case "picked_up":
        return "#3B82F6";
      case "in_transit":
      case "out_for_delivery":
        return "#8B5CF6";
      case "delivered":
        return colors.success;
      default:
        return colors.textSecondary;
    }
  };

  const getNextStatus = (currentStatus) => {
    const statusFlow = {
      pending: null,
      confirmed: null,
      preparing: null,
      ready: "picked_up",
      ready_for_pickup: "picked_up",
      picked_up: "out_for_delivery",
      in_transit: "delivered",
      out_for_delivery: "delivered",
    };
    return statusFlow[currentStatus];
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: "Pending",
      confirmed: "Confirmed",
      preparing: "Preparing",
      ready: "Ready for Pickup",
      ready_for_pickup: "Ready for Pickup",
      picked_up: "Picked Up",
      in_transit: "In Transit",
      out_for_delivery: "Out for Delivery",
      delivered: "Delivered",
    };
    return labels[status] || status;
  };

  const getNextStatusLabel = (currentStatus) => {
    const labels = {
      ready: "Mark as Picked Up",
      ready_for_pickup: "Mark as Picked Up",
      picked_up: "Mark Out for Delivery",
      in_transit: "Mark as Delivered",
      out_for_delivery: "Mark as Delivered",
    };
    return labels[currentStatus] || "Update Status";
  };

  const formatSizeLabel = (size) => {
    const normalized = String(size || "")
      .trim()
      .toLowerCase();
    if (!normalized) return null;

    return normalized
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  };

  const summary = useMemo(() => {
    const readyCount = orders.filter((order) =>
      READY_STATUSES.includes(order.status),
    ).length;
    const activeCount = orders.filter((order) =>
      ACTIVE_STATUSES.includes(order.status),
    ).length;

    return {
      total: orders.length,
      ready: readyCount,
      active: activeCount,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (activeFilter === "ready") {
      return orders.filter((order) => READY_STATUSES.includes(order.status));
    }

    if (activeFilter === "active") {
      return orders.filter((order) => ACTIVE_STATUSES.includes(order.status));
    }

    return orders;
  }, [orders, activeFilter]);

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
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View
          style={{
            paddingTop:
              (Platform.OS === "android" ? StatusBar.currentHeight || 0 : 44) +
              spacing.md,
          }}
        >
          <View style={styles.headerCard}>
            <Text style={styles.headerTitle}>Order Queue</Text>
            <Text style={styles.headerSubTitle}>Manage pickups and drop-offs</Text>
            <View style={styles.readyPill}>
              <Ionicons name="bag-check-outline" size={14} color={colors.white} />
              <Text style={styles.readyPillText}>
                {summary.ready} Ready for Pickup
              </Text>
            </View>
          </View>

          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                activeFilter === "all" && styles.filterChipActive,
              ]}
              onPress={() => setActiveFilter("all")}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === "all" && styles.filterTextActive,
                ]}
              >
                All ({summary.total})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                activeFilter === "ready" && styles.filterChipActive,
              ]}
              onPress={() => setActiveFilter("ready")}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === "ready" && styles.filterTextActive,
                ]}
              >
                Ready ({summary.ready})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                activeFilter === "active" && styles.filterChipActive,
              ]}
              onPress={() => setActiveFilter("active")}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === "active" && styles.filterTextActive,
                ]}
              >
                In Transit ({summary.active})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => (
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
              onPress={() => handleViewOrder(order)}
            >
              <View style={styles.orderHeader}>
                <Text style={styles.orderVendor}>
                  {order.chawp_vendors?.name || "Unknown Vendor"}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: `${getStatusColor(order.status)}20` },
                  ]}
                >
                  <Text
                    style={[styles.statusText, { color: getStatusColor(order.status) }]}
                  >
                    {getStatusLabel(order.status)}
                  </Text>
                </View>
              </View>

              <Text style={styles.orderMeta}>
                {order.chawp_user_profiles?.full_name || "Customer"}
              </Text>
              <Text style={styles.orderMeta}>{order.delivery_address}</Text>
              {order.chawp_user_profiles?.phone ? (
                <Text style={styles.orderMeta}>{order.chawp_user_profiles.phone}</Text>
              ) : null}

              {order.order_items?.length > 0 ? (
                <View style={styles.orderItemsPreview}>
                  {order.order_items.slice(0, 2).map((item) => {
                    const itemImage =
                      item.meal_image ||
                      item.meal?.image ||
                      (Array.isArray(item.meal?.images) ? item.meal.images[0] : null);

                    return (
                      <View key={item.id} style={styles.orderItemPreviewRow}>
                        {itemImage ? (
                          <Image
                            source={{ uri: itemImage }}
                            style={styles.orderItemPreviewImage}
                          />
                        ) : null}
                        <Text style={styles.orderItemPreviewText} numberOfLines={1}>
                          {item.meal?.title || "Item"} x{item.quantity}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}

              <View style={styles.orderFooter}>
                <Text style={styles.orderAmount}>
                  GH₵{parseFloat(order.total_amount || 0).toFixed(2)}
                </Text>
                <Text style={styles.orderDate}>
                  {new Date(order.created_at).toLocaleString()}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="list-outline" size={70} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No matching orders</Text>
            <Text style={styles.emptyText}>
              Switch filters or pull down to refresh.
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Order Details</Text>

            {selectedOrder ? (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View
                    style={[
                      styles.statusBadgeLarge,
                      {
                        backgroundColor:
                          `${getStatusColor(selectedOrder.status)}20`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusTextLarge,
                        { color: getStatusColor(selectedOrder.status) },
                      ]}
                    >
                      {getStatusLabel(selectedOrder.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Vendor</Text>
                  <Text style={styles.detailValue}>
                    {selectedOrder.chawp_vendors?.name || "Unknown"}
                  </Text>
                  {selectedOrder.chawp_vendors?.address ? (
                    <Text style={styles.detailSubValue}>
                      {selectedOrder.chawp_vendors.address}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Customer</Text>
                  <Text style={styles.detailValue}>
                    {selectedOrder.chawp_user_profiles?.full_name || "Unknown"}
                  </Text>
                  {selectedOrder.chawp_user_profiles?.phone ? (
                    <Text style={styles.detailSubValue}>
                      {selectedOrder.chawp_user_profiles.phone}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Delivery Address</Text>
                  <Text style={styles.detailValue}>{selectedOrder.delivery_address}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Items</Text>
                  {selectedOrder.order_items?.length > 0 ? (
                    selectedOrder.order_items.map((item) => {
                      const itemImage =
                        item.meal_image ||
                        item.meal?.image ||
                        (Array.isArray(item.meal?.images)
                          ? item.meal.images[0]
                          : null);
                      const sizeLabel = formatSizeLabel(item.selected_size);
                      const specs = Array.isArray(item.selected_specifications)
                        ? item.selected_specifications.filter(Boolean)
                        : [];

                      return (
                        <View key={item.id} style={styles.orderItemDetailRow}>
                          {itemImage ? (
                            <Image
                              source={{ uri: itemImage }}
                              style={styles.orderItemDetailImage}
                            />
                          ) : null}
                          <View style={styles.orderItemDetailInfo}>
                            <Text style={styles.orderItemDetailTitle}>
                              {item.meal?.title || "Item"} x{item.quantity}
                            </Text>
                            {sizeLabel ? (
                              <Text style={styles.orderItemDetailMeta}>
                                Size: {sizeLabel}
                              </Text>
                            ) : null}
                            {specs.length > 0 ? (
                              <Text style={styles.orderItemDetailMeta}>
                                Specs: {specs.join(", ")}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.detailValue}>No item details</Text>
                  )}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Order Amount</Text>
                  <Text style={[styles.detailValue, styles.amountText]}>
                    GH₵{parseFloat(selectedOrder.total_amount || 0).toFixed(2)}
                  </Text>
                </View>

                {getNextStatus(selectedOrder.status) ? (
                  <TouchableOpacity
                    style={styles.updateButton}
                    onPress={() =>
                      handleUpdateStatus(
                        selectedOrder.id,
                        getNextStatus(selectedOrder.status),
                      )
                    }
                    disabled={updatingStatus}
                  >
                    {updatingStatus ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <Text style={styles.updateButtonText}>
                        {getNextStatusLabel(selectedOrder.status)}
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : null}
              </ScrollView>
            ) : null}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingBottom: spacing.xxxl,
  },
  headerCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.sm,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
  },
  headerSubTitle: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  readyPill: {
    marginTop: spacing.md,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  readyPillText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 12,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
  },
  filterChipActive: {
    backgroundColor: `${colors.primary}20`,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  filterTextActive: {
    color: colors.primary,
  },
  orderCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  orderVendor: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  orderMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  orderItemsPreview: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  orderItemPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  orderItemPreviewImage: {
    width: 26,
    height: 26,
    borderRadius: radii.sm,
    backgroundColor: colors.border,
  },
  orderItemPreviewText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
  },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  orderAmount: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.primary,
  },
  orderDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyState: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    padding: spacing.xl,
    maxHeight: "90%",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  modalBody: {
    maxHeight: 500,
  },
  detailSection: {
    marginBottom: spacing.lg,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
  },
  detailValue: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  detailSubValue: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 3,
  },
  statusBadgeLarge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    alignSelf: "flex-start",
  },
  statusTextLarge: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  amountText: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.primary,
  },
  orderItemDetailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  orderItemDetailImage: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    backgroundColor: colors.border,
  },
  orderItemDetailInfo: {
    flex: 1,
  },
  orderItemDetailTitle: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  orderItemDetailMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  updateButton: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: radii.md,
    alignItems: "center",
    marginTop: spacing.md,
  },
  updateButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  closeButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    borderRadius: radii.md,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  closeButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
});
