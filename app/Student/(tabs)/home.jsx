import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import React, { useState, useEffect, useContext } from 'react'
import Header from '../../../components/Home/Header'
import {Colors} from '../../../constants/Colors'
import { router } from 'expo-router';
import { AuthContext } from '../../../AuthContext';
import { database } from '../../../FirebaseConfig';
import { ref, query, orderByChild, equalTo, onValue, get, set } from 'firebase/database';
import { useCustomBackHandler } from '../../../components/BackHandler/backhadler';

export default function Home() {
  useCustomBackHandler();
  const [appointments, setAppointments] = useState([]);
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [pendingAppointments, setPendingAppointments] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { userID } = useContext(AuthContext);
 
  useEffect(() => {
    if (!userID) {
      setIsLoading(false);
      return;
    }

    const appointmentsRef = ref(database, 'appointments');
    const teachersRef = ref(database, 'users/teachers');
    
    const appointmentsQuery = query(
      appointmentsRef, 
      orderByChild('studentId'), 
      equalTo(userID)
    );

    const checkAndUpdateAppointments = async () => {
      try {
        const snapshot = await get(appointmentsQuery);
        const currentDate = new Date();
        
        if (snapshot.exists()) {
          const appointmentsData = snapshot.val();
          const updatePromises = [];

          for (const [id, appointment] of Object.entries(appointmentsData)) {
            const appointmentDate = new Date(appointment.date);
            
            // Specific condition for appointments dated yesterday
            if (
              appointmentDate.toDateString() === new Date(currentDate - 86400000).toDateString() &&
              ['pending', 'confirmed'].includes(appointment.status.toLowerCase())
            ) {
              const appointmentRef = ref(database, `appointments/${id}`);
              updatePromises.push(
                set(appointmentRef, {
                  ...appointment,
                  status: 'cancelled',
                  remarks: 'The appointment is cancelled due to late response'
                })
              );
            }
          }

          await Promise.all(updatePromises);
        }
      } catch (error) {
        console.error('Error updating appointments:', error);
      }
    };

    const fetchAppointments = async () => {
      try {
        // First update appointments
        await checkAndUpdateAppointments();

        const snapshot = await get(appointmentsQuery);
        const teachersSnapshot = await get(ref(database, 'users/teachers'));
        
        const teachersData = teachersSnapshot.val() || {};
        const appointmentsData = snapshot.val() || {};
        
        const fetchedAppointments = [];
        let totalCount = 0;
        let pendingCount = 0;

        for (const [id, appointment] of Object.entries(appointmentsData)) {
          // Skip non-active appointments
          if (!['pending', 'confirmed'].includes(appointment.status.toLowerCase())) {
            continue;
          }

          const teacher = teachersData[appointment.teacherId];
          const teacherName = teacher 
            ? `${teacher.firstName} ${teacher.lastName}` 
            : 'Unknown Teacher';

          fetchedAppointments.push({
            id,
            teacherName,
            type: appointment.type,
            time: appointment.time,
            date: appointment.date,
            displayDate: new Date(appointment.date).toLocaleDateString('en-US', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            }),
            status: appointment.status,
            remarks: appointment.remarks
          });

          totalCount++;
          if (appointment.status.toLowerCase() === 'pending') {
            pendingCount++;
          }
        }

        // Sort appointments by date and time
        fetchedAppointments.sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          
          if (dateA.getTime() !== dateB.getTime()) {
            return dateB.getTime() - dateA.getTime();
          }
          
          const [timeA] = a.time.split(' - ')[0].split(':').map(Number);
          const [timeB] = b.time.split(' - ')[0].split(':').map(Number);
          
          return timeB - timeA;
        });

        setAppointments(fetchedAppointments);
        setTotalAppointments(totalCount);
        setPendingAppointments(pendingCount);
      } catch (error) {
        console.error('Error processing appointmentss:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchAppointments();

    // Set up real-time listener
    const unsubscribe = onValue(appointmentsQuery, () => {
      fetchAppointments();
    });

    // Set up interval to check and update daily
    const intervalId = setInterval(checkAndUpdateAppointments, 24 * 60 * 60 * 1000);

    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, [userID]);

  return (
    <View style={{flex: 1, backgroundColor: '#f8f8f8'}}>
      <Header/>
     
      <View style={{padding: 20}}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
          <TouchableOpacity 
            style={[styles.card, {flex: 0.48}]}
            onPress={() => router.push('/Student/appointment')}
          >
            <Text style={styles.cardTitle}>Total Consultations</Text>
            <Text style={styles.cardValue}>{totalAppointments}</Text>
          </TouchableOpacity>
          
          <View style={[styles.card, {flex: 0.48}]}>
            <Text style={styles.cardTitle}>Pending Consultations</Text>
            <Text style={styles.cardValue}>{pendingAppointments}</Text>
          </View>
        </View>
      </View>

      <View style={styles.fixedHeader}>
        <Text style={styles.sectionTitle}>Consultations</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.PRIMARY} />
          <Text style={styles.loadingText}>Loading appointments...</Text>
        </View>
        ) : appointments.length === 0 ? (
          <View style={styles.noAppointmentsContainer}>
            <Text style={styles.noAppointmentsText}>No records found</Text>
          </View>
        ) : (
        <ScrollView style={{flex: 1}}>
          <View style={{padding: 20, paddingTop: 0}}>       
            {appointments.map(item => (
              <View key={item.id} style={styles.appointmentCard}>
                <View style={{flexDirection: 'row', gap: 10}}>
                  <View style={{flex: 1}}>
                    <Text style={styles.teacherName}>{item.teacherName}</Text>
                    <Text style={styles.department}>{item.type}</Text>
                    <Text style={styles.time}>{item.time} - {item.displayDate}</Text>
                    {item.remarks && (
                      <Text style={styles.remarks}>{item.remarks}</Text>
                    )}
                  </View>
                  <View style={[
                    styles.statusContainer, 
                    {backgroundColor: item.status.toLowerCase() === 'pending' 
                      ? '#FFF4E5' 
                      : item.status.toLowerCase() === 'cancelled' 
                        ? '#fee2e2' 
                        : '#dcfce7'
                    }
                  ]}>
                    <Text style={[
                      styles.statusText, 
                      {color: item.status.toLowerCase() === 'pending' 
                        ? '#FFAB19' 
                        : item.status.toLowerCase() === 'cancelled' 
                          ? '#ef4444' 
                          : '#22c55e'
                      }
                    ]}>
                      {item.status}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
const styles = {
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    color: Colors.GRAY,
    fontFamily: 'outfit'
  },
  cardValue: {
    fontSize: 24,
    color: Colors.PRIMARY,
    fontFamily: 'outfit-bold',
    marginTop: 5
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
    fontFamily: 'outfit',
  },
  fixedHeader: {
    backgroundColor: '#f8f8f8',
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'outfit-medium',
    marginBottom: 15,
    paddingLeft: 20,
  },
  appointmentCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 1,
  },
  teacherName: {
    fontSize: 16,
    fontFamily: 'outfit-medium',
    color: Colors.GRAY
  },
  department: {
    fontSize: 14,
    fontFamily: 'outfit',
    color: Colors.GRAY,
    marginVertical: 5
  },
  time: {
    fontSize: 12,
    fontFamily: 'outfit',
    color: Colors.GRAY
  },
  remarks: {
    fontSize: 12,
    fontFamily: 'outfit',
    color: '#ef4444',
    marginTop: 5
  },
  statusContainer: {
    padding: 5,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center'
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'outfit-medium'
  },
  noAppointmentsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20
  },
  noAppointmentsText: {
    fontSize: 14,
    color: Colors.GRAY,
    fontFamily: 'outfit'
  }
};