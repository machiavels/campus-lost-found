import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { itemsApi, claimsApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Badge from '../components/ui/Badge.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { MapPin, Clock, User, Edit, Trash2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function ItemDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: item, isLoading } = useQuery({
    queryKey: ['item', id],
    queryFn: () => itemsApi.get(id),
    select: (r) => r.data.item ?? r.data,
  });

  const deleteMutation = useMutation({
    mutationFn: () => itemsApi.delete(id),
    onSuccess: () => { toast.success('Annonce supprimée'); navigate('/items'); },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const claimMutation = useMutation({
    mutationFn: () => claimsApi.create({ itemId: id }),
    onSuccess: () => { toast.success('Réclamation envoyée !'); qc.invalidateQueries(['item', id]); },
    onError: (err) => toast.error(err.response?.data?.message || 'Erreur'),
  });

  if (isLoading) return <Spinner fullPage />;
  if (!item) return <div className="text-center py-16 text-gray-500">Annonce introuvable.</div>;

  const isOwner = user?.id === item.userId;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {item.photos?.length > 0 && (
        <div className="flex gap-3 overflow-x-auto">
          {item.photos.map((p) => (
            <img key={p.id} src={`${API_BASE}/uploads/${p.filename}`} alt={item.title} className="h-64 rounded-xl object-cover flex-shrink-0" />
          ))}
        </div>
      )}
      <div className="card p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">{item.title}</h1>
          <div className="flex gap-2 flex-shrink-0">
            <Badge label={item.type} />
            <Badge label={item.status} />
          </div>
        </div>
        {item.description && <p className="text-gray-600">{item.description}</p>}
        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
          {item.location && <span className="flex items-center gap-1"><MapPin size={14} />{item.location.name}</span>}
          {item.category && <span className="flex items-center gap-1">🏷️ {item.category.name}</span>}
          <span className="flex items-center gap-1"><Clock size={14} />{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: fr })}</span>
          {item.user && <span className="flex items-center gap-1"><User size={14} />{item.user.username}</span>}
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          {isOwner ? (
            <>
              <Link to={`/items/${id}/edit`} className="btn-secondary"><Edit size={16} />Modifier</Link>
              <button onClick={() => { if (confirm('Supprimer cette annonce ?')) deleteMutation.mutate(); }} className="btn-secondary text-red-600 hover:bg-red-50">
                <Trash2 size={16} />Supprimer
              </button>
            </>
          ) : user && item.status === 'ACTIVE' ? (
            <button onClick={() => claimMutation.mutate()} className="btn-primary" disabled={claimMutation.isPending}>
              {claimMutation.isPending ? 'Envoi...' : '✋ Réclamer cet objet'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
