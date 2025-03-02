// context/AuthContext.js
import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [username, setUsername] = useState(null);
  const [userID, setUserID] = useState(null);
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const savedUsername = await AsyncStorage.getItem("username");
        const savedUserType = await AsyncStorage.getItem("userType");
        const savedStudentId = await AsyncStorage.getItem("userID");
  
        if (savedStudentId) {
          setUsername(savedUsername);
          setUserID(savedStudentId);
          setUserType(savedUserType);
        }
      } catch (error) {
        console.error("Error loading session data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadSession();
  }, []);

  const login = async (username, userType, userID) => {
    try {
      await AsyncStorage.setItem("username", username);
      await AsyncStorage.setItem("userType", userType);
      await AsyncStorage.setItem("userID", userID);
      setUserID(userID);
      setUsername(username);
      setUserType(userType);
    } catch (error) {
      console.error("Error setting session:", error);
    }
  };
  const logout = async () => {
    try {
      await AsyncStorage.removeItem("username");
      await AsyncStorage.removeItem("userType");
      await AsyncStorage.removeItem("userID");
      setUserID(null);
      setUsername(null);
      setUserType(null);
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };
  return (
    <AuthContext.Provider value={{ username, userType, userID, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
