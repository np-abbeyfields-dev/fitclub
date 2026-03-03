import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { clubService } from '../services/clubService';
import { useTheme } from '../theme/ThemeContext';
import { Button, Input } from '../components';

export default function JoinClubScreen() {
  const navigation = useNavigation();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  const { colors, spacing, typography } = theme;

  const handleJoin = async () => {
    const code = inviteCode.trim().toUpperCase();
    if (!code) {
      Alert.alert('Oops', 'Enter the invite code from your club.');
      return;
    }
    setLoading(true);
    try {
      await clubService.join(code);
      Alert.alert("You're in! 🎉", 'You joined the club.', [{ text: 'OK', onPress: () => (navigation as any).navigate('Home') }]);
    } catch (e: any) {
      Alert.alert('Could not join', e?.message || 'Check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, padding: spacing.md, paddingTop: spacing.md }]}>
      <View style={[styles.iconWrap, { marginBottom: spacing.sm }]}>
        <Ionicons name="people" size={48} color={colors.primary} />
      </View>
      <Text style={[styles.title, { ...typography.h1, color: colors.text, marginBottom: spacing.xs }]}>Join a club</Text>
      <Text style={[styles.hint, { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md }]}>
        Enter the invite code your admin or friend shared with you.
      </Text>
      <Input
        placeholder="e.g. A1B2C3D4"
        value={inviteCode}
        onChangeText={(t) => setInviteCode(t.toUpperCase())}
        autoCapitalize="characters"
        autoCorrect={false}
        editable={!loading}
        maxLength={12}
        style={{ marginBottom: spacing.sm, letterSpacing: 2, textAlign: 'center' }}
      />
      <Button
        title="Join club"
        onPress={handleJoin}
        loading={loading}
        fullWidth
        icon={<Ionicons name="enter-outline" size={22} color={colors.textInverse} />}
        style={{ marginBottom: spacing.sm }}
      />
      <TouchableOpacity onPress={() => navigation.goBack()} disabled={loading} style={styles.linkWrap}>
        <Text style={[styles.link, { ...typography.body, fontWeight: '600', color: colors.primary }]}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  iconWrap: { alignItems: 'center' },
  title: {},
  hint: {},
  linkWrap: { alignSelf: 'center' },
  link: {},
});
