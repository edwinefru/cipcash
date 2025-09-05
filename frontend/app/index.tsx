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
  KeyboardAvoidingView,
  Keyboard,
  BlurView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { BlurView as ExpoBlurView } from 'expo-blur';
import * as ApplePay from 'expo-apple-pay';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;
const { width, height } = Dimensions.get('window');

// iOS Glass Morphism Colors
const colors = {
  primary: '#007AFF',
  primaryDark: '#0051D5',
  secondary: '#8E8E93',
  success: '#34C759',
  warning: '#FF9500',
  danger: '#FF3B30',
  background: '#F2F2F7',
  cardBackground: 'rgba(255, 255, 255, 0.8)',
  glassBackground: 'rgba(255, 255, 255, 0.25)',
  textPrimary: '#000000',
  textSecondary: '#8E8E93',
  border: 'rgba(255, 255, 255, 0.2)',
  shadowColor: 'rgba(0, 0, 0, 0.1)',
};

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

// Glass Morphism Components
const GlassCard: React.FC<{ children: React.ReactNode; style?: any }> = ({ children, style }) => (
  <ExpoBlurView intensity={20} style={[styles.glassCard, style]}>
    {children}
  </ExpoBlurView>
);

const GlassButton: React.FC<{ 
  title: string; 
  onPress: () => void; 
  icon?: string; 
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: any;
}> = ({ title, onPress, icon, variant = 'primary', disabled, loading, style }) => (
  <TouchableOpacity
    style={[
      styles.glassButton,
      styles[`glassButton${variant.charAt(0).toUpperCase() + variant.slice(1)}`],
      disabled && styles.glassButtonDisabled,
      style
    ]}
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.7}
  >
    <ExpoBlurView intensity={30} style={styles.glassButtonBlur}>
      {loading ? (
        <ActivityIndicator color="white" size="small" />
      ) : (
        <View style={styles.glassButtonContent}>
          {icon && <Ionicons name={icon as any} size={20} color="white" style={{ marginRight: 8 }} />}
          <Text style={styles.glassButtonText}>{title}</Text>
        </View>
      )}
    </ExpoBlurView>
  </TouchableOpacity>
);

// Components
const WelcomeScreen: React.FC<{ onGetStarted: () => void }> = ({ onGetStarted }) => (
  <View style={styles.container}>
    <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
    <View style={styles.welcomeBackground}>
      <SafeAreaView style={styles.welcomeContainer}>
        <View style={styles.welcomeContent}>
          <ExpoBlurView intensity={80} style={styles.welcomeCard}>
            <View style={styles.logoContainer}>
              <Ionicons name="globe-outline" size={80} color={colors.primary} />
              <Text style={styles.welcomeTitle}>RemitAfrica</Text>
              <Text style={styles.welcomeSubtitle}>
                Send money to Africa instantly and securely
              </Text>
            </View>
            
            <View style={styles.featuresContainer}>
              {[
                { icon: 'flash-outline', text: 'Instant Transfers', color: colors.success },
                { icon: 'shield-checkmark-outline', text: 'KYC Compliant', color: colors.primary },
                { icon: 'card-outline', text: 'Apple Pay & More', color: colors.warning },
                { icon: 'flag-outline', text: '24 Countries', color: colors.danger },
              ].map((feature, index) => (
                <GlassCard key={index} style={styles.featureCard}>
                  <Ionicons name={feature.icon as any} size={24} color={feature.color} />
                  <Text style={styles.featureText}>{feature.text}</Text>
                </GlassCard>
              ))}
            </View>
            
            <GlassButton
              title="Get Started"
              icon="arrow-forward"
              onPress={onGetStarted}
              style={styles.getStartedButton}
            />
          </ExpoBlurView>
        </View>
      </SafeAreaView>
    </View>
  </View>
);

const KYCRegistrationScreen: React.FC<{ onRegistrationSuccess: (user: User) => void; onBackToLogin: () => void }> = ({ 
  onRegistrationSuccess, 
  onBackToLogin 
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  
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

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener('keyboardWillShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const keyboardWillHide = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

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
      case 1:
        return !!(kycData.first_name && kycData.last_name && kycData.date_of_birth && 
                  kycData.nationality && kycData.gender);
      case 2:
        return !!(kycData.email && kycData.phone && kycData.address_line1 && 
                  kycData.city && kycData.state_province && kycData.country);
      case 3:
        return !!(kycData.id_type && kycData.id_number && kycData.id_issuing_country);
      case 4:
        return !!(kycData.occupation && kycData.annual_income_range && kycData.source_of_funds);
      case 5:
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
        global.authToken = data.access_token;
        
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
    const steps = [
      {
        title: 'Personal Information',
        content: (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <TextInput
              style={styles.glassInput}
              placeholder="First Name *"
              placeholderTextColor={colors.textSecondary}
              value={kycData.first_name}
              onChangeText={(text) => setKycData({ ...kycData, first_name: text })}
            />
            <TextInput
              style={styles.glassInput}
              placeholder="Middle Name (Optional)"
              placeholderTextColor={colors.textSecondary}
              value={kycData.middle_name}
              onChangeText={(text) => setKycData({ ...kycData, middle_name: text })}
            />
            <TextInput
              style={styles.glassInput}
              placeholder="Last Name *"
              placeholderTextColor={colors.textSecondary}
              value={kycData.last_name}
              onChangeText={(text) => setKycData({ ...kycData, last_name: text })}
            />
            <TextInput
              style={styles.glassInput}
              placeholder="Date of Birth (YYYY-MM-DD) *"
              placeholderTextColor={colors.textSecondary}
              value={kycData.date_of_birth}
              onChangeText={(text) => setKycData({ ...kycData, date_of_birth: text })}
            />
            <TextInput
              style={styles.glassInput}
              placeholder="Nationality *"
              placeholderTextColor={colors.textSecondary}
              value={kycData.nationality}
              onChangeText={(text) => setKycData({ ...kycData, nationality: text })}
            />
            
            <Text style={styles.sectionLabel}>Gender *</Text>
            <View style={styles.optionsContainer}>
              {['male', 'female', 'other'].map((gender) => (
                <TouchableOpacity
                  key={gender}
                  style={[
                    styles.glassOption,
                    kycData.gender === gender && styles.glassOptionSelected
                  ]}
                  onPress={() => setKycData({ ...kycData, gender })}
                >
                  <ExpoBlurView intensity={20} style={styles.glassOptionBlur}>
                    <Text style={[
                      styles.glassOptionText,
                      kycData.gender === gender && styles.glassOptionTextSelected
                    ]}>
                      {gender.charAt(0).toUpperCase() + gender.slice(1)}
                    </Text>
                  </ExpoBlurView>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
              <GlassCard style={styles.imagePickerCard}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.profileImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="camera-outline" size={40} color={colors.primary} />
                    <Text style={styles.imagePickerText}>Add Profile Picture</Text>
                  </View>
                )}
              </GlassCard>
            </TouchableOpacity>
          </ScrollView>
        )
      },
      // ... other steps would be similar with glass morphism styling
    ];

    return steps[currentStep - 1]?.content || <View />;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.kycContainer, { paddingBottom: keyboardHeight > 0 ? keyboardHeight - 80 : 0 }]}
      >
        <SafeAreaView style={styles.kycSafeArea}>
          <ExpoBlurView intensity={95} style={styles.kycHeader}>
            <TouchableOpacity onPress={onBackToLogin} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <View style={styles.kycHeaderContent}>
              <Text style={styles.kycTitle}>Account Registration</Text>
              <Text style={styles.kycSubtitle}>Step {currentStep} of 5</Text>
            </View>
          </ExpoBlurView>
          
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressIndicator, { width: `${(currentStep / 5) * 100}%` }]} />
            </View>
          </View>

          <View style={styles.kycContentContainer}>
            <GlassCard style={styles.kycCard}>
              <Text style={styles.stepTitle}>
                {['Personal Information', 'Contact Details', 'Identification', 'Employment', 'Security'][currentStep - 1]}
              </Text>
              {renderStep()}
            </GlassCard>
          </View>

          <ExpoBlurView intensity={95} style={styles.kycFooter}>
            <View style={styles.kycFooterContent}>
              {currentStep > 1 && (
                <GlassButton
                  title="Back"
                  variant="secondary"
                  onPress={() => setCurrentStep(currentStep - 1)}
                  style={styles.backStepButton}
                />
              )}
              
              <GlassButton
                title={currentStep === 5 ? 'Create Account' : 'Next'}
                onPress={handleNext}
                loading={loading}
                style={[styles.nextButton, currentStep === 1 && styles.nextButtonFull]}
              />
            </View>
          </ExpoBlurView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
};

// Enhanced Credit Card Component with Apple Pay
const CreditCardCarousel: React.FC<{ 
  paymentMethods: PaymentMethod[]; 
  onSelectMethod: (method: PaymentMethod | 'apple_pay') => void;
  selectedMethod: PaymentMethod | 'apple_pay' | null;
}> = ({ paymentMethods, onSelectMethod, selectedMethod }) => {
  const [applePayAvailable, setApplePayAvailable] = useState<boolean>(false);

  useEffect(() => {
    checkApplePayAvailability();
  }, []);

  const checkApplePayAvailability = async () => {
    try {
      const isAvailable = await ApplePay.isAvailableAsync();
      setApplePayAvailable(isAvailable);
    } catch (error) {
      setApplePayAvailable(false);
    }
  };

  const renderCard = ({ item }: { item: PaymentMethod | 'apple_pay' }): JSX.Element => {
    if (item === 'apple_pay') {
      return (
        <TouchableOpacity 
          style={[
            styles.paymentCard,
            selectedMethod === 'apple_pay' && styles.paymentCardSelected
          ]} 
          onPress={() => onSelectMethod('apple_pay')}
        >
          <ExpoBlurView intensity={40} style={styles.applePayCard}>
            <View style={styles.applePayContent}>
              <Ionicons name="logo-apple" size={40} color="white" />
              <Text style={styles.applePayText}>Apple Pay</Text>
            </View>
          </ExpoBlurView>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity 
        style={[
          styles.paymentCard,
          selectedMethod === item && styles.paymentCardSelected
        ]} 
        onPress={() => onSelectMethod(item)}
      >
        <ExpoBlurView intensity={40} style={styles.creditCard}>
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
        </ExpoBlurView>
      </TouchableOpacity>
    );
  };

  const allPaymentMethods = applePayAvailable ? ['apple_pay' as const, ...paymentMethods] : paymentMethods;

  return (
    <View style={styles.carouselContainer}>
      <Text style={styles.carouselTitle}>Select Payment Method</Text>
      <FlatList
        data={allPaymentMethods}
        renderItem={renderCard as any}
        keyExtractor={(item) => typeof item === 'string' ? item : item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={width * 0.8 + 20}
        decelerationRate="fast"
        contentContainerStyle={styles.carouselContent}
      />
    </View>
  );
};

// Main App Component with improved navigation
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
    return (
      <AuthScreen 
        onAuthSuccess={handleAuthSuccess}
        onBackToWelcome={() => setCurrentScreen('welcome')}
      />
    );
  }

  if (currentScreen === 'dashboard' && user) {
    return <DashboardScreen user={user} />;
  }

  return null;
};

// iOS Glass Morphism Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  // Welcome Screen Styles
  welcomeBackground: {
    flex: 1,
    backgroundColor: `linear-gradient(135deg, ${colors.primary}22, ${colors.success}22)`,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  welcomeContent: {
    width: '100%',
    alignItems: 'center',
  },
  welcomeCard: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 32,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
  },
  featureText: {
    fontSize: 16,
    color: colors.textPrimary,
    marginLeft: 12,
    fontWeight: '600',
  },
  getStartedButton: {
    width: '100%',
  },

  // Glass Morphism Components
  glassCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glassBackground,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
  },
  glassButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  glassButtonPrimary: {
    backgroundColor: colors.primary,
  },
  glassButtonSecondary: {
    backgroundColor: colors.secondary,
  },
  glassButtonSuccess: {
    backgroundColor: colors.success,
  },
  glassButtonDanger: {
    backgroundColor: colors.danger,
  },
  glassButtonDisabled: {
    opacity: 0.5,
  },
  glassButtonBlur: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  glassButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  glassInput: {
    backgroundColor: colors.glassBackground,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
  },

  // KYC Screen Styles
  kycContainer: {
    flex: 1,
  },
  kycSafeArea: {
    flex: 1,
  },
  kycHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  kycHeaderContent: {
    flex: 1,
    alignItems: 'center',
    marginRight: 40,
  },
  kycTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  kycSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  progressBarContainer: {
    padding: 20,
    paddingBottom: 0,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressIndicator: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  kycContentContainer: {
    flex: 1,
    padding: 20,
  },
  kycCard: {
    flex: 1,
    padding: 24,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 24,
    textAlign: 'center',
  },
  stepContent: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  glassOption: {
    borderRadius: 12,
    marginRight: 12,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  glassOptionSelected: {
    borderColor: colors.primary,
  },
  glassOptionBlur: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  glassOptionText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  glassOptionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  imagePickerButton: {
    alignItems: 'center',
    marginVertical: 20,
  },
  imagePickerCard: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  imagePlaceholder: {
    alignItems: 'center',
  },
  imagePickerText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  kycFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  kycFooterContent: {
    flexDirection: 'row',
    gap: 12,
  },
  backStepButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
  nextButtonFull: {
    flex: 1,
  },

  // Payment Card Styles
  carouselContainer: {
    marginVertical: 24,
  },
  carouselTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  carouselContent: {
    paddingHorizontal: 20,
  },
  paymentCard: {
    width: width * 0.8,
    height: 200,
    marginHorizontal: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },
  paymentCardSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  creditCard: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
    backgroundColor: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
  },
  applePayCard: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  applePayContent: {
    alignItems: 'center',
  },
  applePayText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBrand: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  cardCvv: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  defaultBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  defaultBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
});

export default App;