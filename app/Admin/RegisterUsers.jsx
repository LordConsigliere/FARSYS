import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Dimensions, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { ref, set, onValue } from 'firebase/database';
import { database } from '../../FirebaseConfig';
import * as Crypto from 'expo-crypto';

const { width, height } = Dimensions.get('window');

// Secure password hashing utility
const hashPassword = async (password, salt = null) => {
  try {
    // Generate a random salt if not provided
    const useSalt = salt || Array.from(await Crypto.getRandomBytesAsync(16))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Create hash with salt
    const dataToHash = password + useSalt;
    const hashedPassword = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      dataToHash
    );
    
    return {
      hash: hashedPassword,
      salt: useSalt
    };
  } catch (error) {
    console.error('Hashing error:', error);
    throw new Error('Password processing failed');
  }
};

const RegistrationForm = () => {
  const [userType, setUserType] = useState('student');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [pendingUserType, setPendingUserType] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form fields state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Error states
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    username: '',
    password: '',
    confirmPassword: ''
  });

  const hasAnyData = () => {
    // Check for any filled fields
    const hasFilledFields = firstName.trim() !== '' || 
                          lastName.trim() !== '' || 
                          username.trim() !== '' || 
                          password.trim() !== '' || 
                          confirmPassword.trim() !== '';

    // Check for any validation errors
    const hasErrors = Object.values(errors).some(error => error !== '');

    return hasFilledFields || hasErrors;
  };

  const validateField = (fieldName, value) => {
    let error = '';
    
    // Add validation even for empty fields
    if (!value.trim()) {
      error = `${fieldName} cannot be blank`;
    } else if (fieldName === 'Password' && value.length < 6) {
      error = 'Password must be at least 6 characters';
    } else if (fieldName === 'Confirm Password' && value !== password) {
      error = 'Passwords do not match';
    }

    // Update errors state
    setErrors(prev => ({
      ...prev,
      [fieldName.toLowerCase().replace(' ', '')]: error
    }));

    return error === '';
  };

  const handleInputChange = (fieldName, value) => {
    const setters = {
      'First Name': setFirstName,
      'Last Name': setLastName,
      'Username': setUsername,
      'Password': setPassword,
      'Confirm Password': setConfirmPassword
    };

    setters[fieldName](value);
    validateField(fieldName, value);
  };

  const handleUserTypeChange = (newType) => {
    if (newType === userType) return;
    
    if (hasAnyData()) {
      setPendingUserType(newType);
      setShowSwitchModal(true);
    } else {
      setUserType(newType);
    }
  };

  const resetAllFields = () => {
    setFirstName('');
    setLastName('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');


    setErrors({
      firstName: '',
      lastName: '',
      username: '',
      password: '',
      confirmPassword: ''
    });
  };

  const confirmSwitch = () => {
    resetAllFields();
    setUserType(pendingUserType);
    setShowSwitchModal(false);
    setPendingUserType(null);
  };

  const validateForm = () => {
    let isValid = true;
    const fieldsToValidate = {
      'First Name': firstName,
      'Last Name': lastName,
      'Username': username,
      'Password': password,
      'Confirm Password': confirmPassword,    
    };

    Object.entries(fieldsToValidate).forEach(([fieldName, value]) => {
      if (!validateField(fieldName, value)) {
        isValid = false;
      }
    });

    return isValid;
  };

  const createUser = async () => {
    try {
      const timestamp = new Date().getTime();
      const userPath = `users/${userType}s/${userType === 'student' ? 'ST-' : 'TR-'}${timestamp}`;
      const userRef = ref(database, userPath);
      
      // Hash password with salt
      const { hash: hashedPassword, salt } = await hashPassword(password);
      
      const userData = {
        firstName,
        lastName,
        username,
        passwordHash: hashedPassword,
        salt,
        userType,
        createdAt: new Date().toISOString(),
        accountStatus:'not-updated'       
      };
  
      await set(userRef, userData);
      return true;
    } catch (error) {
      console.error('Error creating user:', error);
      Alert.alert('Error', 'Failed to create user account');
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const success = await createUser();
      
      if (success) {
        Alert.alert(
          'Success',
          'Account created successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                router.push('/Admin/HomepageAdmin');
              }
            }
          ]
        );
      } else {
        throw new Error('Failed to create user');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (hasAnyData()) {
      setShowCancelModal(true);
    } else {
      router.push('/Admin/HomepageAdmin');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handleCancel}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create an Account</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.radioGroup}>
          <TouchableOpacity 
            style={[styles.radioCard, userType === 'student' && styles.radioCardActive]}
            onPress={() => handleUserTypeChange('student')}
          >
            <Ionicons name="school" size={24} color={userType === 'student' ? '#007AFF' : '#A0A0A0'} />
            <Text style={[styles.radioText, userType === 'student' && styles.radioTextActive]}>Student</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.radioCard, userType === 'teacher' && styles.radioCardActive]}
            onPress={() => handleUserTypeChange('teacher')}
          >
            <Ionicons name="person" size={24} color={userType === 'teacher' ? '#007AFF' : '#A0A0A0'} />
            <Text style={[styles.radioText, userType === 'teacher' && styles.radioTextActive]}>Teacher</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <View style={[styles.inputContainer, errors.firstname && styles.inputError]}>
              <TextInput
                style={styles.input}
                placeholder="First Name"
                placeholderTextColor="#A0A0A0"
                value={firstName}
                onChangeText={(value) => handleInputChange('First Name', value)}
              />
            </View>
            {errors.firstname ? (
              <Text style={styles.errorText}>{errors.firstname}</Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <View style={[styles.inputContainer, errors.lastname && styles.inputError]}>
              <TextInput
                style={styles.input}
                placeholder="Last Name"
                placeholderTextColor="#A0A0A0"
                value={lastName}
                onChangeText={(value) => handleInputChange('Last Name', value)}
              />
            </View>
            {errors.lastname ? (
              <Text style={styles.errorText}>{errors.lastname}</Text>
            ) : null}
          </View>
          <View style={styles.inputGroup}>
            <View style={[styles.inputContainer, errors.username && styles.inputError]}>
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="#A0A0A0"
                value={username}
                onChangeText={(value) => handleInputChange('Username', value)}
              />
            </View>
            {errors.username ? (
              <Text style={styles.errorText}>{errors.username}</Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <View style={[styles.inputContainer, errors.password && styles.inputError]}>
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#A0A0A0"
                value={password}
                onChangeText={(value) => handleInputChange('Password', value)}
                secureTextEntry
              />
            </View>
            {errors.password ? (
              <Text style={styles.errorText}>{errors.password}</Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <View style={[styles.inputContainer, errors.confirmpassword && styles.inputError]}>
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor="#A0A0A0"
                value={confirmPassword}
                onChangeText={(value) => handleInputChange('Confirm Password', value)}
                secureTextEntry
              />
            </View>
            {errors.confirmpassword ? (
              <Text style={styles.errorText}>{errors.confirmpassword}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
         style={[styles.createButton, isLoading && styles.disabledButton]}
         onPress={handleSubmit}
         disabled={isLoading}
       >
         <Text style={styles.createButtonText}>
           {isLoading ? 'Creating Account...' : 'Create Account'}
         </Text>
       </TouchableOpacity>
       <TouchableOpacity 
         style={styles.cancelButton}
         onPress={handleCancel}
         disabled={isLoading}
       >
         <Text style={styles.cancelButtonText}>Cancel</Text>
       </TouchableOpacity>
     </View>
   </ScrollView>

   {/* Cancel Registration Modal */}
   <Modal
     animationType="fade"
     transparent={true}
     visible={showCancelModal}
     onRequestClose={() => setShowCancelModal(false)}
   >
     <View style={styles.modalOverlay}>
       <View style={styles.modalContent}>
         <Text style={styles.modalTitle}>Cancel Registration</Text>
         <Text style={styles.modalText}>Are you sure you want to cancel? All entered information will be lost.</Text>
         <View style={styles.modalButtons}>
           <TouchableOpacity 
             style={styles.modalCancelButton}
             onPress={() => setShowCancelModal(false)}
           >
             <Text style={styles.modalCancelButtonText}>No, Continue</Text>
           </TouchableOpacity>
           <TouchableOpacity 
             style={styles.modalConfirmButton}
             onPress={() => {
               setShowCancelModal(false);
               router.push('/Admin/HomepageAdmin');
             }}
           >
             <Text style={styles.modalConfirmButtonText}>Yes</Text>
           </TouchableOpacity>
         </View>
       </View>
     </View>
   </Modal>

   {/* Switch Form Type Modal */}
   <Modal
     animationType="fade"
     transparent={true}
     visible={showSwitchModal}
     onRequestClose={() => setShowSwitchModal(false)}
   >
     <View style={styles.modalOverlay}>
       <View style={styles.modalContent}>
         <Text style={styles.modalTitle}>Switch Form Type</Text>
         <Text style={styles.modalText}>
           Switching form type will reset all fields. Do you want to continue?
         </Text>
         <View style={styles.modalButtons}>
           <TouchableOpacity 
             style={styles.modalCancelButton}
             onPress={() => {
               setShowSwitchModal(false);
               setPendingUserType(null);
             }}
           >
             <Text style={styles.modalCancelButtonText}>No, Stay</Text>
           </TouchableOpacity>
           <TouchableOpacity 
             style={styles.modalConfirmButton}
             onPress={confirmSwitch}
           >
             <Text style={styles.modalConfirmButtonText}>Yes, Switch</Text>
           </TouchableOpacity>
         </View>
       </View>
     </View>
   </Modal>
 </SafeAreaView>
);
};

const styles = StyleSheet.create({
safeArea: {
 flex: 1,
 backgroundColor: '#F8F9FA',
},
container: {
 flex: 1,
},
scrollContent: {
 padding: width * 0.04,
 paddingBottom: 20,
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
 gap: 58,
},
headerTitle: {
 fontSize: 22,
 fontWeight: "bold",
 color: "#fff",
},
radioGroup: {
 flexDirection: 'row',
 justifyContent: 'space-between',
 marginBottom: height * 0.02,
},
radioCard: {
 width: '48%',
 padding: width * 0.03,
 borderRadius: 12,
 backgroundColor: '#FFFFFF',
 alignItems: 'center',
 justifyContent: 'center',
 shadowColor: '#000',
 shadowOffset: {
   width: 0,
   height: 1,
 },
 shadowOpacity: 0.1,
 shadowRadius: 2,
 elevation: 2,
},
radioCardActive: {
 backgroundColor: '#F0F7FF',
 borderWidth: 1.5,
 borderColor: '#007AFF',
},
radioText: {
 marginTop: 4,
 fontSize: width * 0.035,
 color: '#666666',
 fontWeight: '500',
},
radioTextActive: {
 color: '#007AFF',
},
formContainer: {
 marginBottom: height * 0.02,
},
inputContainer: {
 backgroundColor: '#FFFFFF',
 borderRadius: 8,
 shadowColor: '#000',
 shadowOffset: {
   width: 0,
   height: 1,
 },
 shadowOpacity: 0.1,
 shadowRadius: 2,
 elevation: 2,
},
inputGroup: {
 marginBottom: height * 0.02,
},
input: {
 padding: width * 0.03,
 fontSize: width * 0.04,
 color: '#1A1A1A',
 borderWidth: 1,
 borderColor: 'transparent',
},
inputError: {
 borderColor: '#DC3545',
 borderWidth: 1,
},
errorText: {
 color: '#DC3545',
 fontSize: width * 0.035,
 marginTop: 4,
 marginLeft: 4,
},
buttonContainer: {
 gap: 8,
},
createButton: {
 backgroundColor: '#007AFF',
 padding: height * 0.018,
 borderRadius: 8,
 alignItems: 'center',
 shadowColor: '#007AFF',
 shadowOffset: {
   width: 0,
   height: 2,
 },
 shadowOpacity: 0.2,
 shadowRadius: 3,
 elevation: 3,
},
disabledButton: {
 opacity: 0.7,
},
createButtonText: {
 color: '#FFFFFF',
 fontSize: width * 0.04,
 fontWeight: '600',
},
cancelButton: {
 padding: height * 0.018,
 borderRadius: 8,
 alignItems: 'center',
 backgroundColor: '#F8F9FA',
 borderWidth: 1,
 borderColor: '#E0E0E0',
},
cancelButtonText: {
 color: '#666666',
 fontSize: width * 0.04,
 fontWeight: '600',
},
modalOverlay: {
 flex: 1,
 backgroundColor: 'rgba(0, 0, 0, 0.5)',
 justifyContent: 'center',
 alignItems: 'center',
},
modalContent: {
 backgroundColor: 'white',
 borderRadius: 16,
 padding: 20,
 width: width * 0.85,
 alignItems: 'center',
 shadowColor: '#000',
 shadowOffset: {
   width: 0,
   height: 2,
 },
 shadowOpacity: 0.25,
 shadowRadius: 4,
 elevation: 5,
},
modalTitle: {
 fontSize: width * 0.05,
 fontWeight: '700',
 color: '#1A1A1A',
 marginBottom: 12,
},
modalText: {
 fontSize: width * 0.04,
 color: '#666666',
 textAlign: 'center',
 marginBottom: 20,
},
modalButtons: {
 flexDirection: 'row',
 gap: 12,
 width: '100%',
},
modalCancelButton: {
 flex: 1,
 padding: height * 0.015,
 borderRadius: 8,
 alignItems: 'center',
 backgroundColor: '#F8F9FA',
 borderWidth: 1,
 borderColor: '#E0E0E0',
},
modalCancelButtonText: {
 color: '#666666',
 fontSize: width * 0.035,
 fontWeight: '600',
},
modalConfirmButton: {
 flex: 1,
 padding: height * 0.015,
 borderRadius: 8,
 alignItems: 'center',
 backgroundColor: '#DC3545',
},
modalConfirmButtonText: {
 color: '#FFFFFF',
 fontSize: width * 0.035,
 fontWeight: '600',
},
});

export default RegistrationForm;