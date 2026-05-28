import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, RADIUS, FONT } from '../theme';

export default function AuthScreen() {
  const { signIn } = useAuth();
  const [tab,      setTab]      = useState('login');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  async function handleLogin() {
    if (!email || !password) { setError('Remplissez tous les champs.'); return; }
    setError(''); setLoading(true);
    try {
      const data = await api.login(email, password);
      const t  = data.accessToken || data.token;
      const rt = data.refreshToken || null;
      const u  = data.user || { email };
      await signIn(t, rt, u);
    } catch (e) {
      setError(e.data?.error || e.data?.message || 'Identifiants incorrects ou serveur inaccessible');
    } finally { setLoading(false); }
  }

  async function handleRegister() {
    if (!username || !email || !password) { setError('Remplissez tous les champs.'); return; }
    if (password.length < 8) { setError('Mot de passe minimum 8 caract\u00e8res.'); return; }
    setError(''); setLoading(true);
    try {
      const data = await api.register(username, email, password);
      const t  = data.accessToken || data.token;
      const rt = data.refreshToken || null;
      const u  = data.user || { username, email };
      await signIn(t, rt, u);
    } catch (e) {
      const msg = e.data?.message || e.data?.error;
      setError(Array.isArray(msg) ? msg.join(' \u2022 ') : (msg || 'Erreur lors de la cr\u00e9ation du compte'));
    } finally { setLoading(false); }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <View style={s.logoWrap}>
            <View style={s.logoBox}>
              <Ionicons name="search" size={32} color={COLORS.white} />
            </View>
            <Text style={s.logoTitle}>Campus Lost & Found</Text>
            <Text style={s.logoSub}>Retrouvez vos objets sur le campus</Text>
          </View>

          {/* Card */}
          <View style={s.card}>
            {/* Tabs */}
            <View style={s.tabs}>
              {['login', 'register'].map(t => (
                <TouchableOpacity
                  key={t}
                  style={[s.tab, tab === t && s.tabActive]}
                  onPress={() => { setTab(t); setError(''); }}
                >
                  <Text style={[s.tabLabel, tab === t && s.tabLabelActive]}>
                    {t === 'login' ? 'Connexion' : 'Inscription'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {tab === 'register' && (
              <View style={s.field}>
                <Text style={s.label}>Nom d'utilisateur</Text>
                <TextInput
                  style={s.input} value={username} onChangeText={setUsername}
                  placeholder="jean_dupont" placeholderTextColor={COLORS.faint}
                  autoCapitalize="none" autoCorrect={false}
                />
              </View>
            )}

            <View style={s.field}>
              <Text style={s.label}>Adresse e-mail</Text>
              <TextInput
                style={s.input} value={email} onChangeText={setEmail}
                placeholder="vous@eleve.isep.fr" placeholderTextColor={COLORS.faint}
                keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
              />
            </View>

            <View style={s.field}>
              <Text style={s.label}>Mot de passe</Text>
              <TextInput
                style={s.input} value={password} onChangeText={setPassword}
                placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" placeholderTextColor={COLORS.faint}
                secureTextEntry
              />
            </View>

            {!!error && <Text style={s.errMsg}>{error}</Text>}

            <TouchableOpacity
              style={[s.btn, loading && s.btnDisabled]}
              onPress={tab === 'login' ? handleLogin : handleRegister}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={COLORS.white} />
                : <Text style={s.btnLabel}>
                    {tab === 'login' ? 'Se connecter' : 'Cr\u00e9er un compte'}
                  </Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: COLORS.bg },
  scroll:         { flexGrow: 1, justifyContent: 'center', padding: SPACING.lg },
  logoWrap:       { alignItems: 'center', marginBottom: SPACING.xxl },
  logoBox:        { width: 64, height: 64, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md },
  logoTitle:      { fontSize: 22, fontWeight: FONT.bold, color: COLORS.text, letterSpacing: -0.5 },
  logoSub:        { fontSize: 14, color: COLORS.muted, marginTop: 4, textAlign: 'center' },
  card:           { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, borderWidth: 1, borderColor: COLORS.border },
  tabs:           { flexDirection: 'row', backgroundColor: COLORS.offset, borderRadius: RADIUS.lg, padding: 3, marginBottom: SPACING.lg },
  tab:            { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderRadius: RADIUS.md },
  tabActive:      { backgroundColor: COLORS.surface },
  tabLabel:       { fontSize: 14, fontWeight: FONT.semibold, color: COLORS.muted },
  tabLabelActive: { color: COLORS.primary },
  field:          { marginBottom: SPACING.md },
  label:          { fontSize: 14, fontWeight: FONT.medium, color: COLORS.text, marginBottom: 6 },
  input:          { backgroundColor: COLORS.offset, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: SPACING.md, fontSize: 15, color: COLORS.text, minHeight: 48 },
  errMsg:         { color: COLORS.error, fontSize: 13, marginBottom: SPACING.sm },
  btn:            { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: SPACING.md, alignItems: 'center', minHeight: 50, justifyContent: 'center', marginTop: SPACING.sm },
  btnDisabled:    { opacity: 0.6 },
  btnLabel:       { color: COLORS.white, fontSize: 16, fontWeight: FONT.bold },
});
