// Identidade Adopet: teal da logo – fundos, header e rodapé conversam com a marca
export const lightColors = {
  primary: '#0D9488',       // teal forte – marca
  primaryDark: '#0F766E',
  accent: '#E11D48',        // vermelho suave para "passar"
  background: '#E5EDEA',    // sage claro – fundo das telas (não branco)
  surface: '#D4E2DD',       // sage médio – listas, inputs, blocos
  headerBg: '#C8DAD4',      // tom teal suave – header (identidade da logo)
  tabBarBg: '#C8DAD4',      // rodapé igual ao header
  cardBg: '#FFFFFF',        // cards e modais brancos para contraste
  textPrimary: '#1C1917',
  textSecondary: '#57534E',
  error: '#B91C1C',
  overlay: 'rgba(0,0,0,0.45)',
} as const;

export const darkColors = {
  primary: '#14B8A6',       // teal mais contido no escuro
  primaryDark: '#0D9488',
  accent: '#FB7185',
  background: '#0F1412',    // fundo principal
  surface: '#1C2422',       // cards, blocos – bem legível
  headerBg: '#161D1B',      // header e tab bar
  tabBarBg: '#161D1B',
  cardBg: '#232D2A',        // cards com mais contraste que surface
  textPrimary: '#F5F5F4',
  textSecondary: '#B8B4B0', // mais claro para legibilidade
  error: '#FCA5A5',
  overlay: 'rgba(0,0,0,0.6)',
} as const;

export type ThemeColors = typeof lightColors;
