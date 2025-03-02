import React, { useState, useEffect, useContext,useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../constants/Colors";
import { ref, get, child } from "firebase/database";
import { database } from "../../../FirebaseConfig";
import { AuthContext } from "../../../AuthContext";
import { router, useFocusEffect } from 'expo-router';
const ProfileScreen = ({ navigation }) => {
  const { username, userType } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const dbRef = ref(database);
      let snapshot;

      if (userType === "teacher") {
        snapshot = await get(child(dbRef, "users/teachers"));
      } else if (userType === "student") {
        snapshot = await get(child(dbRef, "users/students"));
      } else {
        setLoading(false);
        Alert.alert("Error", "Could not determine the user type.");
        return;
      }
      
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const userData = childSnapshot.val();
          if (userData.username === username) {
            setProfile({ ...userData, id: childSnapshot.key });
            return true;
          }
        });
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      Alert.alert("Error", "Failed to fetch user profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // This will run every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [username, userType])
  );
  
  const handleEditPress = () => {
    router.push({
      pathname: "/Student/profiledit",
      params: { profile }
    });
  };
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Could not load user profile.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView}>
      {/* Modern Gradient Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <Text style={styles.headerText}>My Profile</Text>
        </View>
      </View>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarWrapper}>
            <Ionicons name="person" size={40} color="#ffffff" />
          </View>
          <View style={styles.badgeContainer}>
            <Ionicons name={userType === "teacher" ? "school" : "book"} size={16} color="#fff" />
          </View>
        </View>

        <Text style={styles.name}>{`${profile.firstName} ${profile.lastName}`}</Text>
        <Text style={styles.userType}>{userType.charAt(0).toUpperCase() + userType.slice(1)}</Text>
      </View>

      {/* Info Cards */}
      <View style={styles.infoSection}>
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="person-circle-outline" size={24} color={Colors.PRIMARY} />
            <Text style={styles.infoTitle}>Personal Information</Text>
          </View>          
          <View style={styles.infoItem}>
            <Text style={styles.label}>First Name</Text>
            <Text style={styles.value}>{profile.firstName}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.label}>Last Name</Text>
            <Text style={styles.value}>{profile.lastName}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.label}>Grade Level</Text>
            <Text style={styles.value}>{profile.gradeLevel}</Text>
          </View>
        </View>
      </View>

      {/* Edit Profile Button */}
      <TouchableOpacity
        style={styles.editButton}
        onPress={handleEditPress}
      >
        <Ionicons name="create-outline" size={20} color="#fff" style={styles.editIcon} />
        <Text style={styles.editButtonText}>Edit Profile</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  headerContainer: {
    height: 180,
    backgroundColor: Colors.PRIMARY,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 5,
  },
  headerContent: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 27,
    color: "#fff",
    fontFamily: "outfit-bold",
    textAlign: 'center',
  },
  profileCard: {
    alignItems: "center",
    marginTop: -60,
    paddingBottom: 20,
  },
  avatarContainer: {
    position: "relative",
  },
  avatarWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    borderWidth: 4,
    borderColor: "#fff",
  },
  badgeContainer: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: Colors.PRIMARY,
    padding: 8,
    borderRadius: 15,
    elevation: 4,
    borderWidth: 2,
    borderColor: "#fff",
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
    fontFamily: "outfit-bold",
  },
  userType: {
    fontSize: 16,
    color: Colors.PRIMARY,
    marginTop: 4,
    fontFamily: "outfit",
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  infoSection: {
    padding: 20,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    elevation: 4,
    marginBottom: 20,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginLeft: 10,
    fontFamily: "outfit-bold",
  },
  infoItem: {
    marginBottom: 16,
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 12,
  },
  label: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
    fontFamily: "outfit",
  },
  value: {
    fontSize: 16,
    color: "#333",
    fontFamily: "outfit-bold",
  },
  editButton: {
    flexDirection: "row",
    backgroundColor: Colors.PRIMARY,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    marginBottom: 30,
    elevation: 4,
  },
  editIcon: {
    marginRight: 8,
  },
  editButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "outfit-bold",
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 20,
    fontFamily: "outfit",
  },
});

export default ProfileScreen;