import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');
const API_BASE_URL = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface User {
  id: string;
  kyc_data: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    profile_picture?: string;
  };
  is_kyc_verified: boolean;
  kyc_rejection_reason?: string;
}

interface Country {
  id: string;
  country_code: string;
  country_name: string;
  currency_code: string;
  currency_name: string;
  flag_emoji: string;
  phone_code: string;
}

interface Transaction {
  id: string;
  amount_sent: number;
  recipient_data: {
    first_name: string;
    last_name: string;
    country: string;
  };
  transfer_status: string;
  created_at: string;
}

const HomeScreen: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUserData();
    loadCountries();
    loadTransactions();
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
      } else {
        router.replace('/welcome');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadCountries = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/countries`);
      if (response.ok) {
        const countriesData = await response.json();
        setCountries(countriesData.slice(0, 8)); // Show first 8 countries
      }
    } catch (error) {
      console.error('Error loading countries:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/transactions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const transactionsData = await response.json();
        setTransactions(transactionsData.slice(0, 5)); // Show last 5 transactions
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadUserData(),
      loadCountries(),
      loadTransactions(),
    ]);
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
        {/* Header */}
        <LinearGradient
          colors={['#007AFF', '#0051D5']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user.kyc_data.first_name.charAt(0)}{user.kyc_data.last_name.charAt(0)}
                </Text>
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.greeting}>Welcome back,</Text>
                <Text style={styles.userName}>{user.kyc_data.first_name}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* KYC Status */}
          <BlurView intensity={20} style={styles.kycStatusCard}>
            <View style={styles.kycStatus}>
              <Ionicons
                name={user.is_kyc_verified ? "checkmark-circle" : "time"}
                size={24}
                color={user.is_kyc_verified ? "#10B981" : "#F59E0B"}
              />
              <View style={styles.kycStatusText}>
                <Text style={styles.kycStatusTitle}>
                  KYC Status: {user.is_kyc_verified ? 'Verified' : 'Pending'}
                </Text>
                <Text style={styles.kycStatusSubtitle}>
                  {user.is_kyc_verified
                    ? 'Your account is fully verified'
                    : user.kyc_rejection_reason || 'Verification in progress'
                  }
                </Text>
              </View>
            </View>
          </BlurView>
        </LinearGradient>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/(tabs)/send')}
            >
              <LinearGradient
                colors={['#FF6B35', '#F7931E']}
                style={styles.quickActionGradient}
              >
                <Ionicons name="send" size={32} color="white" />
                <Text style={styles.quickActionText}>Send Money</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/(tabs)/chat')}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.quickActionGradient}
              >
                <Ionicons name="chatbubbles" size={32} color="white" />
                <Text style={styles.quickActionText}>Support</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{transactions.length}</Text>
              <Text style={styles.statLabel}>Total Transfers</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                ${transactions.reduce((sum, tx) => sum + tx.amount_sent, 0).toFixed(0)}
              </Text>
              <Text style={styles.statLabel}>Total Sent</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{countries.length}+</Text>
              <Text style={styles.statLabel}>Countries</Text>
            </View>
          </View>
        </View>

        {/* Supported Countries */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Supported Countries</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.countriesContainer}>
              {countries.map((country) => (
                <View key={country.id} style={styles.countryCard}>
                  <Text style={styles.countryFlag}>{country.flag_emoji}</Text>
                  <Text style={styles.countryName}>{country.country_name}</Text>
                  <Text style={styles.countryCurrency}>{country.currency_code}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {transactions.length > 0 ? (
            <View style={styles.transactionsList}>
              {transactions.map((transaction) => (
                <View key={transaction.id} style={styles.transactionCard}>
                  <View style={styles.transactionIcon}>
                    <Ionicons name="arrow-forward" size={20} color="#007AFF" />
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionRecipient}>
                      To {transaction.recipient_data.first_name} {transaction.recipient_data.last_name}
                    </Text>
                    <Text style={styles.transactionCountry}>
                      {transaction.recipient_data.country}
                    </Text>
                  </View>
                  <View style={styles.transactionAmount}>
                    <Text style={styles.transactionAmountText}>
                      ${transaction.amount_sent}
                    </Text>
                    <View style={[
                      styles.transactionStatus,
                      { backgroundColor: transaction.transfer_status === 'completed' ? '#10B981' : '#F59E0B' }
                    ]}>
                      <Text style={styles.transactionStatusText}>
                        {transaction.transfer_status}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color="#C7C7CC" />
              <Text style={styles.emptyStateText}>No transactions yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Start sending money to see your transaction history
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  userDetails: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  kycStatusCard: {
    borderRadius: 16,
    overflow: 'hidden',
    padding: 16,
  },
  kycStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  kycStatusText: {
    marginLeft: 12,
    flex: 1,
  },
  kycStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  kycStatusSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 16,
  },
  quickActionCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  quickActionGradient: {
    padding: 20,
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  countriesContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 20,
  },
  countryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  countryFlag: {
    fontSize: 24,
    marginBottom: 4,
  },
  countryName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1C1C1E',
    textAlign: 'center',
  },
  countryCurrency: {
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 2,
  },
  transactionsList: {
    gap: 12,
  },
  transactionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionRecipient: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  transactionCountry: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionAmountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  transactionStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  transactionStatusText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'white',
    textTransform: 'capitalize',
  },
  emptyState: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default HomeScreen;