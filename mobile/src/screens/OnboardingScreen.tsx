import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

interface OnboardingProps {
  onComplete: (data: any) => void;
  /** Sync with login language choice */
  initialLanguage?: string;
  loading?: boolean;
}

export default function OnboardingScreen({
  onComplete,
  initialLanguage = 'hi',
  loading = false,
}: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    tob: '',
    place: '',
    age: '',
    location_type: 'home',
    financial_situation: 'working',
    financial_level: 'medium',
    main_concern: 'general',
    specific_question: '',
    language: initialLanguage,
  });

  const CONCERNS = [
    { key: 'career', label: '💼 Career & Job' },
    { key: 'marriage', label: '💍 Marriage & Love' },
    { key: 'money', label: '💰 Money & Finance' },
    { key: 'health', label: '🏥 Health' },
    { key: 'family', label: '👨‍👩‍👧 Family' },
    { key: 'spiritual', label: '🕉️ Spiritual Growth' },
    { key: 'general', label: '🌟 My Full Life Reading' },
  ];

  const SITUATIONS = [
    { key: 'student', label: 'Student' },
    { key: 'working', label: 'Job / Service' },
    { key: 'business', label: 'Business' },
    { key: 'homemaker', label: 'Homemaker' },
    { key: 'struggling', label: 'Going Through Difficulty' },
    { key: 'retired', label: 'Retired' },
  ];

  const LOCATIONS = [
    { key: 'home', label: '🏠 Living at home / hometown' },
    { key: 'away', label: '🏙️ Away from home (different city)' },
    { key: 'abroad', label: '✈️ Living abroad' },
  ];

  const handleNext = () => {
    if (step === 1) {
      if (!formData.name || !formData.dob || !formData.place) {
        Alert.alert('Please fill all required fields');
        return;
      }
    }
    if (step < 3) {
      setStep(step + 1);
    } else {
      onComplete({
        ...formData,
        age: parseInt(formData.age) || 30,
        tob: formData.tob || '12:00',
      });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.appName}>Chetya</Text>
        <Text style={styles.tagline}>Not your kundli. Your life.</Text>

        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Aapki Janam Jankari</Text>
            <Text style={styles.stepSubtitle}>Your birth details</Text>

            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Rahul Sharma"
              placeholderTextColor="#666"
              value={formData.name}
              onChangeText={(t) => setFormData({ ...formData, name: t })}
            />

            <Text style={styles.label}>Date of Birth * (DD/MM/YYYY)</Text>
            <TextInput
              style={styles.input}
              placeholder="15/03/1995"
              placeholderTextColor="#666"
              value={formData.dob}
              onChangeText={(t) => setFormData({ ...formData, dob: t })}
              keyboardType="numeric"
            />

            <Text style={styles.label}>Time of Birth (HH:MM, 24-hour format)</Text>
            <TextInput
              style={styles.input}
              placeholder="14:30 (leave blank if unknown)"
              placeholderTextColor="#666"
              value={formData.tob}
              onChangeText={(t) => setFormData({ ...formData, tob: t })}
            />
            <Text style={styles.hint}>
              ⚡ Exact birth time makes predictions 10x more precise.{' '}
              Check birth certificate or ask parents.
            </Text>

            <Text style={styles.label}>Place of Birth *</Text>
            <TextInput
              style={styles.input}
              placeholder="Faridabad, Haryana, India"
              placeholderTextColor="#666"
              value={formData.place}
              onChangeText={(t) => setFormData({ ...formData, place: t })}
            />
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Aapki Abhi Ki Situation</Text>
            <Text style={styles.stepSubtitle}>Your current life situation</Text>

            <Text style={styles.label}>Main concern right now</Text>
            <View style={styles.chipContainer}>
              {CONCERNS.map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={[
                    styles.chip,
                    formData.main_concern === c.key && styles.chipSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, main_concern: c.key })}
                >
                  <Text
                    style={[
                      styles.chipText,
                      formData.main_concern === c.key && styles.chipTextSelected,
                    ]}
                  >
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Your current situation</Text>
            <View style={styles.chipContainer}>
              {SITUATIONS.map((s) => (
                <TouchableOpacity
                  key={s.key}
                  style={[
                    styles.chip,
                    formData.financial_situation === s.key && styles.chipSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, financial_situation: s.key })}
                >
                  <Text
                    style={[
                      styles.chipText,
                      formData.financial_situation === s.key && styles.chipTextSelected,
                    ]}
                  >
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Where are you living?</Text>
            <View style={styles.chipContainer}>
              {LOCATIONS.map((l) => (
                <TouchableOpacity
                  key={l.key}
                  style={[
                    styles.chip,
                    formData.location_type === l.key && styles.chipSelected,
                  ]}
                  onPress={() =>
                    setFormData({ ...formData, location_type: l.key as any })
                  }
                >
                  <Text
                    style={[
                      styles.chipText,
                      formData.location_type === l.key && styles.chipTextSelected,
                    ]}
                  >
                    {l.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Your age</Text>
            <TextInput
              style={styles.input}
              placeholder="29"
              placeholderTextColor="#666"
              value={formData.age}
              onChangeText={(t) => setFormData({ ...formData, age: t })}
              keyboardType="numeric"
            />

            <Text style={styles.label}>One specific question (optional but powerful)</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Should I change my job this year? Will my marriage happen soon?"
              placeholderTextColor="#666"
              value={formData.specific_question}
              onChangeText={(t) =>
                setFormData({ ...formData, specific_question: t })
              }
              multiline
            />
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Bhasha Chuniye</Text>
            <Text style={styles.stepSubtitle}>Choose your language</Text>

            {[
              { key: 'hi', label: '🇮🇳 Hindi — हिन्दी' },
              { key: 'en', label: '🌐 English' },
              { key: 'ta', label: 'தமிழ் — Tamil' },
              { key: 'te', label: 'తెలుగు — Telugu' },
              { key: 'mr', label: 'मराठी — Marathi' },
              { key: 'bn', label: 'বাংলা — Bengali' },
            ].map((lang) => (
              <TouchableOpacity
                key={lang.key}
                style={[
                  styles.langButton,
                  formData.language === lang.key && styles.langButtonSelected,
                ]}
                onPress={() => setFormData({ ...formData, language: lang.key })}
              >
                <Text
                  style={[
                    styles.langText,
                    formData.language === lang.key && styles.langTextSelected,
                  ]}
                >
                  {lang.label}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>Aapki Details</Text>
              <Text style={styles.summaryText}>Name: {formData.name}</Text>
              <Text style={styles.summaryText}>DOB: {formData.dob}</Text>
              <Text style={styles.summaryText}>Place: {formData.place}</Text>
              <Text style={styles.summaryText}>
                Concern: {CONCERNS.find((c) => c.key === formData.main_concern)?.label}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.buttonRow}>
          {step > 1 && (
            <TouchableOpacity style={styles.backButton} onPress={() => setStep(step - 1)}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextButton, loading && { opacity: 0.6 }]}
            onPress={handleNext}
            disabled={loading}
          >
            <Text style={styles.nextButtonText}>
              {step === 3 ? '✨ Meri Kundli Dekho' : 'Next →'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.progressRow}>
          {[1, 2, 3].map((s) => (
            <View key={s} style={[styles.dot, step >= s && styles.dotActive]} />
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const GOLD = '#D4AF37';
const NAVY = '#0F1631';
const DARK = '#1A2142';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY },
  scroll: { padding: 24, paddingTop: 60 },
  appName: {
    fontSize: 36,
    fontWeight: '700',
    color: GOLD,
    textAlign: 'center',
    letterSpacing: 4,
  },
  tagline: {
    fontSize: 14,
    color: '#8899BB',
    textAlign: 'center',
    marginBottom: 32,
    marginTop: 4,
    fontStyle: 'italic',
  },
  stepContainer: { marginBottom: 24 },
  stepTitle: { fontSize: 22, fontWeight: '600', color: '#FFFFFF', marginBottom: 4 },
  stepSubtitle: { fontSize: 13, color: '#8899BB', marginBottom: 24 },
  label: {
    fontSize: 13,
    color: GOLD,
    marginBottom: 8,
    marginTop: 16,
    fontWeight: '500',
  },
  input: {
    backgroundColor: DARK,
    borderRadius: 10,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 15,
    borderWidth: 0.5,
    borderColor: '#2A3560',
  },
  hint: { fontSize: 11, color: '#6677AA', marginTop: 6, fontStyle: 'italic' },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A3560',
    backgroundColor: DARK,
    marginBottom: 4,
  },
  chipSelected: { backgroundColor: GOLD, borderColor: GOLD },
  chipText: { color: '#8899BB', fontSize: 13 },
  chipTextSelected: { color: NAVY, fontWeight: '600' },
  langButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A3560',
    backgroundColor: DARK,
    marginBottom: 8,
  },
  langButtonSelected: { backgroundColor: GOLD, borderColor: GOLD },
  langText: { color: '#FFFFFF', fontSize: 16 },
  langTextSelected: { color: NAVY, fontWeight: '700' },
  summaryBox: {
    backgroundColor: DARK,
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    borderWidth: 0.5,
    borderColor: GOLD,
  },
  summaryTitle: { color: GOLD, fontWeight: '600', fontSize: 14, marginBottom: 8 },
  summaryText: { color: '#AABBCC', fontSize: 13, marginBottom: 4 },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  backButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A3560',
    alignItems: 'center',
  },
  backButtonText: { color: '#8899BB', fontSize: 16 },
  nextButton: {
    flex: 2,
    backgroundColor: GOLD,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: { color: NAVY, fontSize: 16, fontWeight: '700' },
  progressRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 24, marginBottom: 40 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2A3560' },
  dotActive: { backgroundColor: GOLD },
});

