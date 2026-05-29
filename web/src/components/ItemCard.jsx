import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import Badge from './ui/Badge.jsx';
import { MapPin, Clock } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function ItemCard({ item }) {
  const photo = item.photos?.[0];
  const photoUrl = photo ? `${API_BASE}/uploads/${photo.filename}` : null;

  return (
    <Link
      to={`/items/${item.id}`}
      className="card flex flex-col overflow-hidden hover:shadow-md transition-shadow group"
    >
      <div className="h-48 bg-gray-100 overflow-hidden">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={item.title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="h-full flex items-center justify-center text-4xl text-gray-300">
            &#128270;
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 line-clamp-2 flex-1">{item.title}</h3>
          <div className="flex flex-col gap-1 items-end shrink-0">
            <Badge label={item.type} />
            <Badge label={item.status} />
          </div>
        </div>
        {item.description && (
          <p className="text-sm text-gray-500 line-clamp-2 mb-3">{item.description}</p>
        )}
        <div className="mt-auto flex flex-col gap-1 text-xs text-gray-400">
          {item.location && (
            <span className="flex items-center gap-1">
              <MapPin size={12} /> {item.location.name}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: fr })}
          </span>
        </div>
      </div>
    </Link>
  );
}
