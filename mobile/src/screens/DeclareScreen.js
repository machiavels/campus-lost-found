import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../api/client';
import { useAppMode } from '../context/AppModeContext';
import { COLORS, SPACING, RADIUS, FONT } from '../theme';

export default function DeclareScreen({ navigation }) {
  const { demoMode }             = useAppMode();
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
  const [photos,     setPhotos]     = useState([]);   // { uri } locale avant upload

  useEffect(() => {
    if (demoMode) {
      setCategories([
        { id: 'c1', name: 'Electronique' }, { id: 'c2', name: 'Cl\u00e9s' },
        { id: 'c3', name: 'V\u00eatements' },  { id: 'c4', name: 'Sac / Cartable' },
        { id: 'c5', name: 'Livres' },       { id: 'c6', name: 'Autre' },
      ]);
      setLocations([
        { id: 'l1', name: 'Biblioth\u00e8que' }, { id: 'l2', name: 'Amphi 1' },
        { id: 'l3', name: 'Amphi 2' },         { id: 'l4', name: 'Parking B' },
        { id: 'l5', name: 'B\u00e2timent C' },   { id: 'l6', name: 'Cafet\u00e9ria' },
      ]);
      setCategoryId('c1'); setLocationId('l1');
      setRefLoading(false);
      return;
    }
    (async () => {
      try {
        const [cats, locs] = await Promise.all([api.getCategories(), api.getLocations()]);
        setCategories(cats); setLocations(locs);
        if (cats.length) setCategoryId(cats[0].id);
        if (locs.length) setLocationId(locs[0].id);
      } catch (e) {
        setError('Impossible de charger les donn\u00e9es de r\u00e9f\u00e9rence.');
      } finally { setRefLoading(false); }
    })();
  }, [demoMode]);

  // ── Gestion photos ────────────────────────────────────────────────────────
  function addPhotoFromResult(result) {
    if (result.canceled) return;
    const asset = result.assets[0];
    setPhotos(prev => [...prev, { uri: asset.uri, asset }]);
  }

  async function pickFromGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission refus\u00e9e', "Autorisez l'acc\u00e8s \u00e0 la galerie."); return; }
    addPhotoFromResult(await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.7,
    }));
  }

  async function pickFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission refus\u00e9e', "Autorisez l'acc\u00e8s \u00e0 la cam\u00e9ra."); return; }
    addPhotoFromResult(await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7 }));
  }

  function promptPhoto() {
    Alert.alert('Ajouter une photo', 'Source :', [
      { text: 'Galerie', onPress: pickFromGallery },
      { text: 'Cam\u00e9ra',  onPress: pickFromCamera },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }

  function removePhoto(uri) {
    setPhotos(prev => prev.filter(p => p.uri !== uri));
  }

  // ── Soumission ────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!name.trim())  { setError('Le titre est requis.');    return; }
    if (!desc.trim())  { setError('La description est requise.'); return; }
    if (!categoryId)   { setError('La cat\u00e9gorie est requise.'); return; }
    if (!locationId)   { setError('Le lieu est requis.');     return; }
    setError(''); setLoading(true);
    try {
      let itemId = null;
      if (!demoMode) {
        const created = await api.createItem({
          name: name.trim(), description: desc.trim(),
          reportType: type, categoryId, locationId,
        });
        itemId = created.item?.id || created.id;
        // Upload photos si pr\u00e9sentes
        if (photos.length > 0 && itemId) {
          await Promise.allSettled(photos.map(p => api.uploadPhoto(itemId, p.asset)));
        }
      }
      Alert.alert('Publi\u00e9 !', `Votre annonce${photos.length ? ` avec ${photos.length} photo(s)` : ''} a \u00e9t\u00e9 publi\u00e9e.`, [
        { text: 'OK', onPress: () => {
          setName(''); setDesc(''); setError(''); setPhotos([]);
          navigation.navigate('Accueil');
        }},
      ]);
    } catch (e) {
      const msg = e.data?.message || e.message || 'Erreur lors de la publication';
      setError(Array.isArray(msg) ? msg.join(' \u2022 ') : msg);
    } finally { setLoading(false); }
  }

  if (refLoading) {
    return (
      <SafeAreaView style={[s.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ color: COLORS.muted, marginTop: 12 }}>Chargement\u2026</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}><Text style={s.headerTitle}>D\u00e9clarer un objet</Text></View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.form} keyboardShouldPersistTaps="handled">

          {/* Type */}
          <View style={s.field}>
            <Text style={s.label}>Type de d\u00e9claration</Text>
            <View style={s.typeRow}>
              {[['LOST','\ud83d\udd34  Objet perdu'], ['FOUND','\ud83d\udfe2  Objet trouv\u00e9']].map(([t, label]) => (
                <TouchableOpacity key={t} style={[s.typeBtn, type===t && (t==='LOST' ? s.typeLost : s.typeFound)]} onPress={() => setType(t)}>
                  <Text style={[s.typeBtnLabel, type===t && { color: t==='LOST' ? COLORS.warn : COLORS.success }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Titre */}
          <View style={s.field}>
            <Text style={s.label}>Titre <Text style={{ color: COLORS.error }}>*</Text></Text>
            <TextInput style={s.input} value={name} onChangeText={setName}
              placeholder="ex : MacBook Pro gris" placeholderTextColor={COLORS.faint} />
          </View>

          {/* Description */}
          <View style={s.field}>
            <Text style={s.label}>Description <Text style={{ color: COLORS.error }}>*</Text></Text>
            <TextInput style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]} value={desc} onChangeText={setDesc}
              placeholder="D\u00e9tails, caract\u00e9ristiques distinctives\u2026" placeholderTextColor={COLORS.faint} multiline />
          </View>

          {/* Cat\u00e9gorie */}
          <View style={s.field}>
            <Text style={s.label}>Cat\u00e9gorie <Text style={{ color: COLORS.error }}>*</Text></Text>
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

          {/* Photos */}
          <View style={s.field}>
            <Text style={s.label}>Photos <Text style={s.labelOpt}>(optionnel)</Text></Text>
            <View style={s.photoRow}>
              {photos.map(p => (
                <View key={p.uri} style={s.photoThumb}>
                  <Image source={{ uri: p.uri }} style={s.thumbImg} resizeMode="cover" />
                  <TouchableOpacity style={s.thumbDel} onPress={() => removePhoto(p.uri)}>
                    <Ionicons name="close-circle" size={20} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < 4 && (
                <TouchableOpacity style={s.photoAdd} onPress={promptPhoto}>
                  <Ionicons name="camera-outline" size={24} color={COLORS.primary} />
                  <Text style={s.photoAddLabel}>Ajouter</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {!!error && <Text style={s.errMsg}>{error}</Text>}

          <TouchableOpacity style={[s.btn, loading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={loading}>
            {loading
              ? <ActivityIndicator color={COLORS.white} />
              : <Text style={s.btnLabel}>Publier l'annonce{photos.length > 0 ? ` (${photos.length} photo${photos.length > 1 ? 's' : ''})` : ''}</Text>
            }
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
  labelOpt:        { fontSize: 12, color: COLORS.muted, fontWeight: FONT.regular },
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
  photoRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: 4 },
  photoThumb:      { width: 80, height: 80, borderRadius: RADIUS.lg, overflow: 'visible' },
  thumbImg:        { width: 80, height: 80, borderRadius: RADIUS.lg },
  thumbDel:        { position: 'absolute', top: -8, right: -8 },
  photoAdd:        { width: 80, height: 80, borderRadius: RADIUS.lg, borderWidth: 2, borderColor: COLORS.primary, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryHi, gap: 4 },
  photoAddLabel:   { fontSize: 11, color: COLORS.primary, fontWeight: FONT.semibold },
  errMsg:          { color: COLORS.error, fontSize: 13, marginBottom: SPACING.md },
  btn:             { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center', minHeight: 50, justifyContent: 'center', marginTop: SPACING.sm },
  btnLabel:        { color: COLORS.white, fontSize: 16, fontWeight: FONT.bold },
});
