import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

export const useNotificationHandler = (navigation) => {
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Handler for when notification is received while app is running
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      const appointmentData = notification.request.content.data;
      console.log('Notification received:', appointmentData);
    });

    // Handler for when user taps on notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const appointmentData = response.notification.request.content.data;
      
      if (appointmentData.type === 'appointment_request') {
        // Navigate to appropriate screen based on notification type
        navigation.navigate('AppointmentDetails', {
          appointmentId: appointmentData.appointmentId
        });
      }
    });

    // Cleanup
    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, [navigation]);
};