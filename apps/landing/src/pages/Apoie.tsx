const CONTACT_EMAIL = 'contato@appadopet.com.br';

const IconHeart = () => (
  <svg className="w-12 h-12 text-adopet-orange" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const IconPaw = () => (
  <svg className="w-12 h-12 text-adopet-primary" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
    <circle cx="6.5" cy="9.5" r="2" />
    <circle cx="17.5" cy="9.5" r="2" />
    <circle cx="10.5" cy="6.5" r="2" />
    <circle cx="13.5" cy="6.5" r="2" />
    <ellipse cx="12" cy="16" rx="5" ry="4" />
  </svg>
);

const IconGift = () => (
  <svg className="w-12 h-12 text-adopet-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 00-2 2v6a2 2 0 002 2h14a2 2 0 002-2v-6a2 2 0 00-2-2M5 12v6h14v-6M5 12h14" />
  </svg>
);

const IconMail = () => (
  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const IconCheck = () => (
  <svg className="w-6 h-6 text-adopet-primary shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
  </svg>
);

export function ApoiePage() {
  return (
    <div className="min-h-screen bg-adopet-background">
      <header className="sticky top-0 z-10 bg-adopet-header/95 backdrop-blur-sm border-b border-adopet-header/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <a href="#" className="text-adopet-primary font-semibold hover:underline flex items-center gap-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Voltar
          </a>
          <img src="/logo.png" alt="Adopet" className="h-10 w-auto" />
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative px-6 py-16 md:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-adopet-primary/10 via-adopet-surface/50 to-adopet-orange/5 pointer-events-none" />
          <div className="absolute top-10 right-10 w-64 h-64 bg-adopet-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-48 h-48 bg-adopet-orange/10 rounded-full blur-2xl" />
          <div className="relative max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-adopet-primary/10 text-adopet-primary mb-6">
              <IconHeart />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-adopet-text-primary mb-4">
              Apoie a Adopet
            </h1>
            <p className="text-xl md:text-2xl text-adopet-text-secondary max-w-2xl mx-auto mb-8">
              Ajude a melhorar o app que conecta pets a lares amorosos — de forma <span className="text-adopet-primary font-semibold">100% voluntária</span>.
            </p>
          </div>
        </section>

        {/* O que é o Adopet */}
        <section className="px-6 py-12 md:py-16">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
              <div className="flex-shrink-0">
                <div className="w-24 h-24 rounded-2xl bg-adopet-primary/10 flex items-center justify-center">
                  <IconPaw />
                </div>
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-display font-bold text-adopet-text-primary mb-4">
                  O que é o Adopet?
                </h2>
                <p className="text-lg text-adopet-text-secondary leading-relaxed">
                  O Adopet é um aplicativo gratuito que conecta pessoas que querem adotar um pet com tutores e instituições que buscam um lar responsável. Com feed personalizado, mapa de pets próximos, chat e parceiros, facilitamos o encontro entre quem procura e quem oferece um novo lar.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 100% gratuito */}
        <section className="px-6 py-12 md:py-16 bg-adopet-surface/60">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-adopet-orange/15 text-adopet-orange mb-6">
                <IconGift />
              </div>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-adopet-text-primary mb-4">
                Totalmente gratuito
              </h2>
              <p className="text-lg text-adopet-text-secondary max-w-2xl mx-auto">
                Você não paga nada para usar o app. Crie conta, anuncie pets para adoção e adote — sem custo.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              <div className="flex items-start gap-4 p-6 rounded-2xl bg-white border border-adopet-primary/10 shadow-sm">
                <IconCheck />
                <div>
                  <h3 className="font-semibold text-adopet-text-primary mb-1">Anunciar pets</h3>
                  <p className="text-adopet-text-secondary text-sm">Publique anúncios de pets para adoção sem pagar nada.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-6 rounded-2xl bg-white border border-adopet-primary/10 shadow-sm">
                <IconCheck />
                <div>
                  <h3 className="font-semibold text-adopet-text-primary mb-1">Adotar</h3>
                  <p className="text-adopet-text-secondary text-sm">Busque e adote pets de forma completamente gratuita.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Apoie voluntariamente */}
        <section className="px-6 py-12 md:py-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-adopet-text-primary text-center mb-4">
              Apoie voluntariamente
            </h2>
            <p className="text-lg text-adopet-text-secondary text-center max-w-2xl mx-auto mb-12">
              O app é gratuito e sempre será. Se você quiser contribuir para que o Adopet continue evoluindo, entre em contato. Seu apoio ajuda a melhorar o aplicativo para todos.
            </p>

            <div className="max-w-xl mx-auto">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="group flex items-center justify-center gap-4 p-6 md:p-8 rounded-2xl bg-adopet-primary text-white shadow-lg shadow-adopet-primary/25 hover:bg-adopet-primary-dark hover:shadow-xl hover:shadow-adopet-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-white/20 group-hover:bg-white/25 transition-colors">
                  <IconMail />
                </div>
                <div className="text-left">
                  <p className="text-sm text-white/80 font-medium mb-0.5">Entre em contato</p>
                  <p className="text-xl md:text-2xl font-bold break-all">{CONTACT_EMAIL}</p>
                </div>
              </a>
              <p className="mt-6 text-center text-adopet-text-secondary text-sm">
                Envie uma mensagem se quiser apoiar o projeto. Responderemos em breve.
              </p>
            </div>

            <div className="mt-16 grid sm:grid-cols-3 gap-6 text-center">
              <div className="p-6 rounded-xl bg-white/60 border border-adopet-primary/10">
                <p className="text-3xl font-bold text-adopet-primary mb-1">+</p>
                <p className="text-adopet-text-secondary text-sm">Novas funcionalidades</p>
              </div>
              <div className="p-6 rounded-xl bg-white/60 border border-adopet-primary/10">
                <p className="text-3xl font-bold text-adopet-primary mb-1">+</p>
                <p className="text-adopet-text-secondary text-sm">Melhorias de experiência</p>
              </div>
              <div className="p-6 rounded-xl bg-white/60 border border-adopet-primary/10">
                <p className="text-3xl font-bold text-adopet-primary mb-1">+</p>
                <p className="text-adopet-text-secondary text-sm">Manutenção do app</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Baixar app */}
        <section className="px-6 py-16 md:py-20 bg-adopet-primary">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-4">
              Ainda não usa o Adopet?
            </h2>
            <p className="text-lg text-white/90 mb-8">
              Baixe grátis na Google Play e comece a anunciar ou adotar pets hoje mesmo.
            </p>
            <a
              href="https://play.google.com/store/apps/details?id=br.com.adopet.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-2xl bg-adopet-orange text-white font-semibold text-lg shadow-xl hover:bg-adopet-orange-light transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.627L15.206 12l2.492-2.491zM5.864 2.658L16.802 8.99l-2.303 2.302-8.635-8.634z" />
              </svg>
              Baixar grátis na Google Play
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
