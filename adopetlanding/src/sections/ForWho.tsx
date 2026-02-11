const audiences = [
  {
    title: 'Quem quer adotar',
    items: [
      'Feed de pets disponíveis para adoção',
      'Perfis completos: fotos, história e temperamento',
      'Mapa para ver animais próximos',
      'Favoritos e conversa direta com o tutor',
      'Parceiros com cupons para o novo amigo',
    ],
    cta: 'Encontre seu pet',
    gradient: 'from-adopet-primary to-adopet-primary-dark',
  },
  {
    title: 'Quem quer colocar para adoção',
    items: [
      'Anúncio simples com fotos e descrição',
      'Controle de adoções e conversas',
      'Visibilidade para seu pet',
      'Conexão com adotantes responsáveis',
    ],
    cta: 'Publique um anúncio',
    gradient: 'from-adopet-primary to-adopet-primary-dark',
  },
  {
    title: 'Parceiros (clínicas, lojas, ONGs)',
    items: [
      'Página de parceiros no app',
      'Cupons de desconto para usuários',
      'Destaque e mais visibilidade',
      'Planos para clínicas e pet shops',
    ],
    cta: 'Seja parceiro',
    gradient: 'from-adopet-orange to-adopet-orange-light',
  },
];

export function ForWho() {
  return (
    <section className="py-20 md:py-28 px-6 bg-adopet-background">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-adopet-text-primary mb-4">
            Para todo mundo que ama pets
          </h2>
          <p className="text-lg text-adopet-text-secondary max-w-2xl mx-auto">
            Seja para adotar, para encontrar um lar para um animal ou para divulgar seu negócio — o Adopet conecta. Cadastro, anúncios e adoção são gratuitos.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {audiences.map((block) => (
            <div
              key={block.title}
              className="bg-adopet-card rounded-2xl overflow-hidden shadow-sm border border-adopet-header/50 hover:shadow-lg transition-shadow"
            >
              <div className={`h-2 bg-gradient-to-r ${block.gradient}`} />
              <div className="p-6 md:p-8">
                <h3 className="text-xl font-semibold text-adopet-text-primary mb-4">
                  {block.title}
                </h3>
                <ul className="space-y-3 mb-6">
                  {block.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-adopet-text-secondary">
                      <span className="text-adopet-primary mt-0.5">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <span className="inline-block text-adopet-primary font-semibold">
                  {block.cta} →
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
