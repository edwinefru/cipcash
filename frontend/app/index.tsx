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
  Image,
  FlatList,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;
const { width } = Dimensions.get('window');

// TypeScript Interfaces
interface Country {
  id: string;
  country_code: string;
  country_name: string;
  currency_code: string;
  currency_name: string;
  is_active: boolean;
  mtn_supported: boolean;
  flag_emoji: string;
  phone_code: string;
}

interface TransferReason {
  code: string;
  description: string;
  category: string;
}

interface ExchangeRate {
  rate: number;
  updated_at: string;
}

interface UserKYC {
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_of_birth: string;
  nationality: string;
  gender: string;
  email: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  id_type: string;
  id_number: string;
  id_expiry_date?: string;
  id_issuing_country: string;
  occupation: string;
  employer_name?: string;
  annual_income_range: string;
  source_of_funds: string;
  profile_picture?: string;
}

interface User {
  id: string;
  kyc_data: UserKYC;
  is_kyc_verified: boolean;
  kyc_verification_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PaymentMethod {
  id: string;
  user_id: string;
  method_type: string;
  last_four?: string;
  card_brand?: string;
  expiry_month?: number;
  expiry_year?: number;
  is_default: boolean;
  created_at: string;
}

interface RecipientKYC {
  first_name: string;
  middle_name?: string;
  last_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state_province: string;
  country: string;
  relationship_to_sender: string;
  recipient_type: string;
  business_name?: string;
  business_registration_number?: string;
}

// Components
const WelcomeScreen: React.FC<{ onGetStarted: () => void }> = ({ onGetStarted }) => (
  <SafeAreaView style={styles.container}>
    <View style={styles.welcomeContainer}>
      <Ionicons name="globe-outline" size={120} color="#2563eb" />
      <Text style={styles.welcomeTitle}>RemitAfrica</Text>
      <Text style={styles.welcomeSubtitle}>
        Send money to Africa instantly and securely
      </Text>
      <Text style={styles.welcomeDescription}>
        Transfer money to 24 African countries using MTN Mobile Money with competitive exchange rates and comprehensive KYC compliance.
      </Text>
      
      <View style={styles.featuresContainer}>
        <View style={styles.featureItem}>
          <Ionicons name="flash-outline" size={24} color="#10b981" />
          <Text style={styles.featureText}>Instant Transfers</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="shield-checkmark-outline" size={24} color="#10b981" />
          <Text style={styles.featureText}>KYC Compliant</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="card-outline" size={24} color="#10b981" />
          <Text style={styles.featureText}>Multiple Payment Options</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="flag-outline" size={24} color="#10b981" />
          <Text style={styles.featureText}>24 Countries Supported</Text>
        </View>
      </View>
      
      <TouchableOpacity style={styles.getStartedButton} onPress={onGetStarted}>
        <Text style={styles.getStartedButtonText}>Get Started</Text>
        <Ionicons name="arrow-forward" size={20} color="white" />
      </TouchableOpacity>
    </View>
  </SafeAreaView>
);

const KYCRegistrationScreen: React.FC<{ onRegistrationSuccess: (user: User) => void; onBackToLogin: () => void }> = ({ 
  onRegistrationSuccess, 
  onBackToLogin 
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  const [kycData, setKycData] = useState<UserKYC>({
    first_name: '',
    middle_name: '',
    last_name: '',
    date_of_birth: '',
    nationality: '',
    gender: '',
    email: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state_province: '',
    postal_code: '',
    country: '',
    id_type: '',
    id_number: '',
    id_expiry_date: '',
    id_issuing_country: '',
    occupation: '',
    employer_name: '',
    annual_income_range: '',
    source_of_funds: '',
  });
  
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  const pickImage = async (): Promise<void> => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access camera roll is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const imageUri = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setProfileImage(imageUri);
      setKycData(prev => ({ ...prev, profile_picture: imageUri }));
    }
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1: // Personal Information
        return !!(kycData.first_name && kycData.last_name && kycData.date_of_birth && 
                  kycData.nationality && kycData.gender);
      case 2: // Contact Information
        return !!(kycData.email && kycData.phone && kycData.address_line1 && 
                  kycData.city && kycData.state_province && kycData.country);
      case 3: // Identification
        return !!(kycData.id_type && kycData.id_number && kycData.id_issuing_country);
      case 4: // Employment/Income
        return !!(kycData.occupation && kycData.annual_income_range && kycData.source_of_funds);
      case 5: // Password
        return !!(password && confirmPassword && password === confirmPassword && password.length >= 8);
      default:
        return false;
    }
  };

  const handleNext = (): void => {
    if (validateCurrentStep()) {
      if (currentStep < 5) {
        setCurrentStep(currentStep + 1);
      } else {
        handleRegistration();
      }
    } else {
      Alert.alert('Incomplete Information', 'Please fill in all required fields before proceeding.');
    }
  };

  const handleRegistration = async (): Promise<void> => {
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kyc_data: kycData,
          password: password,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        // Store token
        global.authToken = data.access_token;
        
        // Get user info
        const userResponse = await fetch(`${BACKEND_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${data.access_token}`,
          },
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          onRegistrationSuccess(userData);
        }
      } else {
        Alert.alert('Registration Failed', data.detail || 'Registration failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = (): JSX.Element => {
    switch (currentStep) {
      case 1:
        return (
          <View>
            <Text style={styles.stepTitle}>Personal Information</Text>
            <TextInput
              style={styles.input}
              placeholder="First Name *"
              value={kycData.first_name}
              onChangeText={(text) => setKycData({ ...kycData, first_name: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Middle Name (Optional)"
              value={kycData.middle_name}
              onChangeText={(text) => setKycData({ ...kycData, middle_name: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Last Name *"
              value={kycData.last_name}
              onChangeText={(text) => setKycData({ ...kycData, last_name: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Date of Birth (YYYY-MM-DD) *"
              value={kycData.date_of_birth}
              onChangeText={(text) => setKycData({ ...kycData, date_of_birth: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Nationality *"
              value={kycData.nationality}
              onChangeText={(text) => setKycData({ ...kycData, nationality: text })}
            />
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Gender *</Text>
              {['male', 'female', 'other'].map((gender) => (
                <TouchableOpacity
                  key={gender}
                  style={[
                    styles.pickerOption,
                    kycData.gender === gender && styles.pickerOptionSelected,
                  ]}
                  onPress={() => setKycData({ ...kycData, gender })}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    kycData.gender === gender && styles.pickerOptionTextSelected,
                  ]}>
                    {gender.charAt(0).toUpperCase() + gender.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.profileImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="camera-outline" size={40} color="#9ca3af" />
                  <Text style={styles.imagePickerText}>Add Profile Picture</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        );
      
      case 2:
        return (
          <View>
            <Text style={styles.stepTitle}>Contact Information</Text>
            <TextInput
              style={styles.input}
              placeholder="Email Address *"
              value={kycData.email}
              onChangeText={(text) => setKycData({ ...kycData, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Phone Number *"
              value={kycData.phone}
              onChangeText={(text) => setKycData({ ...kycData, phone: text })}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Address Line 1 *"
              value={kycData.address_line1}
              onChangeText={(text) => setKycData({ ...kycData, address_line1: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Address Line 2 (Optional)"
              value={kycData.address_line2}
              onChangeText={(text) => setKycData({ ...kycData, address_line2: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="City *"
              value={kycData.city}
              onChangeText={(text) => setKycData({ ...kycData, city: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="State/Province *"
              value={kycData.state_province}
              onChangeText={(text) => setKycData({ ...kycData, state_province: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Postal Code"
              value={kycData.postal_code}
              onChangeText={(text) => setKycData({ ...kycData, postal_code: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Country *"
              value={kycData.country}
              onChangeText={(text) => setKycData({ ...kycData, country: text })}
            />
          </View>
        );
      
      case 3:
        return (
          <View>
            <Text style={styles.stepTitle}>Identification</Text>
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>ID Type *</Text>
              {[
                { value: 'passport', label: 'Passport' },
                { value: 'national_id', label: 'National ID' },
                { value: 'drivers_license', label: 'Driver\'s License' },
                { value: 'other', label: 'Other' },
              ].map((idType) => (
                <TouchableOpacity
                  key={idType.value}
                  style={[
                    styles.pickerOption,
                    kycData.id_type === idType.value && styles.pickerOptionSelected,
                  ]}
                  onPress={() => setKycData({ ...kycData, id_type: idType.value })}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    kycData.id_type === idType.value && styles.pickerOptionTextSelected,
                  ]}>
                    {idType.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="ID Number *"
              value={kycData.id_number}
              onChangeText={(text) => setKycData({ ...kycData, id_number: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="ID Expiry Date (YYYY-MM-DD)"
              value={kycData.id_expiry_date}
              onChangeText={(text) => setKycData({ ...kycData, id_expiry_date: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="ID Issuing Country *"
              value={kycData.id_issuing_country}
              onChangeText={(text) => setKycData({ ...kycData, id_issuing_country: text })}
            />
          </View>
        );
      
      case 4:
        return (
          <View>
            <Text style={styles.stepTitle}>Employment & Income</Text>
            <TextInput
              style={styles.input}
              placeholder="Occupation *"
              value={kycData.occupation}
              onChangeText={(text) => setKycData({ ...kycData, occupation: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Employer Name"
              value={kycData.employer_name}
              onChangeText={(text) => setKycData({ ...kycData, employer_name: text })}
            />
            
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Annual Income Range *</Text>
              {[
                { value: 'under_25k', label: 'Under $25,000' },
                { value: '25k_50k', label: '$25,000 - $50,000' },
                { value: '50k_100k', label: '$50,000 - $100,000' },
                { value: '100k_250k', label: '$100,000 - $250,000' },
                { value: '250k_500k', label: '$250,000 - $500,000' },
                { value: 'over_500k', label: 'Over $500,000' },
              ].map((income) => (
                <TouchableOpacity
                  key={income.value}
                  style={[
                    styles.pickerOption,
                    kycData.annual_income_range === income.value && styles.pickerOptionSelected,
                  ]}
                  onPress={() => setKycData({ ...kycData, annual_income_range: income.value })}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    kycData.annual_income_range === income.value && styles.pickerOptionTextSelected,
                  ]}>
                    {income.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Source of Funds *</Text>
              {[
                { value: 'salary', label: 'Salary' },
                { value: 'business', label: 'Business' },
                { value: 'investment', label: 'Investment' },
                { value: 'inheritance', label: 'Inheritance' },
                { value: 'gift', label: 'Gift' },
                { value: 'other', label: 'Other' },
              ].map((source) => (
                <TouchableOpacity
                  key={source.value}
                  style={[
                    styles.pickerOption,
                    kycData.source_of_funds === source.value && styles.pickerOptionSelected,
                  ]}
                  onPress={() => setKycData({ ...kycData, source_of_funds: source.value })}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    kycData.source_of_funds === source.value && styles.pickerOptionTextSelected,
                  ]}>
                    {source.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      
      case 5:
        return (
          <View>
            <Text style={styles.stepTitle}>Create Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Password (min 8 characters) *"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password *"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            <Text style={styles.passwordHint}>
              Password must be at least 8 characters long and include a mix of letters, numbers, and special characters.
            </Text>
          </View>
        );
      
      default:
        return <View />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.kycHeader}>
        <TouchableOpacity onPress={onBackToLogin} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.kycTitle}>Account Registration</Text>
        <Text style={styles.kycSubtitle}>Step {currentStep} of 5</Text>
      </View>
      
      <View style={styles.progressBar}>
        <View style={[styles.progressIndicator, { width: `${(currentStep / 5) * 100}%` }]} />
      </View>

      <ScrollView style={styles.kycContent} showsVerticalScrollIndicator={false}>
        {renderStep()}
      </ScrollView>

      <View style={styles.kycFooter}>
        {currentStep > 1 && (
          <TouchableOpacity
            style={styles.backStepButton}
            onPress={() => setCurrentStep(currentStep - 1)}
          >
            <Text style={styles.backStepButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.nextButton, currentStep === 1 && styles.nextButtonFull]}
          onPress={handleNext}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.nextButtonText}>
              {currentStep === 5 ? 'Create Account' : 'Next'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const AuthScreen: React.FC<{ onAuthSuccess: (user: User) => void }> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });

  const handleLogin = async (): Promise<void> => {
    if (!loginData.email || !loginData.password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();
      
      if (response.ok) {
        global.authToken = data.access_token;
        
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
        Alert.alert('Error', data.detail || 'Login failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isLogin) {
    return (
      <KYCRegistrationScreen 
        onRegistrationSuccess={onAuthSuccess}
        onBackToLogin={() => setIsLogin(true)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.authContainer}>
        <View style={styles.authHeader}>
          <Ionicons name="globe-outline" size={60} color="#2563eb" />
          <Text style={styles.authTitle}>Welcome Back</Text>
          <Text style={styles.authSubtitle}>Sign in to your account</Text>
        </View>

        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={loginData.email}
            onChangeText={(text) => setLoginData({ ...loginData, email: text })}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={loginData.password}
            onChangeText={(text) => setLoginData({ ...loginData, password: text })}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.authButton, loading && styles.authButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.authButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchAuthButton}
            onPress={() => setIsLogin(false)}
          >
            <Text style={styles.switchAuthText}>
              Don't have an account? Sign Up
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const CreditCardCarousel: React.FC<{ paymentMethods: PaymentMethod[]; onSelectMethod: (method: PaymentMethod) => void }> = ({ 
  paymentMethods, 
  onSelectMethod 
}) => {
  const renderCard = ({ item }: { item: PaymentMethod }): JSX.Element => (
    <TouchableOpacity 
      style={styles.creditCard} 
      onPress={() => onSelectMethod(item)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardBrand}>{item.card_brand?.toUpperCase() || 'CARD'}</Text>
        <Ionicons name="card-outline" size={24} color="white" />
      </View>
      <View style={styles.cardNumber}>
        <Text style={styles.cardNumberText}>•••• •••• •••• {item.last_four}</Text>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.cardExpiry}>
          {item.expiry_month?.toString().padStart(2, '0')}/{item.expiry_year?.toString().slice(-2)}
        </Text>
        <Text style={styles.cardCvv}>•••</Text>
      </View>
      {item.is_default && (
        <View style={styles.defaultBadge}>
          <Text style={styles.defaultBadgeText}>DEFAULT</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.carouselContainer}>
      <Text style={styles.carouselTitle}>Select Payment Method</Text>
      <FlatList
        data={paymentMethods}
        renderItem={renderCard}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={width * 0.8 + 20}
        decelerationRate="fast"
        contentContainerStyle={styles.carouselContent}
      />
    </View>
  );
};

const DashboardScreen: React.FC<{ user: User }> = ({ user }) => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showSendMoney, setShowSendMoney] = useState<boolean>(false);
  const [showProfile, setShowProfile] = useState<boolean>(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  useEffect(() => {
    fetchCountries();
    fetchPaymentMethods();
  }, []);

  const fetchCountries = async (): Promise<void> => {
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

  const fetchPaymentMethods = async (): Promise<void> => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/payment-methods`, {
        headers: {
          'Authorization': `Bearer ${global.authToken}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setPaymentMethods(data);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
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
        <View style={styles.headerContent}>
          <View style={styles.userInfo}>
            {user.kyc_data.profile_picture ? (
              <Image 
                source={{ uri: user.kyc_data.profile_picture }} 
                style={styles.profileImageSmall}
              />
            ) : (
              <View style={styles.profilePlaceholderSmall}>
                <Ionicons name="person" size={24} color="#9ca3af" />
              </View>
            )}
            <View>
              <Text style={styles.greeting}>Hello, {user.kyc_data.first_name}!</Text>
              <Text style={styles.subGreeting}>
                {user.is_kyc_verified ? (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={styles.verifiedText}>KYC Verified</Text>
                  </View>
                ) : (
                  <Text style={styles.unverifiedText}>KYC Pending</Text>
                )}
              </Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.profileButton} 
            onPress={() => setShowProfile(true)}
          >
            <Ionicons name="settings-outline" size={24} color="#2563eb" />
          </TouchableOpacity>
        </View>
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
              Transfer to 24 African countries
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
          <View style={styles.statCard}>
            <Ionicons name="flag-outline" size={24} color="#10b981" />
            <Text style={styles.statValue}>24</Text>
            <Text style={styles.statLabel}>Countries</Text>
          </View>
        </View>

        <View style={styles.countriesSection}>
          <Text style={styles.sectionTitle}>Supported Countries</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {countries.map((country) => (
              <View key={country.id} style={styles.countryCardHorizontal}>
                <Text style={styles.countryFlag}>{country.flag_emoji}</Text>
                <Text style={styles.countryNameSmall}>{country.country_name}</Text>
                <Text style={styles.countryCurrencySmall}>{country.currency_code}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      <SendMoneyModal
        visible={showSendMoney}
        onClose={() => setShowSendMoney(false)}
        countries={countries}
        user={user}
        paymentMethods={paymentMethods}
      />

      <ProfileModal
        visible={showProfile}
        onClose={() => setShowProfile(false)}
        user={user}
      />
    </SafeAreaView>
  );
};

const SendMoneyModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  countries: Country[];
  user: User;
  paymentMethods: PaymentMethod[];
}> = ({ visible, onClose, countries, user, paymentMethods }) => {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [transferReasons, setTransferReasons] = useState<TransferReason[]>([]);
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  
  const [recipientData, setRecipientData] = useState<RecipientKYC>({
    first_name: '',
    middle_name: '',
    last_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state_province: '',
    country: '',
    relationship_to_sender: '',
    recipient_type: 'individual',
    business_name: '',
    business_registration_number: '',
  });
  
  const [transferData, setTransferData] = useState({
    amount_sent: '',
    currency_sent: 'USD',
    transfer_reason: '',
    transfer_description: '',
  });

  useEffect(() => {
    if (visible) {
      fetchTransferReasons();
    }
  }, [visible]);

  useEffect(() => {
    if (selectedCountry && transferData.amount_sent) {
      fetchExchangeRate();
    }
  }, [selectedCountry, transferData.amount_sent, transferData.currency_sent]);

  const fetchTransferReasons = async (): Promise<void> => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/transfer-reasons`);
      if (response.ok) {
        const data = await response.json();
        setTransferReasons(data);
      }
    } catch (error) {
      console.error('Error fetching transfer reasons:', error);
    }
  };

  const fetchExchangeRate = async (): Promise<void> => {
    if (!selectedCountry || !transferData.amount_sent) return;

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/exchange-rates/${transferData.currency_sent}/${selectedCountry.currency_code}`
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
    if (!exchangeRate || !transferData.amount_sent) return '0';
    return (parseFloat(transferData.amount_sent) * exchangeRate.rate).toFixed(2);
  };

  const handleNext = (): void => {
    if (step === 1) { // Country Selection
      if (!selectedCountry) {
        Alert.alert('Error', 'Please select a destination country');
        return;
      }
      setRecipientData(prev => ({ ...prev, country: selectedCountry.country_code }));
      setStep(2);
    } else if (step === 2) { // Recipient Details
      if (!recipientData.first_name || !recipientData.last_name || !recipientData.phone || 
          !recipientData.relationship_to_sender) {
        Alert.alert('Error', 'Please fill in all required recipient details');
        return;
      }
      setStep(3);
    } else if (step === 3) { // Transfer Details
      if (!transferData.amount_sent || parseFloat(transferData.amount_sent) <= 0 || 
          !transferData.transfer_reason) {
        Alert.alert('Error', 'Please enter amount and select transfer reason');
        return;
      }
      setStep(4);
    } else if (step === 4) { // Payment Method
      if (!selectedPaymentMethod) {
        Alert.alert('Error', 'Please select a payment method');
        return;
      }
      handleSendMoney();
    }
  };

  const handleSendMoney = (): void => {
    Alert.alert(
      'Confirm Transfer',
      `Send ${transferData.currency_sent} ${transferData.amount_sent} to ${recipientData.first_name} in ${selectedCountry?.country_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => {
          Alert.alert('Success', 'Payment processing will be implemented in next phase');
          resetForm();
          onClose();
        }},
      ]
    );
  };

  const resetForm = (): void => {
    setStep(1);
    setSelectedCountry(null);
    setSelectedPaymentMethod(null);
    setRecipientData({
      first_name: '',
      middle_name: '',
      last_name: '',
      phone: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state_province: '',
      country: '',
      relationship_to_sender: '',
      recipient_type: 'individual',
      business_name: '',
      business_registration_number: '',
    });
    setTransferData({
      amount_sent: '',
      currency_sent: 'USD',
      transfer_reason: '',
      transfer_description: '',
    });
    setExchangeRate(null);
  };

  const renderStep = (): JSX.Element => {
    switch (step) {
      case 1:
        return (
          <View>
            <Text style={styles.stepTitle}>Select Destination Country</Text>
            <ScrollView style={styles.countryList}>
              {countries.map((country) => (
                <TouchableOpacity
                  key={country.id}
                  style={[
                    styles.countryItem,
                    selectedCountry?.id === country.id && styles.countryItemSelected,
                  ]}
                  onPress={() => setSelectedCountry(country)}
                >
                  <Text style={styles.countryFlag}>{country.flag_emoji}</Text>
                  <View style={styles.countryInfo}>
                    <Text style={styles.countryName}>{country.country_name}</Text>
                    <Text style={styles.countryCurrency}>
                      {country.currency_code} - {country.currency_name}
                    </Text>
                    <Text style={styles.countryPhone}>{country.phone_code}</Text>
                  </View>
                  {selectedCountry?.id === country.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );

      case 2:
        return (
          <View>
            <Text style={styles.stepTitle}>Recipient Details</Text>
            <Text style={styles.selectedCountryText}>
              Sending to: {selectedCountry?.flag_emoji} {selectedCountry?.country_name}
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder="First Name *"
              value={recipientData.first_name}
              onChangeText={(text) => setRecipientData({ ...recipientData, first_name: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Last Name *"
              value={recipientData.last_name}
              onChangeText={(text) => setRecipientData({ ...recipientData, last_name: text })}
            />
            <TextInput
              style={styles.input}
              placeholder={`Phone Number (${selectedCountry?.phone_code}) *`}
              value={recipientData.phone}
              onChangeText={(text) => setRecipientData({ ...recipientData, phone: text })}
              keyboardType="phone-pad"
            />
            
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Relationship to You *</Text>
              {[
                { value: 'family', label: 'Family Member' },
                { value: 'friend', label: 'Friend' },
                { value: 'business', label: 'Business Partner' },
                { value: 'other', label: 'Other' },
              ].map((relationship) => (
                <TouchableOpacity
                  key={relationship.value}
                  style={[
                    styles.pickerOption,
                    recipientData.relationship_to_sender === relationship.value && styles.pickerOptionSelected,
                  ]}
                  onPress={() => setRecipientData({ ...recipientData, relationship_to_sender: relationship.value })}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    recipientData.relationship_to_sender === relationship.value && styles.pickerOptionTextSelected,
                  ]}>
                    {relationship.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 3:
        return (
          <View>
            <Text style={styles.stepTitle}>Transfer Details</Text>
            
            <View style={styles.amountContainer}>
              <Text style={styles.inputLabel}>Amount to Send *</Text>
              <View style={styles.amountInputContainer}>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  value={transferData.amount_sent}
                  onChangeText={(text) => setTransferData({ ...transferData, amount_sent: text })}
                  keyboardType="numeric"
                />
                <Text style={styles.currencyText}>{transferData.currency_sent}</Text>
              </View>
            </View>

            {exchangeRate && (
              <View style={styles.exchangeInfo}>
                <Text style={styles.exchangeLabel}>Exchange Rate</Text>
                <Text style={styles.exchangeRate}>
                  1 {transferData.currency_sent} = {exchangeRate.rate} {selectedCountry?.currency_code}
                </Text>
                
                <View style={styles.receivedAmountContainer}>
                  <Text style={styles.receivedLabel}>Recipient Gets</Text>
                  <Text style={styles.receivedAmount}>
                    {selectedCountry?.currency_code} {calculateReceivedAmount()}
                  </Text>
                </View>
              </View>
            )}
            
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Reason for Transfer *</Text>
              {transferReasons.map((reason) => (
                <TouchableOpacity
                  key={reason.code}
                  style={[
                    styles.pickerOption,
                    transferData.transfer_reason === reason.code && styles.pickerOptionSelected,
                  ]}
                  onPress={() => setTransferData({ ...transferData, transfer_reason: reason.code })}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    transferData.transfer_reason === reason.code && styles.pickerOptionTextSelected,
                  ]}>
                    {reason.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Additional Description (Optional)"
              value={transferData.transfer_description}
              onChangeText={(text) => setTransferData({ ...transferData, transfer_description: text })}
              multiline
              numberOfLines={3}
            />
          </View>
        );

      case 4:
        return (
          <View>
            <Text style={styles.stepTitle}>Payment Method</Text>
            
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Transfer Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>To:</Text>
                <Text style={styles.summaryValue}>{recipientData.first_name} {recipientData.last_name}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Country:</Text>
                <Text style={styles.summaryValue}>{selectedCountry?.country_name}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>You Send:</Text>
                <Text style={styles.summaryValue}>{transferData.currency_sent} {transferData.amount_sent}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>They Get:</Text>
                <Text style={styles.summaryValue}>{selectedCountry?.currency_code} {calculateReceivedAmount()}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Reason:</Text>
                <Text style={styles.summaryValue}>
                  {transferReasons.find(r => r.code === transferData.transfer_reason)?.description}
                </Text>
              </View>
            </View>

            <CreditCardCarousel 
              paymentMethods={paymentMethods}
              onSelectMethod={setSelectedPaymentMethod}
            />
            
            {!selectedPaymentMethod && (
              <TouchableOpacity style={styles.addPaymentButton}>
                <Ionicons name="add-circle-outline" size={24} color="#2563eb" />
                <Text style={styles.addPaymentText}>Add Payment Method</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      default:
        return <View />;
    }
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

        <View style={styles.progressBar}>
          <View style={[styles.progressIndicator, { width: `${(step / 4) * 100}%` }]} />
        </View>

        <ScrollView style={styles.modalContent}>
          {renderStep()}
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
            onPress={handleNext}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.nextButtonText}>
                {step === 4 ? 'Send Money' : 'Next'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const ProfileModal: React.FC<{ visible: boolean; onClose: () => void; user: User }> = ({ 
  visible, 
  onClose, 
  user 
}) => {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.profileHeader}>
            {user.kyc_data.profile_picture ? (
              <Image 
                source={{ uri: user.kyc_data.profile_picture }} 
                style={styles.profileImageLarge}
              />
            ) : (
              <View style={styles.profilePlaceholderLarge}>
                <Ionicons name="person" size={60} color="#9ca3af" />
              </View>
            )}
            <Text style={styles.profileName}>
              {user.kyc_data.first_name} {user.kyc_data.last_name}
            </Text>
            <Text style={styles.profileEmail}>{user.kyc_data.email}</Text>
            <View style={styles.verificationStatus}>
              {user.is_kyc_verified ? (
                <View style={styles.verifiedBadgeLarge}>
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  <Text style={styles.verifiedTextLarge}>KYC Verified</Text>
                </View>
              ) : (
                <View style={styles.unverifiedBadgeLarge}>
                  <Ionicons name="time-outline" size={20} color="#f59e0b" />
                  <Text style={styles.unverifiedTextLarge}>KYC Pending</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.profileSection}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <View style={styles.profileInfo}>
              <Text style={styles.profileLabel}>Phone:</Text>
              <Text style={styles.profileValue}>{user.kyc_data.phone}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileLabel}>Date of Birth:</Text>
              <Text style={styles.profileValue}>{user.kyc_data.date_of_birth}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileLabel}>Nationality:</Text>
              <Text style={styles.profileValue}>{user.kyc_data.nationality}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileLabel}>Address:</Text>
              <Text style={styles.profileValue}>
                {user.kyc_data.address_line1}, {user.kyc_data.city}, {user.kyc_data.country}
              </Text>
            </View>
          </View>

          <View style={styles.profileSection}>
            <Text style={styles.sectionTitle}>Employment</Text>
            <View style={styles.profileInfo}>
              <Text style={styles.profileLabel}>Occupation:</Text>
              <Text style={styles.profileValue}>{user.kyc_data.occupation}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileLabel}>Income Range:</Text>
              <Text style={styles.profileValue}>{user.kyc_data.annual_income_range.replace('_', ' - ')}</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

// Main App Component
const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<'welcome' | 'auth' | 'dashboard'>('welcome');
  const [user, setUser] = useState<User | null>(null);

  const handleGetStarted = (): void => {
    setCurrentScreen('auth');
  };

  const handleAuthSuccess = (userData: User): void => {
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
};

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
  
  // KYC Registration Styles
  kycHeader: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 20,
  },
  kycTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  kycSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 5,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
  },
  progressIndicator: {
    height: '100%',
    backgroundColor: '#2563eb',
  },
  kycContent: {
    flex: 1,
    padding: 20,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 20,
  },
  kycFooter: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  backStepButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginRight: 10,
  },
  backStepButtonText: {
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
  
  // Image Picker Styles
  imagePickerButton: {
    alignItems: 'center',
    marginVertical: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
  },
  imagePickerText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 5,
    textAlign: 'center',
  },
  
  // Picker Styles
  pickerContainer: {
    marginVertical: 10,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  pickerOption: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  pickerOptionSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  pickerOptionText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  pickerOptionTextSelected: {
    color: 'white',
  },
  passwordHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 10,
    lineHeight: 18,
  },
  
  // Auth Screen Styles
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
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
  
  // Dashboard Styles
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
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImageSmall: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  profilePlaceholderSmall: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subGreeting: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  unverifiedText: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '500',
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
    flex: 0.3,
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
    textAlign: 'center',
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
  countryCardHorizontal: {
    alignItems: 'center',
    marginRight: 15,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    minWidth: 80,
  },
  countryFlag: {
    fontSize: 24,
    marginBottom: 5,
  },
  countryNameSmall: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
  },
  countryCurrencySmall: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
  },
  
  // Credit Card Carousel Styles
  carouselContainer: {
    marginVertical: 20,
  },
  carouselTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 15,
    textAlign: 'center',
  },
  carouselContent: {
    paddingHorizontal: 10,
  },
  creditCard: {
    width: width * 0.8,
    height: 200,
    backgroundColor: '#1f2937',
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 10,
    justifyContent: 'space-between',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBrand: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardNumber: {
    marginVertical: 20,
  },
  cardNumberText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardExpiry: {
    color: '#d1d5db',
    fontSize: 14,
  },
  cardCvv: {
    color: '#d1d5db',
    fontSize: 14,
  },
  defaultBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  defaultBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  addPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderWidth: 2,
    borderColor: '#2563eb',
    borderStyle: 'dashed',
    borderRadius: 10,
    marginTop: 10,
  },
  addPaymentText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Modal Styles
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
  
  // Send Money Modal Styles
  selectedCountryText: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  countryList: {
    maxHeight: 400,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  countryItemSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#f0f9ff',
  },
  countryInfo: {
    flex: 1,
    marginLeft: 15,
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
  countryPhone: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
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
    marginBottom: 20,
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
    flex: 1,
    textAlign: 'right',
  },
  
  // Profile Modal Styles
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: 'white',
    borderRadius: 15,
    marginBottom: 20,
  },
  profileImageLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
  },
  profilePlaceholderLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  profileEmail: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 15,
  },
  verificationStatus: {
    alignItems: 'center',
  },
  verifiedBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  verifiedTextLarge: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  unverifiedBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  unverifiedTextLarge: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  profileSection: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  profileInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  profileLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  profileValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
});

export default App;