import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api, subscribeSSE } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useAppMode } from '../context/AppModeContext';
import { COLORS, SPACING, RADIUS, FONT } from '../theme';

const DEMO_MSGS = [
  { id: 'm1', content: 'Bonjour, est-ce que cet objet est toujours disponible ?', sentAt: new Date(Date.now() - 120000).toISOString(), sender: { id: 'u2', username: 'alice_d' } },
  { id: 'm2', content: 'Oui ! Vous pouvez passer le r\u00e9cup\u00e9rer demain.', sentAt: new Date(Date.now() - 60000).toISOString(), sender: { id: 'me', username: 'moi' } },
  { id: 'm3', content: 'Super, merci beaucoup !', sentAt: new Date().toISOString(), sender: { id: 'u2', username: 'alice_d' } },
];

function relTime(d) {
  if (!d) return '';
  const diff = (Date.now() - new Date(d)) / 1000;
  if (diff < 60)    return 'Maintenant';
  if (diff < 3600)  return Math.floor(diff / 60) + ' min';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h';
  return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatScreen({ route, navigation }) {
  const { partnerId, partnerName, itemId, itemName } = route.params;
  const { user }              = useAuth();
  const { demoMode }          = useAppMode();
  const [messages, setMessages] = useState([]);
  const [text,     setText]     = useState('');
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    navigation.setOptions({
      title: partnerName,
      headerRight: () => (
        <Text style={{ fontSize: 12, color: COLORS.muted, marginRight: 8 }} numberOfLines={1}>
          {itemName}
        </Text>
      ),
    });
  }, [partnerName, itemName]);

  const loadMessages = useCallback(async () => {
    try {
      if (demoMode) { setMessages(DEMO_MSGS); return; }
      const data = await api.getThread(itemId, partnerId);
      setMessages(data.messages || []);
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally { setLoading(false); }
  }, [demoMode, itemId, partnerId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // SSE : \u00e9coute NEW_MESSAGE pour ce thread
  useEffect(() => {
    if (demoMode) return;
    const unsub = subscribeSSE((event, data) => {
      if (
        (event === 'NEW_MESSAGE' || event === 'notification') &&
        data?.itemId === itemId
      ) {
        // Ajoute le message directement si les donn\u00e9es sont l\u00e0, sinon recharge
        if (data.message) {
          setMessages(prev => [...prev, data.message]);
        } else {
          loadMessages();
        }
      }
    });
    return unsub;
  }, [demoMode, itemId, loadMessages]);

  // Scroll auto en bas \u00e0 chaque nouveau message
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  async function send() {
    const content = text.trim();
    if (!content) return;
    setText('');
    setSending(true);
    try {
      if (demoMode) {
        const fake = { id: String(Date.now()), content, sentAt: new Date().toISOString(), sender: { id: 'me', username: user?.username || 'moi' } };
        setMessages(prev => [...prev, fake]);
        return;
      }
      const { message } = await api.sendMessage(partnerId, itemId, content);
      setMessages(prev => [...prev, message]);
    } catch (e) {
      Alert.alert('Erreur envoi', e.data?.message || e.message);
      setText(content); // remet le texte si erreur
    } finally { setSending(false); }
  }

  function isMe(msg) {
    return demoMode
      ? msg.sender?.id === 'me'
      : msg.sender?.id === user?.id;
  }

  if (loading) return (
    <SafeAreaView style={s.safe}>
      <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => String(m.id)}
          contentContainerStyle={s.list}
          renderItem={({ item: msg }) => {
            const mine = isMe(msg);
            return (
              <View style={[s.bubble, mine ? s.bubbleMine : s.bubbleOther]}>
                {!mine && (
                  <Text style={s.bubbleSender}>{msg.sender?.username}</Text>
                )}
                <Text style={[s.bubbleText, mine && s.bubbleTextMine]}>{msg.content}</Text>
                <Text style={[s.bubbleTime, mine && { color: 'rgba(255,255,255,0.6)' }]}>
                  {relTime(msg.sentAt)}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={s.emptyChat}>
              <Ionicons name="chatbubble-outline" size={40} color={COLORS.faint} />
              <Text style={s.emptyChatText}>D\u00e9butez la conversation</Text>
            </View>
          }
        />

        {/* Barre de saisie */}
        <View style={s.inputBar}>
          <TextInput
            style={s.input}
            value={text}
            onChangeText={setText}
            placeholder="Votre message\u2026"
            placeholderTextColor={COLORS.faint}
            multiline
            maxLength={500}
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[s.sendBtn, (!text.trim() || sending) && s.sendBtnDisabled]}
            onPress={send}
            disabled={!text.trim() || sending}
          >
            {sending
              ? <ActivityIndicator color={COLORS.white} size="small" />
              : <Ionicons name="send" size={18} color={COLORS.white} />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: COLORS.bg },
  list:           { padding: SPACING.base, gap: SPACING.sm, paddingBottom: 12 },
  bubble:         { maxWidth: '78%', borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: 2 },
  bubbleMine:     { alignSelf: 'flex-end', backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleOther:    { alignSelf: 'flex-start', backgroundColor: COLORS.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: COLORS.border },
  bubbleSender:   { fontSize: 11, fontWeight: FONT.bold, color: COLORS.primary, marginBottom: 3 },
  bubbleText:     { fontSize: 15, color: COLORS.text, lineHeight: 21 },
  bubbleTextMine: { color: COLORS.white },
  bubbleTime:     { fontSize: 10, color: COLORS.faint, marginTop: 4, textAlign: 'right' },
  emptyChat:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 8 },
  emptyChatText:  { fontSize: 14, color: COLORS.muted },
  inputBar:       { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm, padding: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.surface },
  input:          { flex: 1, backgroundColor: COLORS.offset, borderRadius: RADIUS.xl, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: SPACING.md, paddingVertical: 10, fontSize: 15, color: COLORS.text, maxHeight: 100 },
  sendBtn:        { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled:{ backgroundColor: COLORS.faint },
});
