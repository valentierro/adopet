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
  primary: '#2DD4BF',
  primaryDark: '#14B8A6',
  accent: '#FB7185',
  background: '#0C1210',
  surface: '#1A2220',
  headerBg: '#152520',     // um pouco mais claro que background – header
  tabBarBg: '#152520',     // rodapé alinhado ao header
  cardBg: '#1E2624',
  textPrimary: '#F5F5F4',
  textSecondary: '#A8A29E',
  error: '#FCA5A5',
  overlay: 'rgba(0,0,0,0.55)',
} as const;

export type ThemeColors = typeof lightColors;
