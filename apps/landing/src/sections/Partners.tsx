export function Partners() {
  return (
    <section className="py-20 md:py-28 px-6 bg-adopet-header/60">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-display font-bold text-adopet-text-primary mb-4">
          Parceiros Adopet
        </h2>
        <p className="text-lg text-adopet-text-secondary mb-10">
          Clínicas veterinárias, pet shops e ONGs fazem parte do Adopet: aparecem na página de parceiros, oferecem cupons de desconto e dão mais visibilidade aos pets em adoção.
        </p>
        <div className="flex flex-wrap justify-center gap-4 text-adopet-text-secondary">
          <span className="px-4 py-2 rounded-full bg-adopet-card/80 border border-adopet-primary/20 font-medium">
            Clínicas veterinárias
          </span>
          <span className="px-4 py-2 rounded-full bg-adopet-card/80 border border-adopet-orange/30 font-medium text-adopet-text-primary">
            Pet shops
          </span>
          <span className="px-4 py-2 rounded-full bg-adopet-card/80 border border-adopet-primary/20 font-medium">
            ONGs e abrigos
          </span>
        </div>
      </div>
    </section>
  );
}
