import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const SplashScreen: React.FC = () => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.5));

  useEffect(() => {
    const animateIn = () => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    };

    const timer = setTimeout(() => {
      animateIn();
    }, 500);

    // Auto-navigate after animation
    const navigateTimer = setTimeout(() => {
      // Use simple navigation instead of router to avoid expo-router issues
      if (typeof window !== 'undefined') {
        window.location.href = '/welcome';
      }
    }, 4000);

    return () => {
      clearTimeout(timer);
      clearTimeout(navigateTimer);
    };
  }, [fadeAnim, scaleAnim]);

  return (
    <LinearGradient
      colors={['#007AFF', '#0051D5', '#FF6B35']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar barStyle="light-content" />
      
      {/* Animated Background Elements */}
      <View style={styles.backgroundElements}>
        {[...Array(6)].map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.floatingElement,
              {
                left: `${Math.random() * 80}%`,
                top: `${Math.random() * 80}%`,
                opacity: fadeAnim,
                transform: [
                  {
                    scale: scaleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1 + Math.random() * 0.5],
                    }),
                  },
                ],
              },
            ]}
          >
            <Ionicons
              name={['cash', 'globe', 'card', 'send', 'location', 'people'][i]}
              size={24 + Math.random() * 16}
              color="rgba(255, 255, 255, 0.3)"
            />
          </Animated.View>
        ))}
      </View>

      {/* World Map Visualization */}
      <Animated.View
        style={[
          styles.mapContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <BlurView intensity={20} style={styles.mapBlur}>
          <View style={styles.mapContent}>
            <Text style={styles.mapEmoji}>🌍</Text>
            <View style={styles.arrowsContainer}>
              <Text style={styles.arrow}>💸</Text>
              <Text style={styles.arrow}>→</Text>
              <Text style={styles.arrow}>🏦</Text>
            </View>
          </View>
        </BlurView>
      </Animated.View>

      {/* Main Logo and Content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <BlurView intensity={30} style={styles.logoContainer}>
          <View style={styles.logoContent}>
            <Ionicons name="cash" size={60} color="white" />
            <Text style={styles.title}>CipCash</Text>
            <Text style={styles.subtitle}>Send Money to Africa</Text>
            <View style={styles.taglineContainer}>
              <View style={styles.tagline}>
                <Ionicons name="flash" size={16} color="#FFD700" />
                <Text style={styles.taglineText}>Fast</Text>
              </View>
              <View style={styles.tagline}>
                <Ionicons name="shield-checkmark" size={16} color="#FFD700" />
                <Text style={styles.taglineText}>Secure</Text>
              </View>
              <View style={styles.tagline}>
                <Ionicons name="globe" size={16} color="#FFD700" />
                <Text style={styles.taglineText}>24 Countries</Text>
              </View>
            </View>
          </View>
        </BlurView>
      </Animated.View>

      {/* Loading Animation */}
      <Animated.View
        style={[
          styles.loadingContainer,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <View style={styles.loadingDots}>
          {[0, 1, 2].map((index) => (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  opacity: fadeAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.3, 1, 0.3],
                  }),
                  transform: [
                    {
                      scale: scaleAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1.2],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>
        <Text style={styles.loadingText}>Initializing...</Text>
      </Animated.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundElements: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  floatingElement: {
    position: 'absolute',
  },
  mapContainer: {
    position: 'absolute',
    top: height * 0.15,
    alignItems: 'center',
  },
  mapBlur: {
    borderRadius: 20,
    padding: 20,
  },
  mapContent: {
    alignItems: 'center',
  },
  mapEmoji: {
    fontSize: 80,
    marginBottom: 10,
  },
  arrowsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  arrow: {
    fontSize: 24,
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  logoContent: {
    padding: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 20,
    letterSpacing: 3,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  taglineContainer: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 15,
  },
  tagline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  taglineText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    position: 'absolute',
    bottom: height * 0.15,
    alignItems: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 15,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default SplashScreen;