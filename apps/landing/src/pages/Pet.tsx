/**
 * Página pública /pet/:id — usada pelo link de compartilhamento do app.
 * Não depende de API; só exibe CTA para abrir no app ou baixar.
 */
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=br.com.adopet.app';

function getPetIdFromPath(): string | null {
  const match = window.location.pathname.match(/^\/pet\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export function PetPage() {
  const petId = getPetIdFromPath();
  const appDeepLink = petId ? `adopet://pet/${petId}` : null;

  return (
    <div className="min-h-screen bg-adopet-background">
      <nav className="bg-adopet-background/95 backdrop-blur-sm border-b border-adopet-header/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center">
          <a
            href="https://appadopet.com.br/"
            className="flex items-center gap-2"
          >
            <img src="/logo.png" alt="Adopet" className="h-10 w-auto" />
          </a>
        </div>
      </nav>

      <main className="max-w-lg mx-auto px-6 py-16 text-center">
        <div className="rounded-2xl bg-white shadow-xl border border-adopet-header/20 p-10">
          <h1 className="text-2xl md:text-3xl font-display font-bold text-adopet-text-primary mb-3">
            Um pet te espera no Adopet
          </h1>
          <p className="text-adopet-text-secondary mb-8">
            Quem compartilhou esse link quer que você veja um anúncio de adoção no app. Abra no Adopet ou baixe grátis.
          </p>

          <div className="flex flex-col gap-4">
            {appDeepLink && (
              <a
                href={appDeepLink}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-adopet-primary text-white font-semibold text-lg shadow-lg hover:bg-adopet-primary-dark transition-colors"
              >
                Abrir no app
              </a>
            )}
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-adopet-orange text-white font-semibold text-lg shadow-lg hover:bg-adopet-orange-light transition-colors"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.627L15.206 12l2.492-2.491zM5.864 2.658L16.802 8.99l-2.303 2.302-8.635-8.634z" />
              </svg>
              Baixar grátis na Google Play
            </a>
          </div>

          <p className="mt-8 text-sm text-adopet-text-secondary">
            Não tem o app? Toque em &quot;Baixar grátis&quot; para instalar.
          </p>
        </div>
      </main>
    </div>
  );
}
