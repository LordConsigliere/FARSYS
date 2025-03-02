 import { View, Text } from 'react-native'
 import React from 'react'
 import {Tabs} from 'expo-router'
 import Ionicons from 'react-native-vector-icons/Ionicons';
 import FontAwesome from '@expo/vector-icons/FontAwesome';
 import {Colors} from '../../../constants/Colors';
 export default function TabLayout() {
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
            tabBarLabel: 'Appointment',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar-clear" size={size} color={color} />
            )
          }}
        />
        <Tabs.Screen
          name="notification"
          options={{
            tabBarLabel: 'Notification',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="notifications-sharp" size={24} color={color}  />
            )
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