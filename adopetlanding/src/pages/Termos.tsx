const SUPPORT_EMAIL = 'contato@appadopet.com.br';

export function TermosPage() {
  return (
    <div className="min-h-screen bg-adopet-background">
      <header className="sticky top-0 z-10 bg-adopet-header/95 backdrop-blur-sm border-b border-adopet-header/50">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
          <a
            href="#"
            className="text-adopet-primary font-semibold hover:underline"
          >
            ← Voltar
          </a>
          <img src="/logo.png" alt="Adopet" className="h-10 w-auto" />
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-display font-bold text-adopet-text-primary mb-1">
          Termos de Uso
        </h1>
        <p className="text-sm text-adopet-text-secondary mb-8">
          Última atualização: fevereiro de 2025
        </p>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-adopet-text-primary mb-2">1. Aceitação</h2>
          <p className="text-adopet-text-secondary leading-relaxed">
            Ao usar o aplicativo Adopet, você concorda com estes Termos de Uso. O Adopet é uma plataforma que conecta pessoas que desejam adotar animais a tutores que buscam um novo lar para seus pets.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-adopet-text-primary mb-2">2. Uso da plataforma</h2>
          <p className="text-adopet-text-secondary leading-relaxed">
            Você se compromete a publicar apenas informações verdadeiras sobre os pets, a tratar outros usuários com respeito nas conversas e a não usar o app para fins ilegais ou que violem direitos de terceiros. Anúncios com conteúdo inadequado podem ser removidos e a conta suspensa.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-adopet-text-primary mb-2">3. Responsabilidade</h2>
          <p className="text-adopet-text-secondary leading-relaxed">
            O Adopet facilita o contato entre usuários, mas não realiza a adoção. A decisão de doar ou adotar é de total responsabilidade dos envolvidos. Recomendamos encontros em locais seguros e a verificação das condições do pet antes da entrega.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-adopet-text-primary mb-2">4. Conta e dados (LGPD)</h2>
          <p className="text-adopet-text-secondary leading-relaxed">
            Você é responsável por manter a confidencialidade da sua senha. Ao criar conta, você declara ter lido a Política de Privacidade e concorda com o tratamento dos seus dados pessoais nos termos da Lei Geral de Proteção de Dados (LGPD). O tratamento tem como finalidades a prestação do serviço, a melhoria da experiência e o cumprimento de obrigações legais. Você pode exercer seus direitos (acesso, correção, portabilidade, exclusão, etc.) conforme descrito na Política de Privacidade e entrando em contato pelo canal indicado no app.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-adopet-text-primary mb-2">5. Alterações</h2>
          <p className="text-adopet-text-secondary leading-relaxed">
            Podemos atualizar estes termos periodicamente. O uso continuado do app após alterações constitui aceitação da nova versão. Em caso de dúvidas, entre em contato pelo email de suporte disponível no app.
          </p>
        </section>

        <p className="text-adopet-text-secondary text-sm">
          Contato: <a href={`mailto:${SUPPORT_EMAIL}`} className="text-adopet-primary font-semibold hover:underline">{SUPPORT_EMAIL}</a>
        </p>
      </main>
    </div>
  );
}
