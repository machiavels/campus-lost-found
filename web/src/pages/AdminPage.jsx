import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/client.js';
import Spinner from '../components/ui/Spinner.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Trash2, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('stats');
  const [userPage, setUserPage] = useState(1);
  const [itemPage, setItemPage] = useState(1);

  const { data: stats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.stats(),
    select: (r) => r.data,
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin', 'users', userPage],
    queryFn: () => adminApi.users({ page: userPage, limit: 20 }),
    select: (r) => r.data,
    enabled: tab === 'users',
  });

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['admin', 'items', itemPage],
    queryFn: () => adminApi.items({ page: itemPage, limit: 20 }),
    select: (r) => r.data,
    enabled: tab === 'items',
  });

  const deleteUser = useMutation({
    mutationFn: (id) => adminApi.deleteUser(id),
    onSuccess: () => { qc.invalidateQueries(['admin', 'users']); toast.success('Utilisateur supprimé'); },
    onError: () => toast.error('Erreur'),
  });

  const deleteItem = useMutation({
    mutationFn: (id) => adminApi.deleteItem(id),
    onSuccess: () => { qc.invalidateQueries(['admin', 'items']); toast.success('Annonce supprimée'); },
    onError: () => toast.error('Erreur'),
  });

  const tabs = ['stats', 'users', 'items'];
  const tabLabel = { stats: '📊 Stats', users: '👥 Utilisateurs', items: '📋 Annonces' };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield size={24} className="text-primary-600" />
        <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
      </div>
      <div className="flex gap-2 border-b">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`pb-2 px-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {tabLabel[t]}
          </button>
        ))}
      </div>
      {tab === 'stats' && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.entries(stats).map(([k, v]) => (
            <div key={k} className="card p-4 text-center">
              <p className="text-3xl font-bold text-primary-600">{v}</p>
              <p className="text-sm text-gray-500 capitalize mt-1">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</p>
            </div>
          ))}
        </div>
      )}
      {tab === 'users' && (
        usersLoading ? <Spinner /> : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>{['Username', 'Email', 'Rôle', 'Inscrit', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-500">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y">
                {users?.users?.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{u.username}</td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>{u.role}</span></td>
                    <td className="px-4 py-3 text-gray-400">{formatDistanceToNow(new Date(u.createdAt), { addSuffix: true, locale: fr })}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => { if (confirm('Supprimer cet utilisateur ?')) deleteUser.mutate(u.id); }} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-4 border-t"><Pagination meta={users?.meta} onPageChange={setUserPage} /></div>
          </div>
        )
      )}
      {tab === 'items' && (
        itemsLoading ? <Spinner /> : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>{['Titre', 'Type', 'Statut', 'Auteur', 'Date', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-500">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y">
                {items?.items?.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium max-w-[200px] truncate">{item.title}</td>
                    <td className="px-4 py-3">{item.type}</td>
                    <td className="px-4 py-3">{item.status}</td>
                    <td className="px-4 py-3 text-gray-500">{item.user?.username}</td>
                    <td className="px-4 py-3 text-gray-400">{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: fr })}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => { if (confirm('Supprimer cette annonce ?')) deleteItem.mutate(item.id); }} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-4 border-t"><Pagination meta={items?.meta} onPageChange={setItemPage} /></div>
          </div>
        )
      )}
    </div>
  );
}
