import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { BackToTop } from './components/BackToTop';
import { Hero } from './sections/Hero';
import { AppScreens } from './sections/AppScreens';
import { Features } from './sections/Features';
import { ForWho } from './sections/ForWho';
import { Partners } from './sections/Partners';
import { FAQ } from './sections/FAQ';
import { CTA } from './sections/CTA';
import { Contato } from './sections/Contato';
import { Footer } from './sections/Footer';
import { TermosPage } from './pages/Termos';
import { PrivacidadePage } from './pages/Privacidade';
import { ExclusaoContaPage } from './pages/ExclusaoConta';
import { ApoiePage } from './pages/Apoie';

function LandingContent() {
  return (
    <>
      <Header />
      <Hero />
      <AppScreens />
      <Features />
      <ForWho />
      <Partners />
      <FAQ />
      <CTA />
      <Contato />
      <Footer />
      <BackToTop />
    </>
  );
}

export default function App() {
  const [hash, setHash] = useState(() => window.location.hash || '');

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash || '');
    window.addEventListener('hashchange', onHashChange);
    setHash(window.location.hash || '');
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (hash === '#apoie') return <ApoiePage />;
  if (hash === '#termos') return <TermosPage />;
  if (hash === '#privacidade') return <PrivacidadePage />;
  if (hash === '#exclusao-conta') return <ExclusaoContaPage />;
  return (
    <div className="min-h-screen">
      <LandingContent />
    </div>
  );
}