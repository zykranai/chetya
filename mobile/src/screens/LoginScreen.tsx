import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { APP_LANGUAGES } from '../constants/languages';
import { authWithEmail } from '../services/api';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [lang, setLang] = useState('en');
  const [loading, setLoading] = useState(false);

  const onContinue = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes('@') || trimmed.length < 5) {
      Alert.alert('Email', 'Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      await authWithEmail(trimmed, lang);
    } catch (e: any) {
      Alert.alert('Could not sign in', e?.response?.data?.detail || e?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>Chetya</Text>
        <Text style={styles.tagline}>Not your kundli. Your life.</Text>
        <Text style={styles.sub}>Sign in with email and choose how you want your guru to speak.</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor="#666"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>App language</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.langRow}>
          {APP_LANGUAGES.map((l) => (
            <TouchableOpacity
              key={l.code}
              style={[styles.langChip, lang === l.code && styles.langChipActive]}
              onPress={() => setLang(l.code)}
            >
              <Text style={[styles.langChipText, lang === l.code && styles.langChipTextActive]}>
                {l.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.cta} onPress={onContinue} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#1a1a2e" />
          ) : (
            <Text style={styles.ctaText}>Continue</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.note}>
          Passwordless login: your email identifies your chart and chat history. Use a strong JWT secret in
          production (CHETYA_JWT_SECRET).
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  scroll: { padding: 24, paddingTop: 48 },
  brand: { color: '#f5e6c8', fontSize: 32, fontWeight: '700' },
  tagline: { color: '#a89870', fontSize: 16, marginTop: 8 },
  sub: { color: '#888', fontSize: 14, marginTop: 16, marginBottom: 24 },
  label: { color: '#ccc', fontSize: 13, marginBottom: 8 },
  input: {
    backgroundColor: '#1a1a1e',
    borderRadius: 12,
    padding: 16,
    color: '#f5e6c8',
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2a2a30',
  },
  langRow: { marginBottom: 24, maxHeight: 44 },
  langChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1a1a1e',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#2a2a30',
  },
  langChipActive: { backgroundColor: '#c9a22733', borderColor: '#c9a227' },
  langChipText: { color: '#aaa', fontSize: 13 },
  langChipTextActive: { color: '#f5e6c8', fontWeight: '600' },
  cta: {
    backgroundColor: '#c9a227',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  ctaText: { color: '#1a1a2e', fontSize: 17, fontWeight: '700' },
  note: { color: '#555', fontSize: 11, marginTop: 24, lineHeight: 16 },
});
