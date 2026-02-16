import { useEffect, useRef } from 'react';

const APP_DEEP_LINK = 'adopet';

type PartnerRedirectProps = {
  path: 'partner-success' | 'partner-cancel';
};

/**
 * Página usada como success_url/cancel_url do Stripe Checkout.
 * Redireciona imediatamente para o app (adopet://) para que, após o pagamento,
 * o usuário volte ao app em vez de ficar na tela do Stripe.
 */
export function PartnerRedirectPage({ path }: PartnerRedirectProps) {
  const didRedirect = useRef(false);
  const deepLink = `${APP_DEEP_LINK}://${path}`;

  useEffect(() => {
    if (didRedirect.current) return;
    didRedirect.current = true;
    window.location.href = deepLink;
  }, [deepLink]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'Outfit, sans-serif',
        backgroundColor: '#f8fafc',
        color: '#334155',
      }}
    >
      <p style={{ marginBottom: 16, textAlign: 'center' }}>
        Redirecionando para o app…
      </p>
      <a
        href={deepLink}
        style={{
          color: '#0d9488',
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        Toque aqui se o app não abrir
      </a>
    </div>
  );
}
