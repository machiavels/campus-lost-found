import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, RADIUS, FONT, TYPE_BADGE, STATUS_LABEL } from '../theme';

const DEMO = [
  { id:1, title:'MacBook Pro 14" gris', description:'Retrouvé sous une table côté fenêtre.', type:'found', status:'OPEN', category:'ELECTRONICS', location:'Bibliothèque centrale', createdAt:'2026-05-27', reporter:{username:'alice_d'} },
  { id:2, title:'Clés de voiture Renault', description:'Trousseau avec 3 clés et un porte-clé bleu.', type:'lost', status:'OPEN', category:'KEYS', location:'Parking B', createdAt:'2026-05-27', reporter:{username:'marc_t'} },
  { id:3, title:'AirPods Pro blanc', description:'Boîtier sans gravure.', type:'found', status:'CLAIMED', category:'ELECTRONICS', location:'Bâtiment C', createdAt:'2026-05-26', reporter:{username:'sofia_m'} },
  { id:4, title:'Veste Patagonia verte', description:'Laissée sur une chaise en amphi 2.', type:'lost', status:'OPEN', category:'CLOTHING', location:'Amphi 2', createdAt:'2026-05-26', reporter:{username:'lucas_r'} },
  { id:5, title:'Calculatrice TI-82', description:'Nom collé au dos.', type:'found', status:'OPEN', category:'ELECTRONICS', location:'Salle TD 12', createdAt:'2026-05-24', reporter:{username:'emma_b'} },
];

function relDate(d) {
  if (!d) return '';
  const diff = (Date.now() - new Date(d)) / 1000;
  if (diff < 60) return 'À l\'instant';
  if (diff < 3600) return Math.floor(diff / 60) + ' min';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h';
  if (diff < 172800) return 'Hier';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function ItemCard({ item, onPress }) {
  const type = item.type || 'lost';
  const badge = TYPE_BADGE[type] || TYPE_BADGE.lost;
  return (
    <TouchableOpacity style={s.card} onPress={() => onPress(item)} activeOpacity={0.75}>
      <View style={s.cardImgPlaceholder}>
        <Ionicons name="image-outline" size={28} color={COLORS.faint} />
      </View>
      <View style={s.cardBody}>
        <View style={s.cardHeader}>
          <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
          <View style={[s.badge, { backgroundColor: badge.bg }]}>
            <Text style={[s.badgeLabel, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>
        {!!item.description && (
          <Text style={s.cardDesc} numberOfLines={2}>{item.description}</Text>
        )}
        <View style={s.cardMeta}>
          <Ionicons name="location-outline" size={12} color={COLORS.muted} />
          <Text style={s.cardLoc} numberOfLines={1}>{item.location || '—'}</Text>
          <Text style={s.cardDate}>{relDate(item.createdAt || item.date)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [items,     setItems]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [stats,     setStats]     = useState({ lost: 0, found: 0, resolved: 0 });
  const [error,     setError]     = useState('');

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const data = await api.getItems();
      const list = data.items || data.data || data;
      setItems(Array.isArray(list) ? list : DEMO);
      setStats({
        lost:     list.filter(i => i.type === 'lost').length,
        found:    list.filter(i => i.type === 'found').length,
        resolved: list.filter(i => i.status === 'RESOLVED').length,
      });
    } catch (e) {
      setItems(DEMO);
      setStats({ lost: 2, found: 3, resolved: 1 });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const openDetail = (item) => navigation.navigate('Detail', { item });

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.topBar}>
        <View style={s.topLogo}>
          <View style={s.logoMini}><Ionicons name="search" size={14} color={COLORS.white} /></View>
          <Text style={s.topTitle}>Campus L&F</Text>
        </View>
        <TouchableOpacity style={s.notifBtn} onPress={() => {}}>
          <Ionicons name="notifications-outline" size={22} color={COLORS.muted} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={i => String(i.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={COLORS.primary} />}
        ListHeaderComponent={
          <>
            <View style={s.feedHeader}>
              <Text style={s.feedTitle}>Objets perdus & trouvés</Text>
              <Text style={s.feedSub}>Bonjour{user?.username ? ', ' + user.username : ''} 👋</Text>
            </View>
            <View style={s.statsRow}>
              {[{num: stats.lost, label: 'Perdus'}, {num: stats.found, label: 'Trouvés'}, {num: stats.resolved, label: 'Rendus'}].map(s2 => (
                <View key={s2.label} style={s.statBox}>
                  <Text style={s.statNum}>{s2.num}</Text>
                  <Text style={s.statLabel}>{s2.label}</Text>
                </View>
              ))}
            </View>
            <Text style={s.sectionLabel}>RÉCENTS</Text>
          </>
        }
        ListEmptyComponent={
          loading ? <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
          : <View style={s.empty}><Ionicons name="file-tray-outline" size={40} color={COLORS.faint} /><Text style={s.emptyText}>Aucun objet pour l\'instant</Text></View>
        }
        renderItem={({ item }) => <ItemCard item={item} onPress={openDetail} />}
        contentContainerStyle={{ padding: SPACING.base, paddingBottom: 80 }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: COLORS.bg },
  topBar:      { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, paddingHorizontal: SPACING.base, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  topLogo:     { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  logoMini:    { width: 26, height: 26, borderRadius: 7, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  topTitle:    { fontSize: 15, fontWeight: FONT.bold, color: COLORS.text },
  notifBtn:    { padding: 6 },
  feedHeader:  { marginBottom: SPACING.md },
  feedTitle:   { fontSize: 22, fontWeight: FONT.bold, color: COLORS.text, letterSpacing: -0.5 },
  feedSub:     { fontSize: 14, color: COLORS.muted, marginTop: 4 },
  statsRow:    { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  statBox:     { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.md, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  statNum:     { fontSize: 22, fontWeight: FONT.bold, color: COLORS.primary },
  statLabel:   { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  sectionLabel:{ fontSize: 11, fontWeight: FONT.bold, color: COLORS.muted, letterSpacing: 1, marginBottom: SPACING.sm },
  card:        { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md, overflow: 'hidden' },
  cardImgPlaceholder: { height: 80, backgroundColor: COLORS.offset, alignItems: 'center', justifyContent: 'center' },
  cardBody:    { padding: SPACING.md },
  cardHeader:  { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  cardTitle:   { fontSize: 15, fontWeight: FONT.semibold, color: COLORS.text, flex: 1 },
  badge:       { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  badgeLabel:  { fontSize: 11, fontWeight: FONT.bold },
  cardDesc:    { fontSize: 13, color: COLORS.muted, marginBottom: SPACING.sm, lineHeight: 18 },
  cardMeta:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardLoc:     { fontSize: 12, color: COLORS.muted, flex: 1 },
  cardDate:    { fontSize: 11, color: COLORS.faint },
  empty:       { alignItems: 'center', marginTop: 40, gap: 12 },
  emptyText:   { fontSize: 15, color: COLORS.muted },
});
