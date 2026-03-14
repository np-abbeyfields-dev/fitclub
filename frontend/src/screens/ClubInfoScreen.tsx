import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Share,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { Card } from '../components';
import { useClub } from '../context/ClubContext';
import { clubService } from '../services/clubService';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'ClubInfo'>;

export default function ClubInfoScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { colors, spacing, radius, typography } = theme;
  const { selectedClub, isAdmin, refreshClubs } = useClub();
  const [club, setClub] = useState<{ name: string; inviteCode?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!selectedClub) {
      setClub(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await clubService.getById(selectedClub.id);
      const d = res.data as { name: string; inviteCode?: string };
      setClub({ name: d?.name ?? selectedClub.name, inviteCode: d?.inviteCode });
    } catch {
      setClub({ name: selectedClub.name });
    } finally {
      setLoading(false);
    }
  }, [selectedClub?.id, selectedClub?.name]);

  useEffect(() => {
    load();
  }, [load]);

  const shareInviteCode = useCallback(async () => {
    if (club?.inviteCode) {
      try {
        await Share.share({
          message: `Join ${club.name} on FitClub! Invite code: ${club.inviteCode}`,
          title: 'Club invite code',
        });
      } catch (_) {}
    }
  }, [club?.inviteCode, club?.name]);

  const goToManageMembers = useCallback(() => {
    navigation.navigate('Members');
  }, [navigation]);

  const startEditName = useCallback(() => {
    if (club?.name) {
      setEditNameValue(club.name);
      setNameError(null);
      setEditingName(true);
    }
  }, [club?.name]);

  const cancelEditName = useCallback(() => {
    setEditingName(false);
    setEditNameValue('');
    setNameError(null);
  }, []);

  const saveClubName = useCallback(async () => {
    const name = editNameValue.trim();
    if (!name) {
      setNameError('Club name is required.');
      return;
    }
    if (!selectedClub) return;
    setNameSaving(true);
    setNameError(null);
    try {
      await clubService.update(selectedClub.id, { name });
      setClub((c) => (c ? { ...c, name } : null));
      setEditingName(false);
      setEditNameValue('');
      await refreshClubs();
    } catch (e) {
      setNameError(e instanceof Error ? e.message : 'Failed to update name');
    } finally {
      setNameSaving(false);
    }
  }, [editNameValue, selectedClub, refreshClubs]);

  const sendInviteByEmail = useCallback(async () => {
    const email = inviteEmail.trim();
    if (!email || !selectedClub) return;
    setInviteSending(true);
    setInviteMessage(null);
    try {
      await clubService.inviteByEmail(selectedClub.id, email);
      setInviteMessage({ type: 'success', text: 'Invite sent.' });
      setInviteEmail('');
    } catch (e) {
      setInviteMessage({ type: 'error', text: e instanceof Error ? e.message : 'Failed to send invite.' });
    } finally {
      setInviteSending(false);
    }
  }, [inviteEmail, selectedClub]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, paddingBottom: spacing.sm, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: spacing.xs }} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[typography.h3, { color: colors.text, fontWeight: '700', flex: 1 }]}>Club info</Text>
      </View>
      {loading ? (
        <View style={[styles.centered, { flex: 1 }]}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : club ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { padding: spacing.md, paddingBottom: spacing.xxxl }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
            View club details and manage settings.
          </Text>
          <View style={{ marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs }}>
              <Text style={[typography.label, { color: colors.textSecondary }]}>Name</Text>
              {isAdmin && !editingName && (
                <TouchableOpacity onPress={startEditName} style={{ padding: spacing.xs }} hitSlop={8}>
                  <Ionicons name="pencil-outline" size={20} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
            {editingName ? (
              <View>
                <TextInput
                  value={editNameValue}
                  onChangeText={setEditNameValue}
                  placeholder="Club name"
                  placeholderTextColor={colors.textMuted}
                  style={[typography.body, { color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm }]}
                  autoFocus
                  editable={!nameSaving}
                />
                {nameError ? (
                  <Text style={[typography.caption, { color: colors.error, marginTop: spacing.xs }]}>{nameError}</Text>
                ) : null}
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                  <TouchableOpacity
                    onPress={cancelEditName}
                    disabled={nameSaving}
                    style={{ paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }}
                  >
                    <Text style={[typography.label, { color: colors.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={saveClubName}
                    disabled={nameSaving}
                    style={{ paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary }}
                  >
                    {nameSaving ? <ActivityIndicator size="small" color={colors.textInverse} /> : <Text style={[typography.label, { color: colors.textInverse }]}>Save</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text style={[typography.h3, { color: colors.text }]}>{club.name}</Text>
            )}
          </View>
          {club.inviteCode != null && (
            <View style={{ marginBottom: spacing.lg }}>
              <Text style={[typography.label, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Invite code</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Text style={[typography.body, { color: colors.text, fontFamily: 'monospace', letterSpacing: 2, flex: 1 }]}>{club.inviteCode}</Text>
                <TouchableOpacity
                  onPress={shareInviteCode}
                  style={[styles.actionBtn, { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary }]}
                >
                  <Ionicons name="share-outline" size={18} color={colors.primary} style={{ marginRight: spacing.xs }} />
                  <Text style={[typography.label, { color: colors.primary }]}>Share code</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={{ marginBottom: spacing.lg }}>
            <Text style={[typography.label, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Invite by email</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
              Send an invite to anyone; they'll get the join code by email.
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <TextInput
                value={inviteEmail}
                onChangeText={(t) => { setInviteEmail(t); setInviteMessage(null); }}
                placeholder="friend@example.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!inviteSending}
                style={[typography.body, { color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, flex: 1 }]}
              />
              <TouchableOpacity
                onPress={sendInviteByEmail}
                disabled={inviteSending || !inviteEmail.trim()}
                style={[styles.actionBtn, { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: inviteSending || !inviteEmail.trim() ? colors.textMuted : colors.primary }]}
              >
                {inviteSending ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <>
                    <Ionicons name="mail-outline" size={18} color={colors.textInverse} style={{ marginRight: spacing.xs }} />
                    <Text style={[typography.label, { color: colors.textInverse }]}>Send invite</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            {inviteMessage ? (
              <Text style={[typography.caption, { marginTop: spacing.xs, color: inviteMessage.type === 'success' ? colors.success : colors.error }]}>
                {inviteMessage.text}
              </Text>
            ) : null}
          </View>

          {isAdmin && (
            <View style={{ gap: spacing.sm }}>
              <Text style={[typography.label, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Admin actions</Text>
              <TouchableOpacity onPress={goToManageMembers}>
                <Card style={[styles.actionCard, { padding: spacing.md, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg }]}>
                  <View style={[styles.iconWrap, { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md }]}>
                    <Ionicons name="people-outline" size={22} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.body, { fontWeight: '600', color: colors.text }]}>Manage members & roles</Text>
                    <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                      Add or remove members, assign admins and team leads
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </Card>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={[styles.centered, { flex: 1 }]}>
          <Text style={[typography.body, { color: colors.textSecondary }]}>Select a club to view info.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center' },
  scroll: { flex: 1 },
  content: {},
  centered: { justifyContent: 'center', alignItems: 'center' },
  actionBtn: { flexDirection: 'row', alignItems: 'center' },
  actionCard: {},
  iconWrap: {},
});
