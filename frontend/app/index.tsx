import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
  Image,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const SplashScreen: React.FC = () => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.5));
  const [rotateAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Animate logo entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous rotation animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      })
    ).start();

    // Navigate to main app after splash
    const timer = setTimeout(() => {
      router.replace('/welcome');
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#007AFF" translucent />
      <LinearGradient
        colors={['#007AFF', '#0051D5', '#FF6B35']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* World Map Background with rotating globe effect */}
            <Animated.View
              style={[
                styles.globeContainer,
                {
                  transform: [{ rotate: spin }],
                },
              ]}
            >
              <Ionicons name="globe-outline" size={150} color="rgba(255,255,255,0.2)" />
            </Animated.View>

            {/* Money flow arrows */}
            <View style={styles.arrowsContainer}>
              <Ionicons name="arrow-forward" size={24} color="white" style={[styles.arrow, styles.arrow1]} />
              <Ionicons name="arrow-forward" size={20} color="white" style={[styles.arrow, styles.arrow2]} />
              <Ionicons name="arrow-forward" size={18} color="white" style={[styles.arrow, styles.arrow3]} />
            </View>

            {/* Main Logo */}
            <BlurView intensity={30} style={styles.logoBlur}>
              <View style={styles.logo}>
                <Ionicons name="cash" size={60} color="white" />
                <Text style={styles.logoText}>CipCash</Text>
                <Text style={styles.tagline}>Send Money to Africa</Text>
              </View>
            </BlurView>

            {/* Money symbols floating */}
            <View style={styles.moneySymbols}>
              <Text style={[styles.symbol, styles.symbol1]}>$</Text>
              <Text style={[styles.symbol, styles.symbol2]}>€</Text>
              <Text style={[styles.symbol, styles.symbol3]}>£</Text>
              <Text style={[styles.symbol, styles.symbol4]}>¥</Text>
            </View>
          </Animated.View>

          <Animated.View style={[styles.loadingContainer, { opacity: fadeAnim }]}>
            <Text style={styles.loadingText}>Connecting you to Africa...</Text>
            <View style={styles.loadingBar}>
              <Animated.View
                style={[
                  styles.loadingProgress,
                  {
                    width: rotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          </Animated.View>
        </View>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
    position: 'relative',
    width: 300,
    height: 300,
  },
  globeContainer: {
    position: 'absolute',
    top: 0,
    left: 75,
    zIndex: 0,
  },
  arrowsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  arrow: {
    position: 'absolute',
  },
  arrow1: {
    top: 80,
    left: 50,
    opacity: 0.8,
  },
  arrow2: {
    top: 120,
    right: 60,
    opacity: 0.6,
  },
  arrow3: {
    bottom: 100,
    left: 80,
    opacity: 0.7,
  },
  logoBlur: {
    borderRadius: 20,
    overflow: 'hidden',
    padding: 30,
    alignItems: 'center',
    zIndex: 2,
  },
  logo: {
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
  moneySymbols: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  symbol: {
    position: 'absolute',
    fontSize: 20,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: 'bold',
  },
  symbol1: {
    top: 60,
    left: 20,
  },
  symbol2: {
    top: 100,
    right: 30,
  },
  symbol3: {
    bottom: 120,
    left: 30,
  },
  symbol4: {
    bottom: 80,
    right: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    width: '100%',
  },
  loadingText: {
    color: 'white',
    fontSize: 18,
    marginBottom: 20,
    fontWeight: '500',
  },
  loadingBar: {
    width: '80%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingProgress: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 2,
  },
});

export default SplashScreen;