import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import React, { useState, useEffect, useContext } from 'react';
import { Colors } from '../../../constants/Colors';
import { database } from '../../../FirebaseConfig';
import { ref, onValue, update } from 'firebase/database';
import { AuthContext } from '../../../AuthContext';
import { formatDistanceToNow, isToday, parseISO } from 'date-fns';

export default function Notification() {
  const { userID } = useContext(AuthContext);
  const [notifications, setNotifications] = useState({
    today: [],
    earlier: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userID) return;

    const notificationsRef = ref(database, 'notifications');
    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      if (snapshot.exists()) {
        const notificationsData = snapshot.val();
        const userNotifications = Object.entries(notificationsData)
          .filter(([_, notification]) => notification.recipientId === userID)
          .map(([id, notification]) => ({
            id,
            ...notification,
            timeStamp: notification.time ? new Date(notification.time) : new Date(),
            time: notification.time 
              ? formatDistanceToNow(new Date(notification.time), { addSuffix: true })
              : 'just now'
          }))
          .sort((a, b) => b.timeStamp - a.timeStamp);

        const categorizedNotifications = {
          today: [],
          earlier: []
        };

        userNotifications.forEach(notification => {
          if (isToday(notification.timeStamp)) {
            categorizedNotifications.today.push(notification);
          } else {
            categorizedNotifications.earlier.push(notification);
          }
        });

        setNotifications(categorizedNotifications);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userID]);



// notification.jsx - Update handleNotificationPress function
const handleNotificationPress = async (notificationId) => {
  try {
    const notificationRef = ref(database, `notifications/${notificationId}`);
    await update(notificationRef, { read: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};

  const getBackgroundColor = (type, read) => {
    if (read) return '#f5f5f5';
    
    switch (type) {
      case 'appointment':
        return '#e8f5fe';
      case 'message':
        return '#e6ffe6';
      case 'system':
        return '#fff3e0';
      default:
        return '#ffffff';
    }
  };

  const renderNotificationSection = (title, items) => {
    if (items.length === 0) return null;

    return (
      <View>
        <Text style={{
          fontSize: 16,
          fontFamily: 'outfit-medium',
          color: '#666666',
          marginLeft: 16,
          marginTop: 16,
          marginBottom: 8,
        }}>
          {title}
        </Text>
        {items.map(item => (
          <TouchableOpacity
            key={item.id}
            style={{
              backgroundColor: getBackgroundColor(item.type, item.read),
              padding: 16,
              marginVertical: 8,
              marginHorizontal: 16,
              borderRadius: 12,
              shadowColor: '#000',
              shadowOffset: {
                width: 0,
                height: 2,
              },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
            onPress={() => handleNotificationPress(item.id)}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{
                fontSize: 16,
                fontFamily: 'outfit-bold',
                color: '#1a1a1a',
                marginBottom: 4,
              }}>
                {item.title}
              </Text>
              <Text style={{
                fontSize: 12,
                fontFamily: 'outfit',
                color: '#666666',
              }}>
                {item.time}
              </Text>
            </View>
            <Text style={{
              fontSize: 14,
              fontFamily: 'outfit',
              color: '#4a4a4a',
              marginTop: 4,
            }}>
              {item.description}
            </Text>
            {!item.read && (
              <View style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: '#007AFF',
                position: 'absolute',
                top: 16,
                right: 16,
              }} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <View style={{
        padding: 16,
        backgroundColor: Colors.PRIMARY,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
      }}>
        <Text style={{
          fontSize: 24,
          fontFamily: 'outfit-bold',
          color: '#fff',
        }}>
          Notifications
        </Text>
      </View>
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.PRIMARY} />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }}>
          {notifications.today.length === 0 && notifications.earlier.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'outfit', color: '#666' }}>
                No notifications yet
              </Text>
            </View>
          ) : (
            <>
              {renderNotificationSection('Today', notifications.today)}
              {renderNotificationSection('Earlier', notifications.earlier)}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}