import React, {
  useState,
  useRef,
  useCallback,
  useContext,
  useEffect,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Animated,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  PanGestureHandler,
  State,
  GestureHandlerRootView,
  ScrollView,
} from "react-native-gesture-handler";
import { Colors } from "../../../constants/Colors";
import { router } from "expo-router";
import { AuthContext } from "../../../AuthContext";
import { database } from "../../../FirebaseConfig";
import {
  ref,
  query,
  orderByChild,
  equalTo,
  onValue,
  get,
  update,
} from "firebase/database";
import CustomModal from "../../../components/Modal/CustomModal";
const { width } = Dimensions.get("window");
const SWIPE_THRESHOLD = width * 0.15; // Reduced threshold for faster response

const Profile = () => {
  const [activeTab, setActiveTab] = useState("Pending");
  const [isLoading, setIsLoading] = useState(true);
  const translateX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);
  const isAnimating = useRef(false);
  const tabs = ["Pending", "Upcoming", "Complete", "Cancel"];
  const { userID } = useContext(AuthContext);
  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [completedAppointments, setCompletedAppointments] = useState([]);
  const [canceledAppointments, setCanceledAppointments] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalType, setModalType] = useState("error");
  const [selectedAppointment, setSelectedAppointment] = useState(null);
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

  useEffect(() => {
    if (!userID) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const appointmentsRef = ref(database, "appointments");
    const teachersRef = ref(database, "users/teachers");

    const appointmentsQuery = query(
      appointmentsRef,
      orderByChild("studentId"),
      equalTo(userID)
    );

    // Set up real-time listener for appointments
    const unsubscribe = onValue(
      appointmentsQuery,
      async (snapshot) => {
        try {
          const teachersSnapshot = await get(teachersRef);
          const teachersData = teachersSnapshot.val() || {};

          const pending = [];
          const upcoming = [];
          const completed = [];
          const canceled = [];

          if (snapshot.exists()) {
            const appointmentsData = snapshot.val();

            Object.entries(appointmentsData).forEach(([id, appointment]) => {
              const teacher = teachersData[appointment.teacherId];
              const teacherName = teacher
                ? `Teacher ${teacher.firstName} ${teacher.lastName}`
                : "Unknown Teacher";

              const formattedAppointment = {
                id: id,
                title: teacherName,
                type: appointment.type,
                date: new Date(appointment.date).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                }),
                time: appointment.time,
                status: appointment.status,
                reason: appointment.reason || "No reason provided",
                remarks: appointment.remarks || "No reason provided", // Add this line
              };

              // Sort appointments based on status
              switch (appointment.status.toLowerCase()) {
                case "pending":
                  pending.push({
                    ...formattedAppointment,
                    status: "Pending",
                  });
                  break;
                case "confirmed":
                  upcoming.push({
                    ...formattedAppointment,
                    status: "Confirmed",
                  });
                  break;
                case "completed":
                  completed.push({
                    ...formattedAppointment,
                    status: "Completed",
                  });
                  break;
                case "cancelled":
                case "canceled":
                  canceled.push({
                    ...formattedAppointment,
                    status: "Canceled",
                  });
                  break;
                default:
                  console.warn(
                    `Unknown appointment status: ${appointment.status}`
                  );
              }
            });
          }

          // Sort appointments by date
          const sortByDate = (a, b) => new Date(b.date) - new Date(a.date);

          setPendingAppointments(pending.sort(sortByDate));
          setUpcomingAppointments(upcoming.sort(sortByDate));
          setCompletedAppointments(completed.sort(sortByDate));
          setCanceledAppointments(canceled.sort(sortByDate));
        } catch (error) {
          console.error("Error processing appointments:", error);
        } finally {
          setIsLoading(false);
        }
      },
      (error) => {
        console.error("Database error:", error);
        setIsLoading(false);
      }
    );

    // Cleanup listener on component unmount
    return () => unsubscribe();
  }, [userID]);

  const onGestureEvent = useCallback(
    Animated.event([{ nativeEvent: { translationX: translateX } }], {
      useNativeDriver: true,
    }),
    []
  );

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

      await refreshAppointments();

      setIsModalVisible(true);
      setModalType("success");
      setSelectedAppointment(null);
      setCancellationReason("");
      setReasonError("");
      setModalConfig({
        title: "Appointment Cancelled",
        message: "Your appointment has been successfully cancelled.",
        type: "success",
      });
      setModalVisible(true);
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      setIsModalVisible(true);
      setModalType("error");
    } finally {
      setIsCancelling(false);
    }
  };

  const refreshAppointments = async () => {
    if (!userID) return;

    const appointmentsRef = ref(database, "appointments");
    const teachersRef = ref(database, "users/teachers");

    try {
      const teachersSnapshot = await get(teachersRef);
      const teachersData = teachersSnapshot.val() || {};

      const appointmentsQuery = query(
        appointmentsRef,
        orderByChild("studentId"),
        equalTo(userID)
      );

      const snapshot = await get(appointmentsQuery);
      const pending = [];
      const upcoming = [];
      const completed = [];
      const canceled = [];

      if (snapshot.exists()) {
        const appointmentsData = snapshot.val();

        Object.entries(appointmentsData).forEach(([id, appointment]) => {
          const teacher = teachersData[appointment.teacherId];
          const teacherName = teacher
            ? `Prof. ${teacher.firstName} ${teacher.lastName}`
            : "Unknown Teacher";

          const formattedAppointment = {
            id: id,
            title: teacherName,
            type: appointment.type,
            // Store the original date for accurate sorting
            originalDate: appointment.date,
            date: new Date(appointment.date).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            }),
            time: appointment.time,
            status: appointment.status,
            reason: appointment.reason || "No reason provided",
            remarks: appointment.remarks || "No reason provided",
          };

          switch (appointment.status.toLowerCase()) {
            case "pending":
              pending.push({
                ...formattedAppointment,
                status: "Pending",
              });
              break;
            case "confirmed":
              upcoming.push({
                ...formattedAppointment,
                status: "Confirmed",
              });
              break;
            case "completed":
              completed.push({
                ...formattedAppointment,
                status: "Completed",
              });
              break;
            case "cancelled":
            case "canceled":
              canceled.push({
                ...formattedAppointment,
                status: "Canceled",
              });
              break;
          }
        });
      }

      const sortByDate = (a, b) => {
        // Parse dates from the originalDate field
        const dateA = new Date(a.originalDate);
        const dateB = new Date(b.originalDate);
        return dateA - dateB; // Ascending order (older dates first)
      };

      setPendingAppointments(pending.sort(sortByDate));
      setUpcomingAppointments(upcoming.sort(sortByDate));
      setCompletedAppointments(completed.sort(sortByDate));
      setCanceledAppointments(canceled.sort(sortByDate));
    } catch (error) {
      console.error("Error refreshing appointments:", error);
    }
  };

  const onHandlerStateChange = useCallback(
    (event) => {
      if (event.nativeEvent.oldState === State.ACTIVE) {
        if (isAnimating.current) return;

        const { translationX: gestureTranslationX } = event.nativeEvent;

        if (Math.abs(gestureTranslationX) > SWIPE_THRESHOLD) {
          isAnimating.current = true;
          const currentIndex = tabs.indexOf(activeTab);
          const nextIndex =
            gestureTranslationX > 0
              ? Math.max(0, currentIndex - 1)
              : Math.min(tabs.length - 1, currentIndex + 1);

          if (currentIndex !== nextIndex) {
            setActiveTab(tabs[nextIndex]);
          }
        }

        // Optimized spring animation
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          friction: 10, // Lower friction for faster movement
          tension: 100, // Higher tension for snappier response
        }).start(() => {
          isAnimating.current = false;
        });
      }
    },
    [activeTab, tabs]
  );

  const getAppointments = () => {
    switch (activeTab) {
      case "Upcoming":
        return upcomingAppointments;
      case "Pending":
        return pendingAppointments;
      case "Complete":
        return completedAppointments;
      case "Cancel":
        return canceledAppointments;
      default:
        return pendingAppointments;
    }
  };

  const AppointmentCard = ({ appointment }) => (
    <TouchableOpacity
      onPress={() =>
        router.push({
          pathname: "/Student/viewappointments",
          params: appointment,
        })
      }
    >
      <View style={styles.appointmentCard}>
        <View style={styles.appointmentHeader}>
          <View style={styles.iconContainer}>
            {appointment.type === "Medicine" ? (
              <Ionicons name="medical" size={20} color="#666" />
            ) : (
              <Ionicons name="calendar" size={20} color="#666" />
            )}
          </View>
          <View style={styles.appointmentInfo}>
            <Text style={styles.appointmentTitle}>{appointment.title}</Text>
            <Text style={styles.appointmentType}>{appointment.type}</Text>
          </View>
        </View>
        <View style={styles.dateContainer}>
          <View style={styles.dateInfo}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.dateText}>{appointment.date}</Text>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.timeText}>{appointment.time}</Text>
          </View>
        </View>
        {appointment.status === "Pending" && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={(e) => {
                e.stopPropagation();
                setSelectedAppointment(appointment);
                setConfirmModalVisible(true);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.statusContainer}>
          <Text
            style={[
              styles.statusText,
              appointment.status === "Completed"
                ? styles.completedStatus
                : appointment.status === "Confirmed"
                ? styles.upcomingStatus
                : appointment.status === "Pending"
                ? styles.pendingStatus
                : styles.canceledStatus,
            ]}
          >
            {appointment.status}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <CustomModal
        visible={confirmModalVisible}
        title="Cancel Appointment"
        type="error"
        onClose={() => {
          if (!isCancelling) {
            setConfirmModalVisible(false);
            setCancellationReason("");
            setReasonError("");
          }
        }}
        onConfirm={() => {
          if (selectedAppointment && !isCancelling) {
            handleCancelAppointment(selectedAppointment.id);
          }
        }}
        cancelButtonText="No"
        confirmButtonText={isCancelling ? "Cancelling..." : "Yes"}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalMessage}>
            Are you sure you want to cancel this appointment? This action cannot
            be undone.
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

      {/* Loading Overlay */}
      {isCancelling && (
        <View style={styles.loadingOverlay_Cancel}>
          <View style={styles.loadingModalContainer_Cancel}>
            <View style={styles.loadingIconContainer_Cancel}>
              <ActivityIndicator size="large" color={Colors.PRIMARY} />
            </View>
            <Text style={styles.loadingTitle_Cancel}>Please Wait</Text>
            <Text style={styles.loadingMessage_Cancel}>
              Canceling your appointment...
            </Text>
          </View>
        </View>
      )}

      <CustomModal
        visible={modalVisible}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onClose={() => {
          setModalVisible(false);
        }}
      />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Consultations</Text>
      </View>

      {/* MODIFIED: Improved tab container for better responsiveness */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <View style={styles.tabTextContainer}>
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.activeTabText,
                  { fontSize: width < 350 ? 9 : 11 }, // Smaller font on very small devices
                ]}
                numberOfLines={1} // Force single line
                adjustsFontSizeToFit={true} // Automatically adjust font size
              >
                {tab}
              </Text>
              {(tab === "Pending" || tab === "Upcoming") &&
                ((tab === "Pending" && pendingAppointments.length > 0) ||
                (tab === "Upcoming" && upcomingAppointments.length > 0) ? (
                  <View style={styles.counterBadge}>
                    <Text style={styles.counterBadgeText}>
                      {tab === "Pending"
                        ? pendingAppointments.length
                        : upcomingAppointments.length}
                    </Text>
                  </View>
                ) : null)}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <GestureHandlerRootView style={styles.gestureContainer}>
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
          activeOffsetX={[-10, 10]}
          activeOffsetY={[-15, 15]}
        >
          <Animated.View
            style={[
              styles.animatedContainer,
              {
                transform: [
                  {
                    translateX: translateX.interpolate({
                      inputRange: [-width, width],
                      outputRange: [-width / 2, width / 2],
                      extrapolate: "clamp",
                    }),
                  },
                ],
              },
            ]}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.PRIMARY} />
                <Text style={styles.loadingText}>Loading appointments...</Text>
              </View>
            ) : (
              <ScrollView
                ref={scrollViewRef}
                style={styles.appointmentsList}
                showsVerticalScrollIndicator={false}
                bounces={true}
                scrollEventThrottle={16}
                removeClippedSubviews={true}
                windowSize={5}
              >
                {getAppointments().length > 0 ? (
                  getAppointments().map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                    />
                  ))
                ) : (
                  <View style={styles.noRecordsContainer}>
                    <Ionicons
                      name="document-text-outline"
                      size={64}
                      color="#CCCCCC"
                    />
                    <Text style={styles.noRecordsText}>No records found</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </Animated.View>
        </PanGestureHandler>
      </GestureHandlerRootView>

      <TouchableOpacity
        style={styles.setAppointmentButton}
        onPress={() => {
          router.push("/Student/setappointment");
        }}
      >
        <Ionicons name="add" size={24} color="#FFF" />
      </TouchableOpacity>
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
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "outfit-bold",
  },
  loadingOverlay_Cancel: {
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
  loadingModalContainer_Cancel: {
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
  loadingIconContainer_Cancel: {
    marginBottom: 16,
    height: 48,
    justifyContent: "center",
  },
  loadingTitle_Cancel: {
    fontSize: 18,
    fontFamily: "outfit-medium",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  loadingMessage_Cancel: {
    fontSize: 14,
    fontFamily: "outfit",
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },

  // MODIFIED: Improved tab container styles for better responsiveness
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#F0F4F8",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 25,
    padding: 4,
    height: 45,
    alignItems: "center",
  },
  tab: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 22,
    margin: 2,
    paddingHorizontal: 4, // Reduced horizontal padding
  },
  activeTab: {
    backgroundColor: Colors.PRIMARY,
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  tabTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    width: "100%", // Ensure the container takes full width
  },
  tabText: {
    color: "#666",
    fontFamily: "outfit",
    textAlign: "center", // Center the text
  },
  activeTabText: {
    color: "#fff",
    fontWeight: "600",
  },
  counterBadge: {
    position: "absolute",
    top: -10,
    right: -10, // Adjusted to be closer on small screens
    backgroundColor: "#FF3B30",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  counterBadgeText: {
    color: "white",
    fontSize: 10,
    fontFamily: "outfit-bold",
    textAlign: "center",
  },
  noRecordsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
    marginTop: 50,
  },
  noRecordsText: {
    marginTop: 16,
    color: "#888888",
    fontSize: 16,
    fontFamily: "outfit-medium",
    textAlign: "center",
  },
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
  gestureContainer: {
    flex: 1,
    overflow: "hidden",
  },
  animatedContainer: {
    flex: 1,
    width: "100%",
  },
  appointmentsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  appointmentCard: {
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
  appointmentHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 40,
    height: 40,
    backgroundColor: "#F5F5F5",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentTitle: {
    fontSize: 16,
    fontWeight: "500",
    fontFamily: "outfit-medium",
  },
  appointmentType: {
    color: "#666",
    fontSize: 14,
    marginTop: 4,
    fontFamily: "outfit",
  },
  dateContainer: {
    marginTop: 7,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
  },
  dateInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateText: {
    marginLeft: 8,
    marginRight: 16,
    color: "#666",
    fontFamily: "outfit",
  },
  timeText: {
    marginLeft: 8,
    color: "#666",
    fontFamily: "outfit",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 13,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.PRIMARY,
    borderRadius: 8,
    marginRight: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    color: Colors.PRIMARY,
  },
  rescheduleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.PRIMARY,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: "center",
  },
  rescheduleButtonText: {
    color: "#fff",
  },
  statusContainer: {
    marginTop: 16,
    alignItems: "center",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
  },
  completedStatus: {
    color: "#4CAF50",
    fontFamily: "outfit",
  },
  canceledStatus: {
    color: "#F44336",
    fontFamily: "outfit",
  },
  upcomingStatus: {
    color: "#2196F3",
    fontFamily: "outfit",
  },
  pendingStatus: {
    color: "#FFAB19",
    fontFamily: "outfit",
  },
  setAppointmentButton: {
    position: "absolute",
    right: 20,
    bottom: 5,
    width: 60,
    height: 60,
    borderRadius: 45,
    backgroundColor: Colors.PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 16,
    fontFamily: "outfit",
  },
});

export default Profile;
