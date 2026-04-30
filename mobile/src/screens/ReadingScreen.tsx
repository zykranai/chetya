import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import OnboardingScreen from './OnboardingScreen';
import { generateReading, ReadingRequest } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function ReadingScreen() {
  const language = useAuthStore((s) => s.language);
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<string | null>(null);

  const onComplete = async (data: ReadingRequest) => {
    setLoading(true);
    try {
      const body = { ...data, language: language || data.language };
      const wrapper = await generateReading(body);
      const payload = wrapper?.data;
      const reading = payload?.reading;
      const text =
        typeof reading === 'string'
          ? reading
          : reading
            ? JSON.stringify(reading, null, 2)
            : JSON.stringify(payload, null, 2);
      setPayload(text);
    } catch (e: any) {
      Alert.alert('Reading failed', e?.response?.data?.detail || e?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  if (payload) {
    return (
      <ScrollView style={styles.wrap} contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Your reading</Text>
        <Text style={styles.body}>{payload}</Text>
        <TouchableOpacity style={styles.btn} onPress={() => setPayload(null)}>
          <Text style={styles.btnText}>New reading</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>Birth details are saved to your account when you finish.</Text>
      <OnboardingScreen onComplete={onComplete} initialLanguage={language} loading={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#0a0a0a' },
  scroll: { padding: 16, paddingBottom: 40 },
  hint: { color: '#888', paddingHorizontal: 16, paddingTop: 8, fontSize: 13 },
  title: { color: '#f5e6c8', fontSize: 20, marginBottom: 12 },
  body: { color: '#ccc', fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  btn: {
    marginTop: 20,
    alignSelf: 'flex-start',
    backgroundColor: '#2a2a32',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnText: { color: '#c9a227', fontWeight: '600' },
});
