import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import { router } from './App';
import { pruneCache } from './lib/cache';
import { initSync } from './lib/sync';
import './styles.css';

createRoot(document.getElementById('root')!).render(<RouterProvider router={router} />);

registerSW({ immediate: true });
initSync();

// Pedimos que el navegador no borre tus listas para liberar espacio.
navigator.storage?.persist?.().catch(() => {});
setTimeout(() => pruneCache(), 4000);
