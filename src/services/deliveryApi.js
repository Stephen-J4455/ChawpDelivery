import { supabase } from "../config/supabase";

const EXPO_PUSH_TOKEN_REGEX = /^(ExponentPushToken|ExpoPushToken)\[/;

function filterFcmTokens(tokens = []) {
  return [...new Set(tokens)]
    .filter((token) => typeof token === "string" && token.length > 0)
    .filter((token) => !EXPO_PUSH_TOKEN_REGEX.test(token));
}

// ==================== ORDER MANAGEMENT ====================

export async function fetchAvailableOrders(deliveryId) {
  try {
    const { data, error } = await supabase
      .from("chawp_orders")
      .select(
        `
        *,
        chawp_vendors (
          id,
          name,
          address,
          phone
        ),
        chawp_user_profiles (
          id,
          full_name,
          phone,
          address
        ),
        order_items:chawp_order_items(
          id,
          quantity,
          unit_price,
          meal_image,
          selected_size,
          selected_specifications,
          special_instructions,
          meal:chawp_meals(id, title, image, images, price)
        )
      `,
      )
      .in("status", ["ready", "ready_for_pickup"])
      .is("delivery_personnel_id", null)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Error fetching available orders:", error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function fetchMyDeliveries(deliveryId) {
  try {
    const { data, error } = await supabase
      .from("chawp_orders")
      .select(
        `
        *,
        chawp_vendors (
          id,
          name,
          address,
          phone
        ),
        chawp_user_profiles (
          id,
          full_name,
          phone,
          address
        ),
        order_items:chawp_order_items(
          id,
          quantity,
          unit_price,
          meal_image,
          selected_size,
          selected_specifications,
          special_instructions,
          meal:chawp_meals(id, title, image, images, price)
        )
      `,
      )
      .eq("delivery_personnel_id", deliveryId)
      .in("status", [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "ready_for_pickup",
        "picked_up",
        "in_transit",
        "out_for_delivery",
      ])
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Error fetching my deliveries:", error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function fetchDeliveryHistory(deliveryId, limit = 50) {
  try {
    const { data, error } = await supabase
      .from("chawp_orders")
      .select(
        `
        *,
        chawp_vendors (
          id,
          name,
          address
        ),
        chawp_user_profiles (
          id,
          full_name,
          address
        ),
        order_items:chawp_order_items(
          id,
          quantity,
          unit_price,
          meal_image,
          selected_size,
          selected_specifications,
          special_instructions,
          meal:chawp_meals(id, title, image, images, price)
        )
      `,
      )
      .eq("delivery_personnel_id", deliveryId)
      .in("status", ["delivered", "cancelled"])
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Error fetching delivery history:", error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function acceptOrder(orderId, deliveryId) {
  try {
    const { data, error } = await supabase
      .from("chawp_orders")
      .update({
        delivery_personnel_id: deliveryId,
        status: "picked_up",
        picked_up_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .eq("delivery_personnel_id", null) // Ensure order hasn't been taken
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return {
        success: false,
        error: "Order already assigned to another delivery person",
      };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error accepting order:", error);
    return { success: false, error: error.message };
  }
}

export async function updateOrderStatus(orderId, status, additionalData = {}) {
  try {
    const updateData = {
      status,
      ...additionalData,
    };

    // Add timestamps based on status
    if (status === "picked_up") {
      updateData.picked_up_at = new Date().toISOString();
    } else if (status === "out_for_delivery") {
      updateData.in_transit_at = new Date().toISOString();
    } else if (status === "delivered") {
      updateData.delivered_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("chawp_orders")
      .update(updateData)
      .eq("id", orderId)
      .select(
        `
        *,
        chawp_vendors(name),
        chawp_user_profiles(username, full_name, push_token),
        order_items:chawp_order_items(
          quantity,
          meal:chawp_meals(title)
        )
      `,
      )
      .single();

    if (error) throw error;

    // Send push notification to customer
    if (data?.chawp_user_profiles) {
      try {
        const userName =
          data.chawp_user_profiles.username ||
          data.chawp_user_profiles.full_name ||
          "Customer";
        const firstName = userName.split(" ")[0];
        const vendorName = data.chawp_vendors?.name || "the vendor";

        // Get order items summary
        const items = data.order_items || [];
        let itemsSummary = "";

        if (items.length > 0) {
          const firstItem = items[0].meal?.title || "your order";
          if (items.length === 1) {
            itemsSummary = `"${firstItem}"`;
          } else if (items.length === 2) {
            const secondItem = items[1].meal?.title;
            itemsSummary = `"${firstItem}" and "${secondItem}"`;
          } else {
            itemsSummary = `"${firstItem}" and ${items.length - 1} other item${items.length > 2 ? "s" : ""}`;
          }
        } else {
          itemsSummary = "your order";
        }

        // Create personalized messages based on status
        let title = "Order Update";
        let message = "";

        switch (status) {
          case "picked_up":
            title = "📦 Order Picked Up";
            message = `Hello ${firstName}, your order for ${itemsSummary} has been picked up from ${vendorName}.`;
            break;
          case "out_for_delivery":
            title = "🚚 Out for Delivery";
            message = `Hello ${firstName}, your order for ${itemsSummary} is on its way to you!`;
            break;
          case "delivered":
            title = "📦 Order Delivered";
            message = `Hello ${firstName}, your order for ${itemsSummary} has been delivered. Enjoy your meal!`;
            break;
          default:
            message = `Hello ${firstName}, your order status has been updated.`;
        }

        // Get all device tokens for this customer from device_tokens table
        const { data: deviceTokens } = await supabase
          .from("chawp_device_tokens")
          .select("push_token")
          .eq("user_id", data.user_id)
          .eq("device_type", "customer");

        // Collect all tokens (device_tokens + fallback to user_profiles)
        const tokens = [
          ...(deviceTokens || []).map((t) => t.push_token),
          data.chawp_user_profiles?.push_token,
        ].filter(Boolean);

        const fcmTokens = filterFcmTokens(tokens);
        const skippedExpoTokens = tokens.length - fcmTokens.length;
        if (skippedExpoTokens > 0) {
          console.warn(
            `[Delivery] Skipping ${skippedExpoTokens} Expo token(s) for FCM-only mode`,
          );
        }

        if (fcmTokens.length > 0) {
          console.log(
            `[Delivery] Sending notification to ${fcmTokens.length} customer device(s)`,
          );

          const { data: notifResult, error: notifError } =
            await supabase.functions.invoke("send-push-notification", {
              body: {
                tokens: fcmTokens,
                title: title,
                body: message,
                data: {
                  orderId: orderId,
                  type: "order_update",
                  status: status,
                  channelId: "orders",
                },
              },
            });

          if (notifError) {
            console.error("[Delivery] Error sending notification:", notifError);
          } else {
            console.log(
              "[Delivery] Notification sent successfully:",
              notifResult,
            );
          }
        } else {
          console.log("[Delivery] No FCM tokens found for customer");
        }
      } catch (notifError) {
        console.error(
          "[Delivery] Failed to send push notification:",
          notifError,
        );
        // Don't fail the whole operation if notification fails
      }
    } else {
      console.log("[Delivery] No user profile found for customer");
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error updating order status:", error);
    return { success: false, error: error.message };
  }
}

// ==================== EARNINGS MANAGEMENT ====================

export async function fetchEarnings(
  deliveryId,
  startDate = null,
  endDate = null,
) {
  try {
    let query = supabase
      .from("chawp_delivery_earnings")
      .select("*")
      .eq("delivery_personnel_id", deliveryId)
      .order("earned_at", { ascending: false });

    if (startDate) {
      query = query.gte("earned_at", startDate);
    }
    if (endDate) {
      query = query.lte("earned_at", endDate);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Error fetching earnings:", error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function fetchPendingEarnings(deliveryId) {
  try {
    const { data, error } = await supabase
      .from("chawp_delivery_earnings")
      .select("*")
      .eq("delivery_personnel_id", deliveryId)
      .eq("status", "pending")
      .order("earned_at", { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Error fetching pending earnings:", error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function fetchPaidEarnings(
  deliveryId,
  startDate = null,
  endDate = null,
) {
  try {
    let query = supabase
      .from("chawp_delivery_earnings")
      .select("*")
      .eq("delivery_personnel_id", deliveryId)
      .eq("status", "paid")
      .order("paid_at", { ascending: false });

    if (startDate) {
      query = query.gte("paid_at", startDate);
    }
    if (endDate) {
      query = query.lte("paid_at", endDate);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Error fetching paid earnings:", error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function fetchEarningsStats(deliveryId) {
  try {
    // Get today's earnings (non-cancelled)
    const today = new Date().toISOString().split("T")[0];
    const { data: todayData } = await supabase
      .from("chawp_delivery_earnings")
      .select("amount, status")
      .eq("delivery_personnel_id", deliveryId)
      .neq("status", "cancelled")
      .gte("earned_at", today);

    // Get this week's earnings
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { data: weekData } = await supabase
      .from("chawp_delivery_earnings")
      .select("amount, status")
      .eq("delivery_personnel_id", deliveryId)
      .neq("status", "cancelled")
      .gte("earned_at", weekAgo.toISOString());

    // Get this month's earnings
    const monthStart = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    ).toISOString();
    const { data: monthData } = await supabase
      .from("chawp_delivery_earnings")
      .select("amount, status")
      .eq("delivery_personnel_id", deliveryId)
      .neq("status", "cancelled")
      .gte("earned_at", monthStart);

    // Get all-time earnings and pending
    const { data: allData } = await supabase
      .from("chawp_delivery_earnings")
      .select("amount, status")
      .eq("delivery_personnel_id", deliveryId)
      .neq("status", "cancelled");

    const todayEarnings =
      todayData?.reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;
    const weekEarnings =
      weekData?.reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;
    const monthEarnings =
      monthData?.reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;
    const totalEarnings =
      allData?.reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;
    const pendingEarnings =
      allData
        ?.filter((e) => e.status === "pending")
        .reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;
    const paidEarnings =
      allData
        ?.filter((e) => e.status === "paid")
        .reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;

    return {
      success: true,
      data: {
        today: todayEarnings,
        week: weekEarnings,
        month: monthEarnings,
        total: totalEarnings,
        pending: pendingEarnings,
        paid: paidEarnings,
      },
    };
  } catch (error) {
    console.error("Error fetching earnings stats:", error);
    return {
      success: false,
      error: error.message,
      data: { today: 0, week: 0, month: 0, total: 0, pending: 0, paid: 0 },
    };
  }
}

// ==================== DELIVERY STATS ====================

export async function fetchDeliveryStats(deliveryId) {
  try {
    // Get total deliveries
    const { count: totalDeliveries } = await supabase
      .from("chawp_orders")
      .select("*", { count: "exact", head: true })
      .eq("delivery_personnel_id", deliveryId)
      .eq("status", "delivered");

    // Get today's deliveries
    const today = new Date().toISOString().split("T")[0];
    const { count: todayDeliveries } = await supabase
      .from("chawp_orders")
      .select("*", { count: "exact", head: true })
      .eq("delivery_personnel_id", deliveryId)
      .eq("status", "delivered")
      .gte("delivered_at", today);

    // Get active deliveries
    const { count: activeDeliveries } = await supabase
      .from("chawp_orders")
      .select("*", { count: "exact", head: true })
      .eq("delivery_personnel_id", deliveryId)
      .in("status", ["picked_up", "out_for_delivery"]);

    // Get ready for pickup deliveries assigned to this rider
    const { count: readyForPickup } = await supabase
      .from("chawp_orders")
      .select("*", { count: "exact", head: true })
      .eq("delivery_personnel_id", deliveryId)
      .in("status", ["ready", "ready_for_pickup"]);

    // Get delivery person rating
    const { data: deliveryData } = await supabase
      .from("chawp_delivery_personnel")
      .select("rating")
      .eq("id", deliveryId)
      .single();

    return {
      success: true,
      data: {
        totalDeliveries: totalDeliveries || 0,
        todayDeliveries: todayDeliveries || 0,
        activeDeliveries: activeDeliveries || 0,
        readyForPickup: readyForPickup || 0,
        rating: deliveryData?.rating || 0,
      },
    };
  } catch (error) {
    console.error("Error fetching delivery stats:", error);
    return {
      success: false,
      error: error.message,
      data: {
        totalDeliveries: 0,
        todayDeliveries: 0,
        activeDeliveries: 0,
        readyForPickup: 0,
        rating: 0,
      },
    };
  }
}

// ==================== PROFILE MANAGEMENT ====================

export async function updateDeliveryProfile(deliveryId, updates) {
  try {
    const { data, error } = await supabase
      .from("chawp_delivery_personnel")
      .update(updates)
      .eq("id", deliveryId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error updating delivery profile:", error);
    return { success: false, error: error.message };
  }
}

export async function updateUserProfile(userId, updates) {
  try {
    const { data, error } = await supabase
      .from("chawp_user_profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error updating user profile:", error);
    return { success: false, error: error.message };
  }
}
