import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Share,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { clubService } from '../services/clubService';

export default function CreateClubScreen({
  onSuccess,
  onBack,
}: {
  onSuccess: () => void;
  onBack: () => void;
}) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdClub, setCreatedClub] = useState<{ name: string; inviteCode: string } | null>(null);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Oops', 'Give your club a name.');
      return;
    }
    setLoading(true);
    try {
      const res = await clubService.create(trimmed);
      const club = res.data;
      if (club?.inviteCode) {
        setCreatedClub({ name: club.name, inviteCode: club.inviteCode });
      } else {
        Alert.alert('Success', 'Club created!', [{ text: 'OK', onPress: onSuccess }]);
      }
    } catch (e: any) {
      Alert.alert('Could not create club', e?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!createdClub) return;
    const message = `Join my FitClub "${createdClub.name}"! Use invite code: ${createdClub.inviteCode}`;
    try {
      await Share.share({ message, title: 'Join my FitClub' });
    } catch {
      // User cancelled or share not available
    }
  };

  const handleDone = () => {
    onSuccess();
  };

  if (createdClub) {
    return (
      <ScrollView contentContainerStyle={styles.successContainer}>
        <View style={styles.successCard}>
          <View style={styles.successIconWrap}>
            <Ionicons name="checkmark-circle" size={56} color="#16a34a" />
          </View>
          <Text style={styles.successTitle}>Club created!</Text>
          <Text style={styles.successName}>{createdClub.name}</Text>
          <Text style={styles.inviteLabel}>Invite code — share this so others can join</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText} selectable>
              {createdClub.inviteCode}
            </Text>
          </View>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={22} color="#fff" />
            <Text style={styles.shareButtonText}>Share invite code</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create a club</Text>
      <Text style={styles.hint}>Name your club (e.g. "Acme Fitness" or "Campus Runners"). You'll get an invite code to share.</Text>
      <TextInput
        style={styles.input}
        placeholder="Club name"
        placeholderTextColor="#94a3b8"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        autoCorrect={false}
        editable={!loading}
      />
      <TouchableOpacity style={styles.button} onPress={handleCreate} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="add-circle-outline" size={22} color="#fff" />
            <Text style={styles.buttonText}>Create club</Text>
          </>
        )}
      </TouchableOpacity>
      <TouchableOpacity onPress={onBack} disabled={loading}>
        <Text style={styles.link}>Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 48,
    backgroundColor: '#f8fafc',
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
    fontSize: 17,
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
  successContainer: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 48,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  successCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 28,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  successIconWrap: { marginBottom: 16 },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#16a34a',
    marginBottom: 4,
  },
  successName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 20,
  },
  inviteLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  codeBox: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  codeText: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 4,
    color: '#0f172a',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    marginBottom: 12,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  doneButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  doneButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
});
