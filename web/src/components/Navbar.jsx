import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '../api/client.js';
import { Bell, MessageSquare, Plus, LogOut, User, Shield } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const { data: notifs } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => notificationsApi.list({ read: false, limit: 1 }),
    enabled: !!user,
    refetchInterval: 30_000,
    select: (res) => res.data,
  });
  const unreadCount = notifs?.meta?.total ?? 0;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors ${
      isActive ? 'text-primary-600' : 'text-gray-600 hover:text-gray-900'
    }`;

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl">&#128270;</span>
            <span className="font-bold text-gray-900">Lost &amp; Found</span>
          </Link>

          {/* Navigation links */}
          <div className="hidden sm:flex items-center gap-6">
            <NavLink to="/" end className={navLinkClass}>Accueil</NavLink>
            <NavLink to="/items" className={navLinkClass}>Annonces</NavLink>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link to="/items/new" className="btn-primary">
                  <Plus size={16} />
                  <span className="hidden sm:inline">Publier</span>
                </Link>

                <Link to="/notifications" className="relative p-2 text-gray-600 hover:text-gray-900">
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>

                <Link to="/messages" className="p-2 text-gray-600 hover:text-gray-900">
                  <MessageSquare size={20} />
                </Link>

                {user.role === 'ADMIN' && (
                  <Link to="/admin" className="p-2 text-primary-600 hover:text-primary-700">
                    <Shield size={20} />
                  </Link>
                )}

                <div className="relative group">
                  <button className="flex items-center gap-2 rounded-full p-1 hover:bg-gray-100">
                    <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                      <User size={16} className="text-primary-600" />
                    </div>
                  </button>
                  {/* Dropdown */}
                  <div className="absolute right-0 mt-1 hidden group-hover:block w-48 rounded-xl bg-white shadow-lg ring-1 ring-gray-200 py-1">
                    <Link to="/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <User size={14} /> Mon profil
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut size={14} /> Déconnexion
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-secondary">Connexion</Link>
                <Link to="/register" className="btn-primary">S&apos;inscrire</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
