import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { itemsApi, referenceApi } from '../api/client.js';
import toast from 'react-hot-toast';

export default function NewItemPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', type: 'LOST', categoryId: '', locationId: '' });
  const [photos, setPhotos] = useState([]);

  const { data: cats } = useQuery({ queryKey: ['categories'], queryFn: () => referenceApi.categories(), select: (r) => r.data });
  const { data: locs } = useQuery({ queryKey: ['locations'], queryFn: () => referenceApi.locations(), select: (r) => r.data });

  const mutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
      photos.forEach((f) => fd.append('photos', f));
      return itemsApi.create(fd);
    },
    onSuccess: (res) => {
      const id = res.data.item?.id ?? res.data.id;
      toast.success('Annonce créée !');
      navigate(`/items/${id}`);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Erreur'),
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Publier une annonce</h1>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="card p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <div className="flex gap-4">
            {['LOST', 'FOUND'].map((t) => (
              <label key={t} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="type" value={t} checked={form.type === t} onChange={() => set('type', t)} />
                <span>{t === 'LOST' ? '😢 Perdu' : '🎉 Trouvé'}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
          <input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea className="input" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
            <select className="input" value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
              <option value="">-- Choisir --</option>
              {cats?.categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lieu</label>
            <select className="input" value={form.locationId} onChange={(e) => set('locationId', e.target.value)}>
              <option value="">-- Choisir --</option>
              {locs?.locations?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Photos</label>
          <input type="file" multiple accept="image/*" onChange={(e) => setPhotos(Array.from(e.target.files))} className="text-sm" />
        </div>
        <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={mutation.isPending}>
          {mutation.isPending ? 'Publication...' : "Publier l'annonce"}
        </button>
      </form>
    </div>
  );
}
