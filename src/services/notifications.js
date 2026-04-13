/**
 * Push Notification Service for Chawp Delivery App
 * Handles registration, permissions, and notification handling
 */

import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "../config/supabase";

// Conditionally load expo-notifications; Expo Go on newer SDKs can disable push APIs.
let Notifications = null;
try {
  Notifications = require("expo-notifications");

  // Configure how notifications are displayed when app is in foreground
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (error) {
  console.log("expo-notifications not available (expected in Expo Go SDK 53+)");
}

function isNotificationsAvailable() {
  const isExpoGo = Constants.appOwnership === "expo";
  if (isExpoGo) {
    console.log("Running in Expo Go - delivery notifications disabled");
    return false;
  }
  return Notifications !== null;
}

export async function registerForPushNotifications() {
  if (!isNotificationsAvailable()) {
    console.log("Notifications not available - skipping delivery registration");
    return null;
  }

  let token = null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("delivery-orders", {
      name: "Delivery Orders",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#00FF00",
     
    });

    await Notifications.setNotificationChannelAsync("delivery-updates", {
      name: "Delivery Updates",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250],
      lightColor: "#00FF00",
    });
  }

  if (Device.isDevice || Platform.OS === "web") {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Failed to get push notification permission");
      return null;
    }

    try {
      token = (await Notifications.getDevicePushTokenAsync()).data;
      console.log("Delivery native push token:", token);

      if (
        token?.startsWith?.("ExponentPushToken[") ||
        token?.startsWith?.("ExpoPushToken[")
      ) {
        console.error("Delivery Expo token received in FCM-only mode");
        return null;
      }

      // Save token to database
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && token) {
        await savePushToken(token, user.id);
      }
    } catch (error) {
      console.error("Error getting native push token:", error);
    }
  }

  return token;
}

export async function savePushToken(token, userId) {
  if (!token || !userId) {
    console.log("Missing token or userId for saving");
    return;
  }

  try {
    console.log("Saving delivery push token for user:", userId);

    // Get device info
    const deviceInfo = {
      brand: Device.brand || "unknown",
      model: Device.modelName || "unknown",
      os: Device.osName || "unknown",
      osVersion: Device.osVersion || "unknown",
    };

    // Save to device_tokens table with device type 'delivery'
    console.log("Saving push token to device_tokens for delivery app...");
    const { error: deviceError } = await supabase
      .from("chawp_device_tokens")
      .upsert(
        {
          user_id: userId,
          push_token: token,
          device_type: "delivery",
          device_info: deviceInfo,
        },
        {
          onConflict: "user_id,device_type,push_token",
        },
      );

    if (deviceError) {
      console.error("Error saving to device_tokens:", deviceError);
    } else {
      console.log("Push token saved to device_tokens successfully");
    }

    // Save to user profiles table (delivery personnel are also users with role='delivery')
    const { error } = await supabase
      .from("chawp_user_profiles")
      .update({
        push_token: token,
        push_token_updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      console.error("Error saving delivery push token:", error);
      throw error;
    }

    console.log(
      "Delivery push token saved successfully to chawp_user_profiles",
    );
  } catch (error) {
    console.error("Error saving delivery push token:", error);
  }
}

export function setupNotificationListeners(
  onNotificationReceived,
  onNotificationTapped,
) {
  if (!isNotificationsAvailable()) {
    console.log("Notifications not available - delivery listeners disabled");
    return { remove: () => {} };
  }

  const notificationListener = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log("Delivery notification received:", notification);
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    },
  );

  const responseListener =
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log("Delivery notification tapped:", response);
      if (onNotificationTapped) {
        onNotificationTapped(response);
      }
    });

  return {
    notificationListener,
    responseListener,
    remove: () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    },
  };
}

export async function sendLocalNotification(title, body, data = {}) {
  if (!isNotificationsAvailable()) {
    console.log("Notifications not available - local notification skipped");
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
      priority: "high",
    },
    trigger: null,
  });
}
