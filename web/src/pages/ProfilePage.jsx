import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { itemsApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import ItemCard from '../components/ItemCard.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { User } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('items');

  const { data, isLoading } = useQuery({
    queryKey: ['my-items'],
    queryFn: () => itemsApi.list({ userId: user?.id }),
    select: (r) => r.data,
    enabled: !!user,
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Profile card */}
      <div className="card p-6 flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center">
          <User size={32} className="text-primary-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{user?.username}</h1>
          <p className="text-sm text-gray-500">{user?.email}</p>
          {user?.role === 'ADMIN' && (
            <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700 mt-1">Admin</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {['items'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Mes annonces
          </button>
        ))}
      </div>

      {isLoading ? (
        <Spinner />
      ) : data?.items?.length === 0 ? (
        <EmptyState icon="📋" title="Aucune annonce" description="Vous n'avez pas encore publié d'annonce" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {data?.items?.map((item) => <ItemCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}
