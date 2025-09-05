import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const { width, height } = Dimensions.get('window');
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

const WelcomeScreen: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<'welcome' | 'login' | 'register'>('welcome');
  const [user, setUser] = useState<User | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Login form state
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  });

  // Registration form state
  const [registerStep, setRegisterStep] = useState(1);
  const [registerForm, setRegisterForm] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    date_of_birth: '',
    nationality: '',
    gender: 'male',
    email: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state_province: '',
    postal_code: '',
    country: '',
    id_type: 'passport',
    id_number: '',
    id_expiry_date: '',
    id_issuing_country: '',
    occupation: '',
    employer_name: '',
    annual_income_range: 'under_25k',
    source_of_funds: 'salary',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    checkAuthStatus();
    loadCountries();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          router.replace('/(tabs)');
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    }
  };

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

  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginForm),
      });

      const data = await response.json();

      if (response.ok) {
        await AsyncStorage.setItem('authToken', data.access_token);
        router.replace('/(tabs)');
      } else {
        Alert.alert('Login Failed', data.detail || 'Invalid credentials');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!registerForm.email || !registerForm.password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const kyc_data = { ...registerForm };
      delete kyc_data.password;
      delete kyc_data.confirmPassword;

      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kyc_data,
          password: registerForm.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        await AsyncStorage.setItem('authToken', data.access_token);
        Alert.alert('Success', 'Registration successful! Your KYC verification is pending.', [
          { text: 'OK', onPress: () => router.replace('/(tabs)') }
        ]);
      } else {
        Alert.alert('Registration Failed', data.detail || 'Registration failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderWelcomeScreen = () => (
    <LinearGradient
      colors={['#007AFF', '#0051D5', '#FF6B35']}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <ScrollView contentContainerStyle={styles.welcomeContainer}>
        <View style={styles.logoContainer}>
          <BlurView intensity={30} style={styles.logoBlur}>
            <Ionicons name="cash" size={60} color="white" />
            <Text style={styles.logoText}>CipCash</Text>
            <Text style={styles.tagline}>Send Money to Africa</Text>
          </BlurView>
        </View>

        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>Send money to 24 African countries</Text>
          <Text style={styles.featuresSubtitle}>Fast • Secure • Reliable</Text>

          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons name="flash" size={24} color="#FFD700" />
              <Text style={styles.featureText}>Instant Transfers</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="shield-checkmark" size={24} color="#FFD700" />
              <Text style={styles.featureText}>KYC Compliant</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="card" size={24} color="#FFD700" />
              <Text style={styles.featureText}>Multiple Payment Options</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="globe" size={24} color="#FFD700" />
              <Text style={styles.featureText}>24 Countries Supported</Text>
            </View>
          </View>
        </View>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setCurrentScreen('register')}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setCurrentScreen('login')}
          >
            <Text style={styles.secondaryButtonText}>I have an account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );

  const renderLoginScreen = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <LinearGradient
        colors={['#007AFF', '#0051D5']}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.formContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentScreen('welcome')}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>

          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Welcome Back</Text>
            <Text style={styles.formSubtitle}>Sign in to continue</Text>
          </View>

          <BlurView intensity={20} style={styles.formBlur}>
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={loginForm.email}
                  onChangeText={(text) => setLoginForm({ ...loginForm, email: text })}
                  placeholder="Enter your email"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                  style={styles.input}
                  value={loginForm.password}
                  onChangeText={(text) => setLoginForm({ ...loginForm, password: text })}
                  placeholder="Enter your password"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                onPress={handleLogin}
                disabled={isLoading}
              >
                <Text style={styles.submitButtonText}>
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );

  const renderRegisterScreen = () => {
    const totalSteps = 5;
    const progress = (registerStep / totalSteps) * 100;

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <LinearGradient
          colors={['#007AFF', '#0051D5']}
          style={styles.gradient}
        >
          <ScrollView contentContainerStyle={styles.formContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                if (registerStep > 1) {
                  setRegisterStep(registerStep - 1);
                } else {
                  setCurrentScreen('welcome');
                }
              }}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>

            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Create Account</Text>
              <Text style={styles.formSubtitle}>Step {registerStep} of {totalSteps}</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
            </View>

            <BlurView intensity={20} style={styles.formBlur}>
              <View style={styles.form}>
                {renderRegisterStep()}
              </View>
            </BlurView>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    );
  };

  const renderRegisterStep = () => {
    switch (registerStep) {
      case 1:
        return (
          <View>
            <Text style={styles.stepTitle}>Personal Information</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>First Name *</Text>
              <TextInput
                style={styles.input}
                value={registerForm.first_name}
                onChangeText={(text) => setRegisterForm({ ...registerForm, first_name: text })}
                placeholder="Enter first name"
                placeholderTextColor="rgba(255,255,255,0.6)"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Last Name *</Text>
              <TextInput
                style={styles.input}
                value={registerForm.last_name}
                onChangeText={(text) => setRegisterForm({ ...registerForm, last_name: text })}
                placeholder="Enter last name"
                placeholderTextColor="rgba(255,255,255,0.6)"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Date of Birth *</Text>
              <TextInput
                style={styles.input}
                value={registerForm.date_of_birth}
                onChangeText={(text) => setRegisterForm({ ...registerForm, date_of_birth: text })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="rgba(255,255,255,0.6)"
              />
            </View>
            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => setRegisterStep(2)}
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        );
      case 2:
        return (
          <View>
            <Text style={styles.stepTitle}>Contact Information</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email *</Text>
              <TextInput
                style={styles.input}
                value={registerForm.email}
                onChangeText={(text) => setRegisterForm({ ...registerForm, email: text })}
                placeholder="Enter email"
                placeholderTextColor="rgba(255,255,255,0.6)"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone *</Text>
              <TextInput
                style={styles.input}
                value={registerForm.phone}
                onChangeText={(text) => setRegisterForm({ ...registerForm, phone: text })}
                placeholder="Enter phone number"
                placeholderTextColor="rgba(255,255,255,0.6)"
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Address *</Text>
              <TextInput
                style={styles.input}
                value={registerForm.address_line1}
                onChangeText={(text) => setRegisterForm({ ...registerForm, address_line1: text })}
                placeholder="Enter address"
                placeholderTextColor="rgba(255,255,255,0.6)"
              />
            </View>
            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => setRegisterStep(3)}
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        );
      case 3:
        return (
          <View>
            <Text style={styles.stepTitle}>Identification</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ID Type *</Text>
              <View style={styles.pickerContainer}>
                <TouchableOpacity
                  style={[styles.pickerOption, registerForm.id_type === 'passport' && styles.pickerOptionSelected]}
                  onPress={() => setRegisterForm({ ...registerForm, id_type: 'passport' })}
                >
                  <Text style={styles.pickerOptionText}>Passport</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pickerOption, registerForm.id_type === 'national_id' && styles.pickerOptionSelected]}
                  onPress={() => setRegisterForm({ ...registerForm, id_type: 'national_id' })}
                >
                  <Text style={styles.pickerOptionText}>National ID</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ID Number *</Text>
              <TextInput
                style={styles.input}
                value={registerForm.id_number}
                onChangeText={(text) => setRegisterForm({ ...registerForm, id_number: text })}
                placeholder="Enter ID number"
                placeholderTextColor="rgba(255,255,255,0.6)"
              />
            </View>
            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => setRegisterStep(4)}
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        );
      case 4:
        return (
          <View>
            <Text style={styles.stepTitle}>Employment & Income</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Occupation *</Text>
              <TextInput
                style={styles.input}
                value={registerForm.occupation}
                onChangeText={(text) => setRegisterForm({ ...registerForm, occupation: text })}
                placeholder="Enter occupation"
                placeholderTextColor="rgba(255,255,255,0.6)"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Annual Income Range *</Text>
              <View style={styles.pickerContainer}>
                <TouchableOpacity
                  style={[styles.pickerOption, registerForm.annual_income_range === 'under_25k' && styles.pickerOptionSelected]}
                  onPress={() => setRegisterForm({ ...registerForm, annual_income_range: 'under_25k' })}
                >
                  <Text style={styles.pickerOptionText}>Under $25k</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pickerOption, registerForm.annual_income_range === '25k_50k' && styles.pickerOptionSelected]}
                  onPress={() => setRegisterForm({ ...registerForm, annual_income_range: '25k_50k' })}
                >
                  <Text style={styles.pickerOptionText}>$25k - $50k</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => setRegisterStep(5)}
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        );
      case 5:
        return (
          <View>
            <Text style={styles.stepTitle}>Create Password</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password *</Text>
              <TextInput
                style={styles.input}
                value={registerForm.password}
                onChangeText={(text) => setRegisterForm({ ...registerForm, password: text })}
                placeholder="Enter password"
                placeholderTextColor="rgba(255,255,255,0.6)"
                secureTextEntry
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm Password *</Text>
              <TextInput
                style={styles.input}
                value={registerForm.confirmPassword}
                onChangeText={(text) => setRegisterForm({ ...registerForm, confirmPassword: text })}
                placeholder="Confirm password"
                placeholderTextColor="rgba(255,255,255,0.6)"
                secureTextEntry
              />
            </View>
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              <Text style={styles.submitButtonText}>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  if (currentScreen === 'welcome') {
    return renderWelcomeScreen();
  } else if (currentScreen === 'login') {
    return renderLoginScreen();
  } else {
    return renderRegisterScreen();
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  welcomeContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoBlur: {
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 10,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 5,
    fontWeight: '500',
  },
  featuresContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  featuresTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  featuresSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 30,
  },
  featuresList: {
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  featureText: {
    fontSize: 16,
    color: 'white',
    marginLeft: 16,
    fontWeight: '500',
  },
  buttonsContainer: {
    width: '100%',
    gap: 16,
  },
  primaryButton: {
    backgroundColor: 'white',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#007AFF',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  formContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 32,
    zIndex: 10,
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  formTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 20,
  },
  progressBar: {
    width: 200,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'white',
  },
  formBlur: {
    borderRadius: 20,
    overflow: 'hidden',
    padding: 30,
  },
  form: {
    width: '100%',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: 'white',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: 'white',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  pickerContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  pickerOption: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  pickerOptionSelected: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderColor: 'white',
  },
  pickerOptionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  nextButton: {
    backgroundColor: 'white',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  nextButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: 'white',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WelcomeScreen;