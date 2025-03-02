import { View, Text, ScrollView,TouchableOpacity, } from 'react-native'
import React from 'react'
import Header from '../../../components/Home/Header'
import {Colors} from '../../../constants/Colors'
import { router } from 'expo-router';

export default function home() {
  const appointments = [
    {
      id: 1,
      teacherName: 'Mr. Smith',
      department: 'Computer Science',
      time: '10:00 AM',
      date: '23 Mar 2024',
      status: 'Upcoming'
    },
    {
      id: 2,
      teacherName: 'Mr. Smith',
      department: 'Computer Science',
      time: '10:00 AM',
      date: '23 Mar 2024',
      status: 'Upcoming'
    },
    {
      id: 3,
      teacherName: 'Mr. Smith',
      department: 'Computer Science',
      time: '10:00 AM',
      date: '23 Mar 2024',
      status: 'Upcoming'
    },
    {
      id: 4,
      teacherName: 'Mrs. Johnson',
      department: 'Mathematics',
      time: '2:30 PM',
      date: '24 Mar 2024',
      status: 'Pending'
    },
    {
      id: 5,
      teacherName: 'Mrs. Johnson',
      department: 'Mathematics',
      time: '2:30 PM',
      date: '24 Mar 2024',
      status: 'Pending'
    },    
    {
      id: 6,
      teacherName: 'Mrs. Johnson',
      department: 'Mathematics',
      time: '2:30 PM',
      date: '24 Mar 2024',
      status: 'Pending'
    }
  ];

  return (
    <View style={{flex: 1, backgroundColor: '#f8f8f8'}}>
      <Header />
      
      {/* Static Statistics Cards */}
      <View style={{padding: 20}}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
        <TouchableOpacity 
            style={[styles.card, {flex: 0.48}]}
            onPress={() => {
              router.push('/(tabs)/appointment'); // Update path to your target route
            }}
          >
            <Text style={styles.cardTitle}>Total Appointments</Text>
            <Text style={styles.cardValue}>24</Text>
          </TouchableOpacity>
          
          <View style={[styles.card, {flex: 0.48}]}>
            <Text style={styles.cardTitle}>Pending Appointments</Text>
            <Text style={styles.cardValue}>5</Text>
          </View>
        </View>
      </View>

      {/* Scrollable Appointments List */}
      <View style={styles.fixedHeader}>
        <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
      </View>
      <ScrollView style={{flex: 1}}>
        <View style={{padding: 20, paddingTop: 0}}>       
          {appointments.map(item => (
            <View key={item.id} style={styles.appointmentCard}>
              <View style={{flexDirection: 'row', gap: 10}}>
                <View style={{flex: 1}}>
                  <Text style={styles.teacherName}>{item.teacherName}</Text>
                  <Text style={styles.department}>{item.department}</Text>
                  <Text style={styles.time}>{item.time} - {item.date}</Text>
                </View>
                <View style={[styles.statusContainer, 
                  {backgroundColor: item.status === 'Upcoming' ? '#dcfce7' : '#fee2e2'}]}>
                  <Text style={[styles.statusText, 
                    {color: item.status === 'Upcoming' ? '#22c55e' : '#ef4444'}]}>
                    {item.status}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  )
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
    marginBottom: 15
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
  statusContainer: {
    padding: 5,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center'
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'outfit-medium'
  }
}