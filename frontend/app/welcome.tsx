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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

interface Country {
  id: string;
  country_code: string;
  country_name: string;
  currency_code: string;
  currency_name: string;
  flag_emoji: string;
  phone_code: string;
}

const WelcomeScreen: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Login form state
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  });

  // Simple registration form
  const [registerForm, setRegisterForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    loadCountries();
  }, []);

  const loadCountries = async () => {
    try {
      // Mock countries for demo - in production, would call API
      const mockCountries = [
        { id: '1', country_code: 'NG', country_name: 'Nigeria', currency_code: 'NGN', currency_name: 'Nigerian Naira', flag_emoji: '🇳🇬', phone_code: '+234' },
        { id: '2', country_code: 'GH', country_name: 'Ghana', currency_code: 'GHS', currency_name: 'Ghanaian Cedi', flag_emoji: '🇬🇭', phone_code: '+233' },
        { id: '3', country_code: 'KE', country_name: 'Kenya', currency_code: 'KES', currency_name: 'Kenyan Shilling', flag_emoji: '🇰🇪', phone_code: '+254' },
      ];
      setCountries(mockCountries);
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
      // Mock login success for demo
      Alert.alert('Success', 'Login successful! (Demo mode)', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!registerForm.email || !registerForm.password || !registerForm.first_name || !registerForm.last_name) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    
    try {
      // Mock registration success for demo
      Alert.alert('Success', 'Registration successful! (Demo mode)', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Registration failed. Please try again.');
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

  const renderRegisterScreen = () => (
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
            <Text style={styles.formTitle}>Create Account</Text>
            <Text style={styles.formSubtitle}>Join CipCash today</Text>
          </View>

          <BlurView intensity={20} style={styles.formBlur}>
            <View style={styles.form}>
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
          </BlurView>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );

  if (currentScreen === 'login') {
    return renderLoginScreen();
  } else if (currentScreen === 'register') {
    return renderRegisterScreen();
  } else {
    return renderWelcomeScreen();
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
  formBlur: {
    borderRadius: 20,
    overflow: 'hidden',
    padding: 30,
  },
  form: {
    width: '100%',
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