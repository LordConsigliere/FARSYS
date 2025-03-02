
import React from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import { router } from "expo-router";
import { AuthContext } from "../../AuthContext"
import { getAuth, signOut } from 'firebase/auth'
import { useCustomBackHandler } from '../../components/BackHandler/backhadler';
const HomepageAdmin = () => {
  useCustomBackHandler();
  const categories = [
    { id: 1, name: "Manage Account", icon: "account" },
    {
      id: 2,
      name: "Register Account",
      icon: "account-multiple-plus",
    },
    { id: 3, name: "Account List", icon: "clipboard-text-outline" },
    { id: 4, name: "Log out", icon: "power" },
  ];

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
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1E90FF" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.profileContainer}>
        </View>
        <Text style={styles.welcomeText}>FARSys Management</Text>
      </View>
      {/* Categories Section */}
      <View style={styles.categoriesSection}>
        <Text style={styles.categoryTitle}>CATEGORIES</Text>
        {/* <Text style={styles.categorySubtitle}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit
        </Text> */}

        <View style={styles.categoryGrid}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryCard}
              // onPress={() => console.log(`Selected ${category.Home}`)}
              onPress={() => {
                if (category.name === "Register Account") {
                  router.push("/Admin/RegisterUsers");
                } else if (category.name === "Manage Account") {
                  router.push("/Admin/ManageAccount");
                } else if (category.name === "Account List") {
                  router.push("/Admin/AccountList");
                }else if (category.name === "Log out") {
                  router.push(handleLogout);
                }
                
              }}
            >
              <Icon name={category.icon} size={30} color="#1E90FF" />
              <Text style={styles.categoryText}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    backgroundColor: "#1E90FF",
    paddingTop: 30,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  profileContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  profileCircle: {
    width: 50,
    height: 50,
    borderRadius: 30,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  profileLetter: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1E90FF",
  },
  menuIcon: {
    padding: 10,
  },
  welcomeText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 10,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginTop: -20,
  },
  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 10,
    fontSize: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoriesSection: {
    padding: 20,
    flex: 1,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
    textAlign: "center",
  },
  categorySubtitle: {
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  categoryCard: {
    width: "48%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  categoryText: {
    marginTop: 10,
    fontSize: 16,
    color: "#333",
  },
});

export default HomepageAdmin;
