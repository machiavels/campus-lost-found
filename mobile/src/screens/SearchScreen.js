import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { COLORS, SPACING, RADIUS, FONT, TYPE_BADGE } from '../theme';

const FILTERS = [
  { key: 'all',         label: 'Tous' },
  { key: 'lost',        label: 'Perdus' },
  { key: 'found',       label: 'Trouvés' },
  { key: 'ELECTRONICS', label: 'Électronique' },
  { key: 'CLOTHING',    label: 'Vêtements' },
  { key: 'KEYS',        label: 'Clés' },
  { key: 'BOOKS',       label: 'Livres' },
  { key: 'OTHER',       label: 'Autre' },
];

const DEMO = [
  { id:1, title:'MacBook Pro 14" gris', type:'found', status:'OPEN', location:'Bibliothèque', createdAt:'2026-05-27' },
  { id:2, title:'Clés de voiture Renault', type:'lost', status:'OPEN', location:'Parking B', createdAt:'2026-05-27' },
  { id:4, title:'Veste Patagonia verte', type:'lost', status:'OPEN', location:'Amphi 2', createdAt:'2026-05-26' },
];

export default function SearchScreen({ navigation }) {
  const [query,    setQuery]    = useState('');
  const [filter,   setFilter]   = useState('all');
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);
  const timer = useRef(null);

  function onChangeText(text) {
    setQuery(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => doSearch(text, filter), 350);
  }

  async function doSearch(q, f) {
    if (!q && f === 'all') { setItems([]); setSearched(false); return; }
    setLoading(true); setSearched(true);
    try {
      const filters = {};
      if (f === 'lost' || f === 'found') filters.type = f;
      else if (f !== 'all') filters.category = f;
      const data = await api.search(q, filters);
      const list = data.items || data.data || data;
      setItems(Array.isArray(list) ? list : []);
    } catch {
      setItems(DEMO.filter(i => !q || i.title.toLowerCase().includes(q.toLowerCase())));
    } finally { setLoading(false); }
  }

  function selectFilter(key) {
    setFilter(key);
    doSearch(query, key);
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.searchBar}>
        <Ionicons name="search-outline" size={18} color={COLORS.faint} />
        <TextInput
          style={s.searchInput} value={query} onChangeText={onChangeText}
          placeholder="Chercher un objet…" placeholderTextColor={COLORS.faint}
          autoCorrect={false} returnKeyType="search"
        />
        {!!query && (
          <TouchableOpacity onPress={() => { setQuery(''); setItems([]); setSearched(false); }}>
            <Ionicons name="close-circle" size={18} color={COLORS.faint} />
          </TouchableOpacity>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chips} contentContainerStyle={{ paddingHorizontal: SPACING.base, gap: 8 }}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f.key} style={[s.chip, filter===f.key && s.chipActive]} onPress={() => selectFilter(f.key)}>
            <Text style={[s.chipLabel, filter===f.key && s.chipLabelActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {loading ? <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} /> :
        !searched ? (
          <View style={s.empty}><Ionicons name="search-outline" size={40} color={COLORS.faint} />
            <Text style={s.emptyTitle}>Cherchez quelque chose</Text>
            <Text style={s.emptyText}>Tapez un mot-clé ou utilisez les filtres</Text></View>
        ) : items.length === 0 ? (
          <View style={s.empty}><Ionicons name="file-tray-outline" size={40} color={COLORS.faint} />
            <Text style={s.emptyTitle}>Aucun résultat</Text></View>
        ) : (
          <FlatList
            data={items} keyExtractor={i => String(i.id)}
            contentContainerStyle={{ padding: SPACING.base, paddingBottom: 80 }}
            renderItem={({ item }) => {
              const badge = TYPE_BADGE[item.type] || TYPE_BADGE.lost;
              return (
                <TouchableOpacity style={s.card} onPress={() => navigation.navigate('Detail', { item })} activeOpacity={0.75}>
                  <View style={s.cardRow}>
                    <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
                    <View style={[s.badge, { backgroundColor: badge.bg }]}>
                      <Text style={[s.badgeLabel, { color: badge.color }]}>{badge.label}</Text>
                    </View>
                  </View>
                  <View style={s.cardMeta}>
                    <Ionicons name="location-outline" size={12} color={COLORS.muted} />
                    <Text style={s.cardLoc}>{item.location || '—'}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )
      }
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: COLORS.bg },
  searchBar:    { flexDirection: 'row', alignItems: 'center', margin: SPACING.base, backgroundColor: COLORS.offset, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: SPACING.md, gap: 8 },
  searchInput:  { flex: 1, fontSize: 15, color: COLORS.text, paddingVertical: SPACING.md },
  chips:        { flexGrow: 0, marginBottom: SPACING.sm },
  chip:         { paddingHorizontal: 14, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.offset, borderWidth: 1.5, borderColor: COLORS.border },
  chipActive:   { backgroundColor: COLORS.primaryHi, borderColor: COLORS.primary },
  chipLabel:    { fontSize: 12, fontWeight: FONT.semibold, color: COLORS.muted },
  chipLabelActive:{ color: COLORS.primary },
  empty:        { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: SPACING.xxl },
  emptyTitle:   { fontSize: 16, fontWeight: FONT.semibold, color: COLORS.text },
  emptyText:    { fontSize: 13, color: COLORS.muted, textAlign: 'center' },
  card:         { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginBottom: SPACING.md },
  cardRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
  cardTitle:    { fontSize: 15, fontWeight: FONT.semibold, color: COLORS.text, flex: 1 },
  badge:        { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  badgeLabel:   { fontSize: 11, fontWeight: FONT.bold },
  cardMeta:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardLoc:      { fontSize: 12, color: COLORS.muted },
});
