import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../store/authStore';
import { useClub } from '../context/ClubContext';
import { roundService } from '../services/roundService';

function getRoundCountdown(endDateStr: string): string {
  const end = new Date(endDateStr);
  const now = new Date();
  const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Round ended';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

export function WebTopBar() {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { selectedClub } = useClub();
  const { colors, spacing, radius, typography } = theme;
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [activeRoundEnd, setActiveRoundEnd] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedClub) {
      setActiveRoundEnd(null);
      return;
    }
    roundService.listByClub(selectedClub.id).then((res) => {
      const active = (res.data || []).find((r) => r.status === 'active');
      setActiveRoundEnd(active?.endDate ?? null);
    }).catch(() => setActiveRoundEnd(null));
  }, [selectedClub?.id]);

  const initial = (user?.displayName || user?.email || '?').charAt(0).toUpperCase();
  const countdown = activeRoundEnd ? getRoundCountdown(activeRoundEnd) : null;

  const handleLogout = async () => {
    setAvatarOpen(false);
    await logout();
  };

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        },
      ]}
    >
      <View style={styles.left}>
        <Text style={[styles.clubName, { ...typography.h3, color: colors.text }]} numberOfLines={1}>
          {selectedClub?.name ?? 'FitClub'}
        </Text>
        {countdown && (
          <View style={[styles.countdownBadge, { backgroundColor: colors.primaryMuted, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: radius.sm }]}>
            <Ionicons name="time-outline" size={14} color={colors.primary} />
            <Text style={[styles.countdownText, { ...typography.caption, fontWeight: '600', color: colors.primary }]}>{countdown}</Text>
          </View>
        )}
      </View>

      <View style={styles.right}>
        <TouchableOpacity
          onPress={() => {}}
          style={[styles.iconBtn, { marginRight: spacing.xs }]}
          hitSlop={8}
        >
          <Ionicons name="notifications-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setAvatarOpen(true)}
          style={[styles.avatar, { backgroundColor: colors.primaryMuted }]}
          activeOpacity={0.8}
        >
          <Text style={[styles.avatarText, { color: colors.primary }]}>{initial}</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={avatarOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setAvatarOpen(false)}
        >
          <View
            style={[
              styles.dropdown,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: spacing.xs,
              },
            ]}
          >
            <View style={[styles.dropdownHeader, { padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <Text style={[styles.dropdownName, { ...typography.body, fontWeight: '700', color: colors.text }]} numberOfLines={1}>
                {user?.displayName || 'Member'}
              </Text>
              <Text style={[styles.dropdownEmail, { ...typography.bodySmall, color: colors.textSecondary, marginTop: spacing.xxs }]} numberOfLines={1}>
                {user?.email}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleLogout}
              style={[styles.dropdownItem, { padding: spacing.sm }]}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={18} color={colors.error} />
              <Text style={[styles.dropdownItemText, { ...typography.label, color: colors.error }]}>Sign out</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  clubName: {},
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countdownText: {},
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    padding: 6,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: 56,
    paddingRight: 24,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  dropdown: {
    minWidth: 220,
    borderWidth: 1,
  },
  dropdownHeader: { marginBottom: 4 },
  dropdownName: {},
  dropdownEmail: {},
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dropdownItemText: {},
});
