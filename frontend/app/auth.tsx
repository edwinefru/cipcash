import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface User {
  id: string;
  kyc_data: {
    first_name: string;
    last_name: string;
    email: string;
  };
  is_kyc_verified: boolean;
}

const AuthScreen: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
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
          router.replace('/(tabs)');
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={['#007AFF', '#0051D5', '#FF6B35']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
              <View style={styles.logoContainer}>
                <Ionicons name="cash" size={80} color="white" />
                <Text style={styles.logoText}>CipCash</Text>
                <Text style={styles.tagline}>Your Gateway to Africa</Text>
              </View>

              <BlurView intensity={30} style={styles.authCard}>
                <View style={styles.authHeader}>
                  <Text style={styles.authTitle}>
                    {isLogin ? 'Welcome Back' : 'Create Account'}
                  </Text>
                  <Text style={styles.authSubtitle}>
                    {isLogin ? 'Sign in to continue' : 'Join thousands sending money to Africa'}
                  </Text>
                </View>

                <View style={styles.formContainer}>
                  <View style={styles.inputGroup}>
                    <Ionicons name="mail" size={20} color="rgba(255,255,255,0.7)" />
                    <TextInput
                      style={styles.input}
                      placeholder="Email"
                      placeholderTextColor="rgba(255,255,255,0.7)"
                      value={loginData.email}
                      onChangeText={(text) => setLoginData({ ...loginData, email: text })}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Ionicons name="lock-closed" size={20} color="rgba(255,255,255,0.7)" />
                    <TextInput
                      style={styles.input}
                      placeholder="Password"
                      placeholderTextColor="rgba(255,255,255,0.7)"
                      value={loginData.password}
                      onChangeText={(text) => setLoginData({ ...loginData, password: text })}
                      secureTextEntry
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.authButton, loading && styles.authButtonDisabled]}
                    onPress={handleLogin}
                    disabled={loading}
                  >
                    <BlurView intensity={40} style={styles.authButtonContent}>
                      {loading ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <>
                          <Text style={styles.authButtonText}>
                            {isLogin ? 'Sign In' : 'Create Account'}
                          </Text>
                          <Ionicons name="arrow-forward" size={20} color="white" />
                        </>
                      )}
                    </BlurView>
                  </TouchableOpacity>

                  {isLogin && (
                    <TouchableOpacity style={styles.forgotPasswordButton}>
                      <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={styles.socialButtons}>
                  <TouchableOpacity style={styles.socialButton}>
                    <BlurView intensity={20} style={styles.socialButtonContent}>
                      <Ionicons name="logo-google" size={20} color="white" />
                      <Text style={styles.socialButtonText}>Google</Text>
                    </BlurView>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.socialButton}>
                    <BlurView intensity={20} style={styles.socialButtonContent}>
                      <Ionicons name="logo-apple" size={20} color="white" />
                      <Text style={styles.socialButtonText}>Apple</Text>
                    </BlurView>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.switchModeButton}
                  onPress={() => setIsLogin(!isLogin)}
                >
                  <Text style={styles.switchModeText}>
                    {isLogin
                      ? "Don't have an account? Sign Up"
                      : 'Already have an account? Sign In'}
                  </Text>
                </TouchableOpacity>
              </BlurView>

              <View style={styles.trustIndicators}>
                <View style={styles.trustItem}>
                  <Ionicons name="shield-checkmark" size={16} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.trustText}>Secure & Regulated</Text>
                </View>
                <View style={styles.trustItem}>
                  <Ionicons name="globe" size={16} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.trustText}>24 Countries</Text>
                </View>
                <View style={styles.trustItem}>
                  <Ionicons name="time" size={16} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.trustText}>24/7 Support</Text>
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 16,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
  },
  authCard: {
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    marginBottom: 32,
  },
  authHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 22,
  },
  formContainer: {
    marginBottom: 24,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: 'white',
    paddingVertical: 16,
    paddingLeft: 12,
  },
  authButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 16,
  },
  authButtonDisabled: {
    opacity: 0.7,
  },
  authButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 8,
  },
  authButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  forgotPasswordButton: {
    alignItems: 'center',
  },
  forgotPasswordText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dividerText: {
    color: 'rgba(255,255,255,0.6)',
    paddingHorizontal: 16,
    fontSize: 14,
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  socialButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  socialButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
  },
  switchModeButton: {
    alignItems: 'center',
  },
  switchModeText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  trustIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
});

export default AuthScreen;