const SCREENS = [
  { src: '/screens/home.png', label: 'Início' },
  { src: '/screens/feed.png', label: 'Feed' },
  { src: '/screens/mapa.jpeg', label: 'Mapa' },
  { src: '/screens/favoritos.png', label: 'Favoritos' },
  { src: '/screens/chat.jpeg', label: 'Chat' },
  { src: '/screens/meus_anuncios.png', label: 'Meus anúncios' },
  { src: '/screens/minhas_adocoes.jpeg', label: 'Minhas adoções' },
  { src: '/screens/perfil.jpeg', label: 'Perfil' },
];

const CARD_WIDTH = 160;
const GAP = 60;
const TRACK_OFFSET = SCREENS.length * CARD_WIDTH + (SCREENS.length - 1) * GAP;

export function AppScreens() {
  const items = [...SCREENS, ...SCREENS];

  return (
    <section className="py-16 md:py-20 px-0 bg-adopet-background overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-adopet-text-primary mb-2 text-center px-4">
          O app na prática
        </h2>
        <p className="text-adopet-text-secondary text-center mb-10 max-w-xl mx-auto px-4">
          Feed, mapa, favoritos, chat e mais — tudo em um lugar.
        </p>
      </div>
      <div className="relative w-full overflow-hidden">
        <div
          className="flex gap-[60px] items-end justify-start w-max carousel-track"
          style={{
            animation: `carousel-scroll 50s linear infinite`,
          }}
        >
          {items.map(({ src, label }, i) => (
            <div
              key={`${label}-${i}`}
              className="flex-shrink-0 flex flex-col items-center"
              style={{ width: CARD_WIDTH }}
            >
              <div
                className="rounded-2xl overflow-hidden shadow-lg border border-adopet-header/50 bg-adopet-card w-full flex items-center justify-center"
                style={{ aspectRatio: '9/19', maxHeight: 320 }}
              >
                <img
                  src={src}
                  alt={`Tela do app: ${label}`}
                  className="w-full h-full object-cover object-top"
                  loading="lazy"
                />
              </div>
              <p className="mt-2 text-sm font-medium text-adopet-text-secondary text-center w-full">
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        .carousel-track:hover {
          animation-play-state: paused;
        }
        @keyframes carousel-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-${TRACK_OFFSET}px); }
        }
      `}</style>
    </section>
  );
}
