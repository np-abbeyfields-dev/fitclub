import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { clubService } from '../services/clubService';

export default function JoinClubScreen({ onSuccess, onBack }: { onSuccess: () => void; onBack: () => void }) {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    const code = inviteCode.trim().toUpperCase();
    if (!code) {
      Alert.alert('Oops', 'Enter the invite code from your club.');
      return;
    }
    setLoading(true);
    try {
      await clubService.join(code);
      Alert.alert('You\'re in! 🎉', 'You joined the club.', [{ text: 'OK', onPress: onSuccess }]);
    } catch (e: any) {
      Alert.alert('Could not join', e?.message || 'Check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name="people" size={48} color="#2563eb" />
      </View>
      <Text style={styles.title}>Join a club</Text>
      <Text style={styles.hint}>Enter the invite code your admin or friend shared with you.</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. A1B2C3D4"
        placeholderTextColor="#94a3b8"
        value={inviteCode}
        onChangeText={(t) => setInviteCode(t.toUpperCase())}
        autoCapitalize="characters"
        autoCorrect={false}
        editable={!loading}
        maxLength={12}
      />
      <TouchableOpacity style={styles.button} onPress={handleJoin} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="enter-outline" size={22} color="#fff" />
            <Text style={styles.buttonText}>Join club</Text>
          </>
        )}
      </TouchableOpacity>
      <TouchableOpacity onPress={onBack} disabled={loading}>
        <Text style={styles.link}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 56,
    backgroundColor: '#f8fafc',
  },
  iconWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  hint: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    fontSize: 18,
    letterSpacing: 2,
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    padding: 18,
    borderRadius: 12,
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  link: {
    color: '#2563eb',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
});
