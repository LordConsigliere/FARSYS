import { View, Text, Image, SafeAreaView, StatusBar, TouchableOpacity, Modal } from 'react-native'
import React, { useEffect, useState, useContext } from 'react'
import { Entypo } from '@expo/vector-icons'
import { Colors } from './../../constants/Colors'
import { ref, get, child } from 'firebase/database'
import { database } from '../../FirebaseConfig'
import { AuthContext } from "../../AuthContext"
import { getAuth, signOut } from 'firebase/auth'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';

export default function Header() {
  const [userData, setUserData] = useState(null);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const { username, setUserID, setUserRole, userType } = useContext(AuthContext);

  const fetchUserData = async () => {
    if (username) {
      try {
        const dbRef = ref(database);
        let snapshot;
        
        if (userType === "teacher") {
          snapshot = await get(child(dbRef, "users/teachers"));
        } else if (userType === "student") {
          snapshot = await get(child(dbRef, "users/students"));
        }

        if (snapshot) {
          snapshot.forEach((childSnapshot) => {
            const userData = childSnapshot.val();
            if (userData.username === username) {
              setUserData(userData);
              return true;
            }
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    }
  };

  // Use useFocusEffect instead of useEffect
  useFocusEffect(
    useCallback(() => {
      fetchUserData();
    }, [username, userType])
  );

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      
      // Clear AuthContext
      setUserData(null);
      
      // Navigate to login screen
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (  
    <>
      <StatusBar backgroundColor={Colors.PRIMARY} barStyle="light-content" />
      <SafeAreaView style={{backgroundColor: Colors.PRIMARY, borderBottomLeftRadius:25,borderBottomRightRadius:25}}>
        <View style={{
          paddingBottom:50,
          paddingTop:35,
          paddingLeft:20,
          paddingRight:20,
          backgroundColor:Colors.PRIMARY,
          borderBottomLeftRadius:25,
          borderBottomRightRadius:25,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <View style={{display:'flex', flexDirection:'row', alignItems:'center', gap:10}}>
            <View style={{
              backgroundColor: '#ffffff',
              borderRadius: 50,
              width: 40,
              height: 40,
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <Ionicons name="person" size={32} color={Colors.PRIMARY} />
            </View>
            <View>
              <Text style={{fontSize:19, color:'#ffff', fontFamily:"outfit-medium"}}>My Consultations</Text>
              <Text style={{fontSize: 12, color:'#ffff', fontFamily:"outfit"}}>
                Welcome back, {userData ? `${userData.firstName} ${userData.lastName}` : 'Loading...'}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity onPress={() => setIsDropdownVisible(!isDropdownVisible)}>
            <Entypo name="dots-three-vertical" size={24} color="white" />
          </TouchableOpacity>

          {isDropdownVisible && (
            <View style={{
              position: 'absolute', 
              top: 80, 
              right: 20, 
              backgroundColor: 'white', 
              borderRadius: 10,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5
            }}>
              <TouchableOpacity 
                style={{padding: 15}}
                onPress={handleLogout}
              >
                <Text style={{fontFamily: 'outfit', color: Colors.GRAY}}>Logout</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </>
  )
}