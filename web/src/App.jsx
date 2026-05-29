import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Spinner from './components/ui/Spinner.jsx';

import HomePage        from './pages/HomePage.jsx';
import LoginPage       from './pages/LoginPage.jsx';
import RegisterPage    from './pages/RegisterPage.jsx';
import ItemsPage       from './pages/ItemsPage.jsx';
import ItemDetailPage  from './pages/ItemDetailPage.jsx';
import NewItemPage     from './pages/NewItemPage.jsx';
import EditItemPage    from './pages/EditItemPage.jsx';
import MessagesPage    from './pages/MessagesPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import ProfilePage     from './pages/ProfilePage.jsx';
import AdminPage       from './pages/AdminPage.jsx';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner fullPage />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner fullPage />;
  if (!user || user.role !== 'ADMIN') return <Navigate to="/" replace />;
  return children;
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner fullPage />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="items" element={<ItemsPage />} />
        <Route path="items/:id" element={<ItemDetailPage />} />
        <Route
          path="items/new"
          element={<RequireAuth><NewItemPage /></RequireAuth>}
        />
        <Route
          path="items/:id/edit"
          element={<RequireAuth><EditItemPage /></RequireAuth>}
        />
        <Route
          path="messages"
          element={<RequireAuth><MessagesPage /></RequireAuth>}
        />
        <Route
          path="notifications"
          element={<RequireAuth><NotificationsPage /></RequireAuth>}
        />
        <Route
          path="profile"
          element={<RequireAuth><ProfilePage /></RequireAuth>}
        />
        <Route
          path="admin"
          element={<RequireAdmin><AdminPage /></RequireAdmin>}
        />
      </Route>
      <Route
        path="/login"
        element={<GuestOnly><LoginPage /></GuestOnly>}
      />
      <Route
        path="/register"
        element={<GuestOnly><RegisterPage /></GuestOnly>}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
