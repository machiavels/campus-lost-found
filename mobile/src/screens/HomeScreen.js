import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useAppMode } from '../context/AppModeContext';
import { COLORS, SPACING, RADIUS, FONT, TYPE_BADGE, STATUS_LABEL } from '../theme';

const DEMO = [
  { id:'demo-1', title:'MacBook Pro 14" gris', description:'Retrouvé sous une table côté fenêtre.', type:'found', status:'OPEN', category:'Électronique', location:'Bibliothèque centrale', createdAt:'2026-05-27', reporter:{id:'u1', username:'alice_d'} },
  { id:'demo-2', title:'Clés de voiture Renault', description:'Trousseau avec 3 clés et un porte-clé bleu.', type:'lost', status:'OPEN', category:'Clés', location:'Parking B', createdAt:'2026-05-27', reporter:{id:'u2', username:'marc_t'} },
  { id:'demo-3', title:'AirPods Pro blanc', description:'Boîtier sans gravure.', type:'found', status:'CLAIMED', category:'Électronique', location:'Bâtiment C', createdAt:'2026-05-26', reporter:{id:'u3', username:'sofia_m'} },
  { id:'demo-4', title:'Veste Patagonia verte', description:'Laissée sur une chaise en amphi 2.', type:'lost', status:'OPEN', category:'Vêtements', location:'Amphi 2', createdAt:'2026-05-26', reporter:{id:'u4', username:'lucas_r'} },
  { id:'demo-5', title:'Calculatrice TI-82', description:'Nom collé au dos.', type:'found', status:'RESOLVED', category:'Électronique', location:'Salle TD 12', createdAt:'2026-05-24', reporter:{id:'u5', username:'emma_b'} },
];

const DEMO_ADMIN_STATS = { lost: 12, found: 19, resolved: 8, pending: 4, claimed: 3 };

function normalizeItem(item) {
  if (!item) return item;
  return {
    ...item,
    title:    item.title    || item.name || '',
    type:     (item.type    || item.reportType || 'lost').toLowerCase(),
    location: typeof item.location === 'object' ? (item.location?.name ?? '') : (item.location || ''),
    category: typeof item.category === 'object' ? (item.category?.name ?? '') : (item.category || ''),
    reporter: item.reporter || item.user || { username: 'inconnu' },
  };
}

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
  const type  = item.type || 'lost';
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
  const { user }                          = useAuth();
  const { demoMode, adminDemo, toggleDemo, toggleAdminDemo } = useAppMode();
  const [items,     setItems]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [stats,     setStats]     = useState({ lost: 0, found: 0, resolved: 0 });

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      if (demoMode) {
        const list = DEMO;
        setItems(list);
        setStats(adminDemo ? DEMO_ADMIN_STATS : {
          lost:     list.filter(i => i.type === 'lost').length,
          found:    list.filter(i => i.type === 'found').length,
          resolved: list.filter(i => i.status === 'RESOLVED').length,
        });
        return;
      }
      const data = await api.getItems();
      const raw  = data.items || data.data || data;
      const list = (Array.isArray(raw) ? raw : []).map(normalizeItem);
      setItems(list);
      setStats(adminDemo
        ? DEMO_ADMIN_STATS
        : {
            lost:     list.filter(i => i.type === 'lost').length,
            found:    list.filter(i => i.type === 'found').length,
            resolved: list.filter(i => i.status === 'RESOLVED').length,
          }
      );
    } catch (e) {
      setItems(DEMO);
      setStats({ lost: 2, found: 3, resolved: 1 });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [demoMode, adminDemo]);

  useEffect(() => { load(); }, [load]);

  const openDetail = (item) => navigation.navigate('Detail', { item });

  const StatBoxes = adminDemo
    ? [
        { num: stats.lost,     label: 'Perdus'   },
        { num: stats.found,    label: 'Trouvés'  },
        { num: stats.resolved, label: 'Rendus'   },
        { num: stats.pending,  label: 'En attente' },
        { num: stats.claimed,  label: 'Réclamés' },
      ]
    : [
        { num: stats.lost,     label: 'Perdus'  },
        { num: stats.found,    label: 'Trouvés' },
        { num: stats.resolved, label: 'Rendus'  },
      ];

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

      {/* Bandeau Démo / Backend */}
      <View style={s.modeBanner}>
        <View style={s.modeRow}>
          <Ionicons name={demoMode ? 'flask-outline' : 'cloud-outline'} size={15} color={demoMode ? COLORS.warn : COLORS.primary} />
          <Text style={[s.modeLabel, { color: demoMode ? COLORS.warn : COLORS.primary }]}>
            {demoMode ? 'Mode démo' : 'Mode backend'}
          </Text>
          <Switch
            value={demoMode}
            onValueChange={toggleDemo}
            trackColor={{ false: COLORS.primaryHi, true: '#FFF3CD' }}
            thumbColor={demoMode ? COLORS.warn : COLORS.primary}
            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
          />
        </View>
        {demoMode && (
          <View style={s.modeRow}>
            <Ionicons name="shield-outline" size={15} color={adminDemo ? COLORS.error : COLORS.muted} />
            <Text style={[s.modeLabel, { color: adminDemo ? COLORS.error : COLORS.muted }]}>
              Vue admin
            </Text>
            <Switch
              value={adminDemo}
              onValueChange={toggleAdminDemo}
              trackColor={{ false: COLORS.offset, true: '#FFE0E0' }}
              thumbColor={adminDemo ? COLORS.error : COLORS.faint}
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
          </View>
        )}
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
              {adminDemo && <View style={s.adminBadge}><Text style={s.adminBadgeLabel}>👑 Vue admin activée</Text></View>}
            </View>
            <View style={s.statsRow}>
              {StatBoxes.map(s2 => (
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
          loading
            ? <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
            : <Text style={s.empty}>Aucun objet pour l'instant.</Text>
        }
        renderItem={({ item }) => <ItemCard item={item} onPress={openDetail} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: COLORS.bg },
  topBar:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  topLogo:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoMini:        { width: 26, height: 26, borderRadius: 8, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  topTitle:        { fontSize: 16, fontWeight: FONT.bold, color: COLORS.text },
  notifBtn:        { padding: 6 },
  modeBanner:      { flexDirection: 'row', flexWrap: 'wrap', gap: 4, paddingHorizontal: SPACING.base, paddingVertical: 6, backgroundColor: COLORS.offset, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  modeRow:         { flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 8 },
  modeLabel:       { fontSize: 12, fontWeight: FONT.semibold },
  feedHeader:      { paddingHorizontal: SPACING.base, paddingTop: SPACING.lg, paddingBottom: SPACING.sm },
  feedTitle:       { fontSize: 22, fontWeight: FONT.bold, color: COLORS.text, letterSpacing: -0.5 },
  feedSub:         { fontSize: 14, color: COLORS.muted, marginTop: 2 },
  adminBadge:      { alignSelf: 'flex-start', marginTop: 6, backgroundColor: '#FFE0E0', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  adminBadgeLabel: { fontSize: 12, color: COLORS.error, fontWeight: FONT.bold },
  statsRow:        { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.base, gap: SPACING.sm, marginBottom: SPACING.sm },
  statBox:         { flex: 1, minWidth: 60, backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.md, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  statNum:         { fontSize: 22, fontWeight: FONT.bold, color: COLORS.primary },
  statLabel:       { fontSize: 11, color: COLORS.muted, marginTop: 2, textAlign: 'center' },
  sectionLabel:    { paddingHorizontal: SPACING.base, paddingBottom: 6, fontSize: 11, fontWeight: FONT.bold, color: COLORS.faint, letterSpacing: 1 },
  card:            { flexDirection: 'row', backgroundColor: COLORS.surface, marginHorizontal: SPACING.base, marginBottom: SPACING.sm, borderRadius: RADIUS.xl, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  cardImgPlaceholder: { width: 80, backgroundColor: COLORS.offset, alignItems: 'center', justifyContent: 'center' },
  cardBody:        { flex: 1, padding: SPACING.md },
  cardHeader:      { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 4 },
  cardTitle:       { fontSize: 15, fontWeight: FONT.semibold, color: COLORS.text, flex: 1 },
  badge:           { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  badgeLabel:      { fontSize: 11, fontWeight: FONT.bold },
  cardDesc:        { fontSize: 12, color: COLORS.muted, lineHeight: 18, marginBottom: 6 },
  cardMeta:        { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardLoc:         { fontSize: 11, color: COLORS.muted, flex: 1 },
  cardDate:        { fontSize: 11, color: COLORS.faint },
  empty:           { textAlign: 'center', color: COLORS.muted, marginTop: 60, fontSize: 15 },
});
