const SUPPORT_EMAIL = 'contato@appadopet.com.br';

export function PrivacidadePage() {
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
          Política de Privacidade
        </h1>
        <p className="text-sm text-adopet-text-secondary mb-6">
          Última atualização: fevereiro de 2025
        </p>
        <p className="text-adopet-text-secondary leading-relaxed mb-8">
          Esta política descreve como o Adopet trata seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD – Lei 13.709/2018). Ao usar o app, você declara ter lido e concordado com estes termos.
        </p>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-adopet-text-primary mb-2">1. Controlador e finalidade</h2>
          <p className="text-adopet-text-secondary leading-relaxed">
            O aplicativo Adopet é operado pela VALENTIN DOS SANTOS LTDA (nome fantasia VSQuality), pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 38.225.533/0001-44, sendo a controladora dos dados coletados no aplicativo. Tratamos seus dados para: (a) prestar o serviço de conexão entre tutores e adotantes; (b) exibir seu perfil no contexto dos anúncios e conversas, conforme suas configurações; (c) enviar notificações push conforme suas preferências; (d) cumprir obrigações legais e (e) confirmar adoções, quando aplicável, por meio de administradores que podem entrar em contato com você.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-adopet-text-primary mb-2">2. Dados que coletamos</h2>
          <p className="text-adopet-text-secondary leading-relaxed">
            Coletamos: nome, email, telefone (com DDD), cidade, foto de perfil, informações sobre moradia e estilo de vida que você optar por preencher; dados dos pets anunciados (fotos, descrição, etc.); favoritos, conversas e mensagens; preferências de busca e localização quando autorizada; e dados técnicos necessários ao funcionamento do app (ex.: token de notificações).
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-adopet-text-primary mb-2">3. Base legal (LGPD)</h2>
          <p className="text-adopet-text-secondary leading-relaxed">
            O tratamento tem como bases legais: execução de contrato (prestação do serviço), consentimento (quando solicitado para finalidades específicas) e legítimo interesse (segurança, melhoria do serviço e cumprimento legal), nos termos do art. 7º da LGPD.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-adopet-text-primary mb-2">4. Compartilhamento e quem vê seus dados</h2>
          <p className="text-adopet-text-secondary leading-relaxed">
            <strong>Não vendemos nem alugamos seus dados.</strong>
            <br /><br />
            • <strong>Outros usuários:</strong> em conversas e no perfil vinculado aos anúncios, outros usuários veem apenas nome, foto, cidade e informações que você escolheu exibir (ex.: tipo de moradia). <strong>Seu email e telefone não são mostrados a outros usuários.</strong>
            <br /><br />
            • <strong>Administradores:</strong> o telefone pode ser utilizado apenas por administradores do app para confirmar adoções com você (tutor ou adotante), quando necessário.
            <br /><br />
            • Prestadores de serviço (hospedagem, notificações) podem processar dados sob contrato e obrigação de confidencialidade.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-adopet-text-primary mb-2">5. Retenção</h2>
          <p className="text-adopet-text-secondary leading-relaxed">
            Mantemos seus dados enquanto sua conta estiver ativa. Ao desativar a conta, os dados permanecem armazenados para possível reativação; você pode solicitar exclusão definitiva entrando em contato conosco (ver seção 7).
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-adopet-text-primary mb-2">6. Seus direitos (art. 18 da LGPD)</h2>
          <p className="text-adopet-text-secondary leading-relaxed">
            Você tem direito a: confirmação da existência de tratamento; acesso aos dados; correção de dados incompletos ou desatualizados; anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade; portabilidade dos dados (exportar em formato estruturado); eliminação dos dados tratados com consentimento (salvo exceções legais); informação sobre compartilhamento e revogação do consentimento quando o tratamento for com base nele.
            <br /><br />
            <strong>Como exercer:</strong> acesse e atualize seus dados na tela de perfil do app; use a opção &quot;Exportar meus dados&quot; para portabilidade; use &quot;Desativar conta&quot; nas configurações; para exclusão definitiva, portabilidade detalhada ou outras solicitações, entre em contato pelo email abaixo.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-adopet-text-primary mb-2">7. Segurança e contato</h2>
          <p className="text-adopet-text-secondary leading-relaxed">
            Adotamos medidas técnicas e organizacionais para proteger seus dados. Para dúvidas sobre esta política, para exercer seus direitos ou comunicar o encarregado (DPO), entre em contato:
          </p>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-adopet-primary font-semibold hover:underline mt-2 inline-block">
            {SUPPORT_EMAIL}
          </a>
        </section>
      </main>
    </div>
  );
}
