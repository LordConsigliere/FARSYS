import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { ref, onValue, off, get, child, update } from "firebase/database";
import { database } from "../../FirebaseConfig";
import { AuthContext } from "../../AuthContext";

const NotificationItem = ({ appointment, student, onPress, onRead }) => {
  const getRelativeTime = (timestamp) => {
    const now = new Date();
    const appointmentDate = new Date(timestamp);
    const diffInMinutes = Math.floor((now - appointmentDate) / (1000 * 60));

    if (diffInMinutes < 60) {
      return `${diffInMinutes} mins ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} ${days === 1 ? "day" : "days"} ago`;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending":
        return "#f0f8ff";
      case "Confirmed":
        return "#f0fff0";
      case "Canceled":
        return "#fff0f0";
      default:
        return "#ffffff";
    }
  };

  const handlePress = () => {
    onPress(appointment);
    if (!appointment.isRead) {
      onRead(appointment.id);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        { backgroundColor: getStatusColor(appointment.status) },
      ]}
      onPress={handlePress}
    >
      <View style={styles.notificationContent}>
        {/* <Text style={styles.title}>{student?.firstName || "Student"}</Text>
        <Text style={styles.message}>{appointment.type} Appointment</Text>
        <Text style={styles.message}>Time: {appointment.time}</Text> */}

        <Text style={styles.title}>{"New Consultations"}</Text>
        <Text style={styles.message}>
          {student?.firstName || "Student"} {student?.lastName || "Student"} has
          requested a{" "}
          <Text style={{ fontWeight: "bold" }}>{appointment.type}</Text> Concern
          consultation for{" "}
          <Text style={{ fontWeight: "bold" }}>
            {new Date(appointment.date).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </Text>{" "}
          at <Text style={{ fontWeight: "bold" }}> {appointment.time}</Text>.
        </Text>

        {/* <Text
          style={[
            styles.status,
            {
              color:
                appointment.status === "Pending"
                  ? "#ff9800"
                  : appointment.status === "Confirmed"
                  ? "#4caf50"
                  : "#f44336",
            },
          ]}
        >
          Status: {appointment.status}
        </Text> */}
      </View>
      <View style={styles.timeContainer}>
        <Text style={styles.time}>
          {getRelativeTime(appointment.createdAt)}
        </Text>
        {appointment.status === "Pending" && !appointment.isRead && (
          <View style={styles.unreadDot} />
        )}
      </View>
    </TouchableOpacity>
  );
};

const TeacherNotification = () => {
  const [appointments, setAppointments] = useState([]);
  const [students, setStudents] = useState({});
  const [loading, setLoading] = useState(true);
  const { username } = useContext(AuthContext);

  useEffect(() => {
    let appointmentsRef;
    let teacherId;

    const setupRealtimeListener = async () => {
      if (username) {
        try {
          const dbRef = ref(database);

          // Get teacher ID from username
          const teacherSnapshot = await get(child(dbRef, "users/teachers"));
          const teacherDataJSON = teacherSnapshot.toJSON();

          if (teacherDataJSON) {
            for (const key in teacherDataJSON) {
              const data = teacherDataJSON[key];
              if (data && data.username === username) {
                teacherId = key;
                break;
              }
            }
          }

          // Get students data
          const studentsSnapshot = await get(child(dbRef, "users/students"));
          const studentsData = {};
          studentsSnapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            if (data) {
              studentsData[childSnapshot.key] = data;
            }
          });
          setStudents(studentsData);

          // Set up realtime listener for appointments
          if (teacherId) {
            appointmentsRef = ref(database, "appointments");
            onValue(appointmentsRef, (snapshot) => {
              const appointmentsData = [];
              const twoDaysAgo = new Date();
              twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

              snapshot.forEach((childSnapshot) => {
                const appointment = childSnapshot.val();
                if (appointment && appointment.teacherId === teacherId) {
                  // Check if the appointment is less than 2 days old
                  const appointmentDate = new Date(appointment.createdAt);
                  if (appointmentDate > twoDaysAgo) {
                    appointmentsData.push({
                      ...appointment,
                      id: childSnapshot.key,
                    });
                  }
                }
              });

              // Sort by createdAt, newest first
              appointmentsData.sort(
                (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
              );

              setAppointments(appointmentsData);
              setLoading(false);
            });
          }
        } catch (error) {
          console.error("Error setting up notifications:", error);
          setLoading(false);
        }
      }
    };

    setupRealtimeListener();

    return () => {
      if (appointmentsRef) {
        off(appointmentsRef);
      }
    };
  }, [username]);

  const handleNotificationPress = (appointment) => {
    router.push({
      pathname: "/TeacherAppointment",
      params: { appointmentId: appointment.id },
    });
  };

  const markAsRead = async (appointmentId) => {
    try {
      const appointmentRef = ref(database, `appointments/${appointmentId}`);
      await update(appointmentRef, {
        isRead: true,
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E90FF" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Notifications</Text>
      </View>
      <ScrollView style={styles.notificationList}>
        {appointments.map((appointment) => (
          <NotificationItem
            key={appointment.id}
            appointment={appointment}
            student={students[appointment.studentId]}
            onPress={() => {
              router.push("/Teacher/TeacherAppointment");
            }}
            onRead={markAsRead}
          />
        ))}
        {appointments.length === 0 && (
          <Text style={styles.noNotifications}>
            No notifications in the last 2 days
          </Text>
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
    backgroundColor: "#1E90FF",
    padding: 16,
  },
  headerText: {
    color: "#fff",
    fontSize: 25,
    //fontWeight: "bold",
    fontFamily: "outfit-bold",
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
  notificationList: {
    flex: 1,
  },
  notificationItem: {
    flexDirection: "row",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    justifyContent: "space-between",
  },
  notificationContent: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
    fontFamily: "outfit-bold",
  },
  message: {
    color: "#45474B",
    fontSize: 14,
    fontFamily: "outfit-regular",
  },
  status: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: "500",
    fontFamily: "outfit-meduim",
  },
  timeContainer: {
    alignItems: "flex-end",
    fontFamily: "outfit-meduim",
  },
  time: {
    color: "#999",
    fontSize: 12,
    marginBottom: 4,
    fontFamily: "outfit-meduim",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1E90FF",
  },
  readDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  noNotifications: {
    textAlign: "center",
    marginTop: 20,
    color: "#666",
    fontSize: 16,
  },
});

export default TeacherNotification;
