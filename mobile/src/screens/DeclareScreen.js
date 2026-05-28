import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { COLORS, SPACING, RADIUS, FONT } from '../theme';

export default function DeclareScreen({ navigation }) {
  const [type,       setType]       = useState('LOST');
  const [name,       setName]       = useState('');
  const [desc,       setDesc]       = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [categories, setCategories] = useState([]);
  const [locations,  setLocations]  = useState([]);
  const [refLoading, setRefLoading] = useState(true);

  useEffect(() => {
    async function loadRef() {
      try {
        const [cats, locs] = await Promise.all([
          api.getCategories(),
          api.getLocations(),
        ]);
        setCategories(cats);
        setLocations(locs);
        if (cats.length)  setCategoryId(cats[0].id);
        if (locs.length)  setLocationId(locs[0].id);
      } catch (e) {
        setError('Impossible de charger les données de référence.');
      } finally {
        setRefLoading(false);
      }
    }
    loadRef();
  }, []);

  async function handleSubmit() {
    if (!name.trim())     { setError('Le titre est requis.');    return; }
    if (!desc.trim())     { setError('La description est requise (min 5 caractères).'); return; }
    if (!categoryId)      { setError('La catégorie est requise.'); return; }
    if (!locationId)      { setError('Le lieu est requis.');      return; }
    setError(''); setLoading(true);
    try {
      await api.createItem({
        name:        name.trim(),
        description: desc.trim(),
        reportType:  type,
        categoryId,
        locationId,
      });
      Alert.alert('Publié !', 'Votre annonce a été publiée.', [
        { text: 'OK', onPress: () => {
          setName(''); setDesc(''); setError('');
          navigation.navigate('Accueil');
        }},
      ]);
    } catch (e) {
      const msg = e.data?.message || e.message || 'Erreur lors de la publication';
      setError(Array.isArray(msg) ? msg.join(' • ') : msg);
    } finally { setLoading(false); }
  }

  if (refLoading) {
    return (
      <SafeAreaView style={[s.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ color: COLORS.muted, marginTop: 12 }}>Chargement…</Text>
      </SafeAreaView>
    );
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
              {[['LOST','🔴  Objet perdu'], ['FOUND','🟢  Objet trouvé']].map(([t, label]) => (
                <TouchableOpacity key={t} style={[s.typeBtn, type===t && (t==='LOST' ? s.typeLost : s.typeFound)]} onPress={() => setType(t)}>
                  <Text style={[s.typeBtnLabel, type===t && { color: t==='LOST' ? COLORS.warn : COLORS.success }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Nom */}
          <View style={s.field}>
            <Text style={s.label}>Titre <Text style={{ color: COLORS.error }}>*</Text></Text>
            <TextInput style={s.input} value={name} onChangeText={setName}
              placeholder="ex : MacBook Pro gris" placeholderTextColor={COLORS.faint} />
          </View>

          {/* Description */}
          <View style={s.field}>
            <Text style={s.label}>Description <Text style={{ color: COLORS.error }}>*</Text></Text>
            <TextInput style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]} value={desc} onChangeText={setDesc}
              placeholder="Détails, caractéristiques distinctives…" placeholderTextColor={COLORS.faint} multiline />
          </View>

          {/* Catégorie */}
          <View style={s.field}>
            <Text style={s.label}>Catégorie <Text style={{ color: COLORS.error }}>*</Text></Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }} contentContainerStyle={{ gap: 8 }}>
              {categories.map(c => (
                <TouchableOpacity key={c.id} style={[s.chip, categoryId===c.id && s.chipActive]} onPress={() => setCategoryId(c.id)}>
                  <Text style={[s.chipLabel, categoryId===c.id && s.chipLabelActive]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Lieu */}
          <View style={s.field}>
            <Text style={s.label}>Lieu <Text style={{ color: COLORS.error }}>*</Text></Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }} contentContainerStyle={{ gap: 8 }}>
              {locations.map(l => (
                <TouchableOpacity key={l.id} style={[s.chip, locationId===l.id && s.chipActive]} onPress={() => setLocationId(l.id)}>
                  <Text style={[s.chipLabel, locationId===l.id && s.chipLabelActive]}>{l.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
  safe:            { flex: 1, backgroundColor: COLORS.bg },
  header:          { padding: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  headerTitle:     { fontSize: 17, fontWeight: FONT.bold, color: COLORS.text },
  form:            { padding: SPACING.base, paddingBottom: 60 },
  field:           { marginBottom: SPACING.lg },
  label:           { fontSize: 14, fontWeight: FONT.medium, color: COLORS.text, marginBottom: 8 },
  input:           { backgroundColor: COLORS.offset, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, padding: SPACING.md, fontSize: 15, color: COLORS.text, minHeight: 48 },
  typeRow:         { flexDirection: 'row', gap: SPACING.sm },
  typeBtn:         { flex: 1, padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 2, borderColor: COLORS.border, backgroundColor: COLORS.offset, alignItems: 'center' },
  typeLost:        { borderColor: COLORS.warn, backgroundColor: COLORS.warnHi },
  typeFound:       { borderColor: COLORS.success, backgroundColor: COLORS.successHi },
  typeBtnLabel:    { fontSize: 14, fontWeight: FONT.semibold, color: COLORS.muted },
  chip:            { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full, backgroundColor: COLORS.offset, borderWidth: 1.5, borderColor: COLORS.border },
  chipActive:      { backgroundColor: COLORS.primaryHi, borderColor: COLORS.primary },
  chipLabel:       { fontSize: 13, fontWeight: FONT.semibold, color: COLORS.muted },
  chipLabelActive: { color: COLORS.primary },
  errMsg:          { color: COLORS.error, fontSize: 13, marginBottom: SPACING.md },
  btn:             { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center', minHeight: 50, justifyContent: 'center', marginTop: SPACING.sm },
  btnLabel:        { color: COLORS.white, fontSize: 16, fontWeight: FONT.bold },
});
