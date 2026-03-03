import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export default function AnalyticsScreen() {
  const theme = useTheme();
  const { colors, spacing, typography } = theme;
  return (
    <View style={[styles.container, { backgroundColor: colors.background, padding: spacing.md, justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={[styles.title, { ...typography.h1, color: colors.text }]}>Analytics</Text>
      <Text style={[styles.subtitle, { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs }]}>
        Club and round analytics (admin)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: {},
  subtitle: {},
});
