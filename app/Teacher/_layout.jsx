import React, { useState, useEffect } from "react";
import { View, Text } from "react-native";
import { Tabs } from "expo-router";
import Ionicons from "react-native-vector-icons/Ionicons";
import { Colors } from "../../constants/Colors";
import { ref, onValue } from "firebase/database";
import { database } from "../../FirebaseConfig";
import { AuthContext } from "../../AuthContext";

const NotificationBadge = ({ count }) => {
  if (count === 0) return null;

  return (
    <View
      style={{
        position: "absolute",
        right: -6,
        top: -3,
        backgroundColor: "red",
        borderRadius: 9,
        minWidth: 18,
        height: 18,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text
        style={{
          color: "white",
          fontSize: 12,
          fontWeight: "bold",
        }}
      >
        {count > 99 ? "99+" : count}
      </Text>
    </View>
  );
};

export default function TabLayout() {
  const [unreadCount, setUnreadCount] = useState(0);
  const { username } = React.useContext(AuthContext);

  useEffect(() => {
    if (!username) return;

    // First get the teacher's ID
    const fetchTeacherId = async () => {
      const teachersRef = ref(database, "users/teachers");
      onValue(teachersRef, (snapshot) => {
        const teachers = snapshot.val();
        let teacherId;

        for (const key in teachers) {
          if (teachers[key].username === username) {
            teacherId = key;
            break;
          }
        }

        if (teacherId) {
          // Now listen for unread notifications
          const appointmentsRef = ref(database, "appointments");
          onValue(appointmentsRef, (snapshot) => {
            let count = 0;
            const appointments = snapshot.val();

            for (const key in appointments) {
              const appointment = appointments[key];
              if (
                appointment.teacherId === teacherId &&
                appointment.status === "Pending" &&
                !appointment.isRead
              ) {
                count++;
              }
            }

            setUnreadCount(count);
          });
        }
      });
    };

    fetchTeacherId();
  }, [username]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.PRIMARY,
      }}
    >
      <Tabs.Screen
        name="TeacherDashboard"
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="TeacherAppointment"
        options={{
          tabBarLabel: "Consultations",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-clear" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="TeacherNotification"
        options={{
          tabBarLabel: "Notification",
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="notifications-sharp" size={size} color={color} />
              <NotificationBadge count={unreadCount} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="TeacherProfile"
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
