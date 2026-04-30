import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { ChatMessage, sendChatMessage } from '../services/api';

export default function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: ChatMessage = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const data = await sendChatMessage(next, sessionId);
      setSessionId(data.session_id);
      setMessages([...next, data.message]);
    } catch {
      setMessages([
        ...next,
        {
          role: 'assistant',
          content:
            'There was a problem reaching the server. Check EXPO_PUBLIC_API_URL and that you are logged in.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.welcome}>
        Namaste — this is your space. Share what is on your mind; your guru replies in the language you chose at
        login.
      </Text>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View
            style={[styles.bubble, item.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}
          >
            <Text style={styles.bubbleText}>{item.content}</Text>
          </View>
        )}
      />
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="Type your message…"
          placeholderTextColor="#666"
          value={input}
          onChangeText={setInput}
          multiline
          editable={!loading}
        />
        <TouchableOpacity style={styles.send} onPress={send} disabled={loading}>
          {loading ? <ActivityIndicator color="#1a1a2e" /> : <Text style={styles.sendText}>Send</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  welcome: { color: '#8a8068', fontSize: 14, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  list: { padding: 16, paddingBottom: 8 },
  bubble: {
    maxWidth: '88%',
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
  },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: '#2d4a6f' },
  bubbleAssistant: { alignSelf: 'flex-start', backgroundColor: '#1e1e24', borderWidth: 1, borderColor: '#2a2a32' },
  bubbleText: { color: '#e8e4dc', fontSize: 15, lineHeight: 22 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#222',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#151518',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f5e6c8',
    maxHeight: 120,
    fontSize: 16,
  },
  send: {
    backgroundColor: '#c9a227',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    minWidth: 72,
    alignItems: 'center',
  },
  sendText: { color: '#1a1a2e', fontWeight: '700', fontSize: 15 },
});
