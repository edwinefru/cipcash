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
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

// Types
interface Country {
  id: string;
  country_code: string;
  country_name: string;
  currency_code: string;
  currency_name: string;
  is_active: boolean;
  mtn_supported: boolean;
}

interface ExchangeRate {
  rate: number;
  updated_at: string;
}

interface User {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  country: string;
}

// Components
const WelcomeScreen = ({ onGetStarted }: { onGetStarted: () => void }) => (
  <SafeAreaView style={styles.container}>
    <View style={styles.welcomeContainer}>
      <Ionicons name="globe-outline" size={120} color="#2563eb" />
      <Text style={styles.welcomeTitle}>RemitAfrica</Text>
      <Text style={styles.welcomeSubtitle}>
        Send money to Africa instantly and securely
      </Text>
      <Text style={styles.welcomeDescription}>
        Transfer money to Cameroon, Nigeria, Ghana, South Africa, and Kenya using MTN Mobile Money with competitive exchange rates.
      </Text>
      
      <View style={styles.featuresContainer}>
        <View style={styles.featureItem}>
          <Ionicons name="flash-outline" size={24} color="#10b981" />
          <Text style={styles.featureText}>Instant Transfers</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="shield-checkmark-outline" size={24} color="#10b981" />
          <Text style={styles.featureText}>Secure & Trusted</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="card-outline" size={24} color="#10b981" />
          <Text style={styles.featureText}>Multiple Payment Options</Text>
        </View>
      </View>
      
      <TouchableOpacity style={styles.getStartedButton} onPress={onGetStarted}>
        <Text style={styles.getStartedButtonText}>Get Started</Text>
        <Ionicons name="arrow-forward" size={20} color="white" />
      </TouchableOpacity>
    </View>
  </SafeAreaView>
);

const AuthScreen = ({ onAuthSuccess }: { onAuthSuccess: (user: User) => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    country: '',
  });

  const handleAuth = async () => {
    if (!formData.email || !formData.password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!isLogin && (!formData.first_name || !formData.last_name || !formData.phone)) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (response.ok) {
        // Store token (in production, use secure storage)
        global.authToken = data.access_token;
        
        // Get user info
        const userResponse = await fetch(`${BACKEND_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${data.access_token}`,
          },
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          onAuthSuccess(userData);
        }
      } else {
        Alert.alert('Error', data.detail || 'Authentication failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.authContainer}>
        <View style={styles.authHeader}>
          <Ionicons name="globe-outline" size={60} color="#2563eb" />
          <Text style={styles.authTitle}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </Text>
          <Text style={styles.authSubtitle}>
            {isLogin ? 'Sign in to your account' : 'Join RemitAfrica today'}
          </Text>
        </View>

        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={formData.password}
            onChangeText={(text) => setFormData({ ...formData, password: text })}
            secureTextEntry
          />

          {!isLogin && (
            <>
              <TextInput
                style={styles.input}
                placeholder="First Name"
                value={formData.first_name}
                onChangeText={(text) => setFormData({ ...formData, first_name: text })}
              />

              <TextInput
                style={styles.input}
                placeholder="Last Name"
                value={formData.last_name}
                onChangeText={(text) => setFormData({ ...formData, last_name: text })}
              />

              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                keyboardType="phone-pad"
              />

              <TextInput
                style={styles.input}
                placeholder="Country"
                value={formData.country}
                onChangeText={(text) => setFormData({ ...formData, country: text })}
              />
            </>
          )}

          <TouchableOpacity
            style={[styles.authButton, loading && styles.authButtonDisabled]}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.authButtonText}>
                {isLogin ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchAuthButton}
            onPress={() => setIsLogin(!isLogin)}
          >
            <Text style={styles.switchAuthText}>
              {isLogin
                ? "Don't have an account? Sign Up"
                : 'Already have an account? Sign In'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const DashboardScreen = ({ user }: { user: User }) => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSendMoney, setShowSendMoney] = useState(false);

  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/countries`);
      if (response.ok) {
        const data = await response.json();
        setCountries(data);
      }
    } catch (error) {
      console.error('Error fetching countries:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user.first_name}!</Text>
          <Text style={styles.subGreeting}>Ready to send money?</Text>
        </View>
        <TouchableOpacity style={styles.profileButton}>
          <Ionicons name="person-circle-outline" size={32} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.dashboardContent}>
        <TouchableOpacity
          style={styles.sendMoneyCard}
          onPress={() => setShowSendMoney(true)}
        >
          <View style={styles.sendMoneyContent}>
            <Ionicons name="send-outline" size={48} color="white" />
            <Text style={styles.sendMoneyTitle}>Send Money</Text>
            <Text style={styles.sendMoneySubtitle}>
              Transfer money to Africa instantly
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="trending-up-outline" size={24} color="#10b981" />
            <Text style={styles.statValue}>$0</Text>
            <Text style={styles.statLabel}>Total Sent</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle-outline" size={24} color="#10b981" />
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>

        <View style={styles.countriesSection}>
          <Text style={styles.sectionTitle}>Supported Countries</Text>
          {countries.map((country) => (
            <View key={country.id} style={styles.countryCard}>
              <View style={styles.countryInfo}>
                <Text style={styles.countryName}>{country.country_name}</Text>
                <Text style={styles.countryCurrency}>
                  {country.currency_code} - {country.currency_name}
                </Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            </View>
          ))}
        </View>
      </ScrollView>

      <SendMoneyModal
        visible={showSendMoney}
        onClose={() => setShowSendMoney(false)}
        countries={countries}
        user={user}
      />
    </SafeAreaView>
  );
};

const SendMoneyModal = ({
  visible,
  onClose,
  countries,
  user,
}: {
  visible: boolean;
  onClose: () => void;
  countries: Country[];
  user: User;
}) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    recipient_phone: '',
    recipient_name: '',
    recipient_country: '',
    amount_sent: '',
    currency_sent: 'USD',
    payment_method: 'stripe',
  });
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedCountry = countries.find((c) => c.country_code === formData.recipient_country);

  const fetchExchangeRate = async () => {
    if (!formData.currency_sent || !selectedCountry?.currency_code) return;

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/exchange-rates/${formData.currency_sent}/${selectedCountry.currency_code}`
      );
      if (response.ok) {
        const data = await response.json();
        setExchangeRate(data);
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
    }
  };

  useEffect(() => {
    if (formData.recipient_country) {
      fetchExchangeRate();
    }
  }, [formData.currency_sent, formData.recipient_country]);

  const calculateReceivedAmount = () => {
    if (!exchangeRate || !formData.amount_sent) return 0;
    return (parseFloat(formData.amount_sent) * exchangeRate.rate).toFixed(2);
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.recipient_phone || !formData.recipient_name || !formData.recipient_country) {
        Alert.alert('Error', 'Please fill in all recipient details');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!formData.amount_sent || parseFloat(formData.amount_sent) <= 0) {
        Alert.alert('Error', 'Please enter a valid amount');
        return;
      }
      setStep(3);
    }
  };

  const handleSendMoney = () => {
    Alert.alert(
      'Confirm Transfer',
      `Send ${formData.currency_sent} ${formData.amount_sent} to ${formData.recipient_name} in ${selectedCountry?.country_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => {
          Alert.alert('Success', 'Payment integration will be implemented in next phase');
          onClose();
        }},
      ]
    );
  };

  const resetForm = () => {
    setStep(1);
    setFormData({
      recipient_phone: '',
      recipient_name: '',
      recipient_country: '',
      amount_sent: '',
      currency_sent: 'USD',
      payment_method: 'stripe',
    });
    setExchangeRate(null);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => { onClose(); resetForm(); }}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Send Money</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          {step === 1 && (
            <View>
              <Text style={styles.stepTitle}>Recipient Details</Text>
              
              <Text style={styles.inputLabel}>Recipient Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., +237123456789"
                value={formData.recipient_phone}
                onChangeText={(text) => setFormData({ ...formData, recipient_phone: text })}
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Recipient Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Full name"
                value={formData.recipient_name}
                onChangeText={(text) => setFormData({ ...formData, recipient_name: text })}
              />

              <Text style={styles.inputLabel}>Destination Country</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.countrySelector}>
                {countries.map((country) => (
                  <TouchableOpacity
                    key={country.id}
                    style={[
                      styles.countryOption,
                      formData.recipient_country === country.country_code && styles.countryOptionSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, recipient_country: country.country_code })}
                  >
                    <Text style={[
                      styles.countryOptionText,
                      formData.recipient_country === country.country_code && styles.countryOptionTextSelected,
                    ]}>
                      {country.country_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {step === 2 && (
            <View>
              <Text style={styles.stepTitle}>Transfer Amount</Text>
              
              <View style={styles.amountContainer}>
                <Text style={styles.inputLabel}>You Send</Text>
                <View style={styles.amountInputContainer}>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0.00"
                    value={formData.amount_sent}
                    onChangeText={(text) => setFormData({ ...formData, amount_sent: text })}
                    keyboardType="numeric"
                  />
                  <Text style={styles.currencyText}>{formData.currency_sent}</Text>
                </View>
              </View>

              {exchangeRate && (
                <View style={styles.exchangeInfo}>
                  <Text style={styles.exchangeLabel}>Exchange Rate</Text>
                  <Text style={styles.exchangeRate}>
                    1 {formData.currency_sent} = {exchangeRate.rate} {selectedCountry?.currency_code}
                  </Text>
                  
                  <View style={styles.receivedAmountContainer}>
                    <Text style={styles.receivedLabel}>Recipient Gets</Text>
                    <Text style={styles.receivedAmount}>
                      {selectedCountry?.currency_code} {calculateReceivedAmount()}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {step === 3 && (
            <View>
              <Text style={styles.stepTitle}>Payment Method</Text>
              
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryTitle}>Transfer Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>To:</Text>
                  <Text style={styles.summaryValue}>{formData.recipient_name}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Country:</Text>
                  <Text style={styles.summaryValue}>{selectedCountry?.country_name}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>You Send:</Text>
                  <Text style={styles.summaryValue}>{formData.currency_sent} {formData.amount_sent}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>They Get:</Text>
                  <Text style={styles.summaryValue}>{selectedCountry?.currency_code} {calculateReceivedAmount()}</Text>
                </View>
              </View>

              <Text style={styles.inputLabel}>Choose Payment Method</Text>
              {['stripe', 'paypal', 'google_pay'].map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.paymentOption,
                    formData.payment_method === method && styles.paymentOptionSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, payment_method: method })}
                >
                  <Ionicons
                    name={
                      method === 'stripe' ? 'card-outline' :
                      method === 'paypal' ? 'logo-paypal' :
                      'logo-google'
                    }
                    size={24}
                    color={formData.payment_method === method ? '#2563eb' : '#9ca3af'}
                  />
                  <Text style={[
                    styles.paymentOptionText,
                    formData.payment_method === method && styles.paymentOptionTextSelected,
                  ]}>
                    {method === 'stripe' ? 'Credit/Debit Card' :
                     method === 'paypal' ? 'PayPal' :
                     'Google Pay'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.modalFooter}>
          {step > 1 && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setStep(step - 1)}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.nextButton, step === 1 && styles.nextButtonFull]}
            onPress={step === 3 ? handleSendMoney : handleNext}
          >
            <Text style={styles.nextButtonText}>
              {step === 3 ? 'Send Money' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

// Main App Component
export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'welcome' | 'auth' | 'dashboard'>('welcome');
  const [user, setUser] = useState<User | null>(null);

  const handleGetStarted = () => {
    setCurrentScreen('auth');
  };

  const handleAuthSuccess = (userData: User) => {
    setUser(userData);
    setCurrentScreen('dashboard');
  };

  if (currentScreen === 'welcome') {
    return <WelcomeScreen onGetStarted={handleGetStarted} />;
  }

  if (currentScreen === 'auth') {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  if (currentScreen === 'dashboard' && user) {
    return <DashboardScreen user={user} />;
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  welcomeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 20,
    marginBottom: 10,
  },
  welcomeSubtitle: {
    fontSize: 18,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  welcomeDescription: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 40,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  featureText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 10,
    fontWeight: '500',
  },
  getStartedButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  getStartedButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 10,
  },
  authContainer: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  authHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  authTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 20,
    marginBottom: 10,
  },
  authSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 15,
  },
  authButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  authButtonDisabled: {
    opacity: 0.7,
  },
  authButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  switchAuthButton: {
    alignItems: 'center',
  },
  switchAuthText: {
    color: '#2563eb',
    fontSize: 16,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subGreeting: {
    fontSize: 16,
    color: '#6b7280',
  },
  profileButton: {
    padding: 5,
  },
  dashboardContent: {
    flex: 1,
    padding: 20,
  },
  sendMoneyCard: {
    backgroundColor: '#2563eb',
    borderRadius: 15,
    padding: 30,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  sendMoneyContent: {
    alignItems: 'center',
  },
  sendMoneyTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 5,
  },
  sendMoneySubtitle: {
    color: '#bfdbfe',
    fontSize: 16,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    flex: 0.48,
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
    marginTop: 10,
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 5,
  },
  countriesSection: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
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
    marginBottom: 15,
  },
  countryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  countryCurrency: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 10,
  },
  countrySelector: {
    marginTop: 10,
  },
  countryOption: {
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  countryOptionSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  countryOptionText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  countryOptionTextSelected: {
    color: 'white',
  },
  amountContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginTop: 5,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    paddingVertical: 15,
    color: '#1f2937',
  },
  currencyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginLeft: 10,
  },
  exchangeInfo: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
  },
  exchangeLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 5,
  },
  exchangeRate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 15,
  },
  receivedAmountContainer: {
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  receivedLabel: {
    fontSize: 14,
    color: '#2563eb',
    marginBottom: 5,
  },
  receivedAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1d4ed8',
  },
  summaryContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  paymentOptionSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#f8fafc',
  },
  paymentOptionText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
    fontWeight: '500',
  },
  paymentOptionTextSelected: {
    color: '#2563eb',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  backButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginRight: 10,
  },
  backButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 2,
    backgroundColor: '#2563eb',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  nextButtonFull: {
    flex: 1,
    marginRight: 0,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});