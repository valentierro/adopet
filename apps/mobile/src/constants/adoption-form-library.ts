/**
 * Biblioteca de perguntas e templates prontos para formulários de adoção.
 * Inspirado em formulários de ONGs como Toca do PET (tocadopet.ong.br).
 */

export type LibraryQuestion = {
  type: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  useForScoring?: boolean;
  weight?: number;
  scoringConfig?: Record<string, unknown>;
  category: string;
};

export type FormTemplate = {
  id: string;
  name: string;
  description: string;
  questions: Omit<LibraryQuestion, 'category'>[];
  /** Exibe (Recomendado) na lista */
  recommended?: boolean;
  /** Ícone Ionicons (ex: speedometer-outline, document-outline) */
  icon?: string;
  /** Título da tela de apresentação */
  introTitle?: string;
  /** Texto explicativo na tela de apresentação */
  introBody?: string;
};

export const QUESTION_LIBRARY_CATEGORIES = [
  'Identificação',
  'Contato',
  'Moradia',
  'Experiência com pets',
  'Perfil e compatibilidade',
  'Compromissos',
  'Outros',
] as const;

export const QUESTION_LIBRARY: LibraryQuestion[] = [
  // Identificação
  { type: 'TEXT', label: 'Nome completo', required: true, category: 'Identificação' },
  { type: 'DATE', label: 'Data de nascimento', required: true, placeholder: 'DD/MM/AAAA', category: 'Identificação' },
  { type: 'TEXT', label: 'CPF', required: true, placeholder: 'Apenas números', category: 'Identificação' },
  { type: 'TEXT', label: 'RG', required: false, category: 'Identificação' },
  { type: 'TEXT', label: 'Profissão', required: false, category: 'Identificação' },
  // Contato
  { type: 'TEXTAREA', label: 'Endereço completo', required: true, category: 'Contato' },
  { type: 'TEXT', label: 'Bairro', required: true, category: 'Contato' },
  { type: 'TEXT', label: 'CEP', required: true, placeholder: '00000-000', category: 'Contato' },
  { type: 'TEXT', label: 'Cidade', required: true, category: 'Contato' },
  { type: 'TEXT', label: 'Telefone / WhatsApp', required: true, placeholder: '(00) 00000-0000', category: 'Contato' },
  { type: 'TEXT', label: 'E-mail', required: true, placeholder: 'seu@email.com', category: 'Contato' },
  {
    type: 'SELECT_SINGLE',
    label: 'Como nos conheceu?',
    required: false,
    options: [
      { value: 'site', label: 'Site' },
      { value: 'redes', label: 'Redes sociais' },
      { value: 'indicacao', label: 'Indicação' },
      { value: 'evento', label: 'Evento' },
      { value: 'outro', label: 'Outro' },
    ],
    category: 'Contato',
  },
  // Moradia
  {
    type: 'SELECT_SINGLE',
    label: 'Mora em casa ou apartamento?',
    required: true,
    options: [
      { value: 'casa', label: 'Casa' },
      { value: 'apartamento', label: 'Apartamento' },
      { value: 'outro', label: 'Outro' },
    ],
    useForScoring: true,
    weight: 7,
    scoringConfig: { casa: 10, apartamento: 8, outro: 5 },
    category: 'Moradia',
  },
  {
    type: 'SELECT_SINGLE',
    label: 'A moradia é própria ou alugada?',
    required: false,
    options: [
      { value: 'propria', label: 'Própria' },
      { value: 'alugada', label: 'Alugada' },
      { value: 'parentes', label: 'Com parentes/amigos' },
    ],
    useForScoring: true,
    weight: 5,
    scoringConfig: { propria: 10, alugada: 7, parentes: 6 },
    category: 'Moradia',
  },
  {
    type: 'CHECKBOX',
    label: 'Possui quintal ou área externa?',
    required: false,
    useForScoring: true,
    weight: 6,
    scoringConfig: { true: 10, false: 5 },
    category: 'Moradia',
  },
  {
    type: 'SELECT_SINGLE',
    label: 'Sua casa/apartamento possui telas em janelas e rotas de fuga?',
    required: false,
    options: [
      { value: 'sim_total', label: 'Sim, totalmente telado' },
      { value: 'providenciar', label: 'Ainda não, mas providenciarei em até 7 dias' },
      { value: 'nao', label: 'Não está telado' },
      { value: 'nao_se_aplica', label: 'Não se aplica (ex.: apenas cães)' },
    ],
    useForScoring: true,
    weight: 8,
    scoringConfig: { sim_total: 10, providenciar: 8, nao: 0, nao_se_aplica: 10 },
    category: 'Moradia',
  },
  { type: 'NUMBER', label: 'Quantas pessoas moram com você?', required: false, placeholder: '0', category: 'Moradia' },
  {
    type: 'CHECKBOX',
    label: 'Existem crianças na casa ou que visitam com frequência?',
    required: false,
    useForScoring: true,
    weight: 5,
    scoringConfig: { true: 8, false: 10 },
    category: 'Moradia',
  },
  // Experiência com pets
  {
    type: 'TEXTAREA',
    label: 'Já teve outros animais? O que aconteceu com eles?',
    required: false,
    placeholder: 'Descreva brevemente',
    category: 'Experiência com pets',
  },
  {
    type: 'CHECKBOX',
    label: 'Possui outros animais atualmente?',
    required: false,
    useForScoring: true,
    weight: 5,
    scoringConfig: { true: 8, false: 10 },
    category: 'Experiência com pets',
  },
  { type: 'TEXT', label: 'Quais animais você tem atualmente?', required: false, placeholder: 'Ex: 1 cachorro, 2 gatos', category: 'Experiência com pets' },
  {
    type: 'CHECKBOX',
    label: 'Está ciente dos custos com alimentação, veterinário, vacinas e outros ao longo da vida do animal?',
    required: true,
    useForScoring: true,
    weight: 8,
    scoringConfig: { true: 10, false: 0 },
    category: 'Experiência com pets',
  },
  {
    type: 'CHECKBOX',
    label: 'Tem experiência com cães e/ou gatos?',
    required: false,
    useForScoring: true,
    weight: 5,
    scoringConfig: { true: 10, false: 6 },
    category: 'Experiência com pets',
  },
  {
    type: 'TEXTAREA',
    label: 'Onde o animal irá dormir? Terá acesso à casa toda?',
    required: false,
    placeholder: 'Descreva o espaço',
    category: 'Experiência com pets',
  },
  {
    type: 'CHECKBOX',
    label: 'Permite telefonemas ou visitas para acompanhar a adaptação do animal?',
    required: false,
    useForScoring: true,
    weight: 5,
    scoringConfig: { true: 10, false: 5 },
    category: 'Experiência com pets',
  },
  // Perfil e compatibilidade (espelha campos do cadastro de pet para Match Score)
  {
    type: 'SELECT_SINGLE',
    label: 'Com que frequência você passeia ou planeja passear com o pet?',
    required: false,
    options: [
      { value: 'DAILY', label: 'Diariamente' },
      { value: 'FEW_TIMES_WEEK', label: 'Algumas vezes por semana' },
      { value: 'RARELY', label: 'Raramente' },
      { value: 'INDIFERENTE', label: 'Indiferente / Depende do pet' },
    ],
    useForScoring: true,
    weight: 6,
    scoringConfig: { DAILY: 10, FEW_TIMES_WEEK: 8, RARELY: 5, INDIFERENTE: 7 },
    category: 'Perfil e compatibilidade',
  },
  {
    type: 'SELECT_SINGLE',
    label: 'Qual seu ritmo de vida em relação a atividades físicas?',
    required: false,
    options: [
      { value: 'LOW', label: 'Calmo' },
      { value: 'MEDIUM', label: 'Moderado' },
      { value: 'HIGH', label: 'Ativo' },
    ],
    useForScoring: true,
    weight: 6,
    scoringConfig: { LOW: 8, MEDIUM: 10, HIGH: 9 },
    category: 'Perfil e compatibilidade',
  },
  {
    type: 'SELECT_SINGLE',
    label: 'Que tipo de alimentação pretende oferecer ao pet?',
    required: false,
    options: [
      { value: 'dry', label: 'Ração seca' },
      { value: 'wet', label: 'Ração úmida' },
      { value: 'mixed', label: 'Mista' },
      { value: 'natural', label: 'Natural' },
      { value: 'other', label: 'Outra' },
      { value: 'nao_sei', label: 'Ainda não sei' },
    ],
    category: 'Perfil e compatibilidade',
  },
  {
    type: 'CHECKBOX',
    label: 'Está disposto(a) a arcar com gastos extras (medicação, ração especial) se o pet precisar?',
    required: false,
    useForScoring: true,
    weight: 7,
    scoringConfig: { true: 10, false: 5 },
    category: 'Perfil e compatibilidade',
  },
  {
    type: 'SELECT_SINGLE',
    label: 'Prefere pets de qual porte?',
    required: false,
    options: [
      { value: 'small', label: 'Pequeno (P)' },
      { value: 'medium', label: 'Médio (M)' },
      { value: 'large', label: 'Grande (G)' },
      { value: 'xlarge', label: 'Extra grande (GG)' },
      { value: 'indiferente', label: 'Indiferente' },
    ],
    useForScoring: true,
    weight: 5,
    scoringConfig: { small: 10, medium: 10, large: 10, xlarge: 10, indiferente: 10 },
    category: 'Perfil e compatibilidade',
  },
  {
    type: 'SELECT_SINGLE',
    label: 'Prefere filhote, adulto ou idoso?',
    required: false,
    options: [
      { value: 'filhote', label: 'Filhote (0–1 ano)' },
      { value: 'adulto', label: 'Adulto (1–7 anos)' },
      { value: 'idoso', label: 'Idoso (7+ anos)' },
      { value: 'indiferente', label: 'Indiferente' },
    ],
    category: 'Perfil e compatibilidade',
  },
  {
    type: 'CHECKBOX',
    label: 'Teria disponibilidade para um pet com necessidades especiais (medicação contínua, mobilidade reduzida)?',
    required: false,
    useForScoring: true,
    weight: 6,
    scoringConfig: { true: 10, false: 6 },
    category: 'Perfil e compatibilidade',
  },
  {
    type: 'SELECT_SINGLE',
    label: 'Seus pets atuais se dão bem com outros animais?',
    required: false,
    options: [
      { value: 'YES', label: 'Sim' },
      { value: 'NO', label: 'Não' },
      { value: 'UNKNOWN', label: 'Não sei' },
      { value: 'nao_tem', label: 'Não tenho outros pets' },
    ],
    category: 'Perfil e compatibilidade',
  },
  {
    type: 'SELECT_SINGLE',
    label: 'Prefere macho ou fêmea?',
    required: false,
    options: [
      { value: 'male', label: 'Macho' },
      { value: 'female', label: 'Fêmea' },
      { value: 'indiferente', label: 'Indiferente' },
    ],
    category: 'Perfil e compatibilidade',
  },
  // Compromissos
  {
    type: 'CHECKBOX',
    label: 'Compromete-se a levar ao veterinário quando necessário e manter vacinas e vermifugação em dia?',
    required: true,
    useForScoring: true,
    weight: 9,
    scoringConfig: { true: 10, false: 0 },
    category: 'Compromissos',
  },
  {
    type: 'TEXTAREA',
    label: 'Caso mude de residência, o que acontecerá com o animal?',
    required: false,
    placeholder: 'Como garantiria o bem-estar dele?',
    category: 'Compromissos',
  },
  {
    type: 'CHECKBOX',
    label: 'Se não mora em casa própria, está autorizado(a) pelo proprietário/condomínio a ter pets?',
    required: false,
    useForScoring: true,
    weight: 7,
    scoringConfig: { true: 10, false: 3 },
    category: 'Compromissos',
  },
  {
    type: 'CHECKBOX',
    label: 'Entende que adotar um animal é um compromisso pelo resto da vida dele e não deve ser por impulso?',
    required: true,
    useForScoring: true,
    weight: 8,
    scoringConfig: { true: 10, false: 0 },
    category: 'Compromissos',
  },
  // Outros
  { type: 'TEXTAREA', label: 'Mensagem adicional (opcional)', required: false, placeholder: 'Algo que queira nos contar', category: 'Outros' },
];

export const FORM_TEMPLATES: FormTemplate[] = [
  {
    id: 'match',
    name: 'Formulário com Match Score',
    description: 'Perguntas alinhadas ao cadastro de pet para melhor compatibilidade',
    recommended: true,
    icon: 'speedometer-outline',
    introTitle: 'Formulário com Match Score',
    introBody: 'Este formulário faz uma pré-avaliação da compatibilidade do interessado com o pet, com base nas perguntas e respostas.\n\nInclui preferências alinhadas ao cadastro do pet: espécie (cachorro/gato), porte, sexo e faixa de idade, além de moradia, frequência de passeios, ritmo de vida e compromissos. O app calcula automaticamente um Match Score (0–100%) que ajuda você a priorizar candidatos mais compatíveis.\n\nO formulário vem com perguntas pré-definidas, mas pode ser alterado: você pode adicionar ou remover perguntas conforme sua necessidade. Cada pergunta tem um peso configurável que influencia o cálculo do Match Score.\n\nIdeal para triagem eficiente e adoções mais assertivas.',
    questions: [
      // Identificação e documento
      { type: 'TEXT', label: 'Nome completo', required: true },
      { type: 'TEXT', label: 'CPF', required: true, placeholder: 'Apenas números' },
      { type: 'TEXT', label: 'RG', required: false, placeholder: 'Opcional' },
      { type: 'DATE', label: 'Data de nascimento', required: true, placeholder: 'DD/MM/AAAA' },
      // Contato
      { type: 'TEXT', label: 'Telefone / WhatsApp', required: true, placeholder: '(00) 00000-0000' },
      { type: 'TEXT', label: 'E-mail', required: true, placeholder: 'seu@email.com' },
      {
        type: 'SELECT_SINGLE',
        label: 'Como nos conheceu?',
        required: false,
        options: [
          { value: 'site', label: 'Site' },
          { value: 'redes', label: 'Redes sociais' },
          { value: 'indicacao', label: 'Indicação' },
          { value: 'evento', label: 'Evento' },
          { value: 'outro', label: 'Outro' },
        ],
      },
      // Endereço
      { type: 'TEXTAREA', label: 'Endereço completo', required: true, placeholder: 'Rua, número, complemento' },
      { type: 'TEXT', label: 'CEP', required: true, placeholder: '00000-000' },
      { type: 'TEXT', label: 'Cidade', required: true },
      { type: 'TEXT', label: 'Bairro', required: true },
      // Preferências alinhadas ao cadastro do pet (Match Score)
      { type: 'SELECT_SINGLE', label: 'Qual espécie você busca adotar?', required: true, options: [{ value: 'DOG', label: 'Cachorro' }, { value: 'CAT', label: 'Gato' }, { value: 'BOTH', label: 'Tanto faz' }], useForScoring: true, weight: 6, scoringConfig: { DOG: 10, CAT: 10, BOTH: 10 } },
      { type: 'SELECT_SINGLE', label: 'Preferência de porte do pet', required: false, options: [{ value: 'small', label: 'Pequeno' }, { value: 'medium', label: 'Médio' }, { value: 'large', label: 'Grande' }, { value: 'xlarge', label: 'Muito grande' }, { value: 'BOTH', label: 'Indiferente' }], useForScoring: true, weight: 5, scoringConfig: { small: 10, medium: 10, large: 10, xlarge: 10, BOTH: 10 } },
      { type: 'SELECT_SINGLE', label: 'Preferência de sexo do pet', required: false, options: [{ value: 'male', label: 'Macho' }, { value: 'female', label: 'Fêmea' }, { value: 'BOTH', label: 'Indiferente' }], useForScoring: true, weight: 4, scoringConfig: { male: 10, female: 10, BOTH: 10 } },
      { type: 'SELECT_SINGLE', label: 'Faixa de idade preferida do pet', required: false, options: [{ value: 'puppy', label: 'Filhote (até 1 ano)' }, { value: 'young', label: 'Jovem (1 a 3 anos)' }, { value: 'adult', label: 'Adulto (3 a 7 anos)' }, { value: 'senior', label: 'Idoso (7+ anos)' }, { value: 'any', label: 'Indiferente' }], useForScoring: true, weight: 5, scoringConfig: { puppy: 10, young: 10, adult: 10, senior: 10, any: 10 } },
      // Moradia e compatibilidade (Match Score)
      { type: 'SELECT_SINGLE', label: 'Mora em casa ou apartamento?', required: true, options: [{ value: 'casa', label: 'Casa' }, { value: 'apartamento', label: 'Apartamento' }], useForScoring: true, weight: 7, scoringConfig: { casa: 10, apartamento: 8 } },
      { type: 'SELECT_SINGLE', label: 'Com que frequência você passeia ou planeja passear com o pet?', required: false, options: [{ value: 'DAILY', label: 'Diariamente' }, { value: 'FEW_TIMES_WEEK', label: 'Algumas vezes por semana' }, { value: 'RARELY', label: 'Raramente' }, { value: 'INDIFERENTE', label: 'Indiferente' }], useForScoring: true, weight: 6, scoringConfig: { DAILY: 10, FEW_TIMES_WEEK: 8, RARELY: 5, INDIFERENTE: 7 } },
      { type: 'SELECT_SINGLE', label: 'Qual seu ritmo de vida em relação a atividades físicas?', required: false, options: [{ value: 'LOW', label: 'Calmo' }, { value: 'MEDIUM', label: 'Moderado' }, { value: 'HIGH', label: 'Ativo' }], useForScoring: true, weight: 6, scoringConfig: { LOW: 8, MEDIUM: 10, HIGH: 9 } },
      { type: 'CHECKBOX', label: 'Existem crianças na casa ou que visitam com frequência?', required: false, useForScoring: true, weight: 5, scoringConfig: { true: 8, false: 10 } },
      { type: 'CHECKBOX', label: 'Possui outros animais?', required: false, useForScoring: true, weight: 5, scoringConfig: { true: 8, false: 10 } },
      { type: 'CHECKBOX', label: 'Está disposto(a) a arcar com gastos extras se o pet precisar?', required: false, useForScoring: true, weight: 6, scoringConfig: { true: 10, false: 5 } },
      { type: 'CHECKBOX', label: 'Teria disponibilidade para um pet com necessidades especiais?', required: false, useForScoring: true, weight: 6, scoringConfig: { true: 10, false: 6 } },
      { type: 'CHECKBOX', label: 'Está ciente dos custos com alimentação e veterinário?', required: true, useForScoring: true, weight: 8, scoringConfig: { true: 10, false: 0 } },
      { type: 'CHECKBOX', label: 'Compromete-se a levar ao veterinário e manter vacinas em dia?', required: true, useForScoring: true, weight: 9, scoringConfig: { true: 10, false: 0 } },
    ],
  },
  {
    id: 'basic',
    name: 'Formulário básico',
    description: 'Perguntas essenciais para triagem rápida',
    icon: 'document-outline',
    introTitle: 'Formulário básico',
    introBody: 'Formulário enxuto com as perguntas essenciais para triagem rápida: identificação, contato, moradia e compromissos básicos.\n\nIndicado quando você precisa de uma triagem ágil, com menos perguntas para o interessado responder.',
    questions: [
      { type: 'TEXT', label: 'Nome completo', required: true },
      { type: 'TEXT', label: 'Telefone / WhatsApp', required: true },
      { type: 'TEXT', label: 'E-mail', required: true },
      { type: 'SELECT_SINGLE', label: 'Mora em casa ou apartamento?', required: true, options: [{ value: 'casa', label: 'Casa' }, { value: 'apartamento', label: 'Apartamento' }], useForScoring: true, weight: 7, scoringConfig: { casa: 10, apartamento: 8 } },
      { type: 'CHECKBOX', label: 'Possui outros animais?', required: false, useForScoring: true, weight: 5, scoringConfig: { true: 8, false: 10 } },
      { type: 'CHECKBOX', label: 'Está ciente dos custos com alimentação e veterinário?', required: true, useForScoring: true, weight: 8, scoringConfig: { true: 10, false: 0 } },
      { type: 'CHECKBOX', label: 'Compromete-se a levar ao veterinário e manter vacinas em dia?', required: true, useForScoring: true, weight: 9, scoringConfig: { true: 10, false: 0 } },
    ],
  },
  {
    id: 'complete',
    name: 'Formulário completo',
    description: 'Inspirado em ONGs como Toca do PET – triagem detalhada',
    icon: 'document-text-outline',
    introTitle: 'Formulário completo',
    introBody: 'Formulário inspirado em ONGs como Toca do PET, com triagem detalhada.\n\nInclui identificação completa, endereço, moradia, experiência com pets e compromissos. Ideal para instituições que seguem processos rigorosos de triagem.',
    questions: [
      { type: 'TEXT', label: 'Nome completo', required: true },
      { type: 'DATE', label: 'Data de nascimento', required: true, placeholder: 'DD/MM/AAAA' },
      { type: 'TEXT', label: 'CPF', required: true, placeholder: 'Apenas números' },
      { type: 'TEXT', label: 'Profissão', required: false },
      { type: 'TEXTAREA', label: 'Endereço completo', required: true },
      { type: 'TEXT', label: 'Bairro', required: true },
      { type: 'TEXT', label: 'CEP', required: true, placeholder: '00000-000' },
      { type: 'TEXT', label: 'Cidade', required: true },
      { type: 'TEXT', label: 'Telefone / WhatsApp', required: true },
      { type: 'TEXT', label: 'E-mail', required: true },
      { type: 'SELECT_SINGLE', label: 'Como nos conheceu?', required: false, options: [{ value: 'site', label: 'Site' }, { value: 'redes', label: 'Redes sociais' }, { value: 'indicacao', label: 'Indicação' }, { value: 'evento', label: 'Evento' }, { value: 'outro', label: 'Outro' }] },
      { type: 'SELECT_SINGLE', label: 'Mora em casa ou apartamento?', required: true, options: [{ value: 'casa', label: 'Casa' }, { value: 'apartamento', label: 'Apartamento' }, { value: 'outro', label: 'Outro' }], useForScoring: true, weight: 7, scoringConfig: { casa: 10, apartamento: 8, outro: 5 } },
      { type: 'SELECT_SINGLE', label: 'A moradia é própria ou alugada?', required: false, options: [{ value: 'propria', label: 'Própria' }, { value: 'alugada', label: 'Alugada' }, { value: 'parentes', label: 'Com parentes/amigos' }], useForScoring: true, weight: 5, scoringConfig: { propria: 10, alugada: 7, parentes: 6 } },
      { type: 'CHECKBOX', label: 'Possui quintal ou área externa?', required: false, useForScoring: true, weight: 6, scoringConfig: { true: 10, false: 5 } },
      { type: 'NUMBER', label: 'Quantas pessoas moram com você?', required: false },
      { type: 'CHECKBOX', label: 'Existem crianças na casa ou que visitam com frequência?', required: false, useForScoring: true, weight: 5, scoringConfig: { true: 8, false: 10 } },
      { type: 'TEXTAREA', label: 'Já teve outros animais? O que aconteceu com eles?', required: false },
      { type: 'CHECKBOX', label: 'Possui outros animais atualmente?', required: false, useForScoring: true, weight: 5, scoringConfig: { true: 8, false: 10 } },
      { type: 'CHECKBOX', label: 'Está ciente dos custos com alimentação, veterinário e outros ao longo da vida do animal?', required: true, useForScoring: true, weight: 8, scoringConfig: { true: 10, false: 0 } },
      { type: 'CHECKBOX', label: 'Compromete-se a levar ao veterinário quando necessário e manter vacinas em dia?', required: true, useForScoring: true, weight: 9, scoringConfig: { true: 10, false: 0 } },
      { type: 'TEXTAREA', label: 'Caso mude de residência, o que acontecerá com o animal?', required: false },
      { type: 'CHECKBOX', label: 'Permite telefonemas ou visitas para acompanhar a adaptação?', required: false, useForScoring: true, weight: 5, scoringConfig: { true: 10, false: 5 } },
      { type: 'TEXTAREA', label: 'Mensagem adicional (opcional)', required: false },
    ],
  },
  {
    id: 'cats',
    name: 'Formulário para gatos',
    description: 'Focado em adoção responsável de felinos',
    icon: 'paw-outline',
    introTitle: 'Formulário para gatos',
    introBody: 'Formulário focado em adoção responsável de felinos.\n\nInclui perguntas específicas para gatos: telas em janelas, rotas de fuga, compromisso de não deixar o gato na rua sem supervisão e custos com telas.',
    questions: [
      { type: 'TEXT', label: 'Nome completo', required: true },
      { type: 'TEXT', label: 'Telefone / WhatsApp', required: true },
      { type: 'TEXT', label: 'E-mail', required: true },
      { type: 'SELECT_SINGLE', label: 'Mora em casa ou apartamento?', required: true, options: [{ value: 'casa', label: 'Casa' }, { value: 'apartamento', label: 'Apartamento' }], useForScoring: true, weight: 7, scoringConfig: { casa: 10, apartamento: 8 } },
      { type: 'SELECT_SINGLE', label: 'Sua residência possui telas em janelas e rotas de fuga?', required: true, options: [{ value: 'sim_total', label: 'Sim, totalmente telado' }, { value: 'providenciar', label: 'Ainda não, mas providenciarei em até 7 dias' }, { value: 'nao', label: 'Não está telado' }], useForScoring: true, weight: 9, scoringConfig: { sim_total: 10, providenciar: 8, nao: 0 } },
      { type: 'CHECKBOX', label: 'Possui outros gatos ou cães?', required: false, useForScoring: true, weight: 5, scoringConfig: { true: 8, false: 10 } },
      { type: 'CHECKBOX', label: 'Está ciente dos custos com alimentação, veterinário e telas?', required: true, useForScoring: true, weight: 8, scoringConfig: { true: 10, false: 0 } },
      { type: 'CHECKBOX', label: 'Compromete-se a nunca deixar o gato ter acesso à rua sem supervisão?', required: true, useForScoring: true, weight: 9, scoringConfig: { true: 10, false: 0 } },
      { type: 'TEXTAREA', label: 'Onde o gato irá dormir e ter acesso?', required: false },
    ],
  },
  {
    id: 'dogs',
    name: 'Formulário para cães',
    description: 'Inclui frequência de passeios (compatível com o cadastro de pet)',
    icon: 'paw-outline',
    introTitle: 'Formulário para cães',
    introBody: 'Formulário pensado para adoção de cães, com foco em passeios e gastos.\n\nInclui frequência de passeios, disposição para gastos extras (medicação, ração especial) e demais compromissos essenciais. Compatível com os campos do cadastro de pet.',
    questions: [
      { type: 'TEXT', label: 'Nome completo', required: true },
      { type: 'TEXT', label: 'Telefone / WhatsApp', required: true },
      { type: 'TEXT', label: 'E-mail', required: true },
      { type: 'SELECT_SINGLE', label: 'Mora em casa ou apartamento?', required: true, options: [{ value: 'casa', label: 'Casa' }, { value: 'apartamento', label: 'Apartamento' }], useForScoring: true, weight: 7, scoringConfig: { casa: 10, apartamento: 8 } },
      { type: 'SELECT_SINGLE', label: 'Com que frequência você passeia ou planeja passear com o pet?', required: false, options: [{ value: 'DAILY', label: 'Diariamente' }, { value: 'FEW_TIMES_WEEK', label: 'Algumas vezes por semana' }, { value: 'RARELY', label: 'Raramente' }, { value: 'INDIFERENTE', label: 'Indiferente' }], useForScoring: true, weight: 6, scoringConfig: { DAILY: 10, FEW_TIMES_WEEK: 8, RARELY: 5, INDIFERENTE: 7 } },
      { type: 'CHECKBOX', label: 'Possui outros animais?', required: false, useForScoring: true, weight: 5, scoringConfig: { true: 8, false: 10 } },
      { type: 'CHECKBOX', label: 'Está ciente dos custos com alimentação e veterinário?', required: true, useForScoring: true, weight: 8, scoringConfig: { true: 10, false: 0 } },
      { type: 'CHECKBOX', label: 'Está disposto(a) a arcar com gastos extras (medicação, ração especial) se necessário?', required: false, useForScoring: true, weight: 6, scoringConfig: { true: 10, false: 5 } },
      { type: 'CHECKBOX', label: 'Compromete-se a levar ao veterinário e manter vacinas em dia?', required: true, useForScoring: true, weight: 9, scoringConfig: { true: 10, false: 0 } },
    ],
  },
];
