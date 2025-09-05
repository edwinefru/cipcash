import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { BlurView } from 'expo-blur';

const API_BASE_URL = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface User {
  id: string;
  kyc_data: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    date_of_birth: string;
    nationality: string;
    gender: string;
    address_line1: string;
    city: string;
    country: string;
    occupation: string;
    annual_income_range: string;
    profile_picture?: string;
  };
  is_kyc_verified: boolean;
  kyc_rejection_reason?: string;
  kyc_verification_date?: string;
  created_at: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  timestamp: string;
  read: boolean;
}

const ProfileScreen: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    phone: '',
    address_line1: '',
    city: '',
    occupation: '',
  });

  useEffect(() => {
    loadUserData();
    loadNotifications();
  }, []);

  const loadUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        router.replace('/welcome');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setEditForm({
          phone: userData.kyc_data.phone,
          address_line1: userData.kyc_data.address_line1,
          city: userData.kyc_data.city,
          occupation: userData.kyc_data.occupation,
        });
      } else {
        router.replace('/welcome');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/${user?.id || 'dummy'}`);
      if (response.ok) {
        const notificationsData = await response.json();
        setNotifications(notificationsData);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadUserData(), loadNotifications()]);
    setRefreshing(false);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('authToken');
            router.replace('/welcome');
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getIncomeRangeLabel = (range: string) => {
    const ranges: { [key: string]: string } = {
      'under_25k': 'Under $25,000',
      '25k_50k': '$25,000 - $50,000',
      '50k_100k': '$50,000 - $100,000',
      '100k_250k': '$100,000 - $250,000',
      '250k_500k': '$250,000 - $500,000',
      'over_500k': 'Over $500,000',
    };
    return ranges[range] || range;
  };

  const renderProfileHeader = () => (
    <LinearGradient
      colors={['#007AFF', '#0051D5']}
      style={styles.profileHeader}
    >
      <View style={styles.profileHeaderContent}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.kyc_data.first_name.charAt(0)}{user?.kyc_data.last_name.charAt(0)}
            </Text>
          </View>
          <TouchableOpacity style={styles.cameraButton}>
            <Ionicons name="camera" size={16} color="white" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.userName}>
          {user?.kyc_data.first_name} {user?.kyc_data.last_name}
        </Text>
        <Text style={styles.userEmail}>{user?.kyc_data.email}</Text>
        
        <BlurView intensity={20} style={styles.kycStatusContainer}>
          <View style={styles.kycStatus}>
            <Ionicons
              name={user?.is_kyc_verified ? "checkmark-circle" : user?.kyc_rejection_reason ? "close-circle" : "time"}
              size={20}
              color={user?.is_kyc_verified ? "#10B981" : user?.kyc_rejection_reason ? "#EF4444" : "#F59E0B"}
            />
            <Text style={styles.kycStatusText}>
              {user?.is_kyc_verified 
                ? 'Verified' 
                : user?.kyc_rejection_reason 
                  ? 'Rejected' 
                  : 'Pending Verification'
              }
            </Text>
          </View>
          {user?.kyc_rejection_reason && (
            <Text style={styles.rejectionReason}>{user.kyc_rejection_reason}</Text>
          )}
        </BlurView>
      </View>
    </LinearGradient>
  );

  const renderPersonalInfo = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setShowEditProfile(true)}
        >
          <Ionicons name="create-outline" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Date of Birth</Text>
          <Text style={styles.infoValue}>{formatDate(user?.kyc_data.date_of_birth || '')}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Gender</Text>
          <Text style={styles.infoValue}>{user?.kyc_data.gender}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Nationality</Text>
          <Text style={styles.infoValue}>{user?.kyc_data.nationality}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phone</Text>
          <Text style={styles.infoValue}>{user?.kyc_data.phone}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Address</Text>
          <Text style={styles.infoValue}>
            {user?.kyc_data.address_line1}, {user?.kyc_data.city}, {user?.kyc_data.country}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderEmploymentInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Employment & Income</Text>
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Occupation</Text>
          <Text style={styles.infoValue}>{user?.kyc_data.occupation}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Annual Income</Text>
          <Text style={styles.infoValue}>
            {getIncomeRangeLabel(user?.kyc_data.annual_income_range || '')}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderAccountInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Account Information</Text>
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Member Since</Text>
          <Text style={styles.infoValue}>{formatDate(user?.created_at || '')}</Text>
        </View>
        {user?.kyc_verification_date && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>KYC Verified</Text>
            <Text style={styles.infoValue}>{formatDate(user.kyc_verification_date)}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickActionItem}
          onPress={() => setShowNotifications(true)}
        >
          <View style={styles.quickActionIcon}>
            <Ionicons name="notifications" size={24} color="#007AFF" />
          </View>
          <Text style={styles.quickActionText}>Notifications</Text>
          {notifications.filter(n => !n.read).length > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {notifications.filter(n => !n.read).length}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionItem}
          onPress={() => router.push('/(tabs)/chat')}
        >
          <View style={styles.quickActionIcon}>
            <Ionicons name="chatbubbles" size={24} color="#10B981" />
          </View>
          <Text style={styles.quickActionText}>Support</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickActionItem}>
          <View style={styles.quickActionIcon}>
            <Ionicons name="document-text" size={24} color="#F59E0B" />
          </View>
          <Text style={styles.quickActionText}>Documents</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionItem}
          onPress={handleLogout}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: '#FEF2F2' }]}>
            <Ionicons name="log-out" size={24} color="#EF4444" />
          </View>
          <Text style={[styles.quickActionText, { color: '#EF4444' }]}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderNotificationsModal = () => (
    <Modal visible={showNotifications} animationType="slide">
      <SafeAreaView style={styles.modal}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowNotifications(false)}>
            <Ionicons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Notifications</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <ScrollView style={styles.notificationsList}>
          {notifications.length === 0 ? (
            <View style={styles.emptyNotifications}>
              <Ionicons name="notifications-outline" size={48} color="#C7C7CC" />
              <Text style={styles.emptyNotificationsText}>No notifications yet</Text>
            </View>
          ) : (
            notifications.map((notification) => (
              <View key={notification.id} style={styles.notificationItem}>
                <View style={styles.notificationIcon}>
                  <Ionicons
                    name={notification.type === 'success' ? 'checkmark-circle' : 'information-circle'}
                    size={24}
                    color={notification.type === 'success' ? '#10B981' : '#007AFF'}
                  />
                </View>
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationTitle}>{notification.title}</Text>
                  <Text style={styles.notificationMessage}>{notification.message}</Text>
                  <Text style={styles.notificationTime}>
                    {new Date(notification.timestamp).toLocaleString()}
                  </Text>
                </View>
                {!notification.read && <View style={styles.unreadDot} />}
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  if (isLoading || !user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderProfileHeader()}
        {renderPersonalInfo()}
        {renderEmploymentInfo()}
        {renderAccountInfo()}
        {renderQuickActions()}
      </ScrollView>
      
      {renderNotificationsModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  profileHeader: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  profileHeaderContent: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 16,
  },
  kycStatusContainer: {
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  kycStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  kycStatusText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  rejectionReason: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  editButton: {
    padding: 8,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  infoLabel: {
    fontSize: 16,
    color: '#8E8E93',
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
    flex: 1,
    textAlign: 'right',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  quickActionItem: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    width: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
    textAlign: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modal: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  notificationsList: {
    flex: 1,
  },
  emptyNotifications: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 300,
  },
  emptyNotificationsText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 16,
  },
  notificationItem: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  notificationIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#C7C7CC',
  },
  unreadDot: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
});

export default ProfileScreen;