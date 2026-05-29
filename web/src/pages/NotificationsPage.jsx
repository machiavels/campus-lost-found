import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../api/client.js';
import Spinner from '../components/ui/Spinner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Bell, CheckCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function NotificationsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list({ limit: 50 }),
    select: (r) => r.data,
  });

  const readAllMutation = useMutation({
    mutationFn: () => notificationsApi.readAll(),
    onSuccess: () => { qc.invalidateQueries(['notifications']); toast.success('Tout marqué comme lu'); },
  });

  const readOneMutation = useMutation({
    mutationFn: (id) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  });

  if (isLoading) return <Spinner />;

  const notifs = data?.notifications ?? [];

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        {notifs.some((n) => !n.read) && (
          <button onClick={() => readAllMutation.mutate()} className="btn-secondary text-sm">
            <CheckCheck size={16} /> Tout marquer comme lu
          </button>
        )}
      </div>
      {notifs.length === 0 ? (
        <EmptyState icon={<Bell size={40} className="text-gray-300" />} title="Aucune notification" />
      ) : (
        <div className="card divide-y">
          {notifs.map((n) => (
            <div key={n.id}
              className={`p-4 flex items-start gap-3 cursor-pointer hover:bg-gray-50 transition-colors ${!n.read ? 'bg-primary-50' : ''}`}
              onClick={() => !n.read && readOneMutation.mutate(n.id)}>
              {!n.read && <span className="mt-1.5 h-2 w-2 rounded-full bg-primary-600 flex-shrink-0" />}
              <div className="flex-1">
                <p className={`text-sm ${!n.read ? 'font-medium text-gray-900' : 'text-gray-600'}`}>{n.message}</p>
                <p className="text-xs text-gray-400 mt-0.5">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: fr })}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
