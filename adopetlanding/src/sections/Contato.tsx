const CONTATO_EMAIL = 'contato@appadopet.com.br';

export function Contato() {
  return (
    <section className="py-12 md:py-16 px-6 bg-adopet-surface">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-adopet-text-primary mb-2">
          Fale conosco
        </h2>
        <p className="text-adopet-text-secondary mb-6">
          Dúvidas, sugestões ou exercício de direitos (LGPD)? Entre em contato:
        </p>
        <a
          href={`mailto:${CONTATO_EMAIL}`}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-adopet-primary text-white font-semibold hover:bg-adopet-primary-dark transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          {CONTATO_EMAIL}
        </a>
      </div>
    </section>
  );
}
