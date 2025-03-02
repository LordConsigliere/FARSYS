import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import React, { useEffect, useState, useContext } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "../constants/Colors";
import { router } from "expo-router";
import { ref, get, child } from "firebase/database";
import { database } from "../FirebaseConfig";
import * as Crypto from "expo-crypto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthContext } from "../AuthContext"; // Import the AuthContext

// Move animation values outside component
const fadeAnim = new Animated.Value(1);
const slideAnim = new Animated.Value(0);

const hashPassword = async (password, salt) => {
  const dataToHash = password + salt;
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    dataToHash
  );
};

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useContext(AuthContext); // Access the login function from AuthContext

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("Error", "Please enter both username and password");
      return;
    }
  
    setIsLoading(true);
  
    // Start measuring latency
    const startTime = Date.now();
  
    try {
      const dbRef = ref(database);
      const studentSnapshot = await get(child(dbRef, "users/students"));
      const teacherSnapshot = await get(child(dbRef, "users/teachers"));
      const adminSnapshot = await get(child(dbRef, "users/admin")); // Changed from admin to admins
  
      let user = null;
      let userType = null;
      let userID = null;
  
      // Check admin credentials first
      adminSnapshot.forEach((childSnapshot) => {
        const adminData = childSnapshot.val();
        if (adminData.username === username) {
          user = adminData;
          userType = "admin";
          userID = childSnapshot.key;
          return true;
        }
      });
  
      // If not admin, check students
      if (!user) {
        studentSnapshot.forEach((childSnapshot) => {
          const studentData = childSnapshot.val();
          if (studentData.username === username) {
            user = studentData;
            userType = "student";
            userID = childSnapshot.key;
            return true;
          }
        });
      }
  
      // If not student, check teachers
      if (!user) {
        teacherSnapshot.forEach((childSnapshot) => {
          const teacherData = childSnapshot.val();
          if (teacherData.username === username) {
            user = teacherData;
            userType = "teacher";
            userID = childSnapshot.key;
            return true;
          }
        });
      }
  
      if (!user) {
        Alert.alert("Error", "User not found");
        setIsLoading(false);
        return;
      }
  
      // Verify password
      const hashedAttempt = await hashPassword(password, user.salt);
      if (hashedAttempt === user.passwordHash) {
        // Save login session
        await login(username, userType, userID);
  
        // Route based on user type
        switch (userType) {
          case "admin":
            router.push("/Admin/HomepageAdmin");
            break;
          case "student":
            if (user.accountStatus === "not-updated") {
              router.push("updateaccount");
            } else {
              router.push({
                pathname: "/Student/(tabs)/home",
              });
            }
            break;
          case "teacher":
            if (user.accountStatus === "not-updated") {
              router.push("updateaccount");
            } else {
              router.push({
                pathname: "/Teacher/TeacherDashboard",
              });
            }
            break;
        }
      } else {
        Alert.alert("Error", "Incorrect password");
      }
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert("Error", "Failed to log in. Please try again.");
    } finally {
      // End measuring latency
      const endTime = Date.now();
      const latency = endTime - startTime;
  
      // Log latency to the console
      console.log(`Login process latency: ${latency}ms`);
  
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
        <Animated.View
          style={[
            styles.loginContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.illustrationContainer}>
            <Image
              source={require("../assets/images/Fapsyslogo.png")}
              style={styles.illustration}
              resizeMode="contain"
            />
            <Text style={styles.logoText}>FARSys</Text>
            <Text style={styles.subText}>Sign in to continue</Text>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#999"
              value={username}
              onChangeText={setUsername}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {/* <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity> */}

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? "Logging in..." : "LOGIN"}
            </Text>
          </TouchableOpacity>
        </Animated.View>
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
  disabledButton: {
    opacity: 0.7,
  },
  loginContainer: {
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
  illustrationContainer: {
    alignItems: "center",
    marginBottom: 20,
    height: 200,
  },
  illustration: {
    width: "100%",
    height: "100%",
  },
  inputContainer: {
    marginTop: 60,
    marginBottom: 14,
  },
  input: {
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
    fontFamily: "outfit",
  },
  forgotPassword: {
    alignItems: "flex-end",
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: "#4c669f",
    fontSize: 14,
    fontFamily: "outfit",
  },
  loginButton: {
    backgroundColor: Colors.PRIMARY,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  loginButtonText: {
    color: "white",
    fontSize: 16,
    fontFamily: "outfit",
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
  },
  signupText: {
    color: "#666",
    fontSize: 14,
  },
  signupButton: {
    color: "#4c669f",
    fontSize: 14,
    fontWeight: "bold",
  },
  logoText: {
    fontSize: 40,
    fontFamily: "outfit-bold",
    color: "#3674B5",
    marginBottom: 5,
  },
  subText: {
    fontFamily: "outfit",
    fontSize: 13,
    color: "#666",
  },
});
