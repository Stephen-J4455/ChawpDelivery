import React from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii } from "../theme";
import { useNotification } from "../contexts/NotificationContext";

export default function Notification() {
  const { notification } = useNotification();
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (notification.visible) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [notification.visible]);

  if (!notification.visible) return null;

  const getIcon = () => {
    switch (notification.type) {
      case "success":
        return "checkmark-circle";
      case "error":
        return "alert-circle";
      case "info":
        return "information-circle";
      default:
        return "notifications";
    }
  };

  const getBackgroundColor = () => {
    switch (notification.type) {
      case "success":
        return colors.success;
      case "error":
        return colors.error;
      case "info":
        return colors.info;
      default:
        return colors.primary;
    }
  };

  return (
    <Animated.View
      style={[
        styles.notification,
        { backgroundColor: getBackgroundColor(), opacity },
      ]}>
      <Ionicons name={getIcon()} size={24} color={colors.white} />
      <Text style={styles.notificationText}>{notification.message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  notification: {
    position: "absolute",
    top: 60,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  notificationText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: colors.white,
  },
});
