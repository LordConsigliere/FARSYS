import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import { ref, get, child, onValue, off } from "firebase/database";
import { database } from "../../FirebaseConfig";
import { AuthContext } from "../../AuthContext";
import { v4 as uuidv4 } from "uuid"; // Import uuid
import "react-native-get-random-values"; //Import crypto polyfill
import { Colors } from "./../../constants/Colors";
import { getAuth, signOut } from "firebase/auth";

const TeacherDashboard = () => {
  const [teacherData, setTeacherData] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { username } = useContext(AuthContext);
  const [students, setStudents] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const fetchTeacherAndAppointments = async () => {
      setLoading(true);
      if (username) {
        try {
          const dbRef = ref(database);

          // Fetch teacher data
          const teacherSnapshot = await get(child(dbRef, "users/teachers"));
          let currentTeacherId = null;
          let currentTeacherData = null;
          const teacherDataJSON = teacherSnapshot.toJSON();
          if (teacherDataJSON) {
            for (const key in teacherDataJSON) {
              const data = teacherDataJSON[key];
              if (data && data.username === username) {
                currentTeacherId = key;
                currentTeacherData = data;
                setUserData(username);
                break;
              }
            }
          }

          // Set up real-time listener for students
          const studentsRef = ref(database, "users/students");
          onValue(studentsRef, (snapshot) => {
            const studentsData = {};
            snapshot.forEach((childSnapshot) => {
              const data = childSnapshot.val();
              if (data) {
                studentsData[childSnapshot.key] = data;
              }
            });
            setStudents(studentsData);
          });

          if (currentTeacherData) {
            setTeacherData(currentTeacherData);

            // Set up real-time listener for appointments
            const appointmentsRef = ref(database, "appointments");
            // Inside your onValue callback for appointmentsRef
            onValue(appointmentsRef, (snapshot) => {
              const appointmentsData = [];
              snapshot.forEach((childSnapshot) => {
                const appointment = childSnapshot.val();
                if (
                  appointment &&
                  appointment.teacherId === currentTeacherId &&
                  isDateTodayOrFuture(appointment.date) &&
                  appointment.status !== "Declined" &&
                  appointment.status !== "Canceled" &&
                  appointment.status !== "cancelled"
                ) {
                  appointmentsData.push({
                    ...appointment,
                    id: childSnapshot.key,
                  });
                }
              });
              console.log("Appointments updated:", appointmentsData); // Add this log
              setAppointments(appointmentsData);
            });
          }
        } catch (error) {
          console.error("Error fetching data:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchTeacherAndAppointments();

    // Cleanup function to remove listeners
    return () => {
      const appointmentsRef = ref(database, "appointments");
      const studentsRef = ref(database, "users/students");
      off(appointmentsRef);
      off(studentsRef);
    };
  }, [username]);
  //check date
  const isDateTodayOrFuture = (dateString) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of today

    const appointmentDate = new Date(dateString);
    appointmentDate.setHours(0, 0, 0, 0); // Set to beginning of appointment day

    return appointmentDate >= today;
  };

  const sortAppointments = (appointments) => {
    const statusOrder = {
      Pending: 1,
      Confirmed: 2,
      Completed: 3,
    };

    return [...appointments].sort((a, b) => {
      // First compare by status
      const statusA = statusOrder[a.status] || 999;
      const statusB = statusOrder[b.status] || 999;
      const statusComparison = statusA - statusB;

      if (statusComparison !== 0) {
        return statusComparison; // If status is different, prioritize status sorting
      }

      // If statuses are the same, compare by date
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA - dateB; // Sort by date (latest to oldest)
    });

    // return [...appointments].sort((b, a) => {
    //   // First compare by status
    //   const statusA = statusOrder[a.status] || 999; // Default high value for any other status
    //   const statusB = statusOrder[b.status] || 999;
    //   const statusComparison = statusA - statusB;

    //   if (statusComparison !== 0) {
    //     return statusComparison; // If status is different, sort by priority
    //   }

    //   // If statuses are the same, compare by date
    //   const dateA = new Date(a.date);
    //   const dateB = new Date(b.date);
    //   return dateA - dateB; // Sort by date (nearest to farthest)
    // });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    if (hour > 19) return "Good Evening";
  };
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading Consultations...</Text>
      </View>
    );
  }
  const openModal = (appointment) => {
    setSelectedAppointment(appointment);
    setModalVisible(true);
  };
  const closeModal = () => {
    setModalVisible(false);
    setSelectedAppointment(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending":
        return "#f0f8ff";
      case "Confirmed":
        return "#f0f8ff";
      case "Canceled":
        return "#fff0f0";
      case "cancelled":
        return "#fff0f0";
      case "Completed":
        return "#f0fff0";
      default:
        return "#ffffff";
    }
  };

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

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);

      // Clear AuthContext
      setUserData(null);

      // Navigate to login screen
      router.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  //card
  const AppointmentCard = ({ appointment }) => (
    <TouchableOpacity onPress={() => openModal(appointment)}>
      <View
        style={[
          styles.projectCard,
          { backgroundColor: getStatusColor(appointment.status) },
        ]}
      >
        <View style={styles.projectIcon}>
          <Icon name="account" size={24} color="#fff" />
        </View>
        <View style={styles.projectInfo}>
          <Text style={styles.projectTitle}>
            {students[appointment.studentId]?.firstName || "Student Name"}{" "}
            {students[appointment.studentId]?.lastName || "Student Name"}
          </Text>
          <Text style={styles.projectType}>{appointment.type}</Text>
          <Text style={styles.projectDate}>
            {new Date(appointment.date).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </Text>
          <Text style={styles.projectTime}>{appointment.time}</Text>
          <Text style={styles.projectStatus}>{appointment.status}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

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
              <Text
                style={styles.modalTitle}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
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
            <ScrollView style={styles.concernScrollContainer}>
              <View style={styles.concernSection}>
                <Text style={styles.modalLabel}>Concern Description</Text>
                <View style={styles.concernContainer}>
                  <Text style={styles.concernText}>
                    {selectedAppointment.reason ||
                      "No concern description provided"}
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Status Badge - Fixed at the bottom */}
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
                <Text style={styles.statusText}>
                  {selectedAppointment.status}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => router.push("/Teacher/TeacherProfile")}
        >
          <Icon name="account" size={24} color="#666" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.greeting}>
            Hi {teacherData ? `Prof. ${teacherData.firstName}` : "Loading..."}!
          </Text>
          <Text style={styles.subGreeting}>{getGreeting()}</Text>
        </View>
        <TouchableOpacity
          onPress={() => setIsDropdownVisible(!isDropdownVisible)}
          style={styles.menuButton}
        >
          <Icon name="dots-vertical" size={24} color="#FFF" />
        </TouchableOpacity>

        {isDropdownVisible && (
          <View
            style={{
              position: "absolute",
              top: 80,
              right: 20,
              backgroundColor: "white",
              borderRadius: 10,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
            }}
          >
            <TouchableOpacity style={{ padding: 15 }} onPress={handleLogout}>
              <Text style={{ fontFamily: "outfit", color: Colors.GRAY }}>
                Logout
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Ongoing Projects */}
      <View style={styles.projectsSection}>
        <View style={styles.projectsHeader}>
          <Text style={styles.projectsTitle}>Consultations</Text>
          <TouchableOpacity>
            <Text style={styles.viewAll}>View all</Text>
          </TouchableOpacity>
        </View>

        {appointments.length > 0 ? (
          <ScrollView>
            {sortAppointments(appointments).map((appointment) => (
              <AppointmentCard key={uuidv4()} appointment={appointment} />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.noAppointmentsContainer}>
            <Icon name="calendar-blank" size={50} color="#A0AEC0" />
            <Text style={styles.noAppointmentsText}>No records found</Text>
          </View>
        )}
      </View>
      {renderModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  noAppointmentsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50,
  },
  noAppointmentsText: {
    marginTop: 10,
    fontSize: 18,
    color: "#A0AEC0",
    fontFamily: "outfit-medium",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E90FF",
    paddingTop: 30,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    gap: 10, // Add space between profile button and text
  },
  headerTextContainer: {
    flex: 1, // This will make the text container take up remaining space
  },
  greeting: {
    fontSize: 20,
    fontFamily: "outfit-medium",
    color: "#FFF",
  },
  subGreeting: {
    fontSize: 14,
    color: "#FFF",
  },
  profileButton: {
    padding: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  menuButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    margin: 20,
    padding: 12,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  welcomeCard: {
    backgroundColor: "#fff",
    margin: 20,
    padding: 20,
    borderRadius: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 5,
    marginBottom: 0,
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  welcomeText: {
    color: "#6B7280",
    fontSize: 14,
  },
  projectsSection: {
    flex: 1,
    padding: 20,
  },
  projectsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  projectsTitle: {
    fontSize: 18,
    //fontWeight: "bold",
    color: "#1F2937",
    fontFamily: "outfit-bold",
  },
  viewAll: {
    color: "#3B82F6",
    fontFamily: "spacemono-regular",
  },
  projectCard: {
    //backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  projectIcon: {
    backgroundColor: "#3B82F6",
    padding: 12,
    borderRadius: 12,
    marginRight: 15,
  },
  projectInfo: {
    flex: 1,
    fontFamily: "outfit-bold",
  },
  projectTitle: {
    fontSize: 16,
    // fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
    fontFamily: "outfit-bold",
  },
  projectType: {
    color: "#6B7280",
    fontSize: 12,
    marginBottom: 8,
    fontFamily: "outfit-meduim",
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    marginBottom: 8,
    fontFamily: "outfit-meduim",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#3B82F6",
    borderRadius: 2,
    fontFamily: "outfit-meduim",
  },
  projectDate: {
    fontSize: 12,
    color: "#6B7280",
    fontFamily: "outfit-meduim",
  },
  projectTime: {
    fontSize: 12,
    color: "#6B7280",
    fontFamily: "outfit-meduim",
  },
  projectStatus: {
    fontSize: 14,
    color: "#6B7280",
    fontFamily: "outfit-meduim",
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  navItem: {
    padding: 10,
  },
  addButton: {
    backgroundColor: "#3B82F6",
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginTop: -30,
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
  // Modal container styles
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "100%",
    maxHeight: "80%", // Increased from 63% to accommodate more content
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    flexDirection: "column", // Ensure content flows vertically
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 20, // Slightly smaller to fit on smaller screens
    fontFamily: "outfit-bold",
    color: "#000000",
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  modalInfoSection: {
    padding: 10,
    backgroundColor: "#F5F5F5",
  },
  modalInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  modalInfoText: {
    marginLeft: 10,
    fontSize: 14, // Reduced for better fit
    fontFamily: "outfit-medium",
    color: "#000000",
  },
  concernScrollContainer: {
    maxHeight: "55%", // Set maximum height for scrollable content
    flexGrow: 0,
  },
  concernSection: {
    padding: 10,
    paddingTop: 15,
  },
  modalLabel: {
    fontSize: 16,
    fontFamily: "outfit-medium",
    color: "#000000",
    marginBottom: 10,
    textAlign: "center",
  },
  concernContainer: {
    backgroundColor: "#F5F5F5",
    padding: 12,
    borderRadius: 8,
    minHeight: 80, // Minimum height instead of fixed
  },
  concernText: {
    fontSize: 14,
    fontFamily: "outfit-regular",
    color: "#000000",
    lineHeight: 20,
  },
  statusBadgeContainer: {
    padding: 12,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    marginTop: "auto", // Push to bottom
  },
  statusBadge: {
    paddingHorizontal: 30,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 120,
    alignItems: "center",
  },
  statusText: {
    fontSize: 14,
    fontFamily: "outfit-medium",
    color: "#000000",
  },
});

export default TeacherDashboard;
