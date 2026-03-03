import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/authService';
import { User } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { Input } from '../components';
import { spacing, typography, radius, shadows } from '../theme/tokens';

const GRADIENT_COLORS_LIGHT = ['#667EEA', '#7B61FF', '#8B5CF6'];
const GRADIENT_COLORS_DARK = ['#0F172A', '#1E293B', '#312E81'];

export default function LoginScreen({
  onRegister,
  onSuccess,
  onBack,
}: {
  onRegister: () => void;
  onSuccess: () => void;
  onBack?: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const login = useAuthStore((s) => s.login);
  const theme = useTheme();
  const { colors } = theme;
  const isDark = theme.isDark;
  const gradientColors = isDark ? GRADIENT_COLORS_DARK : GRADIENT_COLORS_LIGHT;

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMessage('Please enter email and password.');
      return;
    }
    setErrorMessage(null);
    setLoading(true);
    try {
      const res = await authService.login(email.trim(), password);
      if (res.success && res.data) {
        const user: User = res.data.user;
        await login(user, res.data.token);
        onSuccess();
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const cardBg = isDark ? colors.surface : '#FFFFFF';
  const inputBg = isDark ? colors.background : '#FFFFFF';
  const borderColor = (focused: boolean) =>
    focused ? colors.primary : (isDark ? colors.border : '#E5E7EB');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <LinearGradient
        colors={gradientColors}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {onBack ? (
              <TouchableOpacity
                onPress={onBack}
                style={[styles.backButton, { marginBottom: spacing.sm }]}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
            {/* Hero */}
            <View style={styles.hero}>
              <View style={[styles.logoCircle, { shadowColor: colors.primary }]}>
                <LinearGradient
                  colors={[colors.primary, '#8B5CF6']}
                  style={styles.logoGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="barbell" size={40} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <Text style={styles.heroTitle}>Welcome Back!</Text>
              <Text style={styles.heroSubtitle}>Sign in to stay on track</Text>
            </View>

            {/* Form card */}
            <View style={[styles.formCard, { backgroundColor: cardBg }]}>
              <View style={[styles.inputWrap, { backgroundColor: inputBg, borderColor: borderColor(emailFocused), borderWidth: emailFocused ? 2 : 1 }]}>
                <Ionicons name="mail-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                <Input
                  placeholder="Email"
                  value={email}
                  onChangeText={(t) => { setEmail(t); setErrorMessage(null); }}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                  style={[styles.inputField, { backgroundColor: 'transparent', borderWidth: 0 }]}
                />
              </View>
              <View style={[styles.inputWrap, { backgroundColor: inputBg, borderColor: borderColor(passwordFocused), borderWidth: passwordFocused ? 2 : 1 }]}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                <Input
                  placeholder="Password"
                  value={password}
                  onChangeText={(t) => { setPassword(t); setErrorMessage(null); }}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  secureTextEntry
                  editable={!loading}
                  style={[styles.inputField, { backgroundColor: 'transparent', borderWidth: 0 }]}
                />
              </View>

              {errorMessage ? (
                <View style={[styles.errorBox, { backgroundColor: colors.errorMuted }]}>
                  <Ionicons name="alert-circle" size={18} color={colors.error} />
                  <Text style={[styles.errorText, { color: colors.error }]}>{errorMessage}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.9}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Sign In</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={onRegister} disabled={loading}>
                <Text style={[styles.footerLink, { color: isDark ? colors.primary : '#FFFFFF' }]}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboardContainer: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  content: { width: '100%' },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    ...shadows.lg,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logoGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    ...typography.h1,
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: spacing.xs,
    ...(Platform.OS === 'web' && { textShadow: '0 2px 4px rgba(0,0,0,0.2)' }),
  },
  heroSubtitle: {
    ...typography.body,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.95)',
  },
  formCard: {
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadows.lg,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    minHeight: 56,
  },
  inputIcon: { marginRight: spacing.sm },
  inputField: { flex: 1, minHeight: 48, paddingVertical: spacing.xs },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.bodySmall,
    marginLeft: spacing.sm,
    flex: 1,
    fontWeight: '600',
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
    fontSize: 16,
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  footerText: {
    ...typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  footerLink: {
    ...typography.bodySmall,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: spacing.xs,
  },
});
