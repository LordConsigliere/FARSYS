// AccountView.js
import React from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { Colors } from '../../constants/Colors';
import { router, useLocalSearchParams } from 'expo-router';

const AccountView = () => {
  // Get the account data from route params using useLocalSearchParams
  const params = useLocalSearchParams();
  const account = params.account ? JSON.parse(params.account) : null;
  const accountType = params.type;

  const renderAccountDetails = () => {
    if (accountType === 'Student') {
      return (
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Full Name:</Text>
            <Text style={styles.value}>{account.name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Account Created:</Text>
            <Text style={styles.value}>{account.createdAt}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Account Type:</Text>
            <Text style={styles.value}>Student</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>User ID:</Text>
            <Text style={styles.value}>{account.id}</Text>
          </View>
        </View>
      );
    } else {
      return (
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Full Name:</Text>
            <Text style={styles.value}>{account.name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Account Created:</Text>
            <Text style={styles.value}>{account.createdAt}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Account Type:</Text>
            <Text style={styles.value}>Teacher</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>User ID:</Text>
            <Text style={styles.value}>{account.id}</Text>
          </View>
        </View>
      );
    }
  };

  if (!account) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Account Details</Text>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Account information not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Account Details</Text>
        </View>
      </View>
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Icon 
              name={accountType === 'Student' ? "account" : "account-tie"} 
              size={48} 
              color="#fff" 
            />
          </View>
          <Text style={styles.name}>{account?.name}</Text>
          <Text style={styles.type}>{accountType}</Text>
        </View>
        
        {renderAccountDetails()}
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
    gap: 83,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'outfit-bold',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  type: {
    fontSize: 16,
    color: '#6B7280',
  },
  detailsContainer: {
    padding: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  label: {
    fontSize: 16,
    color: '#6B7280',
    flex: 1,
  },
  value: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
  },
});

export default AccountView;