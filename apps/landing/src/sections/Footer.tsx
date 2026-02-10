export function Footer() {
  return (
    <footer className="py-12 px-6 bg-adopet-text-primary text-white/90">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Adopet" className="h-8 w-auto opacity-90" />
          <span className="font-semibold text-white">Adopet</span>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-6 text-sm">
          <a
            href="#"
            className="hover:text-white transition-colors"
            title="Em breve: informe a URL da política de privacidade"
          >
            Política de privacidade
          </a>
          <a
            href="#"
            className="hover:text-white transition-colors"
            title="Em breve: informe a URL dos termos de uso"
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
      <div className="max-w-6xl mx-auto mt-6 pt-6 border-t border-white/20 text-center text-sm text-white/70">
        © {new Date().getFullYear()} Adopet. Adoção responsável na palma da mão.
      </div>
    </footer>
  );
}
