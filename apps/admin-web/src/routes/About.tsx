export function About() {
  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-adopet-text-primary mb-6">Sobre o painel</h1>
      <div className="bg-adopet-card rounded-xl border border-adopet-primary/10 p-6 space-y-4 max-w-2xl">
        <p className="text-adopet-text-primary">
          Painel administrativo do <strong>Adopet</strong> para gestão de anúncios, verificações, denúncias,
          adoções, parceiros e usuários.
        </p>
        <dl className="grid gap-2 text-sm">
          <div>
            <dt className="font-medium text-adopet-text-secondary">App (tutores e adotantes)</dt>
            <dd>
              <a
                href="https://appadopet.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="text-adopet-primary hover:underline"
              >
                appadopet.com.br
              </a>
            </dd>
          </div>
          <div>
            <dt className="font-medium text-adopet-text-secondary">Landing</dt>
            <dd>
              <a
                href="https://appadopet.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="text-adopet-primary hover:underline"
              >
                appadopet.com.br
              </a>
            </dd>
          </div>
        </dl>
        <p className="text-adopet-text-secondary text-sm pt-2 border-t border-adopet-primary/10">
          Versão 1.0 · Acesso restrito a administradores.
        </p>
      </div>
    </div>
  );
}
