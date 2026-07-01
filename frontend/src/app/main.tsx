import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import SitePreparationPage from '../components/screens/SitePreparationPage';
import { AppProviders } from './providers';
import router from './router';
import './styles.css';
import '../styles/site-preparation.css';

const app =
  import.meta.env.VITE_SITE_HOLDING_PAGE === 'true' ? (
    <SitePreparationPage />
  ) : (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {app}
  </StrictMode>,
);
