import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { itemsApi } from '../api/client.js';
import ItemCard from '../components/ItemCard.jsx';
import Spinner from '../components/ui/Spinner.jsx';

export default function HomePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['items', 'recent'],
    queryFn: () => itemsApi.list({ limit: 6, sort: 'createdAt', order: 'desc' }),
    select: (res) => res.data,
  });

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="text-center py-16 bg-gradient-to-br from-primary-50 to-white rounded-2xl">
        <div className="text-5xl mb-4">🔎</div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Campus Lost &amp; Found</h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto mb-8">
          Vous avez perdu ou trouvé un objet sur le campus ? Déclarez-le en quelques secondes.
        </p>
        <div className="flex justify-center gap-4">
          <Link to="/items/new" className="btn-primary text-base px-6 py-3">Publier une annonce</Link>
          <Link to="/items" className="btn-secondary text-base px-6 py-3">Parcourir les annonces</Link>
        </div>
      </section>

      {/* Recent items */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-6">Annonces récentes</h2>
        {isLoading ? (
          <Spinner />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {data?.items?.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
        <div className="text-center mt-8">
          <Link to="/items" className="btn-secondary">Voir toutes les annonces</Link>
        </div>
      </section>
    </div>
  );
}
