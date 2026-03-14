import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { PerformanceHeatmap } from '../components';
import { roundService } from '../services/roundService';
import type { LeaderboardStackParamList } from '../navigation/types';

const DARK = { background: '#0F172A', card: '#1E293B', accent: '#FF6B35', textPrimary: '#F8FAFC', textSecondary: '#94A3B8' } as const;
const LIGHT = { background: '#F8FAFC', card: '#FFFFFF', accent: '#2563EB', textPrimary: '#0F172A', textSecondary: '#64748B' } as const;

type WorkoutItem = {
  id: string;
  activityType: string;
  durationMinutes: number | null;
  distanceKm: number | null;
  points: number;
  loggedAt: string;
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

function formatDuration(mins: number | null): string {
  if (mins == null || mins <= 0) return '—';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function MemberActivityScreen() {
  const route = useRoute<RouteProp<LeaderboardStackParamList, 'MemberActivity'>>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { roundId, userId, userName } = route.params;
  const { spacing: s, radius: r, typography } = theme;
  const d = theme.isDark ? DARK : LIGHT;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutItem[]>([]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await roundService.getMemberWorkouts(roundId, userId);
      setWorkouts(res.data ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load activity';
      if (msg.includes('404') && !msg.toLowerCase().includes('not found')) {
        setError('Round or member not found. Go back to the leaderboard and open this person again.');
      } else {
        setError(msg);
      }
      setWorkouts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [roundId, userId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const goBack = () => navigation.goBack();

  const totalPoints = workouts.reduce((sum, w) => sum + w.points, 0);

  const pointsByDate = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const w of workouts) {
      try {
        const dateKey = w.loggedAt.slice(0, 10);
        map[dateKey] = (map[dateKey] ?? 0) + w.points;
      } catch {
        // skip invalid date
      }
    }
    return map;
  }, [workouts]);

  if (loading && workouts.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: d.background }]}>
        <ActivityIndicator size="large" color={d.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: d.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + s.sm, paddingBottom: s.sm, paddingHorizontal: s.md, borderBottomWidth: 1, borderBottomColor: d.textSecondary, backgroundColor: d.card }]}>
        <TouchableOpacity onPress={goBack} style={{ padding: s.xs, marginRight: s.sm }} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={d.textPrimary} />
        </TouchableOpacity>
        <Text style={[typography.h3, { color: d.textPrimary, fontWeight: '800', flex: 1 }]} numberOfLines={1}>
          {userName}
        </Text>
      </View>

      {error && workouts.length === 0 ? (
        <View style={[styles.centered, { flex: 1, padding: s.lg }]}>
          <Text style={[typography.body, { color: d.textSecondary, textAlign: 'center', marginBottom: s.md }]}>{error}</Text>
          <TouchableOpacity onPress={() => { setLoading(true); load(); }} style={{ padding: s.sm }}>
            <Text style={[typography.label, { color: d.accent, fontWeight: '700' }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ padding: s.md, paddingBottom: s.xxl }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={d.accent} />}
        >
          <View style={[styles.card, { backgroundColor: d.card, borderRadius: r.md, padding: s.md, marginBottom: s.md }]}>
            <Text style={[typography.title, { color: d.textPrimary, fontWeight: '800', marginBottom: s.xs }]}>{userName}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.lg, flexWrap: 'wrap' }}>
              <Text style={[typography.caption, { color: d.textSecondary, fontWeight: '600' }]}>{totalPoints.toLocaleString()} pts total</Text>
              <Text style={[typography.caption, { color: d.textSecondary, fontWeight: '600' }]}>{workouts.length} workout{workouts.length !== 1 ? 's' : ''}</Text>
            </View>
          </View>

          <Text style={[typography.section, { color: d.textPrimary, fontWeight: '700', marginBottom: s.sm }]}>Performance</Text>
          <View style={[styles.card, { backgroundColor: d.card, borderRadius: r.md, padding: s.md, marginBottom: s.md }]}>
            <Text style={[typography.caption, { color: d.textSecondary, fontWeight: '600', marginBottom: s.sm }]}>Last 30 days · intensity = points that day</Text>
            <PerformanceHeatmap pointsByDate={pointsByDate} isDark={theme.isDark} />
          </View>

          <Text style={[typography.section, { color: d.textPrimary, fontWeight: '700', marginBottom: s.sm }]}>Workouts</Text>
          {workouts.length === 0 ? (
            <Text style={[typography.body, { color: d.textSecondary, textAlign: 'center', paddingVertical: s.lg }]}>No workouts logged in this round.</Text>
          ) : (
            workouts.map((w) => (
              <View
                key={w.id}
                style={[
                  styles.workoutRow,
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: d.card,
                    borderRadius: r.sm,
                    paddingVertical: s.sm,
                    paddingHorizontal: s.md,
                    marginBottom: s.xs,
                  },
                ]}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[typography.body, { color: d.textPrimary, fontWeight: '600' }]} numberOfLines={1}>
                    {w.activityType}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.sm, marginTop: 2, flexWrap: 'wrap' }}>
                    <Text style={[typography.caption, { color: d.textSecondary }]}>{formatDuration(w.durationMinutes)}</Text>
                    <Text style={[typography.caption, { color: d.textSecondary }]}>{formatDate(w.loggedAt)}</Text>
                  </View>
                </View>
                <Text style={[typography.body, { color: d.accent, fontWeight: '700' }]}>{w.points} pts</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center' },
  scroll: { flex: 1 },
  card: {},
  workoutRow: {},
});
