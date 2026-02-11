const SUPPORT_EMAIL = 'contato@appadopet.com.br';
const MAILTO_SUBJECT = encodeURIComponent('Solicitação de exclusão de conta e dados - Adopet');
const MAILTO_BODY = encodeURIComponent(
  'Olá,\n\nSolicito a exclusão da minha conta e de todos os meus dados pessoais no aplicativo Adopet, em conformidade com a LGPD.\n\nMeu e-mail cadastrado no app: [informe aqui]\n\nAtenciosamente,'
);
const MAILTO_URL = `mailto:${SUPPORT_EMAIL}?subject=${MAILTO_SUBJECT}&body=${MAILTO_BODY}`;

export function ExclusaoContaPage() {
  return (
    <div className="min-h-screen bg-adopet-background">
      <header className="sticky top-0 z-10 bg-adopet-header/95 backdrop-blur-sm border-b border-adopet-header/50">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
          <a href="#" className="text-adopet-primary font-semibold hover:underline">
            ← Voltar
          </a>
          <img src="/logo.png" alt="Adopet" className="h-10 w-auto" />
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-display font-bold text-adopet-text-primary mb-2">
          Solicitar exclusão da conta e dos dados
        </h1>
        <p className="text-adopet-text-secondary leading-relaxed mb-6">
          Você tem direito à exclusão dos seus dados pessoais, nos termos da LGPD. Para solicitar a exclusão da sua conta e de todos os dados associados no aplicativo Adopet, entre em contato pelo e-mail abaixo.
        </p>
        <p className="text-adopet-text-secondary leading-relaxed mb-4">
          Ao clicar no link, seu aplicativo de e-mail será aberto com o assunto e uma mensagem já preenchidos. Basta informar o e-mail cadastrado no app e enviar. Nossa equipe processará sua solicitação em até o prazo legal.
        </p>
        <a
          href={MAILTO_URL}
          className="inline-flex items-center gap-2 rounded-lg bg-adopet-primary px-5 py-3 text-white font-semibold hover:opacity-90 transition-opacity"
        >
          Solicitar exclusão da conta e dos dados
        </a>
        <p className="text-sm text-adopet-text-secondary mt-6">
          E-mail de contato: <a href={`mailto:${SUPPORT_EMAIL}`} className="text-adopet-primary font-medium hover:underline">{SUPPORT_EMAIL}</a>
        </p>
      </main>
    </div>
  );
}
