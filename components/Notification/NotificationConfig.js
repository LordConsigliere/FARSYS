import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { ref, set } from 'firebase/database';
import { database } from '../../FirebaseConfig';

export async function registerForPushNotifications(userId) {
  let token;

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    
    token = (await Notifications.getExpoPushTokenAsync()).data;
    
    // Store the token in Firebase
    const tokenRef = ref(database, `fcmTokens/${userId}`);
    await set(tokenRef, {
      token,
      device: Device.modelName,
      updatedAt: new Date().toISOString()
    });
  }

  return token;
}