import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { api, subscribeSSE } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useAppMode } from '../context/AppModeContext';
import { COLORS, SPACING, RADIUS, FONT } from '../theme';

const BASE_DEMO_CONVS = [
  {
    id: 'd1',
    partner:     { id: 'u2', username: 'alice_d' },
    item:        { id: 'demo-1', name: 'MacBook Pro 14\" gris' },
    lastMessage: { content: "Oui c'est bien le mien, merci\u00a0!", sentAt: new Date().toISOString() },
    unreadCount: 2,
  },
  {
    id: 'd2',
    partner:     { id: 'u3', username: 'marc_t' },
    item:        { id: 'demo-2', name: 'Cl\u00e9s de voiture Renault' },
    lastMessage: { content: 'Vous avez retrouv\u00e9 mes cl\u00e9s\u00a0?', sentAt: new Date(Date.now() - 86400000).toISOString() },
    unreadCount: 0,
  },
];

// Nouveaux messages entrants simul\u00e9s toutes les ~15s en mode d\u00e9mo
const DEMO_INCOMING = [
  { fromId: 'u2', fromName: 'alice_d', convId: 'd1', itemId: 'demo-1', itemName: 'MacBook Pro 14\" gris', content: 'Je suis disponible demain matin !' },
  { fromId: 'u3', fromName: 'marc_t',  convId: 'd2', itemId: 'demo-2', itemName: 'Cl\u00e9s de voiture Renault', content: 'Avez-vous des nouvelles\u00a0?' },
  { fromId: 'u2', fromName: 'alice_d', convId: 'd1', itemId: 'demo-1', itemName: 'MacBook Pro 14\" gris', content: '\u00c0 quelle heure puis-je passer\u00a0?' },
];
let _incomingIdx = 0;

function normalizeConv(raw, myId) {
  if (!raw) return null;
  const partner = raw.sender?.id === myId ? raw.recipient : raw.sender;
  return {
    id:          raw.id,
    partner:     partner || { id: '?', username: 'Utilisateur' },
    item:        raw.item || { id: '?', name: 'Objet' },
    lastMessage: { content: raw.content, sentAt: raw.sentAt },
    unreadCount: raw.readAt ? 0 : (raw.recipient?.id === myId ? 1 : 0),
  };
}

function relDate(d) {
  if (!d) return '';
  const diff = (Date.now() - new Date(d)) / 1000;
  if (diff < 60)     return 'Maintenant';
  if (diff < 3600)   return Math.floor(diff / 60) + ' min';
  if (diff < 86400)  return Math.floor(diff / 3600) + 'h';
  if (diff < 172800) return 'Hier';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function MessagesScreen({ navigation }) {
  const { user }                    = useAuth();
  const { demoMode }                = useAppMode();
  const [convs, setConvs]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const demoInterval                = useRef(null);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      if (demoMode) { setConvs([...BASE_DEMO_CONVS]); return; }
      const data = await api.getConversations();
      const raw  = data.conversations || data.data || [];
      setConvs(raw.map(c => normalizeConv(c, user?.id)).filter(Boolean));
    } catch (_) {
      setConvs(demoMode ? [...BASE_DEMO_CONVS] : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [demoMode, user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // SSE r\u00e9el
  useEffect(() => {
    if (demoMode) return;
    const unsub = subscribeSSE((event) => {
      if (event === 'NEW_MESSAGE' || event === 'notification') load();
    });
    return unsub;
  }, [demoMode, load]);

  // Simulation SSE en mode d\u00e9mo : un message entrant toutes les ~15s
  useFocusEffect(useCallback(() => {
    if (!demoMode) return;
    demoInterval.current = setInterval(() => {
      const incoming = DEMO_INCOMING[_incomingIdx % DEMO_INCOMING.length];
      _incomingIdx++;
      setConvs(prev => prev.map(c => {
        if (c.id !== incoming.convId) return c;
        return {
          ...c,
          lastMessage: { content: incoming.content, sentAt: new Date().toISOString() },
          unreadCount: c.unreadCount + 1,
        };
      }));
    }, 15000);
    return () => clearInterval(demoInterval.current);
  }, [demoMode]));

  function openChat(conv) {
    // Remet unreadCount \u00e0 0 localement au tap
    setConvs(prev => prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c));
    navigation.navigate('Chat', {
      partnerId:   conv.partner.id,
      partnerName: conv.partner.username,
      itemId:      conv.item.id,
      itemName:    conv.item.name,
    });
  }

  if (!loading && convs.length === 0) return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}><Text style={s.headerTitle}>Messagerie</Text></View>
      <View style={s.empty}>
        <Ionicons name="chatbubbles-outline" size={48} color={COLORS.faint} />
        <Text style={s.emptyTitle}>Aucun message</Text>
        <Text style={s.emptyText}>Vos conversations appara\u00eetront ici</Text>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Messagerie</Text>
        <View style={[s.sseDot, demoMode && s.sseDotDemo]} />
      </View>
      <FlatList
        data={convs}
        keyExtractor={i => String(i.id)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true); }}
            tintColor={COLORS.primary}
          />
        }
        renderItem={({ item: conv }) => (
          <TouchableOpacity style={s.conv} onPress={() => openChat(conv)} activeOpacity={0.7}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{(conv.partner?.username || '?')[0].toUpperCase()}</Text>
            </View>
            <View style={s.convInfo}>
              <Text style={s.convName}>{conv.partner?.username || 'Utilisateur'}</Text>
              <Text style={s.convItem} numberOfLines={1}>{conv.item?.name}</Text>
              <Text style={[s.convPreview, conv.unreadCount > 0 && s.convPreviewUnread]} numberOfLines={1}>
                {conv.lastMessage?.content || '\u2026'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={s.convTime}>{relDate(conv.lastMessage?.sentAt)}</Text>
              {conv.unreadCount > 0 && (
                <View style={s.unreadBadge}>
                  <Text style={s.unreadBadgeText}>{conv.unreadCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: COLORS.bg },
  header:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  headerTitle:       { fontSize: 17, fontWeight: FONT.bold, color: COLORS.text },
  sseDot:            { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success },
  sseDotDemo:        { backgroundColor: COLORS.warn },
  empty:             { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle:        { fontSize: 17, fontWeight: FONT.semibold, color: COLORS.text },
  emptyText:         { fontSize: 14, color: COLORS.muted },
  conv:              { flexDirection: 'row', alignItems: 'center', padding: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.divider, gap: SPACING.md, minHeight: 72 },
  avatar:            { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primaryHi, alignItems: 'center', justifyContent: 'center' },
  avatarText:        { fontSize: 18, fontWeight: FONT.bold, color: COLORS.primary },
  convInfo:          { flex: 1, minWidth: 0 },
  convName:          { fontSize: 15, fontWeight: FONT.semibold, color: COLORS.text },
  convItem:          { fontSize: 11, color: COLORS.primary, marginTop: 1 },
  convPreview:       { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  convPreviewUnread: { color: COLORS.text, fontWeight: FONT.semibold },
  convTime:          { fontSize: 12, color: COLORS.faint },
  unreadBadge:       { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  unreadBadgeText:   { fontSize: 11, color: COLORS.white, fontWeight: FONT.bold },
});
