import React, { createContext, useState, useEffect, useContext } from "react";
import { supabase } from "../config/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DeliveryAuthContext = createContext({});

const DELIVERY_STORAGE_KEY = "@chawp_delivery_profile";

export const DeliveryAuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load delivery from cache immediately
    loadDeliveryFromCache();

    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchDeliveryProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchDeliveryProfile(session.user.id);
      } else {
        setDelivery(null);
        clearDeliveryCache();
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadDeliveryFromCache = async () => {
    try {
      const cachedDelivery = await AsyncStorage.getItem(DELIVERY_STORAGE_KEY);
      if (cachedDelivery) {
        setDelivery(JSON.parse(cachedDelivery));
      }
    } catch (error) {
      console.error("Error loading delivery from cache:", error);
    }
  };

  const saveDeliveryToCache = async (deliveryData) => {
    try {
      await AsyncStorage.setItem(
        DELIVERY_STORAGE_KEY,
        JSON.stringify(deliveryData),
      );
    } catch (error) {
      console.error("Error saving delivery to cache:", error);
    }
  };

  const clearDeliveryCache = async () => {
    try {
      await AsyncStorage.removeItem(DELIVERY_STORAGE_KEY);
    } catch (error) {
      console.error("Error clearing delivery cache:", error);
    }
  };

  const fetchDeliveryProfile = async (userId) => {
    try {
      // First get user profile to check role
      const { data: profile, error: profileError } = await supabase
        .from("chawp_user_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;

      // Check if user is a delivery person
      if (profile.role !== "delivery") {
        console.error("User is not a delivery person");
        setLoading(false);
        return;
      }

      // Get delivery personnel details
      const { data: deliveryData, error: deliveryError } = await supabase
        .from("chawp_delivery_personnel")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (deliveryError) throw deliveryError;

      // If no delivery personnel record exists yet, create a basic profile
      if (!deliveryData) {
        console.log(
          "No delivery personnel record found, user needs to complete profile setup",
        );
        setDelivery({
          ...profile,
          delivery_id: null,
          vehicle_type: null,
          vehicle_registration: null,
          is_available: false,
          rating: 0,
          total_deliveries: 0,
          current_location: null,
          needsSetup: true,
        });
        setLoading(false);
        return;
      }

      if (deliveryData.deleted_at || deliveryData.is_active === false) {
        console.warn("Delivery account is deactivated");
        await supabase.auth.signOut();
        setDelivery(null);
        await clearDeliveryCache();
        setLoading(false);
        return;
      }

      const fullDeliveryProfile = {
        ...profile,
        delivery_id: deliveryData.id,
        vehicle_type: deliveryData.vehicle_type,
        vehicle_registration: deliveryData.vehicle_registration,
        is_available: deliveryData.is_available,
        rating: deliveryData.rating,
        total_deliveries: deliveryData.total_deliveries,
        current_location: deliveryData.current_location,
        needsSetup: false,
      };

      setDelivery(fullDeliveryProfile);
      await saveDeliveryToCache(fullDeliveryProfile);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching delivery profile:", error);
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user is delivery personnel
      const { data: profile } = await supabase
        .from("chawp_user_profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profile.role !== "delivery") {
        await supabase.auth.signOut();
        return {
          success: false,
          error: "You are not authorized as delivery personnel",
        };
      }

      const { data: deliveryProfile } = await supabase
        .from("chawp_delivery_personnel")
        .select("id, deleted_at, is_active")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (
        !deliveryProfile ||
        deliveryProfile.deleted_at ||
        deliveryProfile.is_active === false
      ) {
        await supabase.auth.signOut();
        return {
          success: false,
          error: "Delivery account is deactivated or unavailable",
        };
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setDelivery(null);
      await clearDeliveryCache();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const updateAvailability = async (isAvailable) => {
    try {
      const { error } = await supabase
        .from("chawp_delivery_personnel")
        .update({ is_available: isAvailable })
        .eq("user_id", session.user.id);

      if (error) throw error;

      setDelivery({ ...delivery, is_available: isAvailable });
      await saveDeliveryToCache({ ...delivery, is_available: isAvailable });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const updateLocation = async (latitude, longitude) => {
    try {
      const location = `POINT(${longitude} ${latitude})`;
      const { error } = await supabase
        .from("chawp_delivery_personnel")
        .update({ current_location: location })
        .eq("user_id", session.user.id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  return (
    <DeliveryAuthContext.Provider
      value={{
        session,
        delivery,
        loading,
        signIn,
        signOut,
        updateAvailability,
        updateLocation,
        refreshProfile: () => session && fetchDeliveryProfile(session.user.id),
      }}
    >
      {children}
    </DeliveryAuthContext.Provider>
  );
};

export const useDeliveryAuth = () => {
  const context = useContext(DeliveryAuthContext);
  if (!context) {
    throw new Error("useDeliveryAuth must be used within DeliveryAuthProvider");
  }
  return context;
};
