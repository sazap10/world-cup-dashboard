import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/tokens.css';
import './styles/base.css';
import './styles/app.css';
import { App } from './App';
import { DataProvider } from './app/DataProvider';
import { ClockProvider, TimezoneProvider } from './app/providers';
import { ThemeProvider } from './app/ThemeProvider';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ClockProvider>
          <DataProvider>
            <TimezoneProvider>
              <App />
            </TimezoneProvider>
          </DataProvider>
        </ClockProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
