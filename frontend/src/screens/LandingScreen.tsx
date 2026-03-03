import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { spacing, typography, radius, shadows } from '../theme/tokens';

const GRADIENT_COLORS_LIGHT = ['#6366F1', '#7C3AED', '#8B5CF6'];
const GRADIENT_COLORS_DARK = ['#312E81', '#4C1D95', '#5B21B6'];

type LandingScreenProps = {
  onSignIn: () => void;
  onGetStarted: () => void;
};

export default function LandingScreen({ onSignIn, onGetStarted }: LandingScreenProps) {
  const theme = useTheme();
  const { colors, spacing: themeSpacing } = theme;
  const isDark = theme.isDark;
  const gradientColors = isDark ? GRADIENT_COLORS_DARK : GRADIENT_COLORS_LIGHT;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <LinearGradient
        colors={gradientColors}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={[styles.content, { paddingHorizontal: themeSpacing.lg }]}>
        <View style={styles.hero}>
          <View style={[styles.logoCircle, shadows.lg]}>
            <LinearGradient
              colors={['#818CF8', '#A78BFA']}
              style={styles.logoGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="barbell" size={48} color="#FFFFFF" />
            </LinearGradient>
          </View>
          <Text style={styles.title}>FitClub</Text>
          <Text style={styles.tagline}>
            Compete with your club. Log workouts. Climb the leaderboard.
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: '#FFFFFF' }]}
            onPress={onGetStarted}
            activeOpacity={0.85}
          >
            <Text style={[styles.primaryButtonText, { color: colors.primary }]}>Get started</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: 'rgba(255,255,255,0.8)', borderWidth: 2 }]}
            onPress={onSignIn}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryButtonText}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: spacing.xxl * 2,
    paddingBottom: spacing.xxl,
  },
  hero: {
    alignItems: 'center',
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...(Platform.OS !== 'web' && {
      shadowColor: '#6366F1',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 10,
    }),
  },
  logoGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.h1,
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: spacing.sm,
    textAlign: 'center',
    ...(Platform.OS === 'web' && {
      textShadow: '0 2px 4px rgba(0,0,0,0.2)',
    }),
  },
  tagline: {
    ...typography.body,
    fontSize: 17,
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  actions: {
    gap: spacing.sm,
  },
  primaryButton: {
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  primaryButtonText: {
    ...typography.body,
    fontWeight: '700',
    fontSize: 17,
  },
  secondaryButton: {
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  secondaryButtonText: {
    ...typography.body,
    fontWeight: '600',
    fontSize: 17,
    color: '#FFFFFF',
  },
});
