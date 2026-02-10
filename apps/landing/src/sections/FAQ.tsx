const ITEMS = [
  {
    pergunta: 'O Adopet é grátis?',
    resposta:
      'Sim. Criar conta, anunciar pets para adoção e usar o app para adotar é 100% gratuito. Não cobramos nada de tutores nem de quem quer adotar.',
  },
  {
    pergunta: 'Preciso pagar para anunciar um pet para adoção?',
    resposta:
      'Não. Qualquer pessoa pode publicar anúncios de pets para adoção sem custo. O app é gratuito para quem doa e para quem adota.',
  },
  {
    pergunta: 'Como entro em contato com o tutor ou com o adotante?',
    resposta:
      'Dentro do app há um chat. Quando você se interessar por um pet (ou por um adotante), basta iniciar a conversa por lá para combinar a adoção.',
  },
  {
    pergunta: 'Quem pode ser parceiro Adopet?',
    resposta:
      'Clínicas veterinárias, pet shops e ONGs. Parceiros têm página no app, podem oferecer cupons e mais visibilidade. Há planos para estabelecimentos comerciais; ONGs e instituições têm condições especiais.',
  },
];

export function FAQ() {
  return (
    <section className="py-20 md:py-28 px-6 bg-adopet-background">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-display font-bold text-adopet-text-primary mb-12 text-center">
          Perguntas frequentes
        </h2>
        <ul className="space-y-6">
          {ITEMS.map((item) => (
            <li key={item.pergunta}>
              <h3 className="text-lg font-semibold text-adopet-text-primary mb-2">
                {item.pergunta}
              </h3>
              <p className="text-adopet-text-secondary leading-relaxed">
                {item.resposta}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
