import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useThemeContext } from '../theme/ThemeContext';
import type { ThemePreference } from '../store/themeStore';
import { Card } from '../components';

const APPEARANCE_OPTIONS: { value: ThemePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

export default function SettingsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { colors, spacing, radius } = theme;
  const { preference, setThemePreference } = useThemeContext();

  const { typography } = theme;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { padding: spacing.md, paddingTop: insets.top + spacing.xs }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { marginBottom: spacing.sm }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={[styles.backButton, { padding: spacing.xs }]}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { ...typography.h1, color: colors.text }]}>Settings</Text>
      </View>

      <Card style={[styles.section, { padding: spacing.sm, marginTop: spacing.sm }]}>
        <Text style={[styles.sectionTitle, { ...typography.body, fontWeight: '700', color: colors.textSecondary }]}>
          Appearance
        </Text>
        <Text style={[styles.sectionSubtitle, { ...typography.bodySmall, color: colors.textMuted, marginTop: spacing.xxs }]}>
          Choose light, dark, or match your device
        </Text>
        <View style={[styles.options, { marginTop: spacing.sm }]}>
          {APPEARANCE_OPTIONS.map((opt) => {
            const isSelected = preference === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setThemePreference(opt.value)}
                activeOpacity={0.7}
                style={[
                  styles.optionRow,
                  {
                    backgroundColor: isSelected ? colors.primaryMuted : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                    borderRadius: radius.md,
                    padding: spacing.sm,
                    marginBottom: spacing.xs,
                  },
                ]}
              >
                <Ionicons
                  name={opt.icon}
                  size={22}
                  color={isSelected ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.optionLabel,
                    {
                      color: isSelected ? colors.primary : colors.text,
                      fontWeight: isSelected ? '700' : '500',
                      marginLeft: spacing.sm,
                    },
                  ]}
                >
                  {opt.label}
                </Text>
                {isSelected && (
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color={colors.primary}
                    style={styles.check}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      <Text style={[styles.subtitle, { ...typography.bodySmall, color: colors.textSecondary, marginTop: spacing.lg }]}>
        Club and app settings (admin)
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 40 }, // safe area for tab bar
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 8,
  },
  title: {},
  section: {},
  sectionTitle: {},
  sectionSubtitle: {},
  options: {},
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  optionLabel: { flex: 1 },
  check: { marginLeft: 8 },
  subtitle: {},
});
