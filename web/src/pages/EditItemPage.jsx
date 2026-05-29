import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { itemsApi, referenceApi } from '../api/client.js';
import Spinner from '../components/ui/Spinner.jsx';
import toast from 'react-hot-toast';

export default function EditItemPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);

  const { data: item, isLoading } = useQuery({
    queryKey: ['item', id],
    queryFn: () => itemsApi.get(id),
    select: (r) => r.data.item ?? r.data,
  });
  const { data: cats } = useQuery({ queryKey: ['categories'], queryFn: () => referenceApi.categories(), select: (r) => r.data });
  const { data: locs } = useQuery({ queryKey: ['locations'], queryFn: () => referenceApi.locations(), select: (r) => r.data });

  useEffect(() => {
    if (item) setForm({ title: item.title, description: item.description || '', categoryId: item.categoryId || '', locationId: item.locationId || '' });
  }, [item]);

  const mutation = useMutation({
    mutationFn: () => itemsApi.update(id, form),
    onSuccess: () => { toast.success('Annonce mise à jour !'); navigate(`/items/${id}`); },
    onError: (err) => toast.error(err.response?.data?.message || 'Erreur'),
  });

  if (isLoading || !form) return <Spinner fullPage />;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Modifier l'annonce</h1>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="card p-6 space-y-5">
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
        <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={mutation.isPending}>
          {mutation.isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </button>
      </form>
    </div>
  );
}
