export function Hero() {
  return (
    <header className="relative min-h-[90vh] flex flex-col items-center justify-center px-6 pt-20 pb-24 overflow-hidden bg-hero-pattern bg-adopet-background">
      <div className="absolute inset-0 bg-gradient-to-b from-adopet-header/30 to-transparent pointer-events-none" />
      <div className="relative z-10 max-w-2xl mx-auto text-center animate-fade-in">
        <img
          src="/logo.png"
          alt="Adopet"
          className="h-20 md:h-24 w-auto mx-auto mb-6 drop-shadow-sm object-contain"
        />
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-adopet-text-primary tracking-tight leading-tight mb-4">
          Adoção responsável
          <br />
          <span className="text-adopet-orange">na palma da mão</span>
        </h1>
        <p className="text-lg md:text-xl text-adopet-text-secondary max-w-xl mx-auto mb-6">
          Conectamos quem quer adotar um pet com tutores e instituições que buscam um lar responsável. Feed, mapa, chat e parceiros — tudo em um app.
        </p>
        <p className="text-base md:text-lg font-semibold mb-10">
          <span className="text-adopet-primary">Grátis: </span>
          <span className="text-adopet-orange">crie conta, anuncie pets para adoção e adote — sem custo.</span>
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center flex-wrap">
          <a
            href="https://play.google.com/store/apps/details?id=br.com.adopet.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-adopet-primary hover:bg-adopet-primary-dark text-white font-semibold text-lg shadow-lg shadow-adopet-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.627L15.206 12l2.492-2.491zM5.864 2.658L16.802 8.99l-2.303 2.302-8.635-8.634z" />
            </svg>
            Baixar grátis na Google Play
          </a>
          <span
            className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-adopet-text-secondary/20 text-adopet-text-secondary font-semibold text-lg border border-adopet-text-secondary/30 cursor-default"
            title="Em breve"
          >
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            Em breve na App Store
          </span>
          <a
            href="#como-funciona"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl border-2 border-adopet-primary text-adopet-primary font-semibold hover:bg-adopet-primary/10 transition-colors"
          >
            Ver como funciona
          </a>
        </div>
        <p className="mt-6 text-sm text-adopet-text-secondary">
          Seus dados são tratados conforme a LGPD.
        </p>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-adopet-surface to-transparent pointer-events-none" />
    </header>
  );
}
