// _layout.jsx
import { View, Text } from 'react-native'
import React, { useState, useEffect, useContext } from 'react'
import { Tabs, useNavigation } from 'expo-router'
import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors } from '../../../constants/Colors';
import { database } from '../../../FirebaseConfig';
import { ref, onValue, update, get } from 'firebase/database';
import { AuthContext } from '../../../AuthContext';

export default function TabLayout() {
  const [notificationCount, setNotificationCount] = useState(0);
  const { userID } = useContext(AuthContext);

  const markAllNotificationsAsRead = async () => {
    if (!userID) return;

    try {
      const notificationsRef = ref(database, 'notifications');
      const snapshot = await get(notificationsRef);
      
      if (snapshot.exists()) {
        const updates = {};
        Object.entries(snapshot.val()).forEach(([key, notification]) => {
          if (notification.recipientId === userID && !notification.read) {
            updates[`notifications/${key}/read`] = true;
          }
        });
        
        if (Object.keys(updates).length > 0) {
          await update(ref(database), updates);
        }
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  useEffect(() => {
    if (!userID) return;

    const notificationsRef = ref(database, 'notifications');
    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      if (snapshot.exists()) {
        const notificationsData = snapshot.val();
        const count = Object.values(notificationsData)
          .filter(notification => 
            notification.recipientId === userID && 
            !notification.read &&
            notification.type === 'appointment'
          ).length;
        setNotificationCount(count);
      }
    });

    return () => unsubscribe();
  }, [userID]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.PRIMARY
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          )
        }}
      />
      
      <Tabs.Screen
        name="appointment"
        options={{
          tabBarLabel: 'Consultations',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-clear" size={size} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="notification"
        options={{
          tabBarLabel: 'Notifications',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="notifications-sharp" size={24} color={color} />
              {notificationCount > 0 && (
                <View style={{
                  position: 'absolute',
                  right: -8,
                  top: -5,
                  backgroundColor: '#FF3B30',
                  borderRadius: 8,
                  minWidth: 16,
                  height: 16,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 4,
                }}>
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: 10,
                    fontFamily: 'outfit-bold',
                    textAlign: 'center',
                  }}>
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </Text>
                </View>
              )}
            </View>
          )
        }}
        listeners={{
          tabPress: () => {
            markAllNotificationsAsRead();
          }
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          )
        }}
      />
    </Tabs>
  );
}
