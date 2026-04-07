import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, shadows } from "../theme";
import { useDeliveryAuth } from "../contexts/DeliveryAuthContext";
import { useNotification } from "../contexts/NotificationContext";
import { supabase } from "../config/supabase";
import { fetchMyDeliveries } from "../services/deliveryApi";

export default function ProfilePage() {
  const { delivery, signOut } = useDeliveryAuth();
  const { showSuccess, showError } = useNotification();

  // Payment details modal
  const [bankModalVisible, setBankModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("mobile_money");

  // Bank details
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [ghanaBanks, setGhanaBanks] = useState([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [bankPickerVisible, setBankPickerVisible] = useState(false);
  const [bankSearchQuery, setBankSearchQuery] = useState("");

  // Mobile money details
  const [mobileMoneyProvider, setMobileMoneyProvider] = useState("mtn");
  const [mobileMoneyNumber, setMobileMoneyNumber] = useState("");
  const [mobileMoneyName, setMobileMoneyName] = useState("");

  const [existingPaymentDetails, setExistingPaymentDetails] = useState(null);
  const [subaccountStatus, setSubaccountStatus] = useState({
    checked: false,
    dbHasSubaccount: false,
    dbSubaccountCode: null,
    exists: false,
    paystackExists: false,
    deletedFromPaystack: false,
    verified: false,
    subaccountCode: null,
    reason: null,
    error: null,
  });
  const [creatingSubaccount, setCreatingSubaccount] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [orderSummary, setOrderSummary] = useState({
    readyForPickup: 0,
    inTransit: 0,
  });

  useEffect(() => {
    if (delivery?.delivery_id) {
      loadPaymentDetails();
      loadOrderSummary();
    }
  }, [delivery?.delivery_id]);

  const loadOrderSummary = async () => {
    if (!delivery?.delivery_id) return;

    const result = await fetchMyDeliveries(delivery.delivery_id);
    if (!result.success) return;

    const deliveryOrders = result.data || [];
    const readyForPickup = deliveryOrders.filter((order) =>
      ["ready", "ready_for_pickup"].includes(order.status),
    ).length;
    const inTransit = deliveryOrders.filter((order) =>
      ["picked_up", "in_transit", "out_for_delivery"].includes(order.status),
    ).length;

    setOrderSummary({ readyForPickup, inTransit });
  };

  const filteredGhanaBanks = useMemo(() => {
    const query = bankSearchQuery.trim().toLowerCase();
    if (!query) return ghanaBanks;

    return ghanaBanks.filter((bank) => {
      const bankNameValue = String(bank?.name || "").toLowerCase();
      const bankCodeValue = String(bank?.code || "").toLowerCase();
      return bankNameValue.includes(query) || bankCodeValue.includes(query);
    });
  }, [ghanaBanks, bankSearchQuery]);

  const loadGhanaBanks = async (preferredBank = "") => {
    setLoadingBanks(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "create_subaccount",
        {
          body: {
            action: "list_banks",
          },
        },
      );

      if (error) {
        throw new Error(error.message || "Failed to load banks");
      }

      if (!data?.success) {
        throw new Error(data?.error || "Failed to load banks");
      }

      const normalizedBanks = (Array.isArray(data?.data) ? data.data : [])
        .filter((bank) => bank?.name && bank?.code)
        .map((bank) => ({
          ...bank,
          name: String(bank.name).trim(),
          code: String(bank.code).trim(),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setGhanaBanks(normalizedBanks);

      const preferred = String(preferredBank || bankCode || bankName || "")
        .trim()
        .toLowerCase();

      if (preferred) {
        const matchedBank = normalizedBanks.find(
          (bank) =>
            bank.code.toLowerCase() === preferred ||
            bank.name.toLowerCase() === preferred,
        );

        if (matchedBank) {
          setBankName(matchedBank.name);
          setBankCode(matchedBank.code);
        }
      }
    } catch (error) {
      console.error("Error loading Ghana banks:", error);
      showError(error.message || "Failed to load Ghana banks from Paystack");
    } finally {
      setLoadingBanks(false);
    }
  };

  const loadPaymentDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("chawp_delivery_bank_details")
        .select("*")
        .eq("delivery_personnel_id", delivery.delivery_id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setExistingPaymentDetails(data);
        setPaymentMethod(data.payment_method);

        if (data.payment_method === "bank") {
          setAccountName(data.account_name || "");
          setAccountNumber(data.account_number || "");
          setBankName(data.bank_name || "");
          setBankCode("");
        } else {
          setMobileMoneyProvider(data.mobile_money_provider || "mtn");
          setMobileMoneyNumber(data.mobile_money_number || "");
          setMobileMoneyName(data.mobile_money_name || "");
        }
      }

      if (delivery?.delivery_id) {
        const { data: subaccountResult, error: subaccountError } =
          await supabase.functions.invoke("create_subaccount", {
            body: {
              action: "check_delivery_subaccount",
              delivery_personnel_id: delivery.delivery_id,
            },
          });

        if (!subaccountError && subaccountResult?.success) {
          const status = subaccountResult.data || {};
          setSubaccountStatus({
            checked: true,
            dbHasSubaccount: Boolean(status.db_has_subaccount),
            dbSubaccountCode: status.db_subaccount_code || null,
            exists: Boolean(status.exists),
            paystackExists: Boolean(status.paystack_exists),
            deletedFromPaystack: Boolean(status.deleted_from_paystack),
            verified: Boolean(
              status.paystack_account_verified || status.account_verified,
            ),
            subaccountCode:
              status.subaccount_code || status.db_subaccount_code || null,
            reason: status.reason || null,
            error: null,
          });
        } else {
          setSubaccountStatus((prev) => ({
            ...prev,
            checked: true,
            error: subaccountError?.message || null,
          }));
        }
      }
    } catch (error) {
      console.error("Error loading payment details:", error);
    }
  };

  const openBankDetailsModal = async () => {
    if (!delivery?.delivery_id) return;

    let preferredBank = "";

    try {
      const { data: existingDetails } = await supabase
        .from("chawp_delivery_bank_details")
        .select("*")
        .eq("delivery_personnel_id", delivery.delivery_id)
        .maybeSingle();

      if (existingDetails) {
        const method = existingDetails.payment_method || "mobile_money";
        setPaymentMethod(method);
        setAccountName(existingDetails.account_name || "");
        setAccountNumber(existingDetails.account_number || "");
        setBankName(existingDetails.bank_name || "");
        setBankCode("");
        setMobileMoneyProvider(existingDetails.mobile_money_provider || "mtn");
        setMobileMoneyNumber(existingDetails.mobile_money_number || "");
        setMobileMoneyName(existingDetails.mobile_money_name || "");
        preferredBank = existingDetails.bank_name || "";
      } else {
        setPaymentMethod("mobile_money");
        setAccountName("");
        setAccountNumber("");
        setBankName("");
        setBankCode("");
        setMobileMoneyProvider("mtn");
        setMobileMoneyNumber("");
        setMobileMoneyName("");
      }
    } catch (error) {
      console.error("Error loading payout details:", error);
    }

    await loadGhanaBanks(preferredBank);
    setBankModalVisible(true);
  };

  useEffect(() => {
    if (!bankModalVisible) return;
    if (paymentMethod !== "bank") return;
    if (loadingBanks) return;
    if (ghanaBanks.length > 0) return;

    loadGhanaBanks(bankName);
  }, [bankModalVisible, paymentMethod]);

  const handleSaveBankDetails = async () => {
    try {
      setLoading(true);

      const paymentData = {
        delivery_personnel_id: delivery.delivery_id,
        payment_method: paymentMethod,
      };

      if (paymentMethod === "bank") {
        if (!accountName.trim() || !accountNumber.trim() || !bankName.trim()) {
          showError("Please enter account name, account number, and bank name");
          setLoading(false);
          return;
        }
        paymentData.account_name = accountName.trim();
        paymentData.account_number = accountNumber.trim();
        paymentData.bank_name = bankName.trim();
        paymentData.mobile_money_provider = null;
        paymentData.mobile_money_number = null;
        paymentData.mobile_money_name = null;
      } else {
        if (!mobileMoneyNumber.trim() || !mobileMoneyName.trim()) {
          showError("Please enter mobile money account name and number");
          setLoading(false);
          return;
        }
        paymentData.mobile_money_provider = mobileMoneyProvider.trim();
        paymentData.mobile_money_number = mobileMoneyNumber.trim();
        paymentData.mobile_money_name = mobileMoneyName.trim();
        paymentData.account_name = null;
        paymentData.account_number = null;
        paymentData.bank_name = null;
      }

      const { data: existing, error: existingError } = await supabase
        .from("chawp_delivery_bank_details")
        .select("*")
        .eq("delivery_personnel_id", delivery.delivery_id)
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      let result;
      if (existing) {
        result = await supabase
          .from("chawp_delivery_bank_details")
          .update(paymentData)
          .eq("delivery_personnel_id", delivery.delivery_id);
      } else {
        result = await supabase
          .from("chawp_delivery_bank_details")
          .insert(paymentData);
      }

      if (result.error) throw result.error;

      const { data: checkResult, error: checkError } =
        await supabase.functions.invoke("create_subaccount", {
          body: {
            action: "check_delivery_subaccount",
            delivery_personnel_id: delivery.delivery_id,
          },
        });

      if (checkError) {
        throw new Error(
          checkError.message || "Failed to check delivery subaccount",
        );
      }

      if (!checkResult?.success) {
        throw new Error(
          checkResult?.error || "Failed to check delivery subaccount",
        );
      }

      const subaccountExists = Boolean(checkResult?.data?.exists);

      setCreatingSubaccount(true);
      const settlementBankValue =
        paymentMethod === "bank" ? bankCode || bankName : mobileMoneyProvider;
      const accountNumberValue =
        paymentMethod === "bank" ? accountNumber : mobileMoneyNumber;

      const { data: subaccountResult, error: subaccountError } =
        await supabase.functions.invoke("create_subaccount", {
          body: {
            action: "create_delivery_subaccount",
            delivery_personnel_id: delivery.delivery_id,
            payment_method: paymentMethod,
            settlement_bank: settlementBankValue,
            account_number: accountNumberValue,
            business_name:
              delivery?.full_name ||
              existingPaymentDetails?.mobile_money_name ||
              "Delivery Partner",
            primary_contact_name: delivery?.full_name || null,
            primary_contact_email: delivery?.email || null,
            primary_contact_phone: delivery?.phone || null,
            currency: "GHS",
          },
        });

      if (subaccountError || !subaccountResult?.success) {
        throw new Error(
          subaccountResult?.error ||
            subaccountError?.message ||
            "Failed to create delivery payout subaccount",
        );
      }

      setSubaccountStatus({
        checked: true,
        dbHasSubaccount: Boolean(subaccountResult.data?.payment_account),
        dbSubaccountCode: subaccountResult.data?.payment_account || null,
        exists: true,
        paystackExists: true,
        deletedFromPaystack: false,
        verified: Boolean(subaccountResult.data?.account_verified),
        subaccountCode:
          subaccountResult.data?.payment_account ||
          subaccountResult.data?.subaccount?.subaccount_code ||
          null,
        reason: null,
        error: null,
      });

      showSuccess(
        subaccountResult?.data?.mode === "recreated"
          ? "Paystack account was missing and has been recreated"
          : subaccountExists
            ? "Payment details saved and Paystack account updated"
            : "Payment details saved and Paystack account created",
      );
      setBankModalVisible(false);
      await loadPaymentDetails();
    } catch (error) {
      console.error("Error saving payment details:", error);
      showError(error.message || "Failed to save payment details");
    } finally {
      setCreatingSubaccount(false);
      setLoading(false);
    }
  };

  const closeDeleteModal = () => {
    setDeleteModalVisible(false);
    setDeletePassword("");
    setDeleteReason("");
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      showError("Please enter your password to continue");
      return;
    }

    try {
      setDeletingAccount(true);

      const { data, error } = await supabase.functions.invoke(
        "account-lifecycle",
        {
          body: {
            action: "deactivate_delivery",
            password: deletePassword,
            reason: deleteReason,
          },
        },
      );

      if (error) {
        throw new Error(error.message || "Failed to deactivate account");
      }

      if (!data?.success) {
        throw new Error(data?.error || "Failed to deactivate account");
      }

      closeDeleteModal();
      await signOut();
      showSuccess("Your delivery account has been deactivated");
    } catch (error) {
      showError(
        error.message ||
          "Could not deactivate account. Check active deliveries and pending earnings.",
      );
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          ...styles.content,
          paddingTop:
            (Platform.OS === "android" ? StatusBar.currentHeight : 44) +
            spacing.lg,
        }}
      >
        <View style={styles.profileHero}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={34} color={colors.primary} />
          </View>
          <View style={styles.profileTextWrap}>
            <Text style={styles.name}>
              {delivery?.full_name || "Delivery Person"}
            </Text>
            <Text style={styles.email}>{delivery?.email || ""}</Text>
          </View>
          <View
            style={[
              styles.verificationPill,
              {
                backgroundColor: delivery?.is_verified
                  ? `${colors.success}22`
                  : `${colors.warning}22`,
              },
            ]}
          >
            <Text
              style={[
                styles.verificationPillText,
                {
                  color: delivery?.is_verified
                    ? colors.success
                    : colors.warning,
                },
              ]}
            >
              {delivery?.is_verified ? "Verified" : "Pending"}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Operations Snapshot</Text>
          <View style={styles.snapshotRow}>
            <View style={styles.snapshotCard}>
              <Text style={styles.snapshotLabel}>Ready for Pickup</Text>
              <Text style={styles.snapshotValue}>
                {orderSummary.readyForPickup}
              </Text>
            </View>
            <View style={styles.snapshotCard}>
              <Text style={styles.snapshotLabel}>In Transit</Text>
              <Text style={styles.snapshotValue}>{orderSummary.inTransit}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Vehicle Type</Text>
              <Text style={styles.infoValue}>
                {delivery?.vehicle_type || "N/A"}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Registration</Text>
              <Text style={styles.infoValue}>
                {delivery?.vehicle_registration || "N/A"}
              </Text>
            </View>
            <View style={[styles.infoRow, styles.infoRowNoBorder]}>
              <Text style={styles.infoLabel}>Availability</Text>
              <Text
                style={[
                  styles.infoValue,
                  {
                    color: delivery?.is_available
                      ? colors.success
                      : colors.textSecondary,
                  },
                ]}
              >
                {delivery?.is_available ? "Online" : "Offline"}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payment Details</Text>
            {existingPaymentDetails && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={openBankDetailsModal}
              >
                <Ionicons
                  name="create-outline"
                  size={20}
                  color={colors.primary}
                />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.infoCard}>
            {existingPaymentDetails ? (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Payment Method</Text>
                  <Text style={styles.infoValue}>
                    {existingPaymentDetails.payment_method === "bank"
                      ? "Bank Account"
                      : "Mobile Money"}
                  </Text>
                </View>
                {existingPaymentDetails.payment_method === "bank" ? (
                  <>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Bank</Text>
                      <Text style={styles.infoValue}>
                        {existingPaymentDetails.bank_name}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Account Name</Text>
                      <Text style={styles.infoValue}>
                        {existingPaymentDetails.account_name}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Account Number</Text>
                      <Text style={styles.infoValue}>
                        {existingPaymentDetails.account_number}
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Provider</Text>
                      <Text style={styles.infoValue}>
                        {existingPaymentDetails.mobile_money_provider?.toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Number</Text>
                      <Text style={styles.infoValue}>
                        {existingPaymentDetails.mobile_money_number}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Name</Text>
                      <Text style={styles.infoValue}>
                        {existingPaymentDetails.mobile_money_name}
                      </Text>
                    </View>
                  </>
                )}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Verification</Text>
                  <Text
                    style={[
                      styles.infoValue,
                      {
                        color: existingPaymentDetails.is_verified
                          ? colors.success
                          : colors.warning,
                      },
                    ]}
                  >
                    {existingPaymentDetails.is_verified
                      ? "Verified"
                      : "Pending"}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Paystack Subaccount</Text>
                  <Text style={styles.infoValue}>
                    {subaccountStatus.subaccountCode || "Not created"}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Paystack Status</Text>
                  <Text
                    style={[
                      styles.infoValue,
                      {
                        color: subaccountStatus.verified
                          ? colors.success
                          : colors.warning,
                      },
                    ]}
                  >
                    {subaccountStatus.verified
                      ? "Verified on Paystack"
                      : "Unverified on Paystack"}
                  </Text>
                </View>

                {subaccountStatus.deletedFromPaystack ? (
                  <View style={styles.paystackWarningCard}>
                    <Text style={styles.paystackWarningTitle}>
                      Paystack subaccount missing
                    </Text>
                    <Text style={styles.paystackWarningText}>
                      Your saved account was removed on Paystack. Save payment
                      details again to recreate it.
                    </Text>
                  </View>
                ) : null}
              </>
            ) : (
              <TouchableOpacity
                style={styles.addPaymentButton}
                onPress={openBankDetailsModal}
                disabled={creatingSubaccount}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={24}
                  color={colors.primary}
                />
                <Text style={styles.addPaymentText}>
                  {creatingSubaccount
                    ? "Setting up payout account..."
                    : "Add Payment Details"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteAccountButton}
          onPress={() => setDeleteModalVisible(true)}
        >
          <Ionicons name="trash-outline" size={20} color={colors.error} />
          <Text style={styles.deleteAccountText}>Delete Delivery Account</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Payment Details Modal */}
      <Modal
        visible={bankModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBankModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payment Details</Text>
              <TouchableOpacity onPress={() => setBankModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Payment Method Selection */}
              <Text style={styles.inputLabel}>Payment Method</Text>
              <View style={styles.paymentMethodToggle}>
                <TouchableOpacity
                  style={[
                    styles.paymentMethodButton,
                    paymentMethod === "mobile_money" &&
                      styles.paymentMethodButtonActive,
                  ]}
                  onPress={() => setPaymentMethod("mobile_money")}
                >
                  <Ionicons
                    name="phone-portrait-outline"
                    size={20}
                    color={
                      paymentMethod === "mobile_money"
                        ? colors.white
                        : colors.text
                    }
                  />
                  <Text
                    style={[
                      styles.paymentMethodText,
                      paymentMethod === "mobile_money" &&
                        styles.paymentMethodTextActive,
                    ]}
                  >
                    Mobile Money
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.paymentMethodButton,
                    paymentMethod === "bank" &&
                      styles.paymentMethodButtonActive,
                  ]}
                  onPress={() => setPaymentMethod("bank")}
                >
                  <Ionicons
                    name="business-outline"
                    size={20}
                    color={
                      paymentMethod === "bank" ? colors.white : colors.text
                    }
                  />
                  <Text
                    style={[
                      styles.paymentMethodText,
                      paymentMethod === "bank" &&
                        styles.paymentMethodTextActive,
                    ]}
                  >
                    Bank Account
                  </Text>
                </TouchableOpacity>
              </View>

              {paymentMethod === "bank" ? (
                <>
                  <Text style={styles.inputLabel}>Account Name</Text>
                  <TextInput
                    style={styles.input}
                    value={accountName}
                    onChangeText={setAccountName}
                    placeholder="Enter account name"
                    placeholderTextColor={colors.textSecondary}
                  />

                  <Text style={styles.inputLabel}>Account Number</Text>
                  <TextInput
                    style={styles.input}
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                    placeholder="Enter account number"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />

                  <Text style={styles.inputLabel}>Bank Name</Text>
                  <TouchableOpacity
                    style={styles.bankSelector}
                    onPress={() => setBankPickerVisible(true)}
                    disabled={loadingBanks}
                  >
                    {loadingBanks ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons
                        name="business-outline"
                        size={20}
                        color={colors.primary}
                      />
                    )}
                    <Text
                      style={
                        bankName
                          ? styles.bankSelectorValue
                          : styles.bankSelectorPlaceholder
                      }
                    >
                      {bankName ||
                        (loadingBanks
                          ? "Loading banks..."
                          : "Select Ghana bank")}
                    </Text>
                    <Ionicons
                      name="chevron-down"
                      size={18}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.refreshBanksButton}
                    onPress={() => loadGhanaBanks(bankName)}
                    disabled={loadingBanks}
                  >
                    {loadingBanks ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Text style={styles.refreshBanksText}>Refresh Banks</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.inputLabel}>Mobile Money Provider</Text>
                  <View style={styles.providerButtons}>
                    {["mtn", "vodafone", "airteltigo"].map((provider) => (
                      <TouchableOpacity
                        key={provider}
                        style={[
                          styles.providerButton,
                          mobileMoneyProvider === provider &&
                            styles.providerButtonActive,
                        ]}
                        onPress={() => setMobileMoneyProvider(provider)}
                      >
                        <Text
                          style={[
                            styles.providerText,
                            mobileMoneyProvider === provider &&
                              styles.providerTextActive,
                          ]}
                        >
                          {provider === "airteltigo"
                            ? "AirtelTigo"
                            : provider.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.inputLabel}>Mobile Money Number</Text>
                  <TextInput
                    style={styles.input}
                    value={mobileMoneyNumber}
                    onChangeText={setMobileMoneyNumber}
                    placeholder="Enter mobile money number"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="phone-pad"
                  />

                  <Text style={styles.inputLabel}>Account Name</Text>
                  <TextInput
                    style={styles.input}
                    value={mobileMoneyName}
                    onChangeText={setMobileMoneyName}
                    placeholder="Enter account name"
                    placeholderTextColor={colors.textSecondary}
                  />
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => setBankModalVisible(false)}
              >
                <Text style={styles.buttonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={handleSaveBankDetails}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.buttonPrimaryText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={bankPickerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBankPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Ghana Bank</Text>
              <TouchableOpacity onPress={() => setBankPickerVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.bankSearchWrap}>
                <Ionicons
                  name="search"
                  size={18}
                  color={colors.textSecondary}
                />
                <TextInput
                  style={styles.bankSearchInput}
                  value={bankSearchQuery}
                  onChangeText={setBankSearchQuery}
                  placeholder="Search bank"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <ScrollView
                style={styles.bankListScroll}
                showsVerticalScrollIndicator={false}
              >
                {filteredGhanaBanks.length === 0 ? (
                  <Text style={styles.emptyBanksText}>
                    {loadingBanks
                      ? "Loading banks..."
                      : "No banks found. Try refreshing."}
                  </Text>
                ) : (
                  filteredGhanaBanks.map((bank) => {
                    const isSelected =
                      String(bankCode || "").toLowerCase() ===
                        String(bank.code || "").toLowerCase() ||
                      String(bankName || "").toLowerCase() ===
                        String(bank.name || "").toLowerCase();

                    return (
                      <TouchableOpacity
                        key={bank.code}
                        style={[
                          styles.bankItem,
                          isSelected && styles.bankItemSelected,
                        ]}
                        onPress={() => {
                          setBankName(bank.name);
                          setBankCode(bank.code);
                          setBankPickerVisible(false);
                          setBankSearchQuery("");
                        }}
                      >
                        <View style={styles.bankItemTextWrap}>
                          <Text style={styles.bankItemName}>{bank.name}</Text>
                          <Text style={styles.bankItemCode}>
                            Code: {bank.code}
                          </Text>
                        </View>
                        {isSelected ? (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color={colors.primary}
                          />
                        ) : null}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={deleteModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeDeleteModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Deactivation</Text>
              <TouchableOpacity onPress={closeDeleteModal}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.deleteDescription}>
                Enter your password to deactivate your delivery account. You
                must have no active deliveries and no pending earnings.
              </Text>

              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                value={deletePassword}
                onChangeText={setDeletePassword}
                placeholder="Enter your password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Reason (Optional)</Text>
              <TextInput
                style={[styles.input, styles.deleteReasonInput]}
                value={deleteReason}
                onChangeText={setDeleteReason}
                placeholder="Tell us why you are leaving"
                placeholderTextColor={colors.textSecondary}
                multiline
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={closeDeleteModal}
                disabled={deletingAccount}
              >
                <Text style={styles.buttonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.deleteButton]}
                onPress={handleDeleteAccount}
                disabled={deletingAccount}
              >
                {deletingAccount ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.buttonPrimaryText}>Deactivate</Text>
                )}
              </TouchableOpacity>
            </View>
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
  content: {
    padding: spacing.lg,
  },
  profileHero: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileTextWrap: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  verificationPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  verificationPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  email: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.lg,
    ...shadows.sm,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoRowNoBorder: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  snapshotRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  snapshotCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  snapshotLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  snapshotValue: {
    marginTop: spacing.sm,
    fontSize: 28,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    padding: spacing.lg,
    borderRadius: radii.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.error,
    marginTop: spacing.lg,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.error,
  },
  deleteAccountButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    padding: spacing.lg,
    borderRadius: radii.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.error,
    marginTop: spacing.md,
  },
  deleteAccountText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.error,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  addPaymentButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.sm,
  },
  addPaymentText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  modalBody: {
    padding: spacing.lg,
  },
  modalFooter: {
    flexDirection: "row",
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  deleteDescription: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  deleteReasonInput: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
  },
  bankSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  bankSelectorValue: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "500",
  },
  bankSelectorPlaceholder: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 16,
  },
  refreshBanksButton: {
    marginTop: spacing.sm,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
  },
  refreshBanksText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 13,
  },
  bankSearchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  bankSearchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    paddingVertical: spacing.sm,
  },
  bankListScroll: {
    maxHeight: 360,
  },
  emptyBanksText: {
    color: colors.textSecondary,
    textAlign: "center",
    paddingVertical: spacing.lg,
  },
  bankItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  bankItemSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}14`,
  },
  bankItemTextWrap: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  bankItemName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  bankItemCode: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  paystackWarningCard: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radii.md,
    padding: spacing.md,
    backgroundColor: `${colors.warning}14`,
  },
  paystackWarningTitle: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  paystackWarningText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  paymentMethodToggle: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  paymentMethodButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  paymentMethodButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  paymentMethodTextActive: {
    color: colors.white,
  },
  providerButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  providerButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  providerButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  providerText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  providerTextActive: {
    color: colors.white,
  },
  button: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  deleteButton: {
    backgroundColor: colors.error,
  },
  buttonSecondary: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonPrimaryText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  buttonSecondaryText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
});
