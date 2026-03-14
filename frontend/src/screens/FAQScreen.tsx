import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

type FAQItem = { q: string; a: string };

const FAQ: FAQItem[] = [
  {
    q: 'Where is my Profile?',
    a: 'Tap your avatar (initial letter) in the top-right of the screen to open Profile. There you can switch clubs, see past rounds, manage notifications, and use Admin tools if you’re an admin.',
  },
  {
    q: 'How do I join a club?',
    a: 'Ask your club admin for the invite code, or get an email invite from a member. Open Profile (tap your avatar) → Join club, or use Home. Enter the code to join. You can also use an invite link if someone shared one.',
  },
  {
    q: 'How do I create a challenge round?',
    a: 'Only club admins can create rounds. Open Profile (tap your avatar) → Create challenge round (under Admin tools), or use the Challenges tab → Rounds. Set the round name, end date, and team size. When you activate the round, members can join teams and start logging workouts.',
  },
  {
    q: 'What are custom challenges?',
    a: 'Custom challenges are extra tasks your club admin or team leaders can add (e.g. “Drink 6 glasses of water”). Completing one awards bonus points for the current round. Open the Challenges tab to see and complete them. Only one completion per challenge per day counts.',
  },
  {
    q: 'How are points calculated?',
    a: 'You earn points from workouts you log and from completing custom challenges (Challenges tab). Each workout type has a points value; custom challenges award the points set by your admin or team lead. There may be a daily cap per person. Check your club’s round settings for details.',
  },
  {
    q: 'How do I invite friends by email?',
    a: 'Open Profile (tap your avatar) → tap the gear on your club card, or use Settings → Club info. Use “Invite by email” and enter their address. They’ll receive an email with the club’s join code and a link to get the app.',
  },
  {
    q: 'I found a bug. How do I report it?',
    a: 'Go to Settings → Report a bug. Describe what happened and where (e.g. which screen). We’ll get your message and your email so we can follow up.',
  },
  {
    q: 'How do I contact support?',
    a: 'Use Settings → Contact us. Send a message with your question or feedback. We’ll reply to your email.',
  },
];

export default function FAQScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { colors, spacing, radius, typography } = theme;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, paddingBottom: spacing.sm, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: spacing.xs }} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[typography.h3, { color: colors.text, fontWeight: '700', flex: 1 }]}>FAQ</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { padding: spacing.md, paddingBottom: spacing.xxxl }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
          Common questions about FitClub.
        </Text>
        {FAQ.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <TouchableOpacity
              key={index}
              onPress={() => setOpenIndex(isOpen ? null : index)}
              activeOpacity={0.7}
              style={{
                marginBottom: spacing.sm,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                backgroundColor: colors.surface,
                overflow: 'hidden',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md }}>
                <Text style={[typography.body, { color: colors.text, fontWeight: '600', flex: 1 }]} numberOfLines={isOpen ? undefined : 2}>
                  {item.q}
                </Text>
                <Ionicons
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textSecondary}
                  style={{ marginLeft: spacing.xs }}
                />
              </View>
              {isOpen ? (
                <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
                  <Text style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 22 }]}>{item.a}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center' },
  scroll: { flex: 1 },
  content: {},
});
