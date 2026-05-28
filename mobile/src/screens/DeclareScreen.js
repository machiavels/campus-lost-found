import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { COLORS, SPACING, RADIUS, FONT } from '../theme';

const CATEGORIES = [
  { value: 'ELECTRONICS', label: 'Électronique' },
  { value: 'CLOTHING',    label: 'Vêtements' },
  { value: 'KEYS',        label: 'Clés' },
  { value: 'BOOKS',       label: 'Livres' },
  { value: 'BAGS',        label: 'Sacs' },
  { value: 'DOCUMENTS',   label: 'Documents' },
  { value: 'OTHER',       label: 'Autre' },
];

export default function DeclareScreen({ navigation }) {
  const [type,     setType]     = useState('lost');
  const [title,    setTitle]    = useState('');
  const [desc,     setDesc]     = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  async function handleSubmit() {
    if (!title.trim()) { setError('Le titre est requis.'); return; }
    setError(''); setLoading(true);
    try {
      await api.createItem({
        title: title.trim(),
        description: desc.trim(),
        category: category || 'OTHER',
        location: location.trim(),
        type: type.toUpperCase(),
      });
      Alert.alert('Publié !', 'Votre annonce a été publiée.', [
        { text: 'OK', onPress: () => {
          setTitle(''); setDesc(''); setCategory(''); setLocation(''); setType('lost');
          navigation.navigate('Accueil');
        }},
      ]);
    } catch (e) {
      setError(e.data?.message || 'Erreur lors de la publication');
    } finally { setLoading(false); }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}><Text style={s.headerTitle}>Déclarer un objet</Text></View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.form} keyboardShouldPersistTaps="handled">
          {/* Type */}
          <View style={s.field}>
            <Text style={s.label}>Type de déclaration</Text>
            <View style={s.typeRow}>
              {['lost', 'found'].map(t => (
                <TouchableOpacity key={t} style={[s.typeBtn, type===t && (t==='lost' ? s.typeLost : s.typeFound)]} onPress={() => setType(t)}>
                  <Text style={[s.typeBtnLabel, type===t && { color: t==='lost' ? COLORS.warn : COLORS.success }]}>
                    {t === 'lost' ? '🔴  Objet perdu' : '🟢  Objet trouvé'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={s.field}>
            <Text style={s.label}>Titre <Text style={{ color: COLORS.error }}>*</Text></Text>
            <TextInput style={s.input} value={title} onChangeText={setTitle}
              placeholder="ex : MacBook Pro gris" placeholderTextColor={COLORS.faint} />
          </View>

          <View style={s.field}>
            <Text style={s.label}>Description</Text>
            <TextInput style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]} value={desc} onChangeText={setDesc}
              placeholder="Détails, caractéristiques distinctives…" placeholderTextColor={COLORS.faint}
              multiline />
          </View>

          <View style={s.field}>
            <Text style={s.label}>Catégorie</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }} contentContainerStyle={{ gap: 8 }}>
              {CATEGORIES.map(c => (
                <TouchableOpacity key={c.value} style={[s.chip, category===c.value && s.chipActive]} onPress={() => setCategory(c.value)}>
                  <Text style={[s.chipLabel, category===c.value && s.chipLabelActive]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={s.field}>
            <Text style={s.label}>Lieu</Text>
            <TextInput style={s.input} value={location} onChangeText={setLocation}
              placeholder="ex : Bibliothèque, bâtiment A…" placeholderTextColor={COLORS.faint} />
          </View>

          {!!error && <Text style={s.errMsg}>{error}</Text>}

          <TouchableOpacity style={[s.btn, loading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={s.btnLabel}>Publier l'annonce</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: COLORS.bg },
  header:         { padding: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  headerTitle:    { fontSize: 17, fontWeight: FONT.bold, color: COLORS.text },
  form:           { padding: SPACING.base, paddingBottom: 60 },
  field:          { marginBottom: SPACING.lg },
  label:          { fontSize: 14, fontWeight: FONT.medium, color: COLORS.text, marginBottom: 8 },
  input:          { backgroundColor: COLORS.offset, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, padding: SPACING.md, fontSize: 15, color: COLORS.text, minHeight: 48 },
  typeRow:        { flexDirection: 'row', gap: SPACING.sm },
  typeBtn:        { flex: 1, padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 2, borderColor: COLORS.border, backgroundColor: COLORS.offset, alignItems: 'center' },
  typeLost:       { borderColor: COLORS.warn, backgroundColor: COLORS.warnHi },
  typeFound:      { borderColor: COLORS.success, backgroundColor: COLORS.successHi },
  typeBtnLabel:   { fontSize: 14, fontWeight: FONT.semibold, color: COLORS.muted },
  chip:           { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full, backgroundColor: COLORS.offset, borderWidth: 1.5, borderColor: COLORS.border },
  chipActive:     { backgroundColor: COLORS.primaryHi, borderColor: COLORS.primary },
  chipLabel:      { fontSize: 13, fontWeight: FONT.semibold, color: COLORS.muted },
  chipLabelActive:{ color: COLORS.primary },
  errMsg:         { color: COLORS.error, fontSize: 13, marginBottom: SPACING.md },
  btn:            { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center', minHeight: 50, justifyContent: 'center', marginTop: SPACING.sm },
  btnLabel:       { color: COLORS.white, fontSize: 16, fontWeight: FONT.bold },
});
