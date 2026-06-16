import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/tokens.css';
import './styles/base.css';
import './styles/app.css';
import { App } from './App';
import { ClockProvider, TimezoneProvider } from './app/providers';
import { DataProvider } from './app/DataProvider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ClockProvider>
        <DataProvider>
          <TimezoneProvider>
            <App />
          </TimezoneProvider>
        </DataProvider>
      </ClockProvider>
    </BrowserRouter>
  </StrictMode>,
);
