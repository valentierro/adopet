export function Header() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-adopet-background/95 backdrop-blur-sm border-b border-adopet-header/50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2">
          <img src="/logo.png" alt="Adopet" className="h-10 w-auto" />
        </a>
        <div className="flex items-center gap-4">
          <a
            href="#como-funciona"
            className="text-adopet-text-secondary hover:text-adopet-primary font-medium transition-colors hidden sm:inline"
          >
            Como funciona
          </a>
          <a
            href="https://play.google.com/store/apps/details?id=br.com.adopet.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-adopet-primary text-white text-sm font-semibold hover:bg-adopet-primary-dark transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.627L15.206 12l2.492-2.491zM5.864 2.658L16.802 8.99l-2.303 2.302-8.635-8.634z" />
            </svg>
            Baixar grátis
          </a>
        </div>
      </div>
    </nav>
  );
}
