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
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';

const { width } = Dimensions.get('window');
const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface Country {
  id: string;
  country_code: string;
  country_name: string;
  currency_code: string;
  currency_name: string;
  flag_emoji: string;
  phone_code: string;
}

interface TransferReason {
  code: string;
  description: string;
  category: string;
}

interface PaymentMethod {
  id: string;
  method_type: string;
  last_four?: string;
  card_brand?: string;
  is_default: boolean;
}

const SendMoneyScreen: React.FC = () => {
  const [step, setStep] = useState(1);
  const [countries, setCountries] = useState<Country[]>([]);
  const [transferReasons, setTransferReasons] = useState<TransferReason[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [exchangeRate, setExchangeRate] = useState<any>(null);
  
  const [transferData, setTransferData] = useState({
    // Recipient Details
    first_name: '',
    last_name: '',
    phone: '',
    relationship: '',
    
    // Transfer Details
    amount: '',
    currency: 'USD',
    reason: '',
    description: '',
    
    // Payment
    payment_method: '',
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedCountry && transferData.amount) {
      fetchExchangeRate();
    }
  }, [selectedCountry, transferData.amount]);

  const loadInitialData = async () => {
    try {
      // Load countries
      const countriesResponse = await fetch(`${BACKEND_URL}/api/countries`);
      if (countriesResponse.ok) {
        const countriesData = await countriesResponse.json();
        setCountries(countriesData);
      }

      // Load transfer reasons
      const reasonsResponse = await fetch(`${BACKEND_URL}/api/transfer-reasons`);
      if (reasonsResponse.ok) {
        const reasonsData = await reasonsResponse.json();
        setTransferReasons(reasonsData);
      }

      // Load payment methods (mock for now)
      setPaymentMethods([
        { id: '1', method_type: 'credit_card', last_four: '4242', card_brand: 'Visa', is_default: true },
        { id: '2', method_type: 'paypal', is_default: false },
        { id: '3', method_type: 'apple_pay', is_default: false },
        { id: '4', method_type: 'google_pay', is_default: false },
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const fetchExchangeRate = async () => {
    if (!selectedCountry || !transferData.amount) return;

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/exchange-rates/${transferData.currency}/${selectedCountry.currency_code}`
      );
      if (response.ok) {
        const data = await response.json();
        setExchangeRate(data);
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
    }
  };

  const calculateReceivedAmount = (): string => {
    if (!exchangeRate || !transferData.amount) return '0';
    return (parseFloat(transferData.amount) * exchangeRate.rate).toFixed(2);
  };

  const handleNext = () => {
    if (step === 1 && !selectedCountry) {
      Alert.alert('Error', 'Please select a destination country');
      return;
    }
    if (step === 2 && (!transferData.first_name || !transferData.phone || !transferData.relationship)) {
      Alert.alert('Error', 'Please fill in all recipient details');
      return;
    }
    if (step === 3 && (!transferData.amount || !transferData.reason)) {
      Alert.alert('Error', 'Please enter amount and select reason');
      return;
    }
    if (step === 4 && !transferData.payment_method) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    if (step < 4) {
      setStep(step + 1);
    } else {
      handleSendMoney();
    }
  };

  const handleSendMoney = () => {
    Alert.alert(
      'Confirm Transfer',
      `Send ${transferData.currency} ${transferData.amount} to ${transferData.first_name} in ${selectedCountry?.country_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => {
          Alert.alert('Success', 'Transfer initiated successfully! You will receive updates on the transaction status.');
          resetForm();
        }},
      ]
    );
  };

  const resetForm = () => {
    setStep(1);
    setSelectedCountry(null);
    setTransferData({
      first_name: '',
      last_name: '',
      phone: '',
      relationship: '',
      amount: '',
      currency: 'USD',
      reason: '',
      description: '',
      payment_method: '',
    });
    setExchangeRate(null);
  };

  const renderCountrySelection = () => (
    <View>
      <Text style={styles.stepTitle}>Select Destination Country</Text>
      <Text style={styles.stepSubtitle}>Choose where to send money</Text>
      
      <FlatList
        data={countries}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.countryOption,
              selectedCountry?.id === item.id && styles.countryOptionSelected
            ]}
            onPress={() => setSelectedCountry(item)}
          >
            <BlurView 
              intensity={selectedCountry?.id === item.id ? 80 : 20} 
              style={styles.countryContent}
            >
              <Text style={styles.countryFlag}>{item.flag_emoji}</Text>
              <View style={styles.countryDetails}>
                <Text style={styles.countryName}>{item.country_name}</Text>
                <Text style={styles.countryCurrency}>
                  {item.currency_code} • {item.phone_code}
                </Text>
              </View>
              {selectedCountry?.id === item.id && (
                <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
              )}
            </BlurView>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.countriesList}
      />
    </View>
  );

  const renderRecipientDetails = () => (
    <View>
      <Text style={styles.stepTitle}>Recipient Details</Text>
      <Text style={styles.stepSubtitle}>
        Sending to {selectedCountry?.flag_emoji} {selectedCountry?.country_name}
      </Text>

      <View style={styles.inputContainer}>
        <Ionicons name="person" size={20} color="#8E8E93" />
        <TextInput
          style={styles.textInput}
          placeholder="First Name"
          value={transferData.first_name}
          onChangeText={(text) => setTransferData({...transferData, first_name: text})}
        />
      </View>

      <View style={styles.inputContainer}>
        <Ionicons name="person" size={20} color="#8E8E93" />
        <TextInput
          style={styles.textInput}
          placeholder="Last Name"
          value={transferData.last_name}
          onChangeText={(text) => setTransferData({...transferData, last_name: text})}
        />
      </View>

      <View style={styles.inputContainer}>
        <Ionicons name="call" size={20} color="#8E8E93" />
        <Text style={styles.phoneCode}>{selectedCountry?.phone_code}</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Phone Number"
          value={transferData.phone}
          onChangeText={(text) => setTransferData({...transferData, phone: text})}
          keyboardType="phone-pad"
        />
      </View>

      <Text style={styles.inputLabel}>Relationship to Recipient</Text>
      <View style={styles.optionsGrid}>
        {[
          { value: 'family', label: 'Family', icon: 'heart' },
          { value: 'friend', label: 'Friend', icon: 'people' },
          { value: 'business', label: 'Business', icon: 'briefcase' },
          { value: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
        ].map((rel) => (
          <TouchableOpacity
            key={rel.value}
            style={[
              styles.relationshipOption,
              transferData.relationship === rel.value && styles.relationshipOptionSelected
            ]}
            onPress={() => setTransferData({...transferData, relationship: rel.value})}
          >
            <BlurView intensity={20} style={styles.relationshipContent}>
              <Ionicons 
                name={rel.icon as any} 
                size={20} 
                color={transferData.relationship === rel.value ? '#007AFF' : '#8E8E93'} 
              />
              <Text style={[
                styles.relationshipText,
                transferData.relationship === rel.value && styles.relationshipTextSelected
              ]}>
                {rel.label}
              </Text>
            </BlurView>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderTransferDetails = () => (
    <View>
      <Text style={styles.stepTitle}>Transfer Amount</Text>
      <Text style={styles.stepSubtitle}>How much would you like to send?</Text>

      <BlurView intensity={30} style={styles.amountCard}>
        <Text style={styles.amountLabel}>You Send</Text>
        <View style={styles.amountInputContainer}>
          <Text style={styles.currencySymbol}>{transferData.currency}</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0.00"
            value={transferData.amount}
            onChangeText={(text) => setTransferData({...transferData, amount: text})}
            keyboardType="numeric"
          />
        </View>

        {exchangeRate && (
          <View style={styles.exchangeInfo}>
            <View style={styles.exchangeRow}>
              <Text style={styles.exchangeLabel}>Exchange Rate</Text>
              <Text style={styles.exchangeValue}>
                1 {transferData.currency} = {exchangeRate.rate} {selectedCountry?.currency_code}
              </Text>
            </View>
            
            <View style={styles.receivedAmountCard}>
              <Text style={styles.receivedLabel}>Recipient Gets</Text>
              <Text style={styles.receivedAmount}>
                {selectedCountry?.currency_code} {calculateReceivedAmount()}
              </Text>
            </View>
          </View>
        )}
      </BlurView>

      <Text style={styles.inputLabel}>Reason for Transfer</Text>
      <FlatList
        data={transferReasons}
        keyExtractor={(item) => item.code}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.reasonOption,
              transferData.reason === item.code && styles.reasonOptionSelected
            ]}
            onPress={() => setTransferData({...transferData, reason: item.code})}
          >
            <BlurView intensity={20} style={styles.reasonContent}>
              <Text style={[
                styles.reasonText,
                transferData.reason === item.code && styles.reasonTextSelected
              ]}>
                {item.description}
              </Text>
              {transferData.reason === item.code && (
                <Ionicons name="checkmark" size={20} color="#007AFF" />
              )}
            </BlurView>
          </TouchableOpacity>
        )}
        scrollEnabled={false}
      />
    </View>
  );

  const renderPaymentSelection = () => (
    <View>
      <Text style={styles.stepTitle}>Payment Method</Text>
      <Text style={styles.stepSubtitle}>Choose how to pay</Text>

      {/* Transfer Summary */}
      <BlurView intensity={30} style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Transfer Summary</Text>
        <View style={styles.summaryRows}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>To:</Text>
            <Text style={styles.summaryValue}>
              {transferData.first_name} {transferData.last_name}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Country:</Text>
            <Text style={styles.summaryValue}>
              {selectedCountry?.flag_emoji} {selectedCountry?.country_name}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>You Send:</Text>
            <Text style={styles.summaryValue}>
              {transferData.currency} {transferData.amount}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>They Get:</Text>
            <Text style={styles.summaryValueHighlight}>
              {selectedCountry?.currency_code} {calculateReceivedAmount()}
            </Text>
          </View>
        </View>
      </BlurView>

      {/* Payment Methods */}
      <Text style={styles.inputLabel}>Select Payment Method</Text>
      <FlatList
        data={paymentMethods}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.paymentCard,
              transferData.payment_method === item.id && styles.paymentCardSelected
            ]}
            onPress={() => setTransferData({...transferData, payment_method: item.id})}
          >
            {item.method_type === 'apple_pay' ? (
              <LinearGradient colors={['#000', '#333']} style={styles.applePayCard}>
                <Ionicons name="logo-apple" size={32} color="white" />
                <Text style={styles.applePayText}>Apple Pay</Text>
              </LinearGradient>
            ) : item.method_type === 'credit_card' ? (
              <LinearGradient colors={['#007AFF', '#0051D5']} style={styles.creditCardPayment}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardBrand}>{item.card_brand?.toUpperCase()}</Text>
                  <Ionicons name="card" size={24} color="white" />
                </View>
                <Text style={styles.cardNumber}>•••• •••• •••• {item.last_four}</Text>
                {item.is_default && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultText}>DEFAULT</Text>
                  </View>
                )}
              </LinearGradient>
            ) : (
              <BlurView intensity={30} style={styles.otherPaymentCard}>
                <Ionicons 
                  name={
                    item.method_type === 'paypal' ? 'logo-paypal' : 
                    item.method_type === 'google_pay' ? 'logo-google' : 
                    'card'
                  } 
                  size={32} 
                  color="#007AFF" 
                />
                <Text style={styles.paymentMethodName}>
                  {item.method_type === 'paypal' ? 'PayPal' :
                   item.method_type === 'google_pay' ? 'Google Pay' :
                   'Card'}
                </Text>
              </BlurView>
            )}
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.paymentMethodsList}
      />
    </View>
  );

  const renderCurrentStep = () => {
    switch (step) {
      case 1:
        return renderCountrySelection();
      case 2:
        return renderRecipientDetails();
      case 3:
        return renderTransferDetails();
      case 4:
        return renderPaymentSelection();
      default:
        return renderCountrySelection();
    }
  };

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
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => step > 1 ? setStep(step - 1) : resetForm()}
              >
                <Ionicons name="chevron-back" size={24} color="#007AFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Send Money</Text>
              <Text style={styles.stepIndicator}>Step {step} of 4</Text>
            </View>
            
            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <LinearGradient
                  colors={['#007AFF', '#0051D5']}
                  style={[styles.progressFill, { width: `${(step / 4) * 100}%` }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </View>
            </View>
          </BlurView>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.contentContainer}
          >
            <ScrollView 
              style={styles.scrollContent}
              contentContainerStyle={styles.scrollContainer}
              showsVerticalScrollIndicator={false}
            >
              <BlurView intensity={20} style={styles.stepCard}>
                {renderCurrentStep()}
              </BlurView>
            </ScrollView>

            {/* Action Buttons */}
            <BlurView intensity={95} style={styles.footer}>
              <View style={styles.footerContent}>
                {step > 1 && (
                  <TouchableOpacity
                    style={styles.backStepButton}
                    onPress={() => setStep(step - 1)}
                  >
                    <Text style={styles.backStepText}>Back</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  style={[styles.nextButton, step === 1 && styles.nextButtonFull]}
                  onPress={handleNext}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={['#007AFF', '#0051D5']}
                    style={styles.nextButtonGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <>
                        <Text style={styles.nextButtonText}>
                          {step === 4 ? 'Send Money' : 'Continue'}
                        </Text>
                        <Ionicons name="arrow-forward" size={20} color="white" />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </BlurView>
          </KeyboardAvoidingView>
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
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,122,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
    textAlign: 'center',
  },
  stepIndicator: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  progressContainer: {
    paddingHorizontal: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(142,142,147,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  stepCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  
  // Country Selection
  countriesList: {
    paddingBottom: 20,
  },
  countryOption: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  countryOptionSelected: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  countryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  countryFlag: {
    fontSize: 32,
    marginRight: 16,
  },
  countryDetails: {
    flex: 1,
  },
  countryName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  countryCurrency: {
    fontSize: 14,
    color: '#8E8E93',
  },

  // Input Styles
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  phoneCode: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
    marginHorizontal: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    paddingVertical: 16,
    paddingLeft: 12,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
    marginTop: 8,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  relationshipOption: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  relationshipOptionSelected: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  relationshipContent: {
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  relationshipText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
    fontWeight: '500',
  },
  relationshipTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },

  // Amount Styles
  amountCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  amountLabel: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 12,
    textAlign: 'center',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginRight: 8,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    minWidth: 120,
  },
  exchangeInfo: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 20,
  },
  exchangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exchangeLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  exchangeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  receivedAmountCard: {
    backgroundColor: 'rgba(0,122,255,0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  receivedLabel: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 4,
  },
  receivedAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  
  // Reason Selection
  reasonOption: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  reasonOptionSelected: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  reasonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  reasonText: {
    fontSize: 16,
    color: '#000',
  },
  reasonTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },

  // Payment Methods
  paymentMethodsList: {
    paddingRight: 20,
  },
  paymentCard: {
    width: width * 0.7,
    height: 180,
    marginRight: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  paymentCardSelected: {
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  applePayCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  applePayText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  creditCardPayment: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
    borderRadius: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBrand: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  cardNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    letterSpacing: 2,
    marginVertical: 20,
  },
  defaultBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  defaultText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  otherPaymentCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 8,
  },

  // Summary
  summaryCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
  },
  summaryRows: {
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#8E8E93',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  summaryValueHighlight: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  footerContent: {
    flexDirection: 'row',
    gap: 12,
  },
  backStepButton: {
    flex: 1,
    backgroundColor: 'rgba(142,142,147,0.2)',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  backStepText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  nextButton: {
    flex: 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default SendMoneyScreen;