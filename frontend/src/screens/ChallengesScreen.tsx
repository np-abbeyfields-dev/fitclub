import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useClub } from '../context/ClubContext';
import { customChallengeService, type CustomChallenge } from '../services/customChallengeService';
import { clubService } from '../services/clubService';

const TOGGLE_SIZE = 44;

function ChallengeRow({
  challenge,
  onToggle,
  onLongPress,
  disabled,
  toggling,
  canManage,
}: {
  challenge: CustomChallenge;
  onToggle: (challenge: CustomChallenge) => void;
  onLongPress?: (challenge: CustomChallenge) => void;
  disabled: boolean;
  toggling: boolean;
  canManage: boolean;
}) {
  const theme = useTheme();
  const { colors, spacing, radius, typography } = theme;
  const iconName = (challenge.icon as keyof typeof Ionicons.glyphMap) || 'medal';

  return (
    <TouchableOpacity
      onLongPress={canManage ? () => onLongPress?.(challenge) : undefined}
      activeOpacity={1}
      style={{ marginBottom: spacing.xs }}
    >
    <View
      style={[
        styles.rowCard,
        {
          backgroundColor: colors.card,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          paddingVertical: spacing.sm,
          paddingLeft: spacing.md,
          paddingRight: spacing.sm,
        },
      ]}
    >
      <View style={styles.rowContent}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primaryMuted, borderRadius: radius.sm }]}>
          <Ionicons name={iconName} size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]} numberOfLines={2}>
            {challenge.name}
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
            +{challenge.pointsAwarded} pts
          </Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => !disabled && !toggling && onToggle(challenge)}
        disabled={disabled || toggling}
        style={styles.toggleWrap}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        {toggling ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : challenge.completedToday ? (
          <View style={[styles.toggleDone, { backgroundColor: colors.primary }]}>
            <Ionicons name="checkmark" size={20} color={colors.textInverse} />
          </View>
        ) : (
          <View style={[styles.toggleEmpty, { borderColor: colors.border, borderWidth: 2 }]} />
        )}
      </TouchableOpacity>
    </View>
    </TouchableOpacity>
  );
}

export default function ChallengesScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius, typography } = theme;
  const { selectedClub, isAdmin, isTeamLead } = useClub();

  const [challenges, setChallenges] = useState<CustomChallenge[]>([]);
  const [activeRound, setActiveRound] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const canCreate = isAdmin || isTeamLead;
  const hasActiveRound = activeRound != null;
  const canComplete = hasActiveRound;

  const load = useCallback(async () => {
    if (!selectedClub) {
      setChallenges([]);
      setActiveRound(null);
      setLoading(false);
      return;
    }
    try {
      const dash = await clubService.getDashboard(selectedClub.id);
      const round = dash.data?.activeRound ?? null;
      setActiveRound(round ? { id: round.id, name: round.name } : null);
      if (!round) {
        setChallenges([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const res = await customChallengeService.listByRound(round.id);
      setChallenges(res.data ?? []);
    } catch {
      setChallenges([]);
      setActiveRound(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedClub]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const handleToggle = useCallback(
    async (challenge: CustomChallenge) => {
      if (togglingId === challenge.id) return;
      setTogglingId(challenge.id);
      const wasCompleted = challenge.completedToday;
      setChallenges((prev) =>
        prev.map((c) =>
          c.id === challenge.id ? { ...c, completedToday: !wasCompleted } : c
        )
      );
      try {
        if (wasCompleted) {
          await customChallengeService.uncomplete(challenge.id);
        } else {
          await customChallengeService.complete(challenge.id);
        }
      } catch {
        setChallenges((prev) =>
          prev.map((c) => (c.id === challenge.id ? { ...c, completedToday: wasCompleted } : c))
        );
      } finally {
        setTogglingId(null);
      }
    },
    [togglingId]
  );

  const openCreateChallenge = useCallback(() => {
    if (!activeRound) return;
    (navigation as any).navigate('CreateCustomChallenge', {
      roundId: activeRound.id,
      roundName: activeRound.name,
    });
  }, [navigation, activeRound]);

  const openRounds = useCallback(() => {
    (navigation as any).getParent()?.navigate('HomeTab', { screen: 'Rounds' });
  }, [navigation]);

  const handleLongPress = useCallback(
    (challenge: CustomChallenge) => {
      Alert.alert(
        challenge.name,
        'Edit or delete this challenge?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Edit',
            onPress: () =>
              (navigation as any).navigate('EditCustomChallenge', {
                challengeId: challenge.id,
                roundId: challenge.roundId,
              }),
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                'Delete challenge',
                `Remove "${challenge.name}"? Completions will be lost.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await customChallengeService.delete(challenge.id);
                        load();
                      } catch {
                        Alert.alert('Error', 'Failed to delete challenge');
                      }
                    },
                  },
                ]
              );
            },
          },
        ]
      );
    },
    [navigation, load]
  );

  if (!selectedClub) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ padding: spacing.lg }}>
          <Text style={[typography.h3, { color: colors.text, fontWeight: '800' }]}>Challenges</Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>
            Select a club to see custom challenges.
          </Text>
        </View>
      </View>
    );
  }

  if (loading && challenges.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const noActiveRound = !hasActiveRound && selectedClub != null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={challenges}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingHorizontal: spacing.md,
            paddingTop: spacing.md,
            paddingBottom: (canCreate ? 80 : 24) + insets.bottom,
          },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <>
            <View style={styles.headerRow}>
              <Text style={[typography.h3, { color: colors.text, fontWeight: '800' }]}>Challenges</Text>
              {canCreate && (
                <TouchableOpacity
                  onPress={openRounds}
                  style={{ padding: spacing.xs }}
                  hitSlop={spacing.sm}
                  activeOpacity={0.7}
                >
                  <Text style={[typography.label, { color: colors.primary, fontWeight: '700' }]}>
                    Rounds
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {noActiveRound && (
              <View
                style={[
                  styles.banner,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radius.sm,
                    padding: spacing.sm,
                    marginBottom: spacing.md,
                  },
                ]}
              >
                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                  No active round – challenges are available once a round is running. Start or activate a round from Rounds.
                </Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={[styles.emptyWrap, { paddingVertical: spacing.xl }]}>
            <Ionicons
              name="medal-outline"
              size={56}
              color={colors.textMuted ?? colors.textSecondary}
            />
            <Text style={[typography.h3, { color: colors.text, fontWeight: '700', marginTop: spacing.md }]}>
              {hasActiveRound ? 'No custom challenges yet' : 'No active round'}
            </Text>
            <Text
              style={[
                typography.body,
                { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.lg },
              ]}
            >
              {hasActiveRound
                ? canCreate
                  ? 'Create a challenge like "Drink 6 glasses of water" to award extra points for this round.'
                  : 'Your club admin or team leaders can add challenges for this round.'
                : 'Challenges belong to a round. Start or activate a round from Rounds to add challenges.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ChallengeRow
            challenge={item}
            onToggle={handleToggle}
            onLongPress={handleLongPress}
            disabled={!canComplete}
            toggling={togglingId === item.id}
            canManage={canCreate}
          />
        )}
      />

      {canCreate && hasActiveRound && (
        <TouchableOpacity
          style={[
            styles.fab,
            {
              backgroundColor: colors.primary,
              bottom: 20 + insets.bottom,
              ...theme.shadows.lg,
            },
          ]}
          onPress={openCreateChallenge}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color={colors.textInverse} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  listContent: {},
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  banner: {
    borderWidth: 1,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  iconWrap: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  toggleWrap: {
    width: TOGGLE_SIZE,
    height: TOGGLE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleDone: {
    width: TOGGLE_SIZE,
    height: TOGGLE_SIZE,
    borderRadius: TOGGLE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleEmpty: {
    width: TOGGLE_SIZE,
    height: TOGGLE_SIZE,
    borderRadius: TOGGLE_SIZE / 2,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    right: 24, // theme spacing.lg — StyleSheet is module-scope so can't use theme here
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
