import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Image,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Constants from 'expo-constants';

const { width } = Dimensions.get('window');
const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface User {
  id: string;
  kyc_data: {
    first_name: string;
    last_name: string;
    email: string;
    profile_picture?: string;
  };
  is_kyc_verified: boolean;
}

interface Transaction {
  id: string;
  recipient_data: {
    first_name: string;
    country: string;
  };
  amount_sent: number;
  currency_sent: string;
  transfer_status: string;
  created_at: string;
}

interface Country {
  id: string;
  country_name: string;
  flag_emoji: string;
  currency_code: string;
}

const HomeScreen: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
    loadRecentTransactions();
    loadCountries();
  }, []);

  const loadUserData = async () => {
    try {
      // Check if user is logged in (get from storage or context)
      const token = global.authToken;
      if (!token) {
        router.replace('/auth');
        return;
      }

      const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        router.replace('/auth');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      router.replace('/auth');
    }
  };

  const loadRecentTransactions = async () => {
    try {
      const token = global.authToken;
      if (!token) return;

      const response = await fetch(`${BACKEND_URL}/api/transactions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const transactions = await response.json();
        setRecentTransactions(transactions.slice(0, 3));
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const loadCountries = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/countries`);
      if (response.ok) {
        const countriesData = await response.json();
        setCountries(countriesData.slice(0, 6));
      }
    } catch (error) {
      console.error('Error loading countries:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderCreditCard = () => (
    <TouchableOpacity 
      style={styles.creditCardContainer}
      onPress={() => router.push('/send')}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={['#007AFF', '#0051D5', '#FF6B35']}
        style={styles.creditCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <BlurView intensity={30} style={styles.creditCardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>CipCash</Text>
            <Ionicons name="card" size={32} color="white" />
          </View>
          
          <View style={styles.cardMiddle}>
            <Text style={styles.cardNumber}>•••• •••• •••• 2024</Text>
            <View style={styles.cardChip}>
              <View style={styles.chipInner} />
            </View>
          </View>
          
          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.cardLabel}>VALID THRU</Text>
              <Text style={styles.cardExpiry}>12/27</Text>
            </View>
            <TouchableOpacity style={styles.sendButton}>
              <BlurView intensity={40} style={styles.sendButtonBlur}>
                <Ionicons name="send" size={20} color="white" />
                <Text style={styles.sendButtonText}>Send Money</Text>
              </BlurView>
            </TouchableOpacity>
          </View>
        </BlurView>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderTransactionItem = ({ item }: { item: Transaction }) => (
    <TouchableOpacity style={styles.transactionItem}>
      <BlurView intensity={20} style={styles.transactionContent}>
        <View style={styles.transactionLeft}>
          <View style={styles.transactionIcon}>
            <Ionicons name="arrow-up" size={16} color="#007AFF" />
          </View>
          <View style={styles.transactionDetails}>
            <Text style={styles.transactionTitle}>
              To {item.recipient_data.first_name}
            </Text>
            <Text style={styles.transactionSubtitle}>
              {item.recipient_data.country} • {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <View style={styles.transactionRight}>
          <Text style={styles.transactionAmount}>
            -{item.currency_sent} {item.amount_sent}
          </Text>
          <View style={[
            styles.statusBadge,
            { backgroundColor: item.transfer_status === 'completed' ? '#34C759' : '#FF9500' }
          ]}>
            <Text style={styles.statusText}>{item.transfer_status}</Text>
          </View>
        </View>
      </BlurView>
    </TouchableOpacity>
  );

  const renderCountryItem = ({ item }: { item: Country }) => (
    <TouchableOpacity style={styles.countryItem}>
      <BlurView intensity={20} style={styles.countryContent}>
        <Text style={styles.countryFlag}>{item.flag_emoji}</Text>
        <Text style={styles.countryName}>{item.country_name}</Text>
        <Text style={styles.countryCurrency}>{item.currency_code}</Text>
      </BlurView>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading your dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={['#F2F2F7', '#E5E5EA']}
        style={styles.backgroundGradient}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <BlurView intensity={95} style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.userInfo}>
                {user?.kyc_data.profile_picture ? (
                  <Image 
                    source={{ uri: user.kyc_data.profile_picture }} 
                    style={styles.profileImage}
                  />
                ) : (
                  <View style={styles.profilePlaceholder}>
                    <Ionicons name="person" size={24} color="#8E8E93" />
                  </View>
                )}
                <View style={styles.welcomeText}>
                  <Text style={styles.greeting}>Welcome back,</Text>
                  <Text style={styles.userName}>{user?.kyc_data.first_name} 👋</Text>
                </View>
              </View>
              
              <View style={styles.headerActions}>
                <TouchableOpacity style={styles.headerButton}>
                  <Ionicons name="notifications" size={24} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.headerButton}
                  onPress={() => router.push('/chat')}
                >
                  <Ionicons name="chatbubbles" size={24} color="#007AFF" />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* KYC Status */}
            <View style={styles.kycStatus}>
              <View style={[
                styles.kycBadge,
                { backgroundColor: user?.is_kyc_verified ? '#34C759' : '#FF9500' }
              ]}>
                <Ionicons 
                  name={user?.is_kyc_verified ? "checkmark-circle" : "time"} 
                  size={16} 
                  color="white" 
                />
                <Text style={styles.kycText}>
                  {user?.is_kyc_verified ? 'KYC Verified' : 'KYC Pending'}
                </Text>
              </View>
            </View>
          </BlurView>

          <ScrollView 
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContainer}
          >
            {/* Credit Card */}
            {renderCreditCard()}

            {/* Quick Actions */}
            <BlurView intensity={20} style={styles.quickActions}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.actionsGrid}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => router.push('/send')}
                >
                  <LinearGradient
                    colors={['#007AFF', '#0051D5']}
                    style={styles.actionGradient}
                  >
                    <Ionicons name="send" size={24} color="white" />
                  </LinearGradient>
                  <Text style={styles.actionText}>Send Money</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton}>
                  <LinearGradient
                    colors={['#34C759', '#30B152']}
                    style={styles.actionGradient}
                  >
                    <Ionicons name="trending-up" size={24} color="white" />
                  </LinearGradient>
                  <Text style={styles.actionText}>Exchange Rates</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => router.push('/chat')}
                >
                  <LinearGradient
                    colors={['#FF6B35', '#FF4500']}
                    style={styles.actionGradient}
                  >
                    <Ionicons name="help-circle" size={24} color="white" />
                  </LinearGradient>
                  <Text style={styles.actionText}>Get Help</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton}>
                  <LinearGradient
                    colors={['#8E8E93', '#6D6D70']}
                    style={styles.actionGradient}
                  >
                    <Ionicons name="card" size={24} color="white" />
                  </LinearGradient>
                  <Text style={styles.actionText}>My Cards</Text>
                </TouchableOpacity>
              </View>
            </BlurView>

            {/* Recent Transactions */}
            <BlurView intensity={20} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Transactions</Text>
                <TouchableOpacity onPress={() => router.push('/transactions')}>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              </View>
              
              {recentTransactions.length > 0 ? (
                <FlatList
                  data={recentTransactions}
                  renderItem={renderTransactionItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="receipt-outline" size={48} color="#C7C7CC" />
                  <Text style={styles.emptyText}>No transactions yet</Text>
                  <Text style={styles.emptySubtext}>Start sending money to see your transaction history</Text>
                </View>
              )}
            </BlurView>

            {/* Supported Countries */}
            <BlurView intensity={20} style={styles.section}>
              <Text style={styles.sectionTitle}>Send Money To</Text>
              <FlatList
                data={countries}
                renderItem={renderCountryItem}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.countriesList}
              />
            </BlurView>

            {/* Bottom Spacing for Tab Bar */}
            <View style={styles.bottomSpacing} />
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  profilePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(142,142,147,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  welcomeText: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: '#8E8E93',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,122,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kycStatus: {
    alignItems: 'center',
  },
  kycBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  kycText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  creditCardContainer: {
    marginBottom: 24,
  },
  creditCard: {
    borderRadius: 20,
    height: 200,
    overflow: 'hidden',
  },
  creditCardContent: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  cardMiddle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    letterSpacing: 2,
  },
  cardChip: {
    width: 32,
    height: 24,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    padding: 2,
  },
  chipInner: {
    flex: 1,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
  },
  cardExpiry: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  sendButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  sendButtonBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  sendButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  quickActions: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  section: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  transactionItem: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  transactionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,122,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  transactionSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    textAlign: 'center',
    lineHeight: 20,
  },
  countriesList: {
    paddingRight: 20,
  },
  countryItem: {
    marginRight: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  countryContent: {
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    minWidth: 80,
  },
  countryFlag: {
    fontSize: 24,
    marginBottom: 8,
  },
  countryName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 2,
  },
  countryCurrency: {
    fontSize: 10,
    color: '#8E8E93',
    textAlign: 'center',
  },
  bottomSpacing: {
    height: 100,
  },
});

export default HomeScreen;