// AdminAccountManagement.js
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    SafeAreaView,
    ScrollView,
  } from 'react-native';
  import { Ionicons } from '@expo/vector-icons';
  import { Colors } from '../../constants/Colors';
  import { router } from 'expo-router';
  import { database } from '../../FirebaseConfig';
  import { ref, update, get, child } from 'firebase/database';
  import * as Crypto from 'expo-crypto';
  import AsyncStorage from '@react-native-async-storage/async-storage';
  import React, { useState, useEffect, useContext } from 'react'; // Add useContext
  import { AuthContext } from "../../AuthContext";
  
  // Generate a random salt for password hashing
  const generateSalt = (length = 16) => {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let salt = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      salt += charset[randomIndex];
    }
    return salt;
  };
  
  // Hash password with the provided salt
  const hashPassword = async (password, salt) => {
    const passwordWithSalt = password + salt;
    const digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      passwordWithSalt
    );
    return digest;
  };
  
  const AdminAccountManagement = () => {
      const { username, userType, userID } = useContext(AuthContext); // Get data from AuthContext
      const [currentPassword, setCurrentPassword] = useState('');
      const [newPassword, setNewPassword] = useState('');
      const [confirmPassword, setConfirmPassword] = useState('');
      const [loading, setLoading] = useState(false);
      const [adminData, setAdminData] = useState(null);
    
      // Update fetchAdminData to use userID from context
      useEffect(() => {
        const fetchAdminData = async () => {
          try {
            if (!userID || userType !== 'admin') {
              Alert.alert('Error', 'Admin access required');
              router.back();
              return;
            }
    
            const dbRef = ref(database);
            const snapshot = await get(child(dbRef, `users/admin/${userID}`));
            
            if (snapshot.exists()) {
              setAdminData(snapshot.val());
            } else {
              Alert.alert('Error', 'Admin data not found');
            }
          } catch (error) {
            console.error('Error fetching admin data:', error);
            Alert.alert('Error', 'Failed to fetch admin data');
          }
        };
    
        fetchAdminData();
      }, [userID, userType]);
    
      // Update handlePasswordChange to use userID from context
      const handlePasswordChange = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
          Alert.alert('Error', 'Please fill in all fields');
          return;
        }
    
        if (newPassword !== confirmPassword) {
          Alert.alert('Error', 'New passwords do not match');
          return;
        }
    
        if (newPassword.length < 6) {
          Alert.alert('Error', 'New password must be at least 6 characters long');
          return;
        }
    
        setLoading(true);
        try {
          if (!userID || !adminData) {
            throw new Error('Admin data not found');
          }
    
          // Verify current password
          const currentHashedPassword = await hashPassword(currentPassword, adminData.salt);
          if (currentHashedPassword !== adminData.passwordHash) {
            Alert.alert('Error', 'Current password is incorrect');
            setLoading(false);
            return;
          }
    
          // Generate new salt and hash for the new password
          const newSalt = generateSalt();
          const newHashedPassword = await hashPassword(newPassword, newSalt);
    
          // Update password in Firebase
          const updates = {
            [`users/admin/${userID}/passwordHash`]: newHashedPassword,
            [`users/admin/${userID}/salt`]: newSalt,
            [`users/admin/${userID}/lastUpdated`]: new Date().toISOString()
          };
    
          await update(ref(database), updates);
    
          Alert.alert(
            'Success', 
            'Password updated successfully',
            [{ text: 'OK', onPress: () => router.back() }]
          );
        } catch (error) {
          console.error('Error updating password:', error);
          Alert.alert('Error', 'Failed to update password');
        } finally {
          setLoading(false);
        }
    };
  
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Manage Account</Text>
          </View>
        </View>
  
        <ScrollView style={styles.content}>
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>Change Password</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Current Password"
              placeholderTextColor="#666"
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
  
            <TextInput
              style={styles.input}
              placeholder="New Password"
              placeholderTextColor="#666"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
  
            <TextInput
              style={styles.input}
              placeholder="Confirm New Password"
              placeholderTextColor="#666"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
  
            <TouchableOpacity
              style={[styles.button, loading && styles.disabledButton]}
              onPress={handlePasswordChange}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Updating...' : 'Update Password'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  };
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#fff',
    },
    header: {
      padding: 20,
      backgroundColor: Colors.PRIMARY,
      borderBottomWidth: 1,
      borderBottomColor: '#E5E7EB',
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 70,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#fff',
    },
    content: {
      flex: 1,
    },
    formContainer: {
      padding: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#1F2937',
      marginBottom: 20,
    },
    input: {
      backgroundColor: '#f5f5f5',
      padding: 15,
      borderRadius: 10,
      marginBottom: 15,
      fontSize: 16,
    },
    button: {
      backgroundColor: Colors.PRIMARY,
      padding: 15,
      borderRadius: 10,
      alignItems: 'center',
      marginTop: 10,
    },
    disabledButton: {
      opacity: 0.7,
    },
    buttonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
  });
  
  export default AdminAccountManagement;