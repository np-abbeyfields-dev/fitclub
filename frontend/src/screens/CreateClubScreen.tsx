import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Share, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { clubService } from '../services/clubService';
import { useTheme } from '../theme/ThemeContext';
import { Button, Input, Card } from '../components';

export default function CreateClubScreen() {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdClub, setCreatedClub] = useState<{ name: string; inviteCode: string } | null>(null);
  const theme = useTheme();
  const { colors, spacing, radius, typography } = theme;

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Oops', 'Give your club a name.');
      return;
    }
    setLoading(true);
    try {
      const res = await clubService.create(trimmed);
      const club = res.data;
      if (club?.inviteCode) {
        setCreatedClub({ name: club.name, inviteCode: club.inviteCode });
      } else {
        Alert.alert('Success', 'Club created!', [{ text: 'OK', onPress: () => (navigation as any).navigate('Home') }]);
      }
    } catch (e: any) {
      Alert.alert('Could not create club', e?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!createdClub) return;
    const message = `Join my FitClub "${createdClub.name}"! Use invite code: ${createdClub.inviteCode}`;
    try {
      await Share.share({ message, title: 'Join my FitClub' });
    } catch {
      // User cancelled or share not available
    }
  };

  const handleDone = () => {
    (navigation as any).navigate('Home');
  };

  if (createdClub) {
    return (
      <ScrollView
        contentContainerStyle={[
          styles.successContainer,
          {
            padding: spacing.md,
            paddingTop: spacing.md,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Card style={[styles.successCard, { padding: spacing.lg, width: '100%', maxWidth: 400, alignItems: 'center' }]}>
          <View style={{ marginBottom: spacing.sm }}>
            <Ionicons name="checkmark-circle" size={56} color={colors.success} />
          </View>
          <Text style={[styles.successTitle, { ...typography.h2, color: colors.success, marginBottom: spacing.xxs }]}>Club created!</Text>
          <Text style={[styles.successName, { ...typography.h3, color: colors.text, marginBottom: spacing.md }]}>{createdClub.name}</Text>
          <Text style={[styles.inviteLabel, { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.xs }]}>
            Invite code — share this so others can join
          </Text>
          <View
            style={[
              styles.codeBox,
              {
                backgroundColor: colors.borderLight,
                borderRadius: radius.md,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                marginBottom: spacing.md,
              },
            ]}
          >
            <Text style={[styles.codeText, { ...typography.h2, color: colors.text, letterSpacing: 4 }]} selectable>
              {createdClub.inviteCode}
            </Text>
          </View>
          <Button
            title="Share invite code"
            onPress={handleShare}
            fullWidth
            icon={<Ionicons name="share-outline" size={22} color={colors.textInverse} />}
            style={{ marginBottom: spacing.sm }}
          />
          <TouchableOpacity onPress={handleDone} style={{ paddingVertical: spacing.sm, paddingHorizontal: spacing.md }} activeOpacity={0.7}>
            <Text style={[styles.doneButtonText, { ...typography.body, fontWeight: '600', color: colors.textSecondary }]}>Done</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        {
          flexGrow: 1,
          padding: spacing.md,
          paddingTop: spacing.md,
          backgroundColor: colors.background,
        },
      ]}
    >
      <Text style={[styles.title, { ...typography.h1, color: colors.text, marginBottom: spacing.xs }]}>Create a club</Text>
      <Text style={[styles.hint, { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md }]}>
        Name your club (e.g. "Acme Fitness" or "Campus Runners"). You'll get an invite code to share.
      </Text>
      <Input
        placeholder="Club name"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        autoCorrect={false}
        editable={!loading}
        style={{ marginBottom: spacing.md }}
      />
      <Button
        title="Create club"
        onPress={handleCreate}
        loading={loading}
        fullWidth
        icon={<Ionicons name="add-circle-outline" size={22} color={colors.textInverse} />}
        style={{ marginBottom: spacing.sm }}
      />
      <TouchableOpacity onPress={() => navigation.goBack()} disabled={loading} style={styles.linkWrap}>
        <Text style={[styles.link, { ...typography.body, fontWeight: '600', color: colors.primary }]}>Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {},
  title: {},
  hint: {},
  linkWrap: { alignSelf: 'center' },
  link: {},
  successContainer: { alignItems: 'center' },
  successCard: {},
  successTitle: {},
  successName: {},
  inviteLabel: {},
  codeBox: { width: '100%', alignItems: 'center' },
  codeText: {},
  doneButtonText: {},
});
