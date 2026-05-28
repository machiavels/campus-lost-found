import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { COLORS, SPACING, RADIUS, FONT } from '../theme';

const DEMO_CONVS = [
  { id: 1, other: { username: 'alice_d' }, preview: 'Oui c\'est bien le mien, merci !', updatedAt: new Date().toISOString(), unread: true },
  { id: 2, other: { username: 'marc_t'  }, preview: 'Vous avez retrouvé mes clés ?',  updatedAt: new Date(Date.now() - 86400000).toISOString(), unread: false },
];

export default function MessagesScreen() {
  const [convs, setConvs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getConversations()
      .then(data => setConvs(data.conversations || data.data || data))
      .catch(() => setConvs(DEMO_CONVS))
      .finally(() => setLoading(false));
  }, []);

  function relDate(d) {
    if (!d) return '';
    const diff = (Date.now() - new Date(d)) / 1000;
    if (diff < 3600) return Math.floor(diff / 60) + ' min';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h';
    return 'Hier';
  }

  if (!loading && convs.length === 0) return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}><Text style={s.headerTitle}>Messagerie</Text></View>
      <View style={s.empty}>
        <Ionicons name="chatbubbles-outline" size={48} color={COLORS.faint} />
        <Text style={s.emptyTitle}>Aucun message</Text>
        <Text style={s.emptyText}>Vos conversations apparaîtront ici</Text>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}><Text style={s.headerTitle}>Messagerie</Text></View>
      <FlatList
        data={convs} keyExtractor={i => String(i.id)}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.conv} onPress={() => Alert.alert('Conversation', 'Messagerie complète — prochaine itération')} activeOpacity={0.7}>
            <View style={s.avatar}><Text style={s.avatarText}>{(item.other?.username || '?')[0].toUpperCase()}</Text></View>
            <View style={s.convInfo}>
              <Text style={s.convName}>{item.other?.username || 'Utilisateur'}</Text>
              <Text style={s.convPreview} numberOfLines={1}>{item.preview || item.lastMessage?.content || '…'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Text style={s.convTime}>{relDate(item.updatedAt)}</Text>
              {item.unread && <View style={s.unreadDot} />}
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: COLORS.bg },
  header:      { padding: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  headerTitle: { fontSize: 17, fontWeight: FONT.bold, color: COLORS.text },
  empty:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle:  { fontSize: 17, fontWeight: FONT.semibold, color: COLORS.text },
  emptyText:   { fontSize: 14, color: COLORS.muted },
  conv:        { flexDirection: 'row', alignItems: 'center', padding: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.divider, gap: SPACING.md, minHeight: 68 },
  avatar:      { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primaryHi, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontSize: 17, fontWeight: FONT.bold, color: COLORS.primary },
  convInfo:    { flex: 1, minWidth: 0 },
  convName:    { fontSize: 15, fontWeight: FONT.semibold, color: COLORS.text },
  convPreview: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  convTime:    { fontSize: 12, color: COLORS.faint },
  unreadDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
});
