import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { ref, get, child, update } from "firebase/database";
import { database } from "../../FirebaseConfig";
import { AuthContext } from "../../AuthContext";
import * as Crypto from "expo-crypto";

const TeacherProfile = () => {
  const { username, userType } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  useEffect(() => {
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
        let userFound = false;
        if (snapshot.exists()) {
          snapshot.forEach((childSnapshot) => {
            const userData = childSnapshot.val();
            if (userData.username === username) {
              setProfile({ ...userData, id: childSnapshot.key });
              userFound = true;
              return true;
            }
          });
        }
        if (!userFound) {
          Alert.alert("Error", "Could not find the user.");
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        Alert.alert("Error", "Failed to fetch user profile. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [username, userType]);

  const handleUpdateProfile = async () => {
    setUpdating(true);
    try {
      if (!profile) {
        Alert.alert("Error", "No profile data to update.");
        return;
      }

      if (newPassword !== confirmNewPassword && newPassword !== "") {
        Alert.alert("Error", "Passwords do not match.");
        setUpdating(false);
        return;
      }
      const { id, ...profileDataToUpdate } = profile;
      const dbRef = ref(database);
      let userRef = null;

      if (userType === "teacher") {
        userRef = child(dbRef, `users/teachers/${id}`);
      } else if (userType === "student") {
        userRef = child(dbRef, `users/students/${id}`);
      } else {
        Alert.alert("Error", "Could not determine the user type.");
        setUpdating(false);
        return;
      }

      if (newPassword) {
        const salt = await generateSalt();
        const hashedPassword = await hashPassword(newPassword, salt);
        profileDataToUpdate.passwordHash = hashedPassword;
        profileDataToUpdate.salt = salt;
        setNewPassword("");
        setConfirmNewPassword("");
      }

      await update(userRef, profileDataToUpdate);
      Alert.alert("Success", "Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }
  if (!profile) {
    return (
      <View style={styles.container}>
        <Text>Could not load user profile.</Text>
      </View>
    );
  }
  return (
    // <SafeAreaView style={styles.container}>
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.header}>
        <TouchableOpacity>
          {/* <Text
            style={styles.backButton}
            onPress={() => {
              router.push("/Teacher/TeacherDashboard");
            }}
          >
            ←
          </Text> */}
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.profileSection}>
        <View style={styles.imageContainer}>
          <Image
            source={require("../../assets/images/usericon.png")}
            style={styles.profileImage}
          />
          <TouchableOpacity style={styles.editButton}>
            <Text style={styles.editIcon}>✎</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.profileName}>
          {profile.firstName} {profile.lastName}
        </Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>FIRST NAME</Text>
          <TextInput
            style={styles.input}
            value={profile.firstName}
            onChangeText={(text) => setProfile({ ...profile, firstName: text })}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>LAST NAME</Text>
          <TextInput
            style={styles.input}
            value={profile.lastName}
            onChangeText={(text) => setProfile({ ...profile, lastName: text })}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>USERNAME</Text>
          <TextInput
            style={styles.input}
            value={profile.username}
            onChangeText={(text) => setProfile({ ...profile, username: text })}
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>NEW PASSWORD</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={(text) => setNewPassword(text)}
            secureTextEntry={true}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>CONFIRM NEW PASSWORD</Text>
          <TextInput
            style={styles.input}
            value={confirmNewPassword}
            onChangeText={(text) => setConfirmNewPassword(text)}
            secureTextEntry={true}
          />
        </View>

        <TouchableOpacity
          style={[styles.updateButton, updating && styles.disabledButton]}
          onPress={handleUpdateProfile}
          disabled={updating}
        >
          <Text style={styles.updateButtonText}>
            {updating ? "Updating..." : "UPDATE"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    // </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#f0f8ff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: "#1e90ff",
  },
  backButton: {
    fontSize: 24,
    color: "white",
  },
  headerTitle: {
    fontSize: 25,
    color: "white",
    fontWeight: "500",
    fontFamily: "outfit-bold",
  },
  placeholder: {
    width: 24,
  },
  profileSection: {
    alignItems: "center",
    padding: 20,
  },
  imageContainer: {
    position: "relative",
    alignItems: "center",
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#e1e1e1",
  },
  editButton: {
    position: "absolute",
    right: 0,
    bottom: 0,
    backgroundColor: "#1e90ff",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  editIcon: {
    color: "white",
    fontSize: 16,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "500",
    marginTop: 10,
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: "#1e90ff",
    marginBottom: 5,
    fontSize: 12,
    fontWeight: "500",
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingVertical: 5,
    fontSize: 16,
  },
  updateButton: {
    backgroundColor: "#1e90ff",
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 20,
  },
  updateButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  disabledButton: {
    opacity: 0.7,
  },
});

// Add the hashPassword function at the top level
const hashPassword = async (password, salt) => {
  const dataToHash = password + salt;
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    dataToHash
  );
};

const generateSalt = async () => {
  const randomBytes = await Crypto.getRandomBytesAsync(16);
  const salt = Array.from(new Uint8Array(randomBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return salt;
};

export default TeacherProfile;
