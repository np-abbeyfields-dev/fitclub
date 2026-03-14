import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useClub } from '../context/ClubContext';
import type { ClubWithRole } from '../services/clubService';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function ClubSwitcherSheet({ visible, onClose }: Props) {
  const theme = useTheme();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const { colors, spacing, radius, typography } = theme;
  const { clubs, selectedClub, setSelectedClub, refreshClubs } = useClub();

  const handleSelectClub = (club: ClubWithRole) => {
    setSelectedClub(club);
    refreshClubs().catch(() => {});
    onClose();
  };

  const handleJoinClub = () => {
    onClose();
    (navigation as any).getParent()?.navigate('HomeTab', { screen: 'JoinClub' });
  };

  const handleCreateClub = () => {
    onClose();
    (navigation as any).getParent()?.navigate('HomeTab', { screen: 'CreateClub' });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, maxWidth: width }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.handle, { backgroundColor: colors.border, borderRadius: 2 }]} />
          <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.md, paddingHorizontal: spacing.md }]}>
            Switch Club
          </Text>
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {(clubs ?? []).map((club) => {
              const isActive = selectedClub?.id === club.id;
              return (
                <TouchableOpacity
                  key={club.id}
                  onPress={() => handleSelectClub(club)}
                  style={[
                    styles.clubRow,
                    {
                      paddingVertical: spacing.sm,
                      paddingHorizontal: spacing.md,
                      backgroundColor: isActive ? colors.primaryMuted : colors.card,
                      marginHorizontal: spacing.md,
                      marginBottom: spacing.xs,
                      borderRadius: radius.sm,
                      borderWidth: 1,
                      borderColor: isActive ? colors.primary : colors.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.sm,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  {isActive ? (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  ) : (
                    <View style={{ width: 22, height: 22 }} />
                  )}
                  <Text style={[typography.body, { color: colors.text, fontWeight: isActive ? '700' : '500', flex: 1 }]} numberOfLines={1}>
                    {club.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              onPress={handleJoinClub}
              style={[
                styles.actionRow,
                {
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                  marginHorizontal: spacing.md,
                  marginTop: spacing.sm,
                  marginBottom: spacing.xs,
                  borderRadius: radius.sm,
                  borderWidth: 1,
                  borderColor: colors.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={20} color={colors.primary} />
              <Text style={[typography.label, { color: colors.primary }]}>Join club</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCreateClub}
              style={[
                styles.actionRow,
                {
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                  marginHorizontal: spacing.md,
                  marginBottom: spacing.lg,
                  borderRadius: radius.sm,
                  backgroundColor: colors.primary,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={20} color={colors.heroText} />
              <Text style={[typography.label, { color: colors.heroText, fontWeight: '700' }]}>Create club</Text>
            </TouchableOpacity>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '70%',
    paddingTop: 16,
    paddingBottom: 34,
  },
  handle: {
    width: 36,
    height: 4,
    alignSelf: 'center',
    marginBottom: 16,
  },
  scroll: {
    maxHeight: 400,
  },
  clubRow: {},
  actionRow: {},
});
