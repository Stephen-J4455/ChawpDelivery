import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar as NativeStatusBar,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import Constants from "expo-constants";

import {
  DeliveryAuthProvider,
  useDeliveryAuth,
} from "./src/contexts/DeliveryAuthContext";
import { NotificationProvider } from "./src/contexts/NotificationContext";
import DeliveryAuthScreen from "./src/components/DeliveryAuthScreen";
import Notification from "./src/components/Notification";
import ChawpLoading from "./src/components/ChawpLoading";
import DashboardPage from "./src/pages/DashboardPage";
import OrdersPage from "./src/pages/OrdersPage";
import EarningsPage from "./src/pages/EarningsPage";
import ProfilePage from "./src/pages/ProfilePage";
import ProfileSetupPage from "./src/pages/ProfileSetupPage";
import { colors } from "./src/theme";
import { supabase } from "./src/config/supabase";

const Tab = createBottomTabNavigator();

const parseVersionPart = (value) => {
  const parsed = Number.parseInt(String(value || "").replace(/\D/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const compareVersions = (a = "0.0.0", b = "0.0.0") => {
  const aParts = String(a).split(".");
  const bParts = String(b).split(".");
  const maxLength = Math.max(aParts.length, bParts.length, 3);

  for (let i = 0; i < maxLength; i += 1) {
    const diff = parseVersionPart(aParts[i]) - parseVersionPart(bParts[i]);
    if (diff > 0) return 1;
    if (diff < 0) return -1;
  }

  return 0;
};

const getCurrentAppVersion = () =>
  String(
    Constants.expoConfig?.version ||
      Constants.manifest2?.extra?.expoClient?.version ||
      "0.0.0",
  );

function AppContent() {
  const { session, delivery, loading } = useDeliveryAuth();

  // Register for push notifications when user is authenticated
  useEffect(() => {
    if (session && delivery) {
      registerForNotifications();
    }
  }, [session, delivery]);

  const registerForNotifications = async () => {
    try {
      const notificationService = await import("./src/services/notifications");
      await notificationService.registerForPushNotifications();
      console.log("Delivery notification registration completed");
    } catch (error) {
      console.error("Error registering for notifications:", error);
    }
  };

  if (loading) {
    return (
      <>
        <ExpoStatusBar style="light" />
        <ChawpLoading />
      </>
    );
  }

  if (!session) {
    return (
      <>
        <ExpoStatusBar style="light" />
        <DeliveryAuthScreen />
      </>
    );
  }

  // Check if delivery profile needs setup
  if (delivery?.needsSetup) {
    return (
      <>
        <ExpoStatusBar style="light" />
        <ProfileSetupPage />
      </>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ExpoStatusBar style="light" translucent backgroundColor="transparent" />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            height: 70,
            paddingBottom: 10,
            paddingTop: 10,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardPage}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Orders"
          component={OrdersPage}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="list" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Earnings"
          component={EarningsPage}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cash" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfilePage}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
      <Notification />
    </SafeAreaView>
  );
}

export default function App() {
  const [versionChecking, setVersionChecking] = React.useState(true);
  const [requiredVersion, setRequiredVersion] = React.useState(null);
  const [storeUrl, setStoreUrl] = React.useState("");
  const [releaseNote, setReleaseNote] = React.useState("");
  const currentVersion = React.useMemo(() => getCurrentAppVersion(), []);

  useEffect(() => {
    let mounted = true;

    const checkVersionGate = async () => {
      try {
        const versionField =
          Platform.OS === "ios"
            ? "delivery_min_ios_version"
            : "delivery_min_android_version";
        const storeUrlField =
          Platform.OS === "ios"
            ? "delivery_ios_store_url"
            : "delivery_android_store_url";

        const { data, error } = await supabase
          .from("chawp_app_settings")
          .select(`${versionField}, ${storeUrlField}, delivery_release_note`)
          .order("id", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        const minVersion = data?.[versionField];
        if (
          mounted &&
          minVersion &&
          compareVersions(currentVersion, minVersion) < 0
        ) {
          setRequiredVersion(minVersion);
          setStoreUrl(String(data?.[storeUrlField] || "").trim());
          setReleaseNote(String(data?.delivery_release_note || "").trim());
        }
      } catch (error) {
        console.warn("Delivery version gate check skipped:", error?.message);
      } finally {
        if (mounted) {
          setVersionChecking(false);
        }
      }
    };

    checkVersionGate();

    return () => {
      mounted = false;
    };
  }, [currentVersion]);

  if (versionChecking) {
    return (
      <>
        <ExpoStatusBar style="light" />
        <ChawpLoading />
      </>
    );
  }

  if (requiredVersion) {
    const handleOpenStore = async () => {
      try {
        if (storeUrl) {
          await Linking.openURL(storeUrl);
          return;
        }

        if (Platform.OS === "android") {
          const packageName = Constants.expoConfig?.android?.package;
          if (!packageName) return;
          const marketUrl = `market://details?id=${packageName}`;
          const webUrl = `https://play.google.com/store/apps/details?id=${packageName}`;
          const canOpenMarket = await Linking.canOpenURL(marketUrl);
          await Linking.openURL(canOpenMarket ? marketUrl : webUrl);
          return;
        }
        await Linking.openURL("itms-apps://apps.apple.com");
      } catch (error) {
        console.warn("Unable to open store:", error?.message || error);
      }
    };

    return (
      <SafeAreaView style={styles.versionGateContainer}>
        <ExpoStatusBar style="light" />
        <Text style={styles.versionGateTitle}>Update Required</Text>
        <Text style={styles.versionGateMessage}>
          Please update ChawpDelivery to continue.
        </Text>
        <Text style={styles.versionGateMeta}>
          Current: {currentVersion} | Required: {requiredVersion}
        </Text>
        {!!releaseNote && (
          <Text style={styles.versionGateReleaseNote}>{releaseNote}</Text>
        )}
        <TouchableOpacity
          style={styles.versionGateButton}
          onPress={handleOpenStore}
        >
          <Text style={styles.versionGateButtonText}>Open Store</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaProvider>
      <NotificationProvider>
        <DeliveryAuthProvider>
          <NavigationContainer>
            <AppContent />
          </NavigationContainer>
        </DeliveryAuthProvider>
      </NotificationProvider>
    </SafeAreaProvider>
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
    paddingTop: Platform.OS === "android" ? NativeStatusBar.currentHeight : 0,
  },
  versionGateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    paddingHorizontal: 24,
  },
  versionGateTitle: {
    color: colors.primary,
    fontSize: 26,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 12,
  },
  versionGateMessage: {
    color: colors.textSecondary,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },
  versionGateMeta: {
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 16,
    fontSize: 12,
  },
  versionGateReleaseNote: {
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 20,
  },
  versionGateButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  versionGateButtonText: {
    color: colors.card,
    fontWeight: "700",
  },
});
