import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  PanGestureHandler, 
  State, 
  GestureHandlerRootView,
  ScrollView
} from 'react-native-gesture-handler';
import { Colors } from '../../../constants/Colors';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

const Profile = () => {
  const [activeTab, setActiveTab] = useState('Upcoming');
  const translateX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);
  const tabs = ['Pending','Upcoming','Complete', 'Cancel'];

  const upcomingAppointments = [
    {
      id: 1,
      title: '3rd deworming medication',
      type: 'Medicine',
      date: 'Monday, July 14',
      time: '11:00 - 12:00 AM',
      status: 'Confirmed',
    },
    {
      id: 2,
      title: 'You need to visit the clinic',
      type: 'Check-up',
      date: 'Tuesday, Aug 18',
      time: '08:00 - 10:00 AM',
      time: '08:00 - 10:00 AM',
      status: 'Confirmed',
    },
    {
      id: 3,
      title: 'You need to visit the clinic',
      type: 'Check-up',
      date: 'Tuesday, Aug 18',
      time: '08:00 - 10:00 AM',
      time: '08:00 - 10:00 AM',
      status: 'Confirmed',
    },
    {
      id: 4,
      title: 'You need to visit the clinic',
      type: 'Check-up',
      date: 'Tuesday, Aug 18',
      time: '08:00 - 10:00 AM',
      time: '08:00 - 10:00 AM',
      status: 'Confirmed',
    },
    {
      id: 5,
      title: 'You need to visit the clinic',
      type: 'Check-up',
      date: 'Tuesday, Aug 18',
      time: '08:00 - 10:00 AM',
      status: 'Confirmed',
    },
  ];

  const completedAppointments = [
    {
      id: 3,
      title: 'Regular Check-up',
      type: 'Check-up',
      date: 'Monday, July 10',
      time: '09:00 - 10:00 AM',
      status: 'Completed',
    },
    {
      id: 4,
      title: 'Vaccination',
      type: 'Medicine',
      date: 'Friday, July 7',
      time: '02:00 - 03:00 PM',
      status: 'Completed',
    },
  ];

  const canceledAppointments = [
    {
      id: 5,
      title: 'Dental Check-up',
      type: 'Check-up',
      date: 'Wednesday, July 5',
      time: '01:00 - 02:00 PM',
      status: 'Canceled',
    },
    
  ];

  const pendingAppointments = [
    {
      id: 6,
      title: 'Dental Check-up',
      type: 'Check-up',
      date: 'Wednesday, July 5',
      time: '01:00 - 02:00 PM',
      status: 'Pending',
    },
    {
      id: 7,
      title: 'Dental Check-up',
      type: 'Check-up',
      date: 'Wednesday, July 5',
      time: '01:00 - 02:00 PM',
      status: 'Pending',
    },
    {
      id: 8,
      title: 'Dental Check-up',
      type: 'Check-up',
      date: 'Wednesday, July 5',
      time: '01:00 - 02:00 PM',
      status: 'Pending',
    },
    
  ];

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = event => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationX: gestureTranslationX } = event.nativeEvent;
      
      if (Math.abs(gestureTranslationX) > width * 0.2) {
        const currentIndex = tabs.indexOf(activeTab);
        const nextIndex = gestureTranslationX > 0 
          ? Math.max(0, currentIndex - 1)
          : Math.min(tabs.length - 1, currentIndex + 1);
        
        setActiveTab(tabs[nextIndex]);
      }

      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  };

  const getAppointments = () => {
    switch (activeTab) {
      case 'Upcoming':
        return upcomingAppointments;
      case 'Pending':
      return pendingAppointments;
      case 'Complete':
        return completedAppointments;
      case 'Cancel':
        return canceledAppointments;
      default:
        return pendingAppointments;
    }
  };

  const AppointmentCard = ({ appointment }) => (
    <View style={styles.appointmentCard}>
      <View style={styles.appointmentHeader}>
        <View style={styles.iconContainer}>
          {appointment.type === 'Medicine' ? (
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
      {activeTab === 'Pending' && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rescheduleButton}>
            <Text style={styles.rescheduleButtonText}>Reschedule</Text>
          </TouchableOpacity>
        </View>
      )}
        <View style={styles.statusContainer}>
          <Text style={[
            styles.statusText,
            activeTab === 'Complete' ? styles.completedStatus 
            : activeTab === 'Upcoming' ? styles.upcomingStatus
            : activeTab === 'Pending' ? styles.pendingStatus
            : styles.canceledStatus
          ]}>
            {appointment.status}
          </Text>
        </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Appointments</Text>
      </View>
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <GestureHandlerRootView style={styles.gestureContainer}>
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
          activeOffsetX={[-20, 20]}
          failOffsetY={[-5, 5]}
        >
          <Animated.View style={[
            styles.animatedContainer,
            {
              transform: [{ translateX }]
            }
          ]}>
            <ScrollView
              ref={scrollViewRef}
              style={styles.appointmentsList}
              showsVerticalScrollIndicator={false}
              bounces={true}
              scrollEventThrottle={16}
            >
              {getAppointments().map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))}
            </ScrollView>
          </Animated.View>
        </PanGestureHandler>
      </GestureHandlerRootView>
      <TouchableOpacity 
        style={styles.setAppointmentButton}
        onPress={() => {
          router.push('/setappointment');  // Update path to navigate outside tabs
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
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.PRIMARY,
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'outfit-bold',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F0F4F8',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 25,
    padding: 4,
    height: 45,
    alignItems: 'center',
  },
  tab: {
    flex: 0.8,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 15,
    borderRadius: 22,
    margin: 2,
  },
  activeTab: {
    backgroundColor: Colors.PRIMARY,
    flex: 0.8,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 15,
    borderRadius: 22,
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    color: '#666',
    fontSize: 11,
    fontFamily: 'outfit',
  },
  activeTabText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  gestureContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  animatedContainer: {
    flex: 1,
    width: '100%',
  },
  appointmentsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentTitle: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'outfit-medium',
  },
  appointmentType: {
    color: '#666',
    fontSize: 14,
    marginTop: 4,
    fontFamily: 'outfit',
  },
  dateContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    marginLeft: 8,
    marginRight: 16,
    color: '#666',
    fontFamily: 'outfit',
  },
  timeText: {
    marginLeft: 8,
    color: '#666',
    fontFamily: 'outfit',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    alignItems: 'center',
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
    alignItems: 'center',
  },
  rescheduleButtonText: {
    color: '#fff',
  },
  statusContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  completedStatus: {
    color: '#4CAF50',
    fontFamily: 'outfit',
  },
  canceledStatus: {
    color: '#F44336',
    fontFamily: 'outfit',
  },
  upcomingStatus: {
    color: '#2196F3',
    fontFamily: 'outfit',
  },
  pendingStatus: {
    color: '#FFAB19',
    fontFamily: 'outfit',
  },
  setAppointmentButton: {
    position: 'absolute',
    right: 20,
    bottom: 55,
    width: 85,
    height: 85,
    borderRadius: 45,
    backgroundColor: Colors.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  }
});

export default Profile;