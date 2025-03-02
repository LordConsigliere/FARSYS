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
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  PanGestureHandler,
  State,
  GestureHandlerRootView,
  ScrollView,
} from "react-native-gesture-handler";
import { Colors } from "../../constants/Colors";
import { router } from "expo-router";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { AuthContext } from "../../AuthContext";
import { ref, get, child, update, onValue, off } from "firebase/database";
import { database } from "../../FirebaseConfig";
import { v4 as uuidv4 } from "uuid"; // Import uuid
import "react-native-get-random-values"; //Import crypto polyfill

const { width } = Dimensions.get("window");
const SWIPE_THRESHOLD = width * 0.15;

const TeacherAppointment = () => {
  const [activeTab, setActiveTab] = useState("Pending");
  const translateX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);
  const isAnimating = useRef(false);
  const tabs = ["Pending", "Upcoming", "Complete", "Cancel"];
  const { username } = useContext(AuthContext);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [DeclineAppointment, setDeclineAppointment] = useState(null);
 
  const [confirmationVisible, setConfirmationVisible] = useState(false);

  const [remarkText, setRemarkText] = useState("");

  const [currentTeacherId, setCurrentTeacherId] = useState(null);
  useEffect(() => {
    let appointmentsRef;
    let teacherId;

    const setupRealtimeListener = async () => {
      if (username) {
        try {
          const dbRef = ref(database);

          // Fetch teacher data first
          const teacherSnapshot = await get(child(dbRef, "users/teachers"));
          const teacherDataJSON = teacherSnapshot.toJSON();

          if (teacherDataJSON) {
            for (const key in teacherDataJSON) {
              const data = teacherDataJSON[key];
              if (data && data.username === username) {
                teacherId = key;
                setCurrentTeacherId(key);
                break;
              }
            }
          }

          // Fetch students data
          const studentsSnapshot = await get(child(dbRef, "users/students"));
          const studentsData = {};
          studentsSnapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            if (data) {
              studentsData[childSnapshot.key] = data;
            }
          });
          setStudents(studentsData);

          // Set up real-time listener for appointments
          if (teacherId) {
            appointmentsRef = ref(database, "appointments");
            onValue(appointmentsRef, (snapshot) => {
              const appointmentsData = [];
              snapshot.forEach((childSnapshot) => {
                const appointment = childSnapshot.val();
                if (appointment && appointment.teacherId === teacherId) {
                  appointmentsData.push({
                    ...appointment,
                    id: childSnapshot.key,
                  });
                }
              });
              setAppointments(appointmentsData);
              setLoading(false);
            });
          }
        } catch (error) {
          console.error("Error setting up real-time listener:", error);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    setupRealtimeListener();

    // Cleanup function to remove listeners when component unmounts
    return () => {
      if (appointmentsRef) {
        off(appointmentsRef);
      }
    };
  }, [username]);

  const onGestureEvent = useCallback(
    Animated.event([{ nativeEvent: { translationX: translateX } }], {
      useNativeDriver: true,
    }),
    []
  );

  const openModal = (appointment) => {
    setSelectedAppointment(appointment);
    setModalVisible(true);
  };
  const closeModal = () => {
    setModalVisible(false);
    setSelectedAppointment(null);
  };

  const openDeclineModal = (appointment) => {
    setDeclineAppointment(appointment);
    setModalVisible(true);
  };
  const closeDeclineModal = () => {
    setModalVisible(false);
    setDeclineAppointment(null);
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
    const appointmentValues = Object.values(appointments);
    if (!appointmentValues) return [];

    // Get current date as YYYY-MM-DD string for comparison
    const today = new Date().toISOString().split("T")[0];

    let filteredAppointments = [];

    switch (activeTab) {
      case "Upcoming":
        filteredAppointments = appointments.filter(
          (appointment) => appointment.status === "Confirmed"
        );
        // Sort descending (newest first)
        return filteredAppointments.sort(
          (b, a) => new Date(b.date) - new Date(a.date)
        );

      case "Pending":
        filteredAppointments = appointments
          .map((appointment) => {
            if (appointment.status === "Pending") {
              // Get appointment date as YYYY-MM-DD string
              const appointmentDate = appointment.date;

              // Only cancel if appointment date is strictly less than today's date
              if (appointmentDate < today) {
                handleAppointmentStatusChange(
                  appointment,
                  "Canceled",
                  "The appointment is cancelled due to late response"
                );
                return { ...appointment, status: "Canceled" };
              }
            }
            return appointment;
          })
          .filter((appointment) => appointment.status === "Pending");
        // Sort ascending (oldest first)
        return filteredAppointments.sort(
          (a, b) => new Date(a.date) - new Date(b.date)
        );

      case "Complete":
        filteredAppointments = appointments.filter(
          (appointment) => appointment.status === "Completed"
        );
        // Sort descending (newest first)
        return filteredAppointments.sort(
          (b, a) => new Date(b.date) - new Date(a.date)
        );

      case "Cancel":
        filteredAppointments = appointments.filter(
          (appointment) =>
            appointment.status === "Declined" ||
            appointment.status === "Canceled"
        );
        // Sort descending (newest first)
        return filteredAppointments.sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        );

      default:
        filteredAppointments = appointments.filter(
          (appointment) => appointment.status === "Pending"
        );
        // Sort ascending (oldest first) for default case (which is Pending)
        return filteredAppointments.sort(
          (a, b) => new Date(a.date) - new Date(b.date)
        );
    }
  };
  const currentAppointments = getAppointments();
  const handleAppointmentStatusChange = async (
    appointment,
    newStatus,
    remarks
  ) => {
    // Initialize metrics object
    const metrics = {};
    const totalStart = performance.now(); // Start measuring total latency
  
    try {
      // Start measuring Firebase update latency
      const firebaseStart = performance.now();
  
      const appointmentRef = ref(database, `appointments/${appointment.id}`);
      const updates = {
        status: newStatus,
        remarks: remarks, // Use new remarks if provided
      };
  
      // Update the appointment status in Firebase
      await update(appointmentRef, updates);
  
      // End measuring Firebase update latency
      const firebaseEnd = performance.now();
      metrics.firebaseLatency = Math.round(firebaseEnd - firebaseStart); // Round the value
  
      // Start measuring local state update latency
      const stateUpdateStart = performance.now();
  
      // Update the local state to reflect the new status
      setAppointments((prevAppointments) =>
        prevAppointments.map((item) =>
          item.id === appointment.id
            ? { ...item, status: newStatus, remarks: remarks }
            : item
        )
      );
  
      // End measuring local state update latency
      const stateUpdateEnd = performance.now();
      metrics.stateUpdateLatency = Math.round(stateUpdateEnd - stateUpdateStart); // Round the value
  
      // Close the decline modal and reset the remark text
      closeDeclineModal();
      setRemarkText("");
  
      // Show appropriate alerts based on the new status
      if (newStatus === "Confirmed") {
        Alert.alert("Consultation Accepted", "Consultation has been confirmed");
      } else if (newStatus === "Completed") {
        Alert.alert("Consultation Complete");
      } else if (newStatus === "Canceled") {
        Alert.alert(
          "Consultation Canceled",
          "Consultation has been declined. Please make sure the student was informed"
        );
      }
    } catch (error) {
      console.error("Error updating appointment:", error);
      Alert.alert("Error", "Failed to update consultation");
    } finally {
      // End measuring total latency
      const totalEnd = performance.now();
      metrics.totalLatency = Math.round(totalEnd - totalStart); // Round the value
  
      // Log metrics to the console in the desired format
      console.log(
        `Appointment status change metrics:
        - Firebase Latency: ${metrics.firebaseLatency}ms
        - State Update Latency: ${metrics.stateUpdateLatency}ms
        - Total Latency: ${metrics.totalLatency}ms`
      );
    }
  };
  const EmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <Icon name="calendar-blank" size={50} color="#ccc" />
      <Text style={styles.emptyStateSubText}>
        No records found
      </Text>
    </View>
  );
  const AppointmentCard = ({ appointment }) => (
    <TouchableOpacity onPress={() => openModal(appointment)}>
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
            <Text style={styles.appointmentTitle}>
              {students[appointment.studentId]?.firstName || "Student Name"}{" "}
              {students[appointment.studentId]?.lastName || "Student Name"}
            </Text>
            <Text style={styles.appointmentType}>{appointment.type}</Text>
          </View>
        </View>
        <View style={styles.dateContainer}>
          <View style={styles.dateInfo}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.dateText}>
              {new Date(appointment.date).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.timeText}>{appointment.time}</Text>
          </View>
        </View>
        {activeTab === "Pending" && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => openDeclineModal(appointment)}
            >
              <Text style={styles.cancelButtonText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rescheduleButton}
              onPress={() => {
                Alert.alert(
                  "Confirm Accept",
                  "Are you sure you want to accept this consultation?",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "OK",
                      onPress: () =>
                        handleAppointmentStatusChange(
                          appointment,
                          "Confirmed",
                          ""
                        ),
                    },
                  ]
                );
              }}
            >
              <Text style={styles.rescheduleButtonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === "Upcoming" && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.rescheduleButton}
              onPress={() => {
                Alert.alert(
                  "Complete Consultation",
                  "Are you sure the consultation is complete?",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "OK",
                      onPress: () =>
                        handleAppointmentStatusChange(
                          appointment,
                          "Completed",
                          ""
                        ),
                    },
                  ]
                );
              }}
            >
              <Text style={styles.rescheduleButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.statusContainer}>
          <Text
            style={[
              styles.statusText,
              activeTab === "Complete"
                ? styles.completedStatus
                : activeTab === "Upcoming"
                ? styles.upcomingStatus
                : activeTab === "Pending"
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

  const getStatusModalColor = (status) => {
    switch (status) {
      case "Pending":
        return "#A1E3F9";
      case "Confirmed":
        return "#A1E3F9";
      case "Canceled":
        return "#D84040";
      case "cancelled":
        return "#D84040";
      case "Completed":
        return "#16C47F";
      default:
        return "#ffffff";
    }
  };

  const renderModal = () => {
    if (!selectedAppointment) return null;

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Header Section */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={2}>
                {students[selectedAppointment.studentId]?.firstName ||
                  "Student Name"}{" "}
                {students[selectedAppointment.studentId]?.lastName ||
                  "Student Name"}
              </Text>
              <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Info Section */}
            <ScrollView style={styles.modalScrollContent}>
              <View style={styles.modalInfoSection}>
                <View style={styles.modalInfoRow}>
                  <Icon name="calendar" size={20} color="#3B82F6" />
                  <Text style={styles.modalInfoText}>
                    {new Date(selectedAppointment.date).toLocaleDateString(
                      "en-US",
                      {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      }
                    )}
                  </Text>
                </View>

                <View style={styles.modalInfoRow}>
                  <Icon name="clock-outline" size={20} color="#3B82F6" />
                  <Text style={styles.modalInfoText}>
                    {selectedAppointment.time}
                  </Text>
                </View>

                <View style={styles.modalInfoRow}>
                  <Icon name="format-list-bulleted" size={20} color="#3B82F6" />
                  <Text style={styles.modalInfoText}>
                    {selectedAppointment.type}
                  </Text>
                </View>
              </View>

              {/* Concern Section */}
              <View style={styles.concernSection}>
                <Text style={styles.modalLabel}>Concern Description</Text>
                <View style={styles.concernContainer}>
                  <Text style={styles.concernText}>
                    {selectedAppointment.reason ||
                      "No concern description provided"}
                  </Text>
                </View>

                <Text style={styles.modalremarks}>
                  Remarks:{" "}
                  {selectedAppointment.remarks || "No remarks provided"}
                </Text>

                {/* Status Badge */}
                <View style={styles.statusBadgeContainer}>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: getStatusModalColor(
                          selectedAppointment.status
                        ),
                      },
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>
                      {selectedAppointment.status}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const DeclineModal = () => {
    if (!DeclineAppointment) return null;

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeDeclineModal}
      >
        <View style={enhancedStyles.modalOverlay}>
          <View style={enhancedStyles.modalContent}>
            {/* Header */}
            <View style={enhancedStyles.modalHeader}>
              <Text style={enhancedStyles.modalHeaderText}>
                Decline Consultation
              </Text>
              <TouchableOpacity
                style={enhancedStyles.closeButton}
                onPress={closeDeclineModal}
              >
                <Icon name="close" size={24} color="#555" />
              </TouchableOpacity>
            </View>

            {/* Appointment Info Summary */}
            <View style={enhancedStyles.appointmentSummary}>
              <Text style={enhancedStyles.appointmentTitle}>
                {students[DeclineAppointment.studentId]?.firstName || "Student"}{" "}
                {students[DeclineAppointment.studentId]?.lastName || "Name"}
              </Text>
              <View style={enhancedStyles.appointmentDetails}>
                <View style={enhancedStyles.detailRow}>
                  <Icon
                    name="calendar-outline"
                    size={16}
                    color={Colors.PRIMARY}
                  />
                  <Text style={enhancedStyles.detailText}>
                    {new Date(DeclineAppointment.date).toLocaleDateString(
                      "en-US",
                      {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      }
                    )}
                  </Text>
                </View>
                <View style={enhancedStyles.detailRow}>
                  <Icon name="clock-outline" size={16} color={Colors.PRIMARY} />
                  <Text style={enhancedStyles.detailText}>
                    {DeclineAppointment.time}
                  </Text>
                </View>
                <View style={enhancedStyles.detailRow}>
                  <Icon
                    name="information-outline"
                    size={16}
                    color={Colors.PRIMARY}
                  />
                  <Text style={enhancedStyles.detailText}>
                    {DeclineAppointment.type}
                  </Text>
                </View>
              </View>
            </View>

            {/* Reason Input Section */}
            <View style={enhancedStyles.inputSection}>
              <Text style={enhancedStyles.inputLabel}>
                Reason for Declining:
              </Text>
              <TextInput
                style={enhancedStyles.reasonInput}
                multiline={true}
                value={remarkText}
                onChangeText={setRemarkText}
                placeholder="Please provide a reason for declining this consultation..."
                placeholderTextColor="#999"
                textAlignVertical="top"
                maxLength={500}
              />
              <Text style={enhancedStyles.charCount}>
                {remarkText.length}/500 characters
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={enhancedStyles.buttonContainer}>
              <TouchableOpacity
                style={enhancedStyles.cancelButton}
                onPress={closeDeclineModal}
              >
                <Text style={enhancedStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  enhancedStyles.declineButton,
                  !remarkText.trim() && enhancedStyles.disabledButton,
                ]}
                disabled={!remarkText.trim()}
                onPress={() => {
                  Alert.alert(
                    "Confirm Decline",
                    "Are you sure you want to decline this consultation?",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Decline",
                        onPress: () => {
                          handleAppointmentStatusChange(
                            DeclineAppointment,
                            "Canceled",
                            remarkText
                          );
                          // Show confirmation modal after declining
                          setTimeout(() => {
                            showDeclineConfirmation();
                          }, 500);
                        },
                      },
                    ]
                  );
                }}
              >
                <Text style={enhancedStyles.declineButtonText}>
                  Decline Consultation
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const showDeclineConfirmation = () => {
    setConfirmationVisible(true);
    setTimeout(() => {
      setConfirmationVisible(false);
    }, 2000);
  };

  const DeclineConfirmationModal = () => {
    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={confirmationVisible}
        onRequestClose={() => setConfirmationVisible(false)}
      >
        <View style={enhancedStyles.confirmationOverlay}>
          <View style={enhancedStyles.confirmationContainer}>
            <View style={enhancedStyles.iconContainer}>
              <Icon name="check-circle" size={60} color="#4CAF50" />
            </View>
            <Text style={enhancedStyles.confirmationTitle}>
              Consultation Declined
            </Text>
            <Text style={enhancedStyles.confirmationText}>
              The consultation has been successfully declined.
            </Text>
            <TouchableOpacity
              style={enhancedStyles.okButton}
              onPress={() => setConfirmationVisible(false)}
            >
              <Text style={enhancedStyles.okButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading Consultations...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Consultations</Text>
        </View>
        <View style={styles.tabContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.activeTabText,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
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
                transform: [{ translateX }],
              },
            ]}
          >
            <ScrollView
              ref={scrollViewRef}
              style={styles.appointmentsList}
              showsVerticalScrollIndicator={false}
              bounces={true}
              scrollEventThrottle={16}
              removeClippedSubviews={true}
              windowSize={5}
            >
              {currentAppointments.length > 0 ? (
                currentAppointments.map((appointment) => (
                  <AppointmentCard key={uuidv4()} appointment={appointment} />
                ))
              ) : (
                <EmptyState />
              )}
            </ScrollView>
          </Animated.View>
        </PanGestureHandler>
        {renderModal()}
        {DeclineModal()}
        {DeclineConfirmationModal()}
      </SafeAreaView>
    </GestureHandlerRootView>
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
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginTop: 100,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    fontFamily: 'outfit-medium',
  },
  emptyStateSubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    fontFamily: 'outfit',
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "outfit-bold",
  },
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
    flex: 0.8,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 15,
    borderRadius: 22,
    margin: 2,
  },
  activeTab: {
    backgroundColor: Colors.PRIMARY,
    flex: 0.8,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 15,
    borderRadius: 22,
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    color: "#666",
    fontSize: 10,
    fontFamily: "outfit",
  },
  activeTabText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
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
    marginTop: 12,
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
    marginTop: 16,
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },

  //decline modal
  modalContainer1: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent1: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    width: "90%",
    height: "50%",
  },
  modalTitle1: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 5,
  },
  modalType1: {
    fontSize: 14,
    marginBottom: 0,
    color: "#666",
  },
  modalDate1: {
    fontSize: 14,
    color: "#666",
    marginBottom: 0,
  },
  modalTime1: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 8,
  },
  modalLabel1: {
    fontSize: 14,
    color: "#666",
    marginBottom: 0,
  },
  modalReason1: {
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomColor: "#ddd",
    paddingVertical: 5,
    fontSize: 14,
    height: 200,
    textAlignVertical: "top",
    marginBottom: 5,
  },
  buttonContainer1: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  cancelButton1: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.PRIMARY,
    borderRadius: 8,
    marginRight: 8,
    alignItems: "center",
  },
  cancelButtonText1: {
    color: Colors.PRIMARY,
  },
  rescheduleButton1: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.PRIMARY,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: "center",
  },
  rescheduleButtonText1: {
    color: "#fff",
  },

  //modal
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 15,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "95%",
    maxHeight: "80%", // Adjust maximum height based on screen size
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    overflow: "hidden", // Ensure content doesn't spill out
  },
  modalScrollContent: {
    maxHeight: "100%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "outfit-bold",
    color: "#000000",
    flex: 1,
    flexWrap: "wrap",
  },
  closeButton: {
    padding: 5,
  },
  modalInfoSection: {
    padding: 15,
    backgroundColor: "#F5F5F5",
  },
  modalInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    flexWrap: "wrap",
  },
  modalInfoText: {
    marginLeft: 10,
    fontSize: 14,
    fontFamily: "outfit-medium",
    color: "#000000",
    flex: 1,
    flexWrap: "wrap",
  },
  concernSection: {
    padding: 15,
  },
  modalLabel: {
    fontSize: 16,
    fontFamily: "outfit-medium",
    color: "#000000",
    marginBottom: 8,
    textAlign: "left",
  },
  concernContainer: {
    backgroundColor: "#F5F5F5",
    padding: 10,
    borderRadius: 8,
    minHeight: 80, // Minimum height rather than fixed height
    maxHeight: 200, // Maximum height with scroll if needed
  },
  concernText: {
    fontSize: 14,
    fontFamily: "outfit-regular",
    color: "#000000",
    lineHeight: 20,
  },
  modalremarks: {
    marginTop: 15,
    marginBottom: 15,
    fontSize: 14,
    color: "#000000",
    fontFamily: "outfit",
  },
  statusBadgeContainer: {
    alignItems: "center",
    marginVertical: 10,
  },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 14,
    fontFamily: "outfit-medium",
    color: "#000000",
  },
});

//enhancestyles
const enhancedStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "100%",
    maxWidth: 500,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.PRIMARY,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalHeaderText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "outfit-bold",
  },
  closeButton: {
    padding: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 20,
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  appointmentSummary: {
    padding: 20,
    backgroundColor: "#f9f9f9",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  appointmentTitle: {
    fontSize: 16,
    fontFamily: "outfit-bold",
    marginBottom: 10,
    color: "#333",
  },
  appointmentDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: "outfit",
    color: "#555",
  },
  inputSection: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: "outfit-medium",
    marginBottom: 8,
    color: "#333",
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 120,
    backgroundColor: "#f9f9f9",
    fontFamily: "outfit",
    color: "#333",
  },
  charCount: {
    alignSelf: "flex-end",
    marginTop: 4,
    fontSize: 12,
    color: "#999",
    fontFamily: "outfit",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.PRIMARY,
    borderRadius: 8,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    color: Colors.PRIMARY,
    fontFamily: "outfit-medium",
    fontSize: 14,
  },
  declineButton: {
    flex: 2,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#D84040",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    backgroundColor: "#cccccc",
  },
  declineButtonText: {
    color: "#fff",
    fontFamily: "outfit-medium",
    fontSize: 14,
  },
  // Confirmation modal styles
  confirmationOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  confirmationContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "85%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
  },
  iconContainer: {
    marginBottom: 16,
  },
  confirmationTitle: {
    fontSize: 20,
    fontFamily: "outfit-bold",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  confirmationText: {
    fontSize: 14,
    fontFamily: "outfit",
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  okButton: {
    backgroundColor: Colors.PRIMARY,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    minWidth: 150,
    alignItems: "center",
  },
  okButtonText: {
    color: "#fff",
    fontFamily: "outfit-medium",
    fontSize: 16,
  },
});

export default TeacherAppointment;
