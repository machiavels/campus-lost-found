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
  { id: 'm2', content: 'Oui\u00a0! Vous pouvez passer le r\u00e9cup\u00e9rer demain.', sentAt: new Date(Date.now() - 60000).toISOString(), sender: { id: 'me', username: 'moi' } },
  { id: 'm3', content: 'Super, merci beaucoup\u00a0!', sentAt: new Date().toISOString(), sender: { id: 'u2', username: 'alice_d' } },
];

// R\u00e9ponses automatiques du "bot" en mode d\u00e9mo
const DEMO_BOT_REPLIES = [
  'D\u00e9accord, je viens demain matin.',
  'Parfait \ud83d\udc4d',
  'Ok, o\u00f9 exactement sur le campus\u00a0?',
  'Je confirme, c\u2019est bien le mien.',
  'Merci pour votre r\u00e9activit\u00e9\u00a0!',
  '\u00c0 quelle heure puis-je passer\u00a0?',
  'Excellent, j\u2019arrive dans 10 minutes.',
];
let _botIdx = 0;
function nextBotReply() {
  const reply = DEMO_BOT_REPLIES[_botIdx % DEMO_BOT_REPLIES.length];
  _botIdx++;
  return reply;
}

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
  const { user }                = useAuth();
  const { demoMode }            = useAppMode();
  const [messages, setMessages] = useState([]);
  const [text,     setText]     = useState('');
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const [typing,   setTyping]   = useState(false); // indicateur "en train d'\u00e9crire" demo
  const listRef    = useRef(null);
  const botTimeout = useRef(null);

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

  // SSE r\u00e9el (hors d\u00e9mo)
  useEffect(() => {
    if (demoMode) return;
    const unsub = subscribeSSE((event, data) => {
      if (
        (event === 'NEW_MESSAGE' || event === 'notification') &&
        data?.itemId === itemId
      ) {
        if (data.message) setMessages(prev => [...prev, data.message]);
        else loadMessages();
      }
    });
    return unsub;
  }, [demoMode, itemId, loadMessages]);

  // Nettoyage timeout bot au d\u00e9montage
  useEffect(() => () => clearTimeout(botTimeout.current), []);

  // Scroll auto
  useEffect(() => {
    if (messages.length > 0)
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  // Simule une r\u00e9ponse bot apr\u00e8s l'envoi d'un message en mode d\u00e9mo
  function scheduleBotReply(senderName) {
    // D\u00e9lai al\u00e9atoire entre 1.5s et 4s pour faire naturel
    const delay = 1500 + Math.random() * 2500;
    setTyping(true);
    botTimeout.current = setTimeout(() => {
      setTyping(false);
      const reply = {
        id:      'bot-' + Date.now(),
        content: nextBotReply(),
        sentAt:  new Date().toISOString(),
        sender:  { id: 'u2', username: senderName },
      };
      setMessages(prev => [...prev, reply]);
    }, delay);
  }

  async function send() {
    const content = text.trim();
    if (!content) return;
    setText('');
    setSending(true);
    try {
      if (demoMode) {
        const fake = {
          id:      String(Date.now()),
          content,
          sentAt:  new Date().toISOString(),
          sender:  { id: 'me', username: user?.username || 'moi' },
        };
        setMessages(prev => [...prev, fake]);
        scheduleBotReply(partnerName);
        return;
      }
      const { message } = await api.sendMessage(partnerId, itemId, content);
      setMessages(prev => [...prev, message]);
    } catch (e) {
      Alert.alert('Erreur envoi', e.data?.message || e.message);
      setText(content);
    } finally { setSending(false); }
  }

  function isMe(msg) {
    return demoMode ? msg.sender?.id === 'me' : msg.sender?.id === user?.id;
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
                {!mine && <Text style={s.bubbleSender}>{msg.sender?.username}</Text>}
                <Text style={[s.bubbleText, mine && s.bubbleTextMine]}>{msg.content}</Text>
                <Text style={[s.bubbleTime, mine && { color: 'rgba(255,255,255,0.6)' }]}>
                  {relTime(msg.sentAt)}
                </Text>
              </View>
            );
          }}
          ListFooterComponent={
            typing ? (
              <View style={[s.bubble, s.bubbleOther, s.typingBubble]}>
                <Text style={s.bubbleSender}>{partnerName}</Text>
                <Text style={s.typingDots}>\u2022\u2022\u2022</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={s.emptyChat}>
              <Ionicons name="chatbubble-outline" size={40} color={COLORS.faint} />
              <Text style={s.emptyChatText}>D\u00e9butez la conversation</Text>
            </View>
          }
        />

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
  safe:            { flex: 1, backgroundColor: COLORS.bg },
  list:            { padding: SPACING.base, gap: SPACING.sm, paddingBottom: 12 },
  bubble:          { maxWidth: '78%', borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: 2 },
  bubbleMine:      { alignSelf: 'flex-end', backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleOther:     { alignSelf: 'flex-start', backgroundColor: COLORS.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: COLORS.border },
  bubbleSender:    { fontSize: 11, fontWeight: FONT.bold, color: COLORS.primary, marginBottom: 3 },
  bubbleText:      { fontSize: 15, color: COLORS.text, lineHeight: 21 },
  bubbleTextMine:  { color: COLORS.white },
  bubbleTime:      { fontSize: 10, color: COLORS.faint, marginTop: 4, textAlign: 'right' },
  typingBubble:    { paddingVertical: 8 },
  typingDots:      { fontSize: 20, color: COLORS.muted, letterSpacing: 4 },
  emptyChat:       { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 8 },
  emptyChatText:   { fontSize: 14, color: COLORS.muted },
  inputBar:        { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm, padding: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.surface },
  input:           { flex: 1, backgroundColor: COLORS.offset, borderRadius: RADIUS.xl, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: SPACING.md, paddingVertical: 10, fontSize: 15, color: COLORS.text, maxHeight: 100 },
  sendBtn:         { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: COLORS.faint },
});
