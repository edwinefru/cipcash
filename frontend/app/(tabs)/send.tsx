import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL || '';

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

const SendMoneyScreen: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [countries, setCountries] = useState<Country[]>([]);
  const [transferReasons, setTransferReasons] = useState<TransferReason[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [sendData, setSendData] = useState({
    amount: '',
    recipient_first_name: '',
    recipient_last_name: '',
    recipient_phone: '',
    recipient_relationship: '',
    transfer_reason: '',
    payment_method: 'card',
  });

  const [exchangeRate, setExchangeRate] = useState<number>(0);
  const [recipientAmount, setRecipientAmount] = useState<number>(0);

  useEffect(() => {
    loadCountries();
    loadTransferReasons();
  }, []);

  useEffect(() => {
    if (selectedCountry && sendData.amount) {
      fetchExchangeRate();
    }
  }, [selectedCountry, sendData.amount]);

  const loadCountries = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/countries`);
      if (response.ok) {
        const countriesData = await response.json();
        setCountries(countriesData);
      }
    } catch (error) {
      console.error('Error loading countries:', error);
    }
  };

  const loadTransferReasons = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/transfer-reasons`);
      if (response.ok) {
        const reasonsData = await response.json();
        setTransferReasons(reasonsData);
      }
    } catch (error) {
      console.error('Error loading transfer reasons:', error);
    }
  };

  const fetchExchangeRate = async () => {
    if (!selectedCountry) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/exchange-rates/USD/${selectedCountry.currency_code}`
      );
      if (response.ok) {
        const rateData = await response.json();
        setExchangeRate(rateData.rate);
        setRecipientAmount(parseFloat(sendData.amount) * rateData.rate);
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
    }
  };

  const handleAmountChange = (text: string) => {
    setSendData({ ...sendData, amount: text });
    if (exchangeRate && text) {
      setRecipientAmount(parseFloat(text) * exchangeRate);
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1 && !selectedCountry) {
      Alert.alert('Error', 'Please select a destination country');
      return;
    }
    if (currentStep === 2 && !sendData.amount) {
      Alert.alert('Error', 'Please enter an amount');
      return;
    }
    if (currentStep === 3 && (!sendData.recipient_first_name || !sendData.recipient_last_name || !sendData.recipient_phone)) {
      Alert.alert('Error', 'Please fill in all recipient details');
      return;
    }
    if (currentStep === 4 && !sendData.transfer_reason) {
      Alert.alert('Error', 'Please select a transfer reason');
      return;
    }

    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSendMoney();
    }
  };

  const handleSendMoney = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Error', 'Please login first');
        return;
      }

      // Simulate sending money
      Alert.alert(
        'Success',
        `Money transfer initiated! You're sending $${sendData.amount} to ${sendData.recipient_first_name} ${sendData.recipient_last_name} in ${selectedCountry?.country_name}.`,
        [
          { text: 'OK', onPress: () => resetForm() }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to send money. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setSelectedCountry(null);
    setSendData({
      amount: '',
      recipient_first_name: '',
      recipient_last_name: '',
      recipient_phone: '',
      recipient_relationship: '',
      transfer_reason: '',
      payment_method: 'card',
    });
    setExchangeRate(0);
    setRecipientAmount(0);
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4, 5].map((step) => (
        <View key={step} style={styles.stepContainer}>
          <View style={[
            styles.stepCircle,
            currentStep >= step && styles.stepCircleActive
          ]}>
            <Text style={[
              styles.stepNumber,
              currentStep >= step && styles.stepNumberActive
            ]}>
              {step}
            </Text>
          </View>
          {step < 5 && (
            <View style={[
              styles.stepLine,
              currentStep > step && styles.stepLineActive
            ]} />
          )}
        </View>
      ))}
    </View>
  );

  const renderCountrySelection = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Select Destination Country</Text>
      <Text style={styles.stepSubtitle}>Choose where you want to send money</Text>

      <TouchableOpacity
        style={styles.countrySelector}
        onPress={() => setShowCountryModal(true)}
      >
        <View style={styles.countrySelectorContent}>
          {selectedCountry ? (
            <>
              <Text style={styles.countryFlag}>{selectedCountry.flag_emoji}</Text>
              <View style={styles.countryInfo}>
                <Text style={styles.countryName}>{selectedCountry.country_name}</Text>
                <Text style={styles.countryCurrency}>{selectedCountry.currency_code}</Text>
              </View>
            </>
          ) : (
            <Text style={styles.countrySelectorPlaceholder}>Select Country</Text>
          )}
          <Ionicons name="chevron-down" size={24} color="#8E8E93" />
        </View>
      </TouchableOpacity>

      <Modal visible={showCountryModal} animationType="slide">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCountryModal(false)}>
              <Ionicons name="close" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Country</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={styles.countriesList}>
            {countries.map((country) => (
              <TouchableOpacity
                key={country.id}
                style={styles.countryOption}
                onPress={() => {
                  setSelectedCountry(country);
                  setShowCountryModal(false);
                }}
              >
                <Text style={styles.countryFlag}>{country.flag_emoji}</Text>
                <View style={styles.countryInfo}>
                  <Text style={styles.countryName}>{country.country_name}</Text>
                  <Text style={styles.countryCurrency}>{country.currency_code}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );

  const renderAmountInput = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Enter Amount</Text>
      <Text style={styles.stepSubtitle}>How much would you like to send?</Text>

      <View style={styles.amountContainer}>
        <Text style={styles.currencySymbol}>$</Text>
        <TextInput
          style={styles.amountInput}
          value={sendData.amount}
          onChangeText={handleAmountChange}
          placeholder="0.00"
          keyboardType="numeric"
          fontSize={32}
          textAlign="center"
        />
      </View>

      {selectedCountry && exchangeRate > 0 && sendData.amount && (
        <View style={styles.exchangeInfo}>
          <Text style={styles.exchangeText}>
            Recipient gets: {recipientAmount.toFixed(2)} {selectedCountry.currency_code}
          </Text>
          <Text style={styles.exchangeRate}>
            Rate: 1 USD = {exchangeRate} {selectedCountry.currency_code}
          </Text>
        </View>
      )}
    </View>
  );

  const renderRecipientDetails = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Recipient Details</Text>
      <Text style={styles.stepSubtitle}>Who are you sending money to?</Text>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>First Name *</Text>
          <TextInput
            style={styles.input}
            value={sendData.recipient_first_name}
            onChangeText={(text) => setSendData({ ...sendData, recipient_first_name: text })}
            placeholder="Enter first name"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Last Name *</Text>
          <TextInput
            style={styles.input}
            value={sendData.recipient_last_name}
            onChangeText={(text) => setSendData({ ...sendData, recipient_last_name: text })}
            placeholder="Enter last name"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            value={sendData.recipient_phone}
            onChangeText={(text) => setSendData({ ...sendData, recipient_phone: text })}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Relationship</Text>
          <TextInput
            style={styles.input}
            value={sendData.recipient_relationship}
            onChangeText={(text) => setSendData({ ...sendData, recipient_relationship: text })}
            placeholder="e.g., Family, Friend"
          />
        </View>
      </View>
    </View>
  );

  const renderTransferReason = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Transfer Reason</Text>
      <Text style={styles.stepSubtitle}>Why are you sending this money?</Text>

      <TouchableOpacity
        style={styles.reasonSelector}
        onPress={() => setShowReasonModal(true)}
      >
        <View style={styles.reasonSelectorContent}>
          {sendData.transfer_reason ? (
            <Text style={styles.reasonSelected}>
              {transferReasons.find(r => r.code === sendData.transfer_reason)?.description}
            </Text>
          ) : (
            <Text style={styles.reasonPlaceholder}>Select Reason</Text>
          )}
          <Ionicons name="chevron-down" size={24} color="#8E8E93" />
        </View>
      </TouchableOpacity>

      <Modal visible={showReasonModal} animationType="slide">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowReasonModal(false)}>
              <Ionicons name="close" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Transfer Reason</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={styles.reasonsList}>
            {transferReasons.map((reason) => (
              <TouchableOpacity
                key={reason.code}
                style={styles.reasonOption}
                onPress={() => {
                  setSendData({ ...sendData, transfer_reason: reason.code });
                  setShowReasonModal(false);
                }}
              >
                <Text style={styles.reasonDescription}>{reason.description}</Text>
                <Text style={styles.reasonCategory}>{reason.category}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );

  const renderReview = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Review & Send</Text>
      <Text style={styles.stepSubtitle}>Please review your transfer details</Text>

      <View style={styles.reviewCard}>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Sending to:</Text>
          <Text style={styles.reviewValue}>
            {sendData.recipient_first_name} {sendData.recipient_last_name}
          </Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Country:</Text>
          <Text style={styles.reviewValue}>
            {selectedCountry?.flag_emoji} {selectedCountry?.country_name}
          </Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Phone:</Text>
          <Text style={styles.reviewValue}>{sendData.recipient_phone}</Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Amount:</Text>
          <Text style={styles.reviewValue}>${sendData.amount}</Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Recipient gets:</Text>
          <Text style={styles.reviewValue}>
            {recipientAmount.toFixed(2)} {selectedCountry?.currency_code}
          </Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Reason:</Text>
          <Text style={styles.reviewValue}>
            {transferReasons.find(r => r.code === sendData.transfer_reason)?.description}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderCountrySelection();
      case 2: return renderAmountInput();
      case 3: return renderRecipientDetails();
      case 4: return renderTransferReason();
      case 5: return renderReview();
      default: return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView}>
          {renderStepIndicator()}
          {renderCurrentStep()}
        </ScrollView>

        <View style={styles.footer}>
          {currentStep > 1 && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setCurrentStep(currentStep - 1)}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.nextButton, isLoading && styles.nextButtonDisabled]}
            onPress={handleNextStep}
            disabled={isLoading}
          >
            <Text style={styles.nextButtonText}>
              {currentStep === 5 ? (isLoading ? 'Sending...' : 'Send Money') : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'white',
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#007AFF',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  stepNumberActive: {
    color: 'white',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#007AFF',
  },
  stepContent: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 32,
  },
  countrySelector: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  countrySelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryFlag: {
    fontSize: 32,
    marginRight: 16,
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  countryCurrency: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  countrySelectorPlaceholder: {
    flex: 1,
    fontSize: 18,
    color: '#8E8E93',
  },
  modal: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  countriesList: {
    flex: 1,
  },
  countryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  amountContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    color: '#1C1C1E',
    fontWeight: 'bold',
  },
  exchangeInfo: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  exchangeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
  },
  exchangeRate: {
    fontSize: 14,
    color: '#0051D5',
    marginTop: 4,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  reasonSelector: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  reasonSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reasonSelected: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  reasonPlaceholder: {
    flex: 1,
    fontSize: 16,
    color: '#8E8E93',
  },
  reasonsList: {
    flex: 1,
  },
  reasonOption: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  reasonDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  reasonCategory: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  reviewCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  reviewLabel: {
    fontSize: 16,
    color: '#8E8E93',
    flex: 1,
  },
  reviewValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
    flex: 1,
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    gap: 16,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  nextButton: {
    flex: 2,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default SendMoneyScreen;