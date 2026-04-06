import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { View, ActivityIndicator, StyleSheet, SafeAreaView, Platform, StatusBar as NativeStatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";

import {
  DeliveryAuthProvider,
  useDeliveryAuth,
} from "./src/contexts/DeliveryAuthContext";
import { NotificationProvider } from "./src/contexts/NotificationContext";
import DeliveryAuthScreen from "./src/components/DeliveryAuthScreen";
import Notification from "./src/components/Notification";
import DashboardPage from "./src/pages/DashboardPage";
import OrdersPage from "./src/pages/OrdersPage";
import EarningsPage from "./src/pages/EarningsPage";
import ProfilePage from "./src/pages/ProfilePage";
import ProfileSetupPage from "./src/pages/ProfileSetupPage";
import { colors } from "./src/theme";

const Tab = createBottomTabNavigator();

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
      const notificationService = await import('./src/services/notifications');
      await notificationService.registerForPushNotifications();
      console.log('Delivery notification registration completed');
    } catch (error) {
      console.error('Error registering for notifications:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ExpoStatusBar style="light" />
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
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
    <SafeAreaView style={styles.container} edges={['bottom']}>
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
        }}>
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
    paddingTop: Platform.OS === 'android' ? NativeStatusBar.currentHeight : 0,
  },
});
