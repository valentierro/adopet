export function Footer() {
  return (
    <footer className="py-12 px-6 bg-adopet-text-primary text-white/90">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Adopet" className="h-10 w-auto opacity-90" />
          <span className="font-semibold text-white">Adopet</span>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-6 text-sm">
          <a
            href="#privacidade"
            className="hover:text-white transition-colors"
          >
            Política de privacidade
          </a>
          <a
            href="#termos"
            className="hover:text-white transition-colors"
          >
            Termos de uso
          </a>
          <a
            href="https://play.google.com/store/apps/details?id=br.com.adopet.app"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            Google Play
          </a>
        </nav>
      </div>
      <div className="max-w-6xl mx-auto mt-6 pt-6 border-t border-white/20 text-center text-sm text-white/70 space-y-1">
        <p>© {new Date().getFullYear()} Adopet. Adoção responsável na palma da mão.</p>
        <p>VALENTIN DOS SANTOS LTDA (VSQuality) — CNPJ 38.225.533/0001-44</p>
      </div>
    </footer>
  );
}
