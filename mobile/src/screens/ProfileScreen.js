import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, RADIUS, FONT } from '../theme';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState({ declared: '—', claimed: '—', resolved: '—' });

  useEffect(() => {
    api.getMe().then(data => {
      const u = data.user || data;
      // optionally update stats if endpoint returns them
    }).catch(() => {});
  }, []);

  const initial = (user?.username || user?.email || 'U')[0].toUpperCase();

  function handleLogout() {
    Alert.alert('Déconnexion', 'Êtes-vous sûr ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: async () => {
        try { await api.logout(); } catch (_) {}
        signOut();
      }},
    ]);
  }

  const MENU = [
    { icon: 'notifications-outline', label: 'Notifications', onPress: () => {} },
    { icon: 'shield-outline',        label: 'Confidentialité', onPress: () => {} },
    { icon: 'help-circle-outline',   label: 'Aide & Support', onPress: () => {} },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.avatar}><Text style={s.avatarText}>{initial}</Text></View>
          <Text style={s.name}>{user?.username || user?.email || 'Utilisateur'}</Text>
          {!!user?.email && <Text style={s.email}>{user.email}</Text>}
          {user?.role && <View style={s.roleBadge}><Text style={s.roleLabel}>{user.role}</Text></View>}
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          {[
            { num: stats.declared, label: 'Déclarés' },
            { num: stats.claimed,  label: 'Réclamés' },
            { num: stats.resolved, label: 'Résolus' },
          ].map(st => (
            <View key={st.label} style={s.statBox}>
              <Text style={s.statNum}>{st.num}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* Menu */}
        <View style={s.menu}>
          {MENU.map(m => (
            <TouchableOpacity key={m.label} style={s.menuItem} onPress={m.onPress}>
              <View style={s.menuIcon}><Ionicons name={m.icon} size={18} color={COLORS.primary} /></View>
              <Text style={s.menuLabel}>{m.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.faint} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={s.menuItem} onPress={handleLogout}>
            <View style={[s.menuIcon, { backgroundColor: COLORS.errorHi }]}>
              <Ionicons name="log-out-outline" size={18} color={COLORS.error} />
            </View>
            <Text style={[s.menuLabel, { color: COLORS.error }]}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: COLORS.bg },
  hero:       { backgroundColor: COLORS.primary, padding: SPACING.xxl, paddingTop: SPACING.xl, alignItems: 'center' },
  avatar:     { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,.2)', alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md },
  avatarText: { fontSize: 28, fontWeight: FONT.bold, color: COLORS.white },
  name:       { fontSize: 20, fontWeight: FONT.bold, color: COLORS.white },
  email:      { fontSize: 14, color: 'rgba(255,255,255,.7)', marginTop: 4 },
  roleBadge:  { marginTop: 8, backgroundColor: 'rgba(255,255,255,.15)', borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 4 },
  roleLabel:  { fontSize: 12, fontWeight: FONT.bold, color: COLORS.white, letterSpacing: 1 },
  statsRow:   { flexDirection: 'row', gap: SPACING.sm, padding: SPACING.base },
  statBox:    { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.md, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  statNum:    { fontSize: 22, fontWeight: FONT.bold, color: COLORS.primary },
  statLabel:  { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  menu:       { margin: SPACING.base, backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  menuItem:   { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  menuIcon:   { width: 36, height: 36, borderRadius: RADIUS.lg, backgroundColor: COLORS.offset, alignItems: 'center', justifyContent: 'center' },
  menuLabel:  { flex: 1, fontSize: 15, fontWeight: FONT.medium, color: COLORS.text },
});
