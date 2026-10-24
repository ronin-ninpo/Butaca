import { Navigate, Outlet, ScrollRestoration, createHashRouter, useLocation } from 'react-router-dom';
import { useStore } from './lib/store';
import { TabBar } from './components/Bars';
import { Sheets } from './components/Sheets';
import { ToastHost } from './components/Toast';
import { ForYou } from './screens/ForYou';
import { Explore } from './screens/Explore';
import { Theaters } from './screens/Theaters';
import { MyMovies } from './screens/MyMovies';
import { Favorites } from './screens/Favorites';
import { MediaDetail } from './screens/MediaDetail';
import { PersonDetail } from './screens/PersonDetail';
import { Settings } from './screens/Settings';
import { Welcome } from './screens/Welcome';
import { Account } from './screens/Account';

function Layout() {
  const hasKey = useStore((s) => !!s.settings.tmdbKey);
  const { pathname } = useLocation();
  const open = pathname === '/bienvenida' || pathname === '/cuenta';
  if (!hasKey && !open) return <Navigate to="/bienvenida" replace />;
  return (
    <div className="app">
      <main className="main">
        <Outlet />
      </main>
      {hasKey && !open && <TabBar />}
      <Sheets />
      <ToastHost />
      <ScrollRestoration />
    </div>
  );
}

export const router = createHashRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <ForYou /> },
      { path: '/explorar', element: <Explore /> },
      { path: '/cartelera', element: <Theaters /> },
      { path: '/mis/:tab?', element: <MyMovies /> },
      { path: '/favoritos/:tab?', element: <Favorites /> },
      { path: '/t/:type/:id', element: <MediaDetail /> },
      { path: '/p/:id', element: <PersonDetail /> },
      { path: '/ajustes', element: <Settings /> },
      { path: '/bienvenida', element: <Welcome /> },
      { path: '/cuenta', element: <Account /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
