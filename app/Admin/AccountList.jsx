import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { 
  PanGestureHandler, 
  State, 
  GestureHandlerRootView,
  ScrollView 
} from 'react-native-gesture-handler';
import { database } from '../../FirebaseConfig';
import { ref, get, child } from 'firebase/database';

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.15;

const AccountsList = () => {
  const [activeTab, setActiveTab] = useState('Student');
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const translateX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);
  const tabs = ['Student', 'Teacher'];
  const isAnimating = useRef(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const dbRef = ref(database);
        
        // Fetch students
        const studentsSnapshot = await get(child(dbRef, 'users/students'));
        if (studentsSnapshot.exists()) {
          const studentsData = Object.entries(studentsSnapshot.val()).map(([id, data]) => ({
            id,
            name: `${data.firstName} ${data.lastName}`,
            createdAt: new Date(data.createdAt).toLocaleDateString()
          }));
          setStudents(studentsData);
          
        }

        // Fetch teachers
        const teachersSnapshot = await get(child(dbRef, 'users/teachers'));
        if (teachersSnapshot.exists()) {
          const teachersData = Object.entries(teachersSnapshot.val()).map(([id, data]) => ({
            id,
            name: `${data.firstName} ${data.lastName}`,
            teacherId: data.teacherId,
            createdAt: new Date(data.createdAt).toLocaleDateString()
          }));
          setTeachers(teachersData);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const onGestureEvent = useCallback(
    Animated.event(
      [{ nativeEvent: { translationX: translateX } }],
      { useNativeDriver: true }
    ),
    []
  );

  const onHandlerStateChange = useCallback(event => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      if (isAnimating.current) return;
      
      const { translationX: gestureTranslationX } = event.nativeEvent;
      
      if (Math.abs(gestureTranslationX) > SWIPE_THRESHOLD) {
        isAnimating.current = true;
        const currentIndex = tabs.indexOf(activeTab);
        const nextIndex = gestureTranslationX > 0 
          ? Math.max(0, currentIndex - 1)
          : Math.min(tabs.length - 1, currentIndex + 1);

        if (currentIndex !== nextIndex) {
          setActiveTab(tabs[nextIndex]);
        }
      }

      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        friction: 10,
        tension: 100,
      }).start(() => {
        isAnimating.current = false;
      });
    }
  }, [activeTab, tabs]);
 
  const StudentCard = ({ student }) => (
    <TouchableOpacity style={styles.card} 
      onPress={() => router.push({
      pathname: '/Admin/AccountView',
      params: { 
        account: JSON.stringify(student), 
        type: 'Student' 
      }
    })}>
      <View style={styles.iconContainer}>
        <Icon name="account" size={24} color="#fff" />
      </View>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{student.name}</Text>
        <Text style={styles.concernText}>Created on: {student.createdAt}</Text>
      </View>
    </TouchableOpacity>
  );

  const TeacherCard = ({ teacher }) => (
    <TouchableOpacity style={styles.card}
      onPress={() => router.push({
      pathname: '/Admin/AccountView',
      params: { 
        account: JSON.stringify(teacher), 
        type: 'Teacher' 
      }
    })}>
      <View style={styles.iconContainer}>
        <Icon name="account-tie" size={24} color="#fff" />
      </View>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{teacher.name}</Text>
        <Text style={styles.concernText}>Created on: {teacher.createdAt}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderContent = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      );
    }

    if (activeTab === 'Student') {
      return students.map((student) => (
        <StudentCard key={student.id} student={student} />
      ));
    } else {
      return teachers.map((teacher) => (
        <TeacherCard key={teacher.id} teacher={teacher} />
      ));
    }
  }, [activeTab, students, teachers, loading]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => {router.push('/Admin/HomepageAdmin'); }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Accounts</Text>
        </View>
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
          activeOffsetX={[-10, 10]}
          activeOffsetY={[-15, 15]}
        >
          <Animated.View 
            style={[
              styles.animatedContainer,
              {
                transform: [{ 
                  translateX: translateX.interpolate({
                    inputRange: [-width, width],
                    outputRange: [-width / 2, width / 2],
                    extrapolate: 'clamp'
                  }) 
                }]
              }
            ]}
          >
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              bounces={true}
              scrollEventThrottle={16}
              removeClippedSubviews={true}
            >
              {renderContent()}
            </ScrollView>
          </Animated.View>
        </PanGestureHandler>
      </GestureHandlerRootView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    padding: 20,
    backgroundColor: Colors.PRIMARY,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    marginBottom: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 100,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "outfit-bold",
    color: "#fff",
  },
  gestureContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  animatedContainer: {
    flex: 1,
    width: '100%',
  },
  scrollView: {
    padding: 16,
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
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#4287f5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  concernText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});

export default AccountsList;