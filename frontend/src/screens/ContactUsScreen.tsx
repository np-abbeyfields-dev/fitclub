import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { feedbackService } from '../services/feedbackService';

export default function ContactUsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { colors, spacing, radius, typography } = theme;
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const submit = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      setStatus({ type: 'error', text: 'Please enter a message.' });
      return;
    }
    setSending(true);
    setStatus(null);
    try {
      await feedbackService.contact(subject.trim() || 'Contact from FitClub', trimmed);
      setStatus({ type: 'success', text: 'Message sent. We\'ll get back to you soon.' });
      setSubject('');
      setMessage('');
    } catch (e) {
      setStatus({ type: 'error', text: e instanceof Error ? e.message : 'Failed to send.' });
    } finally {
      setSending(false);
    }
  }, [subject, message]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, paddingBottom: spacing.sm, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: spacing.xs }} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[typography.h3, { color: colors.text, fontWeight: '700', flex: 1 }]}>Contact us</Text>
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { padding: spacing.md, paddingBottom: spacing.xxxl }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
            Send us a message. Your email is included so we can reply.
          </Text>
          <Text style={[typography.label, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Subject (optional)</Text>
          <TextInput
            value={subject}
            onChangeText={(t) => { setSubject(t); setStatus(null); }}
            placeholder="What's this about?"
            placeholderTextColor={colors.textMuted}
            editable={!sending}
            style={[typography.body, { color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.md }]}
          />
          <Text style={[typography.label, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Message</Text>
          <TextInput
            value={message}
            onChangeText={(t) => { setMessage(t); setStatus(null); }}
            placeholder="Your message..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!sending}
            style={[typography.body, { color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, minHeight: 100, marginBottom: spacing.md }]}
          />
          {status ? (
            <Text style={[typography.caption, { marginBottom: spacing.sm, color: status.type === 'success' ? colors.success : colors.error }]}>
              {status.text}
            </Text>
          ) : null}
          <TouchableOpacity
            onPress={submit}
            disabled={sending || !message.trim()}
            style={{
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.md,
              borderRadius: radius.md,
              backgroundColor: sending || !message.trim() ? colors.textMuted : colors.primary,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.xs,
            }}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <>
                <Ionicons name="mail" size={18} color={colors.textInverse} />
                <Text style={[typography.label, { color: colors.textInverse }]}>Send message</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center' },
  scroll: { flex: 1 },
  content: {},
});
