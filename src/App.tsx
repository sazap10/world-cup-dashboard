import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { MobileNav } from './components/Nav';
import { Fixtures } from './pages/Fixtures';
import { Home } from './pages/Home';
import { Knockout } from './pages/Knockout';
import { Results } from './pages/Results';
import { Tables } from './pages/Tables';

export function App() {
  const location = useLocation();
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main" className="main" key={location.pathname}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/fixtures" element={<Fixtures />} />
          <Route path="/results" element={<Results />} />
          <Route path="/tables" element={<Tables />} />
          <Route path="/knockout" element={<Knockout />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}
