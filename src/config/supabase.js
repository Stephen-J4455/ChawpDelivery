import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const supabaseUrl = "https://qxxflbymaoledpluzqtb.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4eGZsYnltYW9sZWRwbHV6cXRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMDk3MzIsImV4cCI6MjA3NzU4NTczMn0.t4hkTwSX7SLxHXdjs00pYaWF7FJj_AjZCyqO5ifpM5k";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
