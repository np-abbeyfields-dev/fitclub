import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useClub } from '../context/ClubContext';
import { customChallengeService } from '../services/customChallengeService';
import { Button } from '../components';
import type { ChallengesStackParamList } from '../navigation/types';

const ICON_OPTIONS: (keyof typeof Ionicons.glyphMap)[] = [
  'medal',
  'water',
  'nutrition',
  'walk',
  'barbell',
  'heart',
  'moon',
  'sunny',
  'leaf',
  'checkmark-circle',
];

export default function CreateCustomChallengeScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ChallengesStackParamList, 'CreateCustomChallenge'>>();
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius, typography } = theme;
  const { selectedClub } = useClub();

  const params = route.params;
  const roundId = params?.roundId;
  const roundName = params?.roundName;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState<string>(ICON_OPTIONS[0]);
  const [points, setPoints] = useState('');
  const [saving, setSaving] = useState(false);

  const goBack = () => (navigation as any).goBack?.();

  const submit = async () => {
    const nameTrim = name.trim();
    if (!nameTrim) {
      Alert.alert('', 'Challenge name is required.');
      return;
    }
    const pointsNum = parseInt(points, 10);
    if (Number.isNaN(pointsNum) || pointsNum < 0) {
      Alert.alert('', 'Enter a valid points value (0 or more).');
      return;
    }
    if (!roundId) {
      Alert.alert('', 'No round selected. Open challenges from a club with an active round.');
      return;
    }
    setSaving(true);
    try {
      await customChallengeService.create(roundId, {
        name: nameTrim,
        description: description.trim() || undefined,
        icon: icon || undefined,
        pointsAwarded: pointsNum,
      });
      goBack();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to create challenge');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { borderBottomColor: colors.border, paddingHorizontal: spacing.md, paddingTop: insets.top + 4, paddingBottom: 6 }]}>
        <TouchableOpacity onPress={goBack} style={{ padding: spacing.xs }} hitSlop={spacing.sm} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[typography.h3, { color: colors.text, fontWeight: '800' }]}>
            New challenge
          </Text>
          {(roundName || selectedClub) ? (
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
              for {roundName ?? selectedClub?.name ?? 'this round'}
            </Text>
          ) : null}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.md, paddingTop: 0, paddingBottom: spacing.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
          Name
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Drink 6 glasses of water"
          placeholderTextColor={colors.textMuted ?? colors.textSecondary}
          style={[
            styles.input,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.sm,
              color: colors.text,
              padding: spacing.sm,
              ...typography.body,
            },
          ]}
        />

        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs }]}>
          Description (optional)
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Short description"
          placeholderTextColor={colors.textMuted ?? colors.textSecondary}
          multiline
          style={[
            styles.input,
            styles.inputMultiline,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.sm,
              color: colors.text,
              padding: spacing.sm,
              ...typography.body,
            },
          ]}
        />

        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs }]}>
          Icon
        </Text>
        <View style={styles.iconRow}>
          {ICON_OPTIONS.map((ico) => (
            <TouchableOpacity
              key={ico}
              onPress={() => setIcon(ico)}
              style={[
                styles.iconBtn,
                {
                  backgroundColor: icon === ico ? colors.primaryMuted : colors.surface,
                  borderColor: icon === ico ? colors.primary : colors.border,
                  borderRadius: radius.sm,
                },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons name={ico} size={24} color={icon === ico ? colors.primary : colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs }]}>
          Points awarded
        </Text>
        <TextInput
          value={points}
          onChangeText={setPoints}
          placeholder="e.g. 5"
          placeholderTextColor={colors.textMuted ?? colors.textSecondary}
          keyboardType="number-pad"
          style={[
            styles.input,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.sm,
              color: colors.text,
              padding: spacing.sm,
              ...typography.body,
            },
          ]}
        />

        <Button
          title={saving ? 'Creating…' : 'Create challenge'}
          onPress={submit}
          loading={saving}
          fullWidth
          style={{ marginTop: spacing.xl }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  input: {
    borderWidth: 1,
  },
  inputMultiline: {
    minHeight: 72,
  },
  iconRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconBtn: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});
