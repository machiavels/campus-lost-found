import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Modal, TextInput, ActivityIndicator,
  Alert, Share, Image, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { api, getBase } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useAppMode } from '../context/AppModeContext';
import { COLORS, SPACING, RADIUS, FONT, TYPE_BADGE, STATUS_LABEL } from '../theme';

/**
 * Construit l'URL complète d'une photo.
 * Le serveur renvoie soit une URL absolue, soit un chemin relatif (/uploads/xxx.jpg).
 */
function photoUrl(p) {
  const raw = p?.url || p?.path || '';
  if (!raw) return null;
  if (raw.startsWith('http')) return raw;
  return getBase() + raw;
}

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
  if (!d) return '\u2014';
  const diff = (Date.now() - new Date(d)) / 1000;
  if (diff < 86400) return "Aujourd'hui";
  if (diff < 172800) return 'Hier';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

export default function DetailScreen({ route, navigation }) {
  const { item: initialItem }   = route.params;
  const { user }                = useAuth();
  const { demoMode, adminDemo } = useAppMode();
  const [item,       setItem]       = useState(normalizeItem(initialItem));
  const [claimModal, setClaimModal] = useState(false);
  const [claimMsg,   setClaimMsg]   = useState('');
  const [claimErr,   setClaimErr]   = useState('');
  const [claimLoad,  setClaimLoad]  = useState(false);
  const [photos,     setPhotos]     = useState(initialItem?.photos || []);
  const [photoLoad,  setPhotoLoad]  = useState(false);
  const [delLoad,    setDelLoad]    = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: item.title || 'Détail' });
    if (!demoMode) {
      api.getItem(item.id)
        .then(data => {
          const norm = normalizeItem(data.item || data);
          setItem(norm);
          setPhotos(norm.photos || []);
        })
        .catch(() => {});
    }
  }, []);

  // isOwner : propriétaire réel OU toggle adminDemo actif en démo
  const isOwner = (user && (item.reporter?.id === user.id || item.userId === user.id))
               || (demoMode && adminDemo);
  const status = item.status || 'OPEN';
  const type   = item.type   || 'lost';
  const badge  = TYPE_BADGE[type] || TYPE_BADGE.lost;
  const rep    = item.reporter || {};
  const initial = (rep.username || '?')[0].toUpperCase();

  async function submitClaim() {
    if (!claimMsg.trim()) { setClaimErr('Écrivez un message.'); return; }
    setClaimErr(''); setClaimLoad(true);
    try {
      if (!demoMode) await api.createClaim(item.id, claimMsg.trim());
      setClaimModal(false); setClaimMsg('');
      setItem(prev => ({ ...prev, status: 'CLAIMED' }));
      Alert.alert('Réclamation envoyée !', 'Le déclarant sera notifié.');
    } catch (e) {
      setClaimErr(e.data?.message || "Erreur lors de l'envoi");
    } finally { setClaimLoad(false); }
  }

  async function markResolved() {
    Alert.alert('Confirmer', 'Marquer cet objet comme rendu ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Confirmer', onPress: async () => {
        try {
          if (!demoMode) await api.updateItem(item.id, { status: 'RESOLVED' });
          setItem(prev => ({ ...prev, status: 'RESOLVED' }));
        } catch (e) { Alert.alert('Erreur', e.data?.message || e.message); }
      }},
    ]);
  }

  async function deleteItem() {
    Alert.alert(
      'Supprimer cette annonce',
      'Cette action est irréversible. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: async () => {
          setDelLoad(true);
          try {
            if (!demoMode) await api.deleteItem(item.id);
            Alert.alert('Supprimé', 'Votre annonce a été supprimée.', [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
          } catch (e) {
            Alert.alert('Erreur', e.data?.message || e.message);
          } finally { setDelLoad(false); }
        }},
      ]
    );
  }

  async function handlePickPhoto(launchFn) {
    const asset = await launchFn();
    if (!asset) return;
    setPhotoLoad(true);
    try {
      if (demoMode) {
        // En démo : prévisualise l'URI locale directement
        setPhotos(prev => [...prev, { id: String(Date.now()), url: asset.uri }]);
      } else {
        const data = await api.uploadPhoto(item.id, asset);
        // Le serveur renvoie { photos: [{id, url}] } ou { photo: {id, url} }
        const uploaded = data.photos?.[0] || data.photo || { id: String(Date.now()), url: asset.uri };
        setPhotos(prev => [...prev, uploaded]);
      }
    } catch (e) {
      Alert.alert('Erreur upload', e.data?.message || e.message);
    } finally { setPhotoLoad(false); }
  }

  async function pickFromGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission refusée', "Autorisez l'accès à la galerie."); return null; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.7 });
    return result.canceled ? null : result.assets[0];
  }

  async function pickFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission refusée', "Autorisez l'accès à la caméra."); return null; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7 });
    return result.canceled ? null : result.assets[0];
  }

  function promptPhoto() {
    Alert.alert('Ajouter une photo', 'Choisissez une source', [
      { text: 'Galerie',  onPress: () => handlePickPhoto(pickFromGallery) },
      { text: 'Caméra',   onPress: () => handlePickPhoto(pickFromCamera) },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }

  async function shareItem() {
    await Share.share({ message: `Campus Lost & Found — "${item.title}" @ ${item.location || 'campus'}` });
  }

  return (
    <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 120 }}>

      {/* Zone photo */}
      {photos.length > 0 ? (
        <FlatList
          horizontal
          data={photos}
          keyExtractor={p => String(p.id)}
          showsHorizontalScrollIndicator={false}
          style={{ height: 220 }}
          renderItem={({ item: p }) => {
            const uri = photoUrl(p);
            if (!uri) return null;
            return (
              <Image
                source={{ uri }}
                style={s.photo}
                resizeMode="cover"
                onError={() => {/* image corrompue, silencieux */}}
              />
            );
          }}
        />
      ) : (
        <View style={s.imgPlaceholder}>
          <Ionicons name="image-outline" size={56} color={COLORS.faint} />
        </View>
      )}

      {/* Bouton photo uniquement pour le propriétaire */}
      {isOwner && (
        <TouchableOpacity style={s.photoBtn} onPress={promptPhoto} disabled={photoLoad}>
          {photoLoad
            ? <ActivityIndicator color={COLORS.white} size="small" />
            : <>
                <Ionicons name="camera-outline" size={16} color={COLORS.white} />
                <Text style={s.photoBtnLabel}>Ajouter une photo</Text>
              </>
          }
        </TouchableOpacity>
      )}

      <View style={s.body}>
        <View style={s.titleRow}>
          <Text style={s.title}>{item.title}</Text>
          <View style={[s.badge, { backgroundColor: badge.bg }]}>
            <Text style={[s.badgeLabel, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>

        {!!item.description && <Text style={s.desc}>{item.description}</Text>}

        <View style={s.grid}>
          {[
            { label: 'Catégorie', val: item.category || '—' },
            { label: 'Lieu',       val: item.location  || '—' },
            { label: 'Date',       val: relDate(item.createdAt || item.date) },
            { label: 'Statut',     val: STATUS_LABEL?.[item.status] || item.status || '—' },
          ].map(({ label, val }) => (
            <View key={label} style={s.gridItem}>
              <Text style={s.gridLabel}>{label}</Text>
              <Text style={s.gridVal}>{String(val)}</Text>
            </View>
          ))}
        </View>

        {adminDemo && (
          <View style={s.adminPanel}>
            <Text style={s.adminPanelTitle}>👑 Panneau admin</Text>
            <Text style={s.adminPanelInfo}>ID : {item.id}</Text>
            <Text style={s.adminPanelInfo}>Reporter ID : {rep.id || '—'}</Text>
            <Text style={s.adminPanelInfo}>Status brut : {item.status}</Text>
          </View>
        )}

        <View style={s.reporter}>
          <View style={s.avatar}><Text style={s.avatarText}>{initial}</Text></View>
          <View>
            <Text style={s.reporterSub}>Déclaré par</Text>
            <Text style={s.reporterName}>{rep.username || rep.email || 'Anonyme'}</Text>
          </View>
        </View>
      </View>

      <View style={s.actions}>
        {status === 'OPEN' && !isOwner && type === 'found' && (
          <TouchableOpacity style={s.btnPrimary} onPress={() => setClaimModal(true)}>
            <Text style={s.btnPrimaryLabel}>Réclamer cet objet</Text>
          </TouchableOpacity>
        )}
        {status === 'OPEN' && !isOwner && type === 'lost' && (
          <TouchableOpacity style={s.btnSuccess} onPress={() => setClaimModal(true)}>
            <Text style={s.btnPrimaryLabel}>J'ai trouvé cet objet</Text>
          </TouchableOpacity>
        )}
        {(status === 'OPEN' || status === 'CLAIMED') && isOwner && (
          <TouchableOpacity style={s.btnSuccess} onPress={markResolved}>
            <Text style={s.btnPrimaryLabel}>Marquer comme rendu</Text>
          </TouchableOpacity>
        )}
        {status === 'CLAIMED' && !isOwner && (
          <View style={s.btnDisabled}>
            <Text style={s.btnDisabledLabel}>Réclamé — en attente de confirmation</Text>
          </View>
        )}
        {status === 'RESOLVED' && (
          <View style={[s.btnDisabled, { borderColor: COLORS.success }]}>
            <Text style={[s.btnDisabledLabel, { color: COLORS.success }]}>Objet rendu — affaire résolue</Text>
          </View>
        )}
        {isOwner && status !== 'RESOLVED' && (
          <TouchableOpacity style={s.btnDanger} onPress={deleteItem} disabled={delLoad}>
            {delLoad
              ? <ActivityIndicator color={COLORS.error} size="small" />
              : <>
                  <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                  <Text style={s.btnDangerLabel}>Supprimer mon annonce</Text>
                </>
            }
          </TouchableOpacity>
        )}
        <TouchableOpacity style={s.btnGhost} onPress={shareItem}>
          <Ionicons name="share-outline" size={18} color={COLORS.primary} />
          <Text style={s.btnGhostLabel}>Partager cette annonce</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={claimModal} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setClaimModal(false)} />
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <Text style={s.sheetTitle}>
            {type === 'found' ? 'Réclamer cet objet' : "Signaler que vous l'avez trouvé"}
          </Text>
          <Text style={s.sheetDesc}>Décrivez brièvement comment vous pouvez le prouver.</Text>
          <TextInput
            style={s.claimInput} value={claimMsg} onChangeText={setClaimMsg}
            placeholder="Ex : Mon téléphone a une coque transparente avec une photo de mon chien…"
            placeholderTextColor={COLORS.faint}
            multiline numberOfLines={4} textAlignVertical="top"
          />
          {!!claimErr && <Text style={s.errMsg}>{claimErr}</Text>}
          <TouchableOpacity style={[s.btnPrimary, claimLoad && { opacity: 0.6 }]} onPress={submitClaim} disabled={claimLoad}>
            {claimLoad
              ? <ActivityIndicator color={COLORS.white} />
              : <Text style={s.btnPrimaryLabel}>Envoyer la réclamation</Text>
            }
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll:          { flex: 1, backgroundColor: COLORS.bg },
  imgPlaceholder:  { height: 220, backgroundColor: COLORS.offset, alignItems: 'center', justifyContent: 'center' },
  photo:           { width: 300, height: 220, marginRight: 4 },
  photoBtn:        { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, marginHorizontal: SPACING.base, marginTop: SPACING.sm, borderRadius: RADIUS.lg, paddingVertical: 10, paddingHorizontal: SPACING.md, justifyContent: 'center' },
  photoBtnLabel:   { color: COLORS.white, fontSize: 14, fontWeight: FONT.semibold },
  body:            { padding: SPACING.base },
  titleRow:        { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: SPACING.md },
  title:           { fontSize: 22, fontWeight: FONT.bold, color: COLORS.text, flex: 1, letterSpacing: -0.4 },
  badge:           { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  badgeLabel:      { fontSize: 12, fontWeight: FONT.bold },
  desc:            { fontSize: 15, color: COLORS.muted, lineHeight: 22, marginBottom: SPACING.lg },
  grid:            { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg },
  gridItem:        { flex: 1, minWidth: '45%', backgroundColor: COLORS.offset, borderRadius: RADIUS.lg, padding: SPACING.md },
  gridLabel:       { fontSize: 11, color: COLORS.faint, fontWeight: FONT.bold, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 },
  gridVal:         { fontSize: 14, fontWeight: FONT.semibold, color: COLORS.text },
  adminPanel:      { backgroundColor: '#FFF8E1', borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: '#FFD54F' },
  adminPanelTitle: { fontSize: 13, fontWeight: FONT.bold, color: '#E65100', marginBottom: 4 },
  adminPanelInfo:  { fontSize: 12, color: '#5D4037', marginBottom: 2 },
  reporter:        { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.offset, borderRadius: RADIUS.xl, padding: SPACING.md },
  avatar:          { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primaryHi, alignItems: 'center', justifyContent: 'center' },
  avatarText:      { fontSize: 16, fontWeight: FONT.bold, color: COLORS.primary },
  reporterSub:     { fontSize: 12, color: COLORS.muted },
  reporterName:    { fontSize: 15, fontWeight: FONT.semibold, color: COLORS.text },
  actions:         { padding: SPACING.base, gap: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.divider },
  btnPrimary:      { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center', minHeight: 50, justifyContent: 'center' },
  btnSuccess:      { backgroundColor: COLORS.success, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center', minHeight: 50, justifyContent: 'center' },
  btnPrimaryLabel: { color: COLORS.white, fontSize: 16, fontWeight: FONT.bold },
  btnDanger:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1.5, borderColor: COLORS.error, minHeight: 50 },
  btnDangerLabel:  { color: COLORS.error, fontSize: 15, fontWeight: FONT.semibold },
  btnDisabled:     { borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border },
  btnDisabledLabel:{ fontSize: 14, fontWeight: FONT.medium, color: COLORS.muted },
  btnGhost:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: SPACING.md },
  btnGhostLabel:   { color: COLORS.primary, fontSize: 14, fontWeight: FONT.semibold },
  overlay:         { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:           { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.xl, paddingBottom: 40 },
  sheetHandle:     { width: 40, height: 4, backgroundColor: COLORS.divider, borderRadius: 99, alignSelf: 'center', marginBottom: SPACING.lg },
  sheetTitle:      { fontSize: 18, fontWeight: FONT.bold, color: COLORS.text, marginBottom: 6 },
  sheetDesc:       { fontSize: 14, color: COLORS.muted, marginBottom: SPACING.lg },
  claimInput:      { backgroundColor: COLORS.offset, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, padding: SPACING.md, fontSize: 14, color: COLORS.text, minHeight: 100, marginBottom: SPACING.md },
  errMsg:          { color: COLORS.error, fontSize: 13, marginBottom: SPACING.sm },
});
