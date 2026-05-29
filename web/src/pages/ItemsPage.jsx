import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { searchApi, referenceApi } from '../api/client.js';
import ItemCard from '../components/ItemCard.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { Search } from 'lucide-react';

export default function ItemsPage() {
  const [filters, setFilters] = useState({ q: '', type: '', categoryId: '', locationId: '', page: 1 });

  const { data: cats } = useQuery({
    queryKey: ['categories'],
    queryFn: () => referenceApi.categories(),
    select: (r) => r.data,
  });
  const { data: locs } = useQuery({
    queryKey: ['locations'],
    queryFn: () => referenceApi.locations(),
    select: (r) => r.data,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['search', filters],
    queryFn: () => searchApi.items(filters),
    select: (r) => r.data,
    keepPreviousData: true,
  });

  const set = (key, val) => setFilters((f) => ({ ...f, [key]: val, page: 1 }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Annonces</h1>
        <Link to="/items/new" className="btn-primary">+ Publier</Link>
      </div>
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Rechercher..." value={filters.q} onChange={(e) => set('q', e.target.value)} />
        </div>
        <select className="input w-auto" value={filters.type} onChange={(e) => set('type', e.target.value)}>
          <option value="">Tous les types</option>
          <option value="LOST">Perdu</option>
          <option value="FOUND">Trouvé</option>
        </select>
        <select className="input w-auto" value={filters.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
          <option value="">Toutes les catégories</option>
          {cats?.categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input w-auto" value={filters.locationId} onChange={(e) => set('locationId', e.target.value)}>
          <option value="">Tous les lieux</option>
          {locs?.locations?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>
      {isLoading ? (
        <Spinner />
      ) : data?.items?.length === 0 ? (
        <EmptyState icon="🔍" title="Aucune annonce trouvée" description="Essayez de modifier vos filtres" />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {data?.items?.map((item) => <ItemCard key={item.id} item={item} />)}
          </div>
          <Pagination meta={data?.meta} onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
        </>
      )}
    </div>
  );
}
