import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/client.js';
import Spinner from '../components/ui/Spinner.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Shield, CheckCircle, XCircle, UserX, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('items');
  const [userPage, setUserPage] = useState(1);
  const [itemPage, setItemPage] = useState(1);

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['admin', 'items', itemPage],
    queryFn: () => adminApi.pendingItems({ page: itemPage, limit: 20 }),
    select: (r) => r.data,
    enabled: tab === 'items',
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin', 'users', userPage],
    queryFn: () => adminApi.users({ page: userPage, limit: 20 }),
    select: (r) => r.data,
    enabled: tab === 'users',
  });

  const moderateMutation = useMutation({
    mutationFn: ({ id, action }) => adminApi.moderateItem(id, action),
    onSuccess: () => { qc.invalidateQueries(['admin', 'items']); toast.success('Annonce mise à jour'); },
    onError: () => toast.error('Erreur'),
  });

  const toggleUserMutation = useMutation({
    mutationFn: ({ id, status }) => adminApi.setUserStatus(id, status),
    onSuccess: () => { qc.invalidateQueries(['admin', 'users']); toast.success('Utilisateur mis à jour'); },
    onError: () => toast.error('Erreur'),
  });

  const tabs = ['items', 'users'];
  const tabLabel = { items: '📋 Annonces à modérer', users: '👥 Utilisateurs' };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield size={24} className="text-primary-600" />
        <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
      </div>
      <div className="flex gap-2 border-b">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`pb-2 px-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {tabLabel[t]}
          </button>
        ))}
      </div>

      {tab === 'items' && (
        itemsLoading ? <Spinner /> : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Titre', 'Type', 'Statut', 'Auteur', 'Date', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {items?.items?.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium max-w-[180px] truncate">{item.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.reportType === 'LOST' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>{item.reportType === 'LOST' ? 'Perdu' : 'Trouvé'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                        item.status === 'VERIFIED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>{item.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{item.reporter?.username}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: fr })}
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      <button title="Valider"
                        onClick={() => moderateMutation.mutate({ id: item.id, action: 'APPROVED' })}
                        className="text-green-600 hover:text-green-800">
                        <CheckCircle size={18} />
                      </button>
                      <button title="Rejeter"
                        onClick={() => moderateMutation.mutate({ id: item.id, action: 'REJECTED' })}
                        className="text-red-500 hover:text-red-700">
                        <XCircle size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!items?.items?.length && (
              <p className="text-center text-gray-400 py-8">Aucune annonce en attente ✅</p>
            )}
            <div className="p-4 border-t">
              <Pagination meta={items?.meta} onPageChange={setItemPage} />
            </div>
          </div>
        )
      )}

      {tab === 'users' && (
        usersLoading ? <Spinner /> : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Username', 'Email', 'Rôle', 'Statut', 'Inscrit', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {users?.users?.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{u.username}</td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                      }`}>{u.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>{u.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true, locale: fr })}
                    </td>
                    <td className="px-4 py-3">
                      {u.status === 'ACTIVE' ? (
                        <button title="Désactiver" onClick={() => toggleUserMutation.mutate({ id: u.id, status: 'INACTIVE' })} className="text-red-500 hover:text-red-700">
                          <UserX size={18} />
                        </button>
                      ) : (
                        <button title="Activer" onClick={() => toggleUserMutation.mutate({ id: u.id, status: 'ACTIVE' })} className="text-green-600 hover:text-green-800">
                          <UserCheck size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-4 border-t">
              <Pagination meta={users?.meta} onPageChange={setUserPage} />
            </div>
          </div>
        )
      )}
    </div>
  );
}
