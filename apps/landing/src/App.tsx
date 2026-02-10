import { Header } from './components/Header';
import { BackToTop } from './components/BackToTop';
import { Hero } from './sections/Hero';
import { AppScreens } from './sections/AppScreens';
import { Features } from './sections/Features';
import { ForWho } from './sections/ForWho';
import { Partners } from './sections/Partners';
import { FAQ } from './sections/FAQ';
import { CTA } from './sections/CTA';
import { Footer } from './sections/Footer';

export default function App() {
  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <AppScreens />
      <Features />
      <ForWho />
      <Partners />
      <FAQ />
      <CTA />
      <Footer />
      <BackToTop />
    </div>
  );
}
