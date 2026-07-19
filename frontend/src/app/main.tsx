import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import SitePreparationPage from '../components/screens/SitePreparationPage';
import router from './router';
import './styles.css';

const app =
  import.meta.env.VITE_SITE_HOLDING_PAGE === 'true' ? (
    <SitePreparationPage />
  ) : (
    <RouterProvider router={router} />
  );

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {app}
  </StrictMode>,
);
