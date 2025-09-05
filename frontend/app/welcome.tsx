import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const WelcomeScreen: React.FC = () => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={['#007AFF', '#0051D5', '#FF6B35']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <BlurView intensity={30} style={styles.heroCard}>
              <View style={styles.logoContainer}>
                <Ionicons name="cash" size={60} color="white" />
                <Text style={styles.appName}>CipCash</Text>
                <Text style={styles.tagline}>Your Gateway to Africa</Text>
              </View>

              <Text style={styles.heroTitle}>
                Send Money to Africa{'\n'}Instantly & Securely
              </Text>
              
              <Text style={styles.heroSubtitle}>
                Transfer money to 24 African countries with the best exchange rates,
                lowest fees, and fastest delivery times.
              </Text>
            </BlurView>
          </View>

          {/* Features Grid */}
          <View style={styles.featuresGrid}>
            {[
              {
                icon: 'flash',
                title: 'Instant Transfers',
                subtitle: 'Money delivered in minutes',
                color: '#FF6B35',
              },
              {
                icon: 'shield-checkmark',
                title: 'Bank-Level Security',
                subtitle: 'Your money is always safe',
                color: '#34C759',
              },
              {
                icon: 'card',
                title: 'Multiple Payment Options',
                subtitle: 'Cards, Apple Pay, Bank Transfer',
                color: '#007AFF',
              },
              {
                icon: 'globe',
                title: '24 African Countries',
                subtitle: 'Widest network coverage',
                color: '#FF3B30',
              },
            ].map((feature, index) => (
              <BlurView key={index} intensity={20} style={styles.featureCard}>
                <View style={[styles.featureIcon, { backgroundColor: feature.color }]}>
                  <Ionicons name={feature.icon as any} size={24} color="white" />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureSubtitle}>{feature.subtitle}</Text>
              </BlurView>
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push('/auth')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#007AFF', '#0051D5']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="arrow-forward" size={20} color="white" />
                <Text style={styles.primaryButtonText}>Get Started</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                // Show app preview or demo
              }}
              activeOpacity={0.8}
            >
              <BlurView intensity={20} style={styles.secondaryButtonBlur}>
                <Ionicons name="play-circle-outline" size={20} color="white" />
                <Text style={styles.secondaryButtonText}>Watch Demo</Text>
              </BlurView>
            </TouchableOpacity>
          </View>

          {/* Trust Indicators */}
          <BlurView intensity={15} style={styles.trustSection}>
            <Text style={styles.trustTitle}>Trusted by 50,000+ users worldwide</Text>
            <View style={styles.trustIndicators}>
              <View style={styles.trustItem}>
                <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                <Text style={styles.trustText}>Licensed & Regulated</Text>
              </View>
              <View style={styles.trustItem}>
                <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                <Text style={styles.trustText}>ISO 27001 Certified</Text>
              </View>
              <View style={styles.trustItem}>
                <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                <Text style={styles.trustText}>24/7 Support</Text>
              </View>
            </View>
          </BlurView>
        </Animated.View>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  heroSection: {
    marginBottom: 40,
  },
  heroCard: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 8,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 30,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  featureCard: {
    width: (width - 60) / 2,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    marginBottom: 4,
  },
  featureSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 16,
  },
  actionButtons: {
    gap: 16,
    marginBottom: 32,
  },
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  secondaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  secondaryButtonBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
  },
  trustSection: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  trustTitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 12,
    textAlign: 'center',
  },
  trustIndicators: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
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

export default WelcomeScreen;