import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
  } from "react-native";
  import React, { useState, useContext, useEffect } from "react";
  import { LinearGradient } from "expo-linear-gradient";
  import { Colors } from "../constants/Colors";
  import { ref, update, get, child } from "firebase/database";
  import { database } from "../FirebaseConfig";
  import * as Crypto from "expo-crypto";
  import { AuthContext } from "../AuthContext";
  import { Picker } from "@react-native-picker/picker";
  import { router } from "expo-router";
  
  const hashPassword = async (password, salt) => {
    const dataToHash = password + salt;
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      dataToHash
    );
  };
  
  export default function UpdateAccount() {
    const { userType, userID, username } = useContext(AuthContext);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [gradeLevel, setGradeLevel] = useState("");
    const [department, setDepartment] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
  
    useEffect(() => {
      const fetchUserDetails = async () => {
        try {
          const dbRef = ref(database);
          const userSnapshot = await get(child(dbRef, `users/${userType}s/${userID}`));
          
          if (userSnapshot.exists()) {
            const userData = userSnapshot.val();
            setFirstName(userData.firstName || "");
            setLastName(userData.lastName || "");
            if (userType === "student") {
              setGradeLevel(userData.gradeLevel || "");
            } else {
              setDepartment(userData.department || "");
            }
          }
        } catch (error) {
          console.error("Error fetching user details:", error);
        }
      };
  
      fetchUserDetails();
    }, [userID, userType]);
  
    const handleUpdate = async () => {
      if (newPassword !== confirmPassword) {
        Alert.alert("Error", "Passwords do not match");
        return;
      }
  
      if (newPassword && newPassword.length < 6) {
        Alert.alert("Error", "Password must be at least 6 characters long");
        return;
      }
  
      if (userType === "student" && !gradeLevel) {
        Alert.alert("Error", "Please select a grade level");
        return;
      }
  
      if (userType === "teacher" && !department) {
        Alert.alert("Error", "Please enter your department");
        return;
      }
  
      setIsLoading(true);
      try {
        const updates = {};
        const salt = Crypto.getRandomValues(new Uint8Array(16)).toString();
  
        if (newPassword) {
          const passwordHash = await hashPassword(newPassword, salt);
          updates[`users/${userType}s/${userID}/passwordHash`] = passwordHash;
          updates[`users/${userType}s/${userID}/salt`] = salt;
        }
  
        if (userType === "student") {
          updates[`users/students/${userID}/gradeLevel`] = gradeLevel;
        } else {
          updates[`users/teachers/${userID}/department`] = department;
        }
  
        // Update account status
        updates[`users/${userType}s/${userID}/accountStatus`] = "updated";
  
        await update(ref(database), updates);
        Alert.alert("Success", "Account updated successfully", [
          {
            text: "OK",
            onPress: () => {
              // Redirect to appropriate dashboard after successful update
              if (userType === "student") {
                router.push("/Student/(tabs)/home");
              } else {
                router.push("/Teacher/TeacherDashboard");
              }
            },
          },
        ]);
      } catch (error) {
        console.error("Update error:", error);
        Alert.alert("Error", "Failed to update account. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
  
    return (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.container}
        >
          <LinearGradient
            colors={["#1E90FF", "#157DDE", "#0A6AC8"]}
            style={styles.gradient}
          >
            <View style={styles.updateContainer}>
              <Text style={styles.headerText}>Welcome to FARSys</Text>
              <Text style={styles.subHeaderText}>(Please complete your profile below)</Text>
              
              <View style={styles.userInfoContainer}>
                <Text style={styles.userInfoText}>
                  <Text style={styles.labelBold}>Name:</Text> {firstName} {lastName}
                </Text>
                <Text style={styles.userInfoText}>
                  <Text style={styles.labelBold}>Type:</Text> {userType.charAt(0).toUpperCase() + userType.slice(1)}
                </Text>
              </View>
    
              {userType === "student" ? (
                <View style={styles.pickerContainer}>
                  <Text style={styles.labelText}>Grade Level</Text>
                  <Picker
                    selectedValue={gradeLevel}
                    onValueChange={(itemValue) => setGradeLevel(itemValue)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select Grade Level" value="" />
                    <Picker.Item label="Grade 7" value="7" />
                    <Picker.Item label="Grade 8" value="8" />
                    <Picker.Item label="Grade 9" value="9" />
                    <Picker.Item label="Grade 10" value="10" />
                    <Picker.Item label="Grade 11" value="11" />
                    <Picker.Item label="Grade 12" value="12" />
                  </Picker>
                </View>
              ) : (
                <View style={styles.inputContainer}>
                  <Text style={styles.labelText}>Department</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter Department"
                    placeholderTextColor="#999"
                    value={department}
                    onChangeText={setDepartment}
                  />
                </View>
              )}
    
              <View style={styles.inputContainer}>
                <Text style={styles.labelText}>New Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter New Password"
                  placeholderTextColor="#999"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm New Password"
                  placeholderTextColor="#999"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </View>
    
              <TouchableOpacity
                style={[styles.updateButton, isLoading && styles.disabledButton]}
                onPress={handleUpdate}
                disabled={isLoading}
              >
                <Text style={styles.updateButtonText}>
                  {isLoading ? "Updating..." : "COMPLETE PROFILE"}
                </Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </KeyboardAvoidingView>
      );
    }
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    gradient: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    subHeaderText: {
        fontSize: 16,
        fontFamily: "outfit",
        color: "#666",
        textAlign: "center",
        marginBottom: 20,
        },
    updateContainer: {
      width: "88%",
      backgroundColor: "white",
      borderRadius: 25,
      padding: 20,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },

      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    headerText: {
      fontSize: 28,
      fontFamily: "outfit-bold",
      color: "#333",
      textAlign: "center",
      marginBottom: 5,
    },
    userInfoContainer: {
        backgroundColor: "#f5f5f5",
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
      },
      userInfoText: {
        fontSize: 16,
        fontFamily: "outfit",
        color: "#333",
        marginBottom: 10,
        lineHeight: 24,
      },
      labelBold: {
        fontFamily: "outfit-bold",
        color: "#666",
      },
    labelText: {
      fontSize: 14,
      fontFamily: "outfit",
      color: "#333",
      marginBottom: 5,
    },
    inputContainer: {
      marginBottom: 20,
    },
    input: {
      backgroundColor: "#f5f5f5",
      padding: 15,
      borderRadius: 10,
      marginBottom: 10,
      fontSize: 16,
      fontFamily: "outfit",
    },
    pickerContainer: {
      marginBottom: 20,
    },
    picker: {
      backgroundColor: "#f5f5f5",
      borderRadius: 10,
      marginBottom: 10,
      fontFamily: "outfit",
    },
    updateButton: {
      backgroundColor: Colors.PRIMARY,
      padding: 15,
      borderRadius: 10,
      alignItems: "center",
    },
    updateButtonText: {
      color: "white",
      fontSize: 16,
      fontFamily: "outfit",
    },
    disabledButton: {
      opacity: 0.7,
    },
  });