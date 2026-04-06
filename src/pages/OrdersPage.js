import React, { useEffect, useState } from "react";
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
import { colors, spacing, radii } from "../theme";
import { useDeliveryAuth } from "../contexts/DeliveryAuthContext";
import { fetchMyDeliveries, updateOrderStatus } from "../services/deliveryApi";
import { useNotification } from "../contexts/NotificationContext";

export default function OrdersPage() {
  const { delivery } = useDeliveryAuth();
  const { showSuccess, showError } = useNotification();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

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
      setOrders(result.data);
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
      showSuccess("Success", `Order marked as ${newStatus.replace("_", " ")}`);
    } else {
      showError("Error", result.error || "Failed to update order");
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
        return colors.primary;
      case "ready_for_pickup":
        return colors.primary;
      case "picked_up":
        return "#3B82F6";
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
      preparing: null, // Wait for vendor to mark ready
      ready: "picked_up",
      ready_for_pickup: "picked_up",
      picked_up: "out_for_delivery",
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
      picked_up: "Mark In Transit",
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
        contentContainerStyle={[
          orders.length === 0 ? styles.emptyContent : styles.content,
          {
            paddingTop:
              (Platform.OS === "android" ? StatusBar.currentHeight : 44) +
              spacing.md,
          },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {orders.length > 0 ? (
          orders.map((order) => (
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
                    { backgroundColor: getStatusColor(order.status) + "20" },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(order.status) },
                    ]}
                  >
                    {getStatusLabel(order.status)}
                  </Text>
                </View>
              </View>

              <Text style={styles.orderCustomer}>
                👤 {order.chawp_user_profiles?.full_name || "Customer"}
              </Text>
              <Text style={styles.orderAddress}>
                📍 {order.delivery_address}
              </Text>
              {order.chawp_user_profiles?.phone && (
                <Text style={styles.orderPhone}>
                  📞 {order.chawp_user_profiles.phone}
                </Text>
              )}

              {order.order_items?.length > 0 && (
                <View style={styles.orderItemsPreview}>
                  {order.order_items.slice(0, 2).map((item) => {
                    const itemImage =
                      item.meal_image ||
                      item.meal?.image ||
                      (Array.isArray(item.meal?.images)
                        ? item.meal.images[0]
                        : null);
                    return (
                      <View key={item.id} style={styles.orderItemPreviewRow}>
                        {itemImage ? (
                          <Image
                            source={{ uri: itemImage }}
                            style={styles.orderItemPreviewImage}
                          />
                        ) : null}
                        <Text
                          style={styles.orderItemPreviewText}
                          numberOfLines={1}
                        >
                          {item.meal?.title || "Item"} x{item.quantity}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

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
            <Ionicons
              name="list-outline"
              size={80}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyTitle}>No Orders Yet</Text>
            <Text style={styles.emptyText}>
              Orders assigned to you will appear here
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Order Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Order Details</Text>

            {selectedOrder && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View
                    style={[
                      styles.statusBadgeLarge,
                      {
                        backgroundColor:
                          getStatusColor(selectedOrder.status) + "20",
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
                  {selectedOrder.chawp_vendors?.address && (
                    <Text style={styles.detailSubValue}>
                      📍 {selectedOrder.chawp_vendors.address}
                    </Text>
                  )}
                  {selectedOrder.chawp_vendors?.phone && (
                    <Text style={styles.detailSubValue}>
                      📞 {selectedOrder.chawp_vendors.phone}
                    </Text>
                  )}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Customer</Text>
                  <Text style={styles.detailValue}>
                    {selectedOrder.chawp_user_profiles?.full_name || "Unknown"}
                  </Text>
                  {selectedOrder.chawp_user_profiles?.phone && (
                    <Text style={styles.detailSubValue}>
                      📞 {selectedOrder.chawp_user_profiles.phone}
                    </Text>
                  )}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Delivery Address</Text>
                  <Text style={styles.detailValue}>
                    {selectedOrder.delivery_address}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Order Amount</Text>
                  <Text style={[styles.detailValue, styles.amountText]}>
                    GH₵{parseFloat(selectedOrder.total_amount || 0).toFixed(2)}
                  </Text>
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
                            {item.special_instructions ? (
                              <Text style={styles.orderItemDetailMeta}>
                                Note: {item.special_instructions}
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
                  <Text style={styles.detailLabel}>Payment Method</Text>
                  <Text style={styles.detailValue}>
                    {selectedOrder.payment_method || "N/A"}
                  </Text>
                </View>

                {selectedOrder.delivery_notes && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Delivery Notes</Text>
                    <Text style={styles.detailValue}>
                      {selectedOrder.delivery_notes}
                    </Text>
                  </View>
                )}

                {getNextStatus(selectedOrder.status) && (
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
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.updateButtonText}>
                        {getNextStatusLabel(selectedOrder.status)}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}

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
  },
  emptyContent: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
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
  orderCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    orderItemsPreview: {
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
    borderColor: colors.border,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
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
      fontWeight: "600",
    },
    orderItemDetailMeta: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  orderVendor: {
    fontSize: 18,
    fontWeight: "bold",
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
    fontWeight: "600",
    textTransform: "uppercase",
  },
  orderCustomer: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
  },
  orderAddress: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
  },
  orderPhone: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
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
    fontWeight: "bold",
    color: colors.primary,
  },
  orderDate: {
    fontSize: 12,
    color: colors.textTertiary,
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
    fontWeight: "bold",
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
    fontWeight: "600",
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
    marginTop: spacing.xs / 2,
  },
  statusBadgeLarge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    alignSelf: "flex-start",
  },
  statusTextLarge: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  amountText: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.primary,
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
    fontWeight: "600",
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
    fontWeight: "600",
  },
});
