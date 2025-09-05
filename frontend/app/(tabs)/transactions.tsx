import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface Transaction {
  id: string;
  recipient_data: {
    first_name: string;
    last_name: string;
    country: string;
  };
  amount_sent: number;
  currency_sent: string;
  amount_received: number;
  currency_received: string;
  transfer_status: string;
  payment_status: string;
  transaction_reference: string;
  created_at: string;
  transfer_reason: string;
}

const TransactionsScreen: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    
    try {
      const token = global.authToken;
      if (!token) return;

      const response = await fetch(`${BACKEND_URL}/api/transactions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      Alert.alert('Error', 'Failed to load transactions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'delivered':
        return '#34C759';
      case 'processing':
      case 'sent':
        return '#007AFF';
      case 'pending':
        return '#FF9500';
      case 'failed':
      case 'cancelled':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'delivered':
        return 'checkmark-circle';
      case 'processing':
      case 'sent':
        return 'sync';
      case 'pending':
        return 'time';
      case 'failed':
      case 'cancelled':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'all') return true;
    return tx.transfer_status === filter;
  });

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <TouchableOpacity
      style={styles.transactionCard}
      onPress={() => Alert.alert('Transaction Details', `Reference: ${item.transaction_reference}`)}
    >
      <BlurView intensity={25} style={styles.transactionContent}>
        <View style={styles.transactionHeader}>
          <View style={styles.transactionLeft}>
            <View style={[
              styles.statusIcon,
              { backgroundColor: getStatusColor(item.transfer_status) }
            ]}>
              <Ionicons 
                name={getStatusIcon(item.transfer_status) as any} 
                size={20} 
                color="white" 
              />
            </View>
            <View style={styles.transactionInfo}>
              <Text style={styles.recipientName}>
                To {item.recipient_data.first_name} {item.recipient_data.last_name}
              </Text>
              <Text style={styles.transactionDetails}>
                {item.recipient_data.country} • {new Date(item.created_at).toLocaleDateString()}
              </Text>
              <Text style={styles.transactionReference}>
                Ref: {item.transaction_reference.substring(0, 8)}...
              </Text>
            </View>
          </View>
          
          <View style={styles.transactionRight}>
            <Text style={styles.transactionAmount}>
              -{item.currency_sent} {item.amount_sent.toLocaleString()}
            </Text>
            <Text style={styles.receivedAmount}>
              +{item.currency_received} {item.amount_received.toLocaleString()}
            </Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.transfer_status) }
            ]}>
              <Text style={styles.statusText}>{item.transfer_status}</Text>
            </View>
          </View>
        </View>
        
        {/* Progress Bar for Processing Transactions */}
        {(item.transfer_status === 'processing' || item.transfer_status === 'sent') && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <LinearGradient
                colors={['#007AFF', '#0051D5']}
                style={[
                  styles.progressFill,
                  { 
                    width: item.transfer_status === 'processing' ? '60%' : '90%'
                  }
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </View>
            <Text style={styles.progressText}>
              {item.transfer_status === 'processing' ? 'Processing transfer...' : 'Delivering to recipient...'}
            </Text>
          </View>
        )}
      </BlurView>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <BlurView intensity={20} style={styles.emptyState}>
      <LinearGradient
        colors={['#007AFF', '#0051D5']}
        style={styles.emptyIconContainer}
      >
        <Ionicons name="receipt-outline" size={48} color="white" />
      </LinearGradient>
      <Text style={styles.emptyTitle}>No Transactions Yet</Text>
      <Text style={styles.emptySubtitle}>
        Start sending money to see your transaction history here
      </Text>
      <TouchableOpacity style={styles.startSendingButton}>
        <LinearGradient
          colors={['#007AFF', '#0051D5']}
          style={styles.startSendingGradient}
        >
          <Ionicons name="send" size={20} color="white" />
          <Text style={styles.startSendingText}>Send Money Now</Text>
        </LinearGradient>
      </TouchableOpacity>
    </BlurView>
  );

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
            <Text style={styles.headerTitle}>Transaction History</Text>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => loadTransactions(true)}
            >
              <Ionicons name="refresh" size={24} color="#007AFF" />
            </TouchableOpacity>
          </BlurView>

          {/* Filter Tabs */}
          <View style={styles.filterContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterTabs}
            >
              {[
                { key: 'all', label: 'All', count: transactions.length },
                { key: 'completed', label: 'Completed', count: transactions.filter(t => t.transfer_status === 'completed').length },
                { key: 'processing', label: 'Processing', count: transactions.filter(t => t.transfer_status === 'processing').length },
                { key: 'pending', label: 'Pending', count: transactions.filter(t => t.transfer_status === 'pending').length },
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.filterTab,
                    filter === tab.key && styles.filterTabActive
                  ]}
                  onPress={() => setFilter(tab.key)}
                >
                  <BlurView 
                    intensity={filter === tab.key ? 80 : 20} 
                    style={styles.filterTabContent}
                  >
                    <Text style={[
                      styles.filterTabText,
                      filter === tab.key && styles.filterTabTextActive
                    ]}>
                      {tab.label}
                    </Text>
                    {tab.count > 0 && (
                      <View style={styles.filterBadge}>
                        <Text style={styles.filterBadgeText}>{tab.count}</Text>
                      </View>
                    )}
                  </BlurView>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Transactions List */}
          <View style={styles.content}>
            {filteredTransactions.length > 0 ? (
              <FlatList
                data={filteredTransactions}
                renderItem={renderTransaction}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.transactionsList}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => loadTransactions(true)}
                    tintColor="#007AFF"
                  />
                }
                showsVerticalScrollIndicator={false}
              />
            ) : (
              renderEmptyState()
            )}
          </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,122,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    paddingVertical: 16,
  },
  filterTabs: {
    paddingHorizontal: 20,
    gap: 12,
  },
  filterTab: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  filterTabActive: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  filterTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  filterTabTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  filterBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 18,
    alignItems: 'center',
  },
  filterBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  transactionsList: {
    paddingTop: 8,
    paddingBottom: 120,
  },
  transactionCard: {
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  transactionContent: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  transactionDetails: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  transactionReference: {
    fontSize: 12,
    color: '#C7C7CC',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  receivedAmount: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  progressContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(142,142,147,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    marginTop: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  startSendingButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  startSendingGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 8,
  },
  startSendingText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TransactionsScreen;