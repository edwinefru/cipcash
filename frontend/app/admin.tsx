import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface AdminSettings {
  id: string;
  mtn_api_key?: string;
  mtn_api_secret?: string;
  mtn_subscription_key?: string;
  mtn_base_url?: string;
  stripe_api_key?: string;
  stripe_webhook_secret?: string;
  paypal_client_id?: string;
  paypal_client_secret?: string;
  google_pay_merchant_id?: string;
  apple_pay_merchant_id?: string;
  supabase_url?: string;
  supabase_anon_key?: string;
  currency_api_key?: string;
  updated_at: string;
}

const AdminDashboard: React.FC = () => {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [stats, setStats] = useState({
    totalTransactions: 0,
    registeredUsers: 0,
    apiStatus: 'Checking...',
  });

  useEffect(() => {
    loadSettings();
    loadStats();
  }, []);

  const loadSettings = async (): Promise<void> => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/settings`);
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        Alert.alert('Error', 'Failed to load admin settings');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error loading settings');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (): Promise<void> => {
    try {
      const healthResponse = await fetch(`${BACKEND_URL}/api/health`);
      setStats(prev => ({
        ...prev,
        apiStatus: healthResponse.ok ? 'Online' : 'Offline',
      }));
    } catch (error) {
      setStats(prev => ({
        ...prev,
        apiStatus: 'Offline',
      }));
    }
  };

  const updateSetting = (key: keyof AdminSettings, value: string): void => {
    if (settings) {
      setSettings({
        ...settings,
        [key]: value,
      });
    }
  };

  const saveSettings = async (): Promise<void> => {
    if (!settings) return;

    setSaving(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mtn_api_key: settings.mtn_api_key,
          mtn_api_secret: settings.mtn_api_secret,
          mtn_subscription_key: settings.mtn_subscription_key,
          mtn_base_url: settings.mtn_base_url,
          stripe_api_key: settings.stripe_api_key,
          stripe_webhook_secret: settings.stripe_webhook_secret,
          paypal_client_id: settings.paypal_client_id,
          paypal_client_secret: settings.paypal_client_secret,
          google_pay_merchant_id: settings.google_pay_merchant_id,
          apple_pay_merchant_id: settings.apple_pay_merchant_id,
          supabase_url: settings.supabase_url,
          supabase_anon_key: settings.supabase_anon_key,
          currency_api_key: settings.currency_api_key,
        }),
      });

      if (response.ok) {
        const updatedSettings = await response.json();
        setSettings(updatedSettings);
        Alert.alert('Success', 'Settings saved successfully!');
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Failed to save settings');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading admin settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="settings" size={32} color="#2563eb" />
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>RemitAfrica Admin</Text>
          <Text style={styles.headerSubtitle}>Configure your remittance system</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Statistics */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalTransactions}</Text>
            <Text style={styles.statLabel}>Total Transactions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.registeredUsers}</Text>
            <Text style={styles.statLabel}>Registered Users</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>24</Text>
            <Text style={styles.statLabel}>Countries</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: stats.apiStatus === 'Online' ? '#10b981' : '#ef4444' }]}>
              {stats.apiStatus}
            </Text>
            <Text style={styles.statLabel}>API Status</Text>
          </View>
        </View>

        {/* MTN Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MTN Mobile Money Settings</Text>
          <Text style={styles.sectionSubtitle}>Configure your MTN MoMo API credentials</Text>
          
          <Text style={styles.inputLabel}>MTN API Key</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your MTN API Key"
            value={settings?.mtn_api_key || ''}
            onChangeText={(text) => updateSetting('mtn_api_key', text)}
          />

          <Text style={styles.inputLabel}>MTN API Secret</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your MTN API Secret"
            value={settings?.mtn_api_secret || ''}
            onChangeText={(text) => updateSetting('mtn_api_secret', text)}
            secureTextEntry
          />

          <Text style={styles.inputLabel}>MTN Subscription Key</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your MTN Subscription Key"
            value={settings?.mtn_subscription_key || ''}
            onChangeText={(text) => updateSetting('mtn_subscription_key', text)}
          />

          <Text style={styles.inputLabel}>MTN Base URL</Text>
          <TextInput
            style={styles.input}
            placeholder="https://sandbox.momodeveloper.mtn.com"
            value={settings?.mtn_base_url || ''}
            onChangeText={(text) => updateSetting('mtn_base_url', text)}
          />
        </View>

        {/* Payment Provider Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Provider Settings</Text>
          <Text style={styles.sectionSubtitle}>Configure Stripe, PayPal, Google Pay, and Apple Pay</Text>
          
          <Text style={styles.inputLabel}>Stripe API Key</Text>
          <TextInput
            style={styles.input}
            placeholder="sk_test_..."
            value={settings?.stripe_api_key || ''}
            onChangeText={(text) => updateSetting('stripe_api_key', text)}
            secureTextEntry
          />

          <Text style={styles.inputLabel}>PayPal Client ID</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter PayPal Client ID"
            value={settings?.paypal_client_id || ''}
            onChangeText={(text) => updateSetting('paypal_client_id', text)}
          />

          <Text style={styles.inputLabel}>Google Pay Merchant ID</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter Google Pay Merchant ID"
            value={settings?.google_pay_merchant_id || ''}
            onChangeText={(text) => updateSetting('google_pay_merchant_id', text)}
          />

          <Text style={styles.inputLabel}>Apple Pay Merchant ID</Text>
          <TextInput
            style={styles.input}
            placeholder="merchant.com.example.remittance"
            value={settings?.apple_pay_merchant_id || ''}
            onChangeText={(text) => updateSetting('apple_pay_merchant_id', text)}
          />
        </View>

        {/* Supabase Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Supabase Database Settings</Text>
          <Text style={styles.sectionSubtitle}>Configure your Supabase database connection</Text>
          
          <Text style={styles.inputLabel}>Supabase URL</Text>
          <TextInput
            style={styles.input}
            placeholder="https://your-project.supabase.co"
            value={settings?.supabase_url || ''}
            onChangeText={(text) => updateSetting('supabase_url', text)}
          />

          <Text style={styles.inputLabel}>Supabase Anon Key</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your Supabase Anon Key"
            value={settings?.supabase_anon_key || ''}
            onChangeText={(text) => updateSetting('supabase_anon_key', text)}
            secureTextEntry
          />
        </View>

        {/* Currency API Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Currency Exchange Settings</Text>
          <Text style={styles.sectionSubtitle}>Configure real-time exchange rate API</Text>
          
          <Text style={styles.inputLabel}>Currency API Key</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter Currency API Key (e.g., from Fixer.io)"
            value={settings?.currency_api_key || ''}
            onChangeText={(text) => updateSetting('currency_api_key', text)}
            secureTextEntry
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveSettings}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="save" size={20} color="white" />
              <Text style={styles.saveButtonText}>Save All Settings</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerText: {
    marginLeft: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    width: '48%',
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    fontSize: 14,
    marginBottom: 10,
  },
  footer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  saveButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default AdminDashboard;