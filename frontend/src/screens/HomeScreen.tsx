import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { clubService } from '../services/clubService';
import { Club } from '../types';

export default function HomeScreen({
  onCreateClub,
  onJoinClub,
  onLogout,
}: {
  onCreateClub: () => void;
  onJoinClub: () => void;
  onLogout: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadClubs = async () => {
    try {
      const res = await clubService.listMine();
      if (res.data) setClubs(res.data);
    } catch {
      setClubs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadClubs();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadClubs();
  };

  const handleLogout = async () => {
    await logout();
    onLogout();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>FitClub</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.signOutBtn}>
            <Ionicons name="log-out-outline" size={20} color="#64748b" />
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.greeting}>Hi, {user?.displayName || user?.email} 👋</Text>
        <Text style={styles.tagline}>Create or join a club and start competing.</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
        }
      >
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionCard, styles.actionCreate]} onPress={onCreateClub}>
            <Ionicons name="add-circle" size={32} color="#2563eb" />
            <Text style={styles.actionTitle}>Create a club</Text>
            <Text style={styles.actionHint}>Start your own and get an invite code</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, styles.actionJoin]} onPress={onJoinClub}>
            <Ionicons name="people" size={32} color="#059669" />
            <Text style={styles.actionTitle}>Join a club</Text>
            <Text style={styles.actionHint}>Enter a code from your admin</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>My clubs</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#2563eb" style={styles.loader} />
        ) : clubs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="fitness-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No clubs yet</Text>
            <Text style={styles.emptyText}>
              Create your own club or tap "Join a club" and enter an invite code from a friend or admin.
            </Text>
          </View>
        ) : (
          <View style={styles.clubList}>
            {clubs.map((item) => (
              <View key={item.id} style={styles.clubCard}>
                <View style={styles.clubCardMain}>
                  <Text style={styles.clubName}>{item.name}</Text>
                  <View style={styles.clubMetaRow}>
                    <View style={[styles.roleBadge, item.role === 'admin' && styles.roleBadgeAdmin]}>
                      <Text style={[styles.roleText, item.role === 'admin' && styles.roleTextAdmin]}>
                        {item.role === 'admin' ? 'Admin' : 'Member'}
                      </Text>
                    </View>
                    {item.inviteCode && item.role === 'admin' && (
                      <Text style={styles.inviteCode} selectable>
                        Code: {item.inviteCode}
                      </Text>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={22} color="#94a3b8" />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 52,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: '#2563eb' },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  signOutText: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  greeting: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginTop: 8 },
  tagline: { fontSize: 14, color: '#64748b', marginTop: 4 },
  content: { flex: 1 },
  contentInner: { padding: 24, paddingBottom: 40 },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  actionCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  actionCreate: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  actionJoin: { borderColor: '#059669', backgroundColor: '#ecfdf5' },
  actionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginTop: 8 },
  actionHint: { fontSize: 12, color: '#64748b', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  loader: { marginVertical: 32 },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#475569', marginTop: 12 },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 21,
  },
  clubList: { gap: 10 },
  clubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  clubCardMain: { flex: 1 },
  clubName: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  clubMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  roleBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleBadgeAdmin: { backgroundColor: '#dbeafe' },
  roleText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  roleTextAdmin: { color: '#2563eb' },
  inviteCode: { fontSize: 12, color: '#64748b', fontWeight: '500' },
});
