import React, { useState, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/Colors";
import { router, useLocalSearchParams } from "expo-router";
import { database } from "../../FirebaseConfig";
import { ref, update } from "firebase/database";
import CustomModal from "../../components/Modal/CustomModal";

const ViewAppointment = () => {
  const params = useLocalSearchParams();
  const appointment = params;

  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    type: "success",
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "#4CAF50";
      case "Confirmed":
        return "#2196F3";
      case "Pending":
        return "#FFAB19";
      case "Canceled":
        return "#F44336";
      default:
        return "#666";
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!cancellationReason.trim()) {
      setReasonError("Please provide a reason for cancellation");
      return;
    }

    setIsCancelling(true);
    setConfirmModalVisible(false);

    try {
      const appointmentRef = ref(database, `appointments/${appointmentId}`);
      await update(appointmentRef, {
        status: "cancelled",
        remarks: cancellationReason.trim(),
      });

      setModalConfig({
        title: "Consultation Cancelled",
        message: "Your consultation has been successfully cancelled.",
        type: "success",
      });
      setModalVisible(true);
    } catch (error) {
      console.error("Error cancelling consultation:", error);
      setModalConfig({
        title: "Error",
        message: "Failed to cancel consultation. Please try again.",
        type: "error",
      });
      setModalVisible(true);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <CustomModal
        visible={confirmModalVisible}
        title="Cancel Consultation"
        type="error"
        onClose={() => {
          if (!isCancelling) {
            setConfirmModalVisible(false);
            setCancellationReason("");
            setReasonError("");
          }
        }}
        onConfirm={() => {
          if (appointment && !isCancelling) {
            handleCancelAppointment(appointment.id);
          }
        }}
        cancelButtonText="No"
        confirmButtonText={isCancelling ? "Cancelling..." : "Yes"}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalMessage}>
            Are you sure you want to cancel this consultation? This action
            cannot be undone.
          </Text>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Reason for Cancellation:</Text>
            <TextInput
              style={[
                styles.reasonInput,
                reasonError ? styles.inputError : null,
              ]}
              placeholder="Please provide a reason for cancellation"
              value={cancellationReason}
              onChangeText={(text) => {
                setCancellationReason(text);
                if (text.trim()) setReasonError("");
              }}
              multiline={true}
              numberOfLines={3}
              textAlignVertical="top"
              editable={!isCancelling}
            />
            {reasonError ? (
              <Text style={styles.errorText}>{reasonError}</Text>
            ) : null}
          </View>
        </View>
      </CustomModal>

      <CustomModal
        visible={modalVisible}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onClose={() => {
          setModalVisible(false);
          if (modalConfig.type === "success") {
            router.back();
          }
        }}
      />

      {/* Loading Overlay */}
      {isCancelling && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingModalContainer}>
            <View style={styles.loadingIconContainer}>
              <ActivityIndicator size="large" color={Colors.PRIMARY} />
            </View>
            <Text style={styles.loadingTitle}>Please Wait</Text>
            <Text style={styles.loadingMessage}>
              Canceling your consultation...
            </Text>
          </View>
        </View>
      )}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Consultation Details</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Status Badge */}
        <View style={styles.statusSection}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(appointment.status) },
            ]}
          >
            <Text style={styles.statusText}>{appointment.status}</Text>
          </View>
        </View>

        {/* Teacher Info Section */}
        <View style={styles.section}>
          <View style={styles.teacherInfoContainer}>
            <View style={styles.iconContainer}>
              <Ionicons name="person" size={32} color={Colors.PRIMARY} />
            </View>
            <View style={styles.teacherDetails}>
              <Text style={styles.teacherName}>{appointment.title}</Text>
              <Text style={styles.appointmentType}>{appointment.type}</Text>
            </View>
          </View>
        </View>

        {/* Date & Time Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date & Time</Text>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color="#666" />
            <Text style={styles.detailText}>{appointment.date}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={20} color="#666" />
            <Text style={styles.detailText}>{appointment.time}</Text>
          </View>
        </View>

        {/* Reason Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reason for Consultation</Text>
          <View style={styles.reasonContainer}>
            <Ionicons name="document-text-outline" size={20} color="#666" />
            <Text style={styles.reasonText}>
              {appointment.reason || "No reason provided"}
            </Text>
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Remarks</Text>
          <View style={styles.reasonContainer}>
            <Ionicons name="document-text-outline" size={20} color="#666" />
            <Text style={styles.reasonText}>
              {appointment.remarks?.trim() || "No remarks provided"}
            </Text>
          </View>
        </View>

        {/* Actions Section */}
        {appointment.status === "Pending" && (
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setConfirmModalVisible(true)}
            >
              <Ionicons
                name="close-circle-outline"
                size={20}
                color={Colors.PRIMARY}
              />
              <Text style={styles.cancelButtonText}>Cancel Consultation</Text>
            </TouchableOpacity>

            {/* <TouchableOpacity style={styles.rescheduleButton}>
              <Ionicons name="calendar-outline" size={20} color="#FFF" />
              <Text style={styles.rescheduleButtonText}>Reschedule</Text>
            </TouchableOpacity> */}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: Colors.PRIMARY,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "outfit-bold",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statusSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "outfit-medium",
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  teacherInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 60,
    height: 60,
    backgroundColor: "#F5F5F5",
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  teacherDetails: {
    flex: 1,
  },
  teacherName: {
    fontSize: 18,
    fontFamily: "outfit-bold",
    color: "#333",
  },
  appointmentType: {
    fontSize: 16,
    color: "#666",
    fontFamily: "outfit",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "outfit-medium",
    color: "#333",
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 12,
    fontSize: 16,
    color: "#666",
    fontFamily: "outfit",
  },
  reasonContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 8,
  },
  reasonText: {
    marginLeft: 12,
    fontSize: 16,
    color: "#666",
    fontFamily: "outfit",
    flex: 1,
    lineHeight: 24,
  },
  actionSection: {
    gap: 12,
    marginBottom: 16,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.PRIMARY,
    gap: 8,
  },
  cancelButtonText: {
    color: Colors.PRIMARY,
    fontSize: 16,
    fontFamily: "outfit-medium",
  },
  rescheduleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.PRIMARY,
    gap: 8,
  },
  rescheduleButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "outfit-medium",
  },
  // Modal and loading overlay styles
  modalContent: {
    width: "100%",
    marginBottom: 5,
  },
  modalMessage: {
    fontSize: 14,
    fontFamily: "outfit",
    color: "#666",
    marginBottom: 16,
    textAlign: "center",
  },
  inputContainer: {
    width: "100%",
    marginTop: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: "outfit-medium",
    color: "#333",
    marginBottom: 8,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: "outfit",
    backgroundColor: "#F5F5F5",
    minHeight: 80,
    width: "100%",
    color: "#333",
  },
  inputError: {
    borderColor: "#FF5252",
  },
  errorText: {
    color: "#FF5252",
    fontSize: 12,
    fontFamily: "outfit",
    marginTop: 4,
  },
  loadingOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  loadingModalContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    minWidth: 270,
    maxWidth: "80%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingIconContainer: {
    marginBottom: 16,
    height: 48,
    justifyContent: "center",
  },
  loadingTitle: {
    fontSize: 18,
    fontFamily: "outfit-medium",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  loadingMessage: {
    fontSize: 14,
    fontFamily: "outfit",
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
});

export default ViewAppointment;
