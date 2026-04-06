import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useDeliveryAuth } from "../contexts/DeliveryAuthContext";
import { supabase } from "../config/supabase";
import { colors } from "../theme";

const ProfileSetupPage = () => {
  const { session, refreshProfile } = useDeliveryAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    vehicleType: "",
    vehicleRegistration: "",
    phoneNumber: "",
  });

  const vehicleTypes = [
    { id: "motorcycle", label: "Motorcycle", icon: "bicycle" },
    { id: "car", label: "Car", icon: "car" },
    { id: "bicycle", label: "Bicycle", icon: "bicycle" },
    { id: "scooter", label: "Scooter", icon: "bicycle" },
  ];

  const handleVehicleSelect = (type) => {
    setFormData({ ...formData, vehicleType: type });
  };

  const handleSubmit = async () => {
    // Validate form
    if (!formData.vehicleType) {
      Alert.alert("Error", "Please select a vehicle type");
      return;
    }
    if (!formData.vehicleRegistration.trim()) {
      Alert.alert("Error", "Please enter vehicle registration number");
      return;
    }
    if (!formData.phoneNumber.trim()) {
      Alert.alert("Error", "Please enter your phone number");
      return;
    }

    setLoading(true);

    try {
      // Update user profile with phone number
      const { error: profileError } = await supabase
        .from("chawp_user_profiles")
        .update({ phone: formData.phoneNumber })
        .eq("id", session.user.id);

      if (profileError) throw profileError;

      // Create delivery personnel record
      const { error: deliveryError } = await supabase
        .from("chawp_delivery_personnel")
        .insert({
          user_id: session.user.id,
          vehicle_type: formData.vehicleType,
          vehicle_registration: formData.vehicleRegistration.toUpperCase(),
          is_available: false,
          rating: 0,
          total_deliveries: 0,
        });

      if (deliveryError) throw deliveryError;

      // Refresh profile to load new data
      await refreshProfile();

      Alert.alert("Success", "Profile setup completed successfully!");
    } catch (error) {
      console.error("Error setting up profile:", error);
      Alert.alert("Error", error.message || "Failed to setup profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight : 44) + 16 }
      ]}>
        <View style={styles.header}>
          <Ionicons name="person-add" size={64} color={colors.primary} />
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>
            Set up your delivery profile to start accepting orders
          </Text>
        </View>

        <View style={styles.form}>
          {/* Vehicle Type Selection */}
          <Text style={styles.label}>Vehicle Type *</Text>
          <View style={styles.vehicleGrid}>
            {vehicleTypes.map((vehicle) => (
              <TouchableOpacity
                key={vehicle.id}
                style={[
                  styles.vehicleCard,
                  formData.vehicleType === vehicle.id &&
                    styles.vehicleCardSelected,
                ]}
                onPress={() => handleVehicleSelect(vehicle.id)}>
                <Ionicons
                  name={vehicle.icon}
                  size={32}
                  color={
                    formData.vehicleType === vehicle.id
                      ? colors.primary
                      : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.vehicleLabel,
                    formData.vehicleType === vehicle.id &&
                      styles.vehicleLabelSelected,
                  ]}>
                  {vehicle.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Vehicle Registration */}
          <Text style={styles.label}>Vehicle Registration Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., ABC-1234"
            placeholderTextColor={colors.textSecondary}
            value={formData.vehicleRegistration}
            onChangeText={(text) =>
              setFormData({ ...formData, vehicleRegistration: text })
            }
            autoCapitalize="characters"
          />

          {/* Phone Number */}
          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., +233 24 123 4567"
            placeholderTextColor={colors.textSecondary}
            value={formData.phoneNumber}
            onChangeText={(text) =>
              setFormData({ ...formData, phoneNumber: text })
            }
            keyboardType="phone-pad"
          />

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              loading && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Complete Setup</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  form: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 12,
    marginTop: 16,
  },
  vehicleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  vehicleCard: {
    width: "48%",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  vehicleCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight || colors.card,
  },
  vehicleLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    fontWeight: "500",
  },
  vehicleLabelSelected: {
    color: colors.primary,
    fontWeight: "600",
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginRight: 8,
  },
});

export default ProfileSetupPage;
