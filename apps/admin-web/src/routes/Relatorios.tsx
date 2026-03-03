import { useQuery } from '@tanstack/react-query';
import {
  adminApi,
  type AdoptionItem,
  type PartnerItem,
  type ReportItem,
  type PetsReportAggregates,
  type UsersReportAggregates,
  type AdoptionsReportAggregates,
} from '@/api/admin';
import type { SatisfactionResponseItem, SatisfactionStats } from '@/api/admin';
import { downloadCsv, downloadPdfWithTable, downloadPdfSummary } from '@/utils/exportReports';
import { useToast } from '@/context/ToastContext';

const speciesLabel: Record<string, string> = { DOG: 'Cachorro', CAT: 'Gato' };
const pubStatusLabel: Record<string, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
};
const petStatusLabel: Record<string, string> = {
  AVAILABLE: 'Disponível',
  IN_PROCESS: 'Em processo',
  ADOPTED: 'Adotado',
};
function recordToSections(
  data: Record<string, number>,
  labelMap?: Record<string, string>
): [string, string | number][] {
  return Object.entries(data)
    .sort(([, a], [, b]) => b - a)
    .map(([k, v]) => [labelMap?.[k] ?? k, v]);
}

const dateStr = () => new Date().toISOString().slice(0, 10);

function useReportData() {
  const { data: adoptions = [] } = useQuery({
    queryKey: ['admin', 'adoptions'],
    queryFn: () => adminApi.getAdoptions(),
  });
  const { data: stats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.getStats(),
  });
  const { data: partners = [] } = useQuery({
    queryKey: ['admin', 'partners'],
    queryFn: () => adminApi.getPartners(),
  });
  const { data: reports = [] } = useQuery({
    queryKey: ['admin', 'reports'],
    queryFn: () => adminApi.getReports(),
  });
  const { data: satisfactionStats } = useQuery({
    queryKey: ['admin', 'satisfaction', 'stats'],
    queryFn: () => adminApi.getSatisfactionStats(),
  });
  const { data: satisfactionData } = useQuery({
    queryKey: ['admin', 'satisfaction', 'responses'],
    queryFn: () => adminApi.getSatisfactionResponses(1, 500),
  });
  const satisfactionItems: SatisfactionResponseItem[] = satisfactionData?.items ?? [];

  const { data: petsAggregates } = useQuery({
    queryKey: ['admin', 'reports', 'pets-aggregates'],
    queryFn: () => adminApi.getPetsReportAggregates(),
  });
  const { data: usersAggregates } = useQuery({
    queryKey: ['admin', 'reports', 'users-aggregates'],
    queryFn: () => adminApi.getUsersReportAggregates(),
  });
  const { data: adoptionsAggregates } = useQuery({
    queryKey: ['admin', 'reports', 'adoptions-aggregates'],
    queryFn: () => adminApi.getAdoptionsReportAggregates(),
  });

  return {
    adoptions,
    stats,
    partners,
    reports,
    satisfactionStats,
    satisfactionItems,
    petsAggregates,
    usersAggregates,
    adoptionsAggregates,
  };
}

function exportAdoptionsCsv(adoptions: AdoptionItem[]) {
  const headers = ['Pet', 'Tutor', 'Adotante', 'Data', 'Confirmado pela Adopet'];
  const rows = adoptions.map((a) => [
    a.petName,
    a.tutorName,
    a.adopterName,
    new Date(a.adoptedAt).toLocaleDateString('pt-BR'),
    a.confirmedByAdopet ? 'Sim' : 'Não',
  ]);
  downloadCsv(`adocoes-${dateStr()}.csv`, headers, rows);
}

function exportAdoptionsPdf(adoptions: AdoptionItem[]) {
  const columns = [
    { header: 'Pet', dataKey: 'petName' },
    { header: 'Tutor', dataKey: 'tutorName' },
    { header: 'Adotante', dataKey: 'adopterName' },
    { header: 'Data', dataKey: 'adoptedAt' },
    { header: 'Confirmado Adopet', dataKey: 'confirmedByAdopet' },
  ];
  const rows = adoptions.map((a) => ({
    petName: a.petName,
    tutorName: a.tutorName,
    adopterName: a.adopterName,
    adoptedAt: new Date(a.adoptedAt).toLocaleDateString('pt-BR'),
    confirmedByAdopet: a.confirmedByAdopet ? 'Sim' : 'Não',
  }));
  downloadPdfWithTable(
    `adocoes-${dateStr()}.pdf`,
    'Relatório de Adoções',
    columns,
    rows,
    { landscape: true }
  );
}

function exportResumoCsv(stats: NonNullable<ReturnType<typeof useReportData>['stats']>) {
  const headers = ['Indicador', 'Valor'];
  const rows = [
    ['Total de adoções', String(stats.totalAdoptions)],
    ['Adoções este mês', String(stats.adoptionsThisMonth)],
    ['Anúncios pendentes', String(stats.pendingPetsCount)],
    ['Denúncias pendentes', String(stats.pendingReportsCount)],
    ['Adoções p/ confirmar (tutor)', String(stats.pendingAdoptionsByTutorCount)],
    ['Verificações pendentes', String(stats.pendingVerificationsCount)],
    ['KYC pendentes', String(stats.pendingKycCount ?? 0)],
  ];
  downloadCsv(`resumo-admin-${dateStr()}.csv`, headers, rows);
}

function exportResumoPdf(stats: NonNullable<ReturnType<typeof useReportData>['stats']>) {
  downloadPdfSummary(
    `resumo-admin-${dateStr()}.pdf`,
    'Resumo Administrativo',
    [
      {
        title: 'Adoções',
        rows: [
          ['Total de adoções', stats.totalAdoptions],
          ['Adoções este mês', stats.adoptionsThisMonth],
        ],
      },
      {
        title: 'Pendências',
        rows: [
          ['Anúncios pendentes', stats.pendingPetsCount],
          ['Denúncias pendentes', stats.pendingReportsCount],
          ['Adoções p/ confirmar (tutor)', stats.pendingAdoptionsByTutorCount],
          ['Verificações (selo) pendentes', stats.pendingVerificationsCount],
          ['KYC pendentes', stats.pendingKycCount ?? 0],
        ],
      },
    ]
  );
}

function exportParceirosCsv(partners: PartnerItem[]) {
  const headers = ['Nome', 'Tipo', 'Cidade', 'Ativo', 'Parceiro pago', 'Data criação'];
  const rows = partners.map((p) => [
    p.name,
    p.type,
    p.city ?? '—',
    p.active ? 'Sim' : 'Não',
    p.isPaidPartner ? 'Sim' : 'Não',
    p.createdAt ? new Date(p.createdAt).toLocaleDateString('pt-BR') : '—',
  ]);
  downloadCsv(`parceiros-${dateStr()}.csv`, headers, rows);
}

function exportParceirosPdf(partners: PartnerItem[]) {
  const columns = [
    { header: 'Nome', dataKey: 'name' },
    { header: 'Tipo', dataKey: 'type' },
    { header: 'Cidade', dataKey: 'city' },
    { header: 'Ativo', dataKey: 'active' },
    { header: 'Pago', dataKey: 'isPaidPartner' },
    { header: 'Criado em', dataKey: 'createdAt' },
  ];
  const rows = partners.map((p) => ({
    name: p.name,
    type: p.type,
    city: p.city ?? '—',
    active: p.active ? 'Sim' : 'Não',
    isPaidPartner: p.isPaidPartner ? 'Sim' : 'Não',
    createdAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString('pt-BR') : '—',
  }));
  downloadPdfWithTable(
    `parceiros-${dateStr()}.pdf`,
    'Relatório de Parceiros',
    columns,
    rows,
    { landscape: true }
  );
}

function exportSatisfacaoCsv(
  items: SatisfactionResponseItem[],
  stats: SatisfactionStats | undefined
) {
  const headers = [
    'Nome',
    'E-mail',
    'Papel',
    'Confiança',
    'Facilidade',
    'Comunicação',
    'Geral',
    'Comentário',
    'Data',
  ];
  const rows = items.map((r) => [
    r.userName,
    r.userEmail,
    r.role,
    String(r.trustScore),
    String(r.easeOfUseScore),
    String(r.communicationScore),
    String(r.overallScore),
    r.comment ?? '—',
    new Date(r.createdAt).toLocaleString('pt-BR'),
  ]);
  downloadCsv(`satisfacao-${dateStr()}.csv`, headers, rows);
  if (stats) {
    const sumHeaders = ['Indicador', 'Valor'];
    const sumRows = [
      ['Total de respostas', String(stats.totalResponses)],
      ['Média confiança', stats.averageTrust.toFixed(2)],
      ['Média facilidade', stats.averageEaseOfUse.toFixed(2)],
      ['Média comunicação', stats.averageCommunication.toFixed(2)],
      ['Média geral', stats.averageOverall.toFixed(2)],
    ];
    downloadCsv(`satisfacao-resumo-${dateStr()}.csv`, sumHeaders, sumRows);
  }
}

function exportSatisfacaoPdf(
  items: SatisfactionResponseItem[],
  stats: SatisfactionStats | undefined
) {
  const columns = [
    { header: 'Nome', dataKey: 'userName' },
    { header: 'Papel', dataKey: 'role' },
    { header: 'Confiança', dataKey: 'trustScore' },
    { header: 'Facilidade', dataKey: 'easeOfUseScore' },
    { header: 'Comunicação', dataKey: 'communicationScore' },
    { header: 'Geral', dataKey: 'overallScore' },
    { header: 'Data', dataKey: 'createdAt' },
  ];
  const rows = items.map((r) => ({
    userName: r.userName,
    role: r.role,
    trustScore: r.trustScore,
    easeOfUseScore: r.easeOfUseScore,
    communicationScore: r.communicationScore,
    overallScore: r.overallScore,
    createdAt: new Date(r.createdAt).toLocaleString('pt-BR'),
  }));
  downloadPdfWithTable(
    `satisfacao-${dateStr()}.pdf`,
    'Pesquisa de Satisfação - Respostas',
    columns,
    rows,
    { landscape: true }
  );
  if (stats) {
    downloadPdfSummary(
      `satisfacao-resumo-${dateStr()}.pdf`,
      'Pesquisa de Satisfação - Resumo',
      [
        {
          title: 'Médias',
          rows: [
            ['Total de respostas', stats.totalResponses],
            ['Média confiança no app', stats.averageTrust.toFixed(2)],
            ['Média facilidade de uso', stats.averageEaseOfUse.toFixed(2)],
            ['Média comunicação/clareza', stats.averageCommunication.toFixed(2)],
            ['Média satisfação geral', stats.averageOverall.toFixed(2)],
          ],
        },
        {
          title: 'Por papel',
          rows: [
            ['Adotantes (qtd)', stats.byRole.adopter.count],
            ['Adotantes (média geral)', stats.byRole.adopter.avgOverall.toFixed(2)],
            ['Tutores (qtd)', stats.byRole.tutor.count],
            ['Tutores (média geral)', stats.byRole.tutor.avgOverall.toFixed(2)],
          ],
        },
      ]
    );
  }
}

function exportDenunciasCsv(reports: ReportItem[]) {
  const headers = ['ID', 'Tipo alvo', 'ID alvo', 'Motivo', 'Descrição', 'Data', 'Resolvido em'];
  const rows = reports.map((r) => [
    r.id,
    r.targetType,
    r.targetId,
    r.reason,
    r.description ?? '—',
    new Date(r.createdAt).toLocaleString('pt-BR'),
    r.resolvedAt ? new Date(r.resolvedAt).toLocaleString('pt-BR') : '—',
  ]);
  downloadCsv(`denuncias-${dateStr()}.csv`, headers, rows);
}

function exportDenunciasPdf(reports: ReportItem[]) {
  const columns = [
    { header: 'Tipo', dataKey: 'targetType' },
    { header: 'Motivo', dataKey: 'reason' },
    { header: 'Data', dataKey: 'createdAt' },
    { header: 'Resolvido', dataKey: 'resolvedAt' },
  ];
  const rows = reports.map((r) => ({
    targetType: r.targetType,
    reason: r.reason,
    createdAt: new Date(r.createdAt).toLocaleString('pt-BR'),
    resolvedAt: r.resolvedAt ? new Date(r.resolvedAt).toLocaleString('pt-BR') : '—',
  }));
  downloadPdfWithTable(
    `denuncias-${dateStr()}.pdf`,
    'Relatório de Denúncias',
    columns,
    rows,
    { landscape: true }
  );
}

function exportPetsAggregatesCsv(data: PetsReportAggregates) {
  const headers = ['Relatório', 'Categoria', 'Quantidade'];
  const rows: string[][] = [];
  const push = (reportName: string, rec: Record<string, number>, labels?: Record<string, string>) => {
    Object.entries(rec)
      .sort(([, a], [, b]) => b - a)
      .forEach(([k, v]) => rows.push([reportName, labels?.[k] ?? k, String(v)]));
  };
  push('Por espécie', data.bySpecies, speciesLabel);
  push('Por raça', data.byBreed);
  push('Por sexo', data.bySex);
  push('Por cidade', data.byCity);
  push('Por faixa de idade', data.byAgeRange);
  push('Por status publicação', data.byPublicationStatus, pubStatusLabel);
  push('Por status', data.byStatus, petStatusLabel);
  push('Vacinado', data.byVaccinated);
  push('Castrado', data.byNeutered);
  downloadCsv(`pets-agregados-${dateStr()}.csv`, headers, rows);
}

function exportPetsAggregatesPdf(data: PetsReportAggregates) {
  const sections: { title: string; rows: [string, string | number][] }[] = [
    { title: 'Por espécie (tipo)', rows: recordToSections(data.bySpecies, speciesLabel) },
    { title: 'Por raça', rows: recordToSections(data.byBreed) },
    { title: 'Por sexo', rows: recordToSections(data.bySex) },
    { title: 'Por cidade', rows: recordToSections(data.byCity) },
    { title: 'Por faixa de idade', rows: recordToSections(data.byAgeRange) },
    { title: 'Por status de publicação', rows: recordToSections(data.byPublicationStatus, pubStatusLabel) },
    { title: 'Por status do anúncio', rows: recordToSections(data.byStatus, petStatusLabel) },
    { title: 'Vacinados', rows: recordToSections(data.byVaccinated) },
    { title: 'Castrados', rows: recordToSections(data.byNeutered) },
  ].filter((s) => s.rows.length > 0);
  downloadPdfSummary(`pets-agregados-${dateStr()}.pdf`, `Pets cadastrados (total: ${data.total})`, sections);
}

function exportAnunciosAggregatesCsv(data: PetsReportAggregates) {
  const headers = ['Indicador', 'Categoria', 'Quantidade'];
  const rows: string[][] = [];
  const push = (name: string, rec: Record<string, number>, labels?: Record<string, string>) => {
    Object.entries(rec).forEach(([k, v]) => rows.push([name, labels?.[k] ?? k, String(v)]));
  };
  push('Status de publicação', data.byPublicationStatus, pubStatusLabel);
  push('Status do anúncio', data.byStatus, petStatusLabel);
  push('Por espécie', data.bySpecies, speciesLabel);
  push('Por cidade', data.byCity);
  downloadCsv(`anuncios-agregados-${dateStr()}.csv`, headers, rows);
}

function exportAnunciosAggregatesPdf(data: PetsReportAggregates) {
  const sections: { title: string; rows: [string, string | number][] }[] = [
    { title: 'Status de publicação', rows: recordToSections(data.byPublicationStatus, pubStatusLabel) },
    { title: 'Status do anúncio', rows: recordToSections(data.byStatus, petStatusLabel) },
    { title: 'Por espécie', rows: recordToSections(data.bySpecies, speciesLabel) },
    { title: 'Por cidade', rows: recordToSections(data.byCity) },
  ].filter((s) => s.rows.length > 0);
  downloadPdfSummary(`anuncios-agregados-${dateStr()}.pdf`, `Anúncios (pets cadastrados, total: ${data.total})`, sections);
}

function exportUsersAggregatesCsv(data: UsersReportAggregates) {
  const headers = ['Relatório', 'Categoria', 'Quantidade'];
  const rows: string[][] = [
    ['Resumo', 'Total de usuários', String(data.total)],
    ['Resumo', 'Com anúncios', String(data.withListings)],
    ['Resumo', 'Sem anúncios', String(data.withoutListings)],
    ['Resumo', 'Desativados/banidos', String(data.deactivated)],
  ];
  if (data.byUserType && Object.keys(data.byUserType).length > 0) {
    const userTypeLabel: Record<string, string> = { TUTOR: 'Tutor', ONG: 'ONG', PARTNER_COMMERCIAL: 'Parceiro comercial' };
    Object.entries(data.byUserType).forEach(([k, v]) => rows.push(['Por tipo', userTypeLabel[k] ?? k, String(v)]));
  }
  Object.entries(data.byCity).sort(([, a], [, b]) => b - a).forEach(([k, v]) => rows.push(['Por cidade', k, String(v)]));
  Object.entries(data.byMonth)
    .sort(([a], [b]) => b.localeCompare(a))
    .forEach(([k, v]) => rows.push(['Por mês (cadastro)', k, String(v)]));
  Object.entries(data.byKycStatus).forEach(([k, v]) => rows.push(['KYC', k, String(v)]));
  downloadCsv(`usuarios-agregados-${dateStr()}.csv`, headers, rows);
}

function exportUsersAggregatesPdf(data: UsersReportAggregates) {
  const sections: { title: string; rows: [string, string | number][] }[] = [
    {
      title: 'Resumo',
      rows: [
        ['Total de usuários', data.total],
        ['Com pelo menos 1 anúncio', data.withListings],
        ['Sem anúncios', data.withoutListings],
        ['Contas desativadas/banidas', data.deactivated],
      ] as [string, string | number][],
    },
    {
      title: 'Por cidade',
      rows: Object.entries(data.byCity)
        .sort(([, a], [, b]) => b - a)
        .map(([k, v]): [string, string | number] => [k, v]),
    },
    {
      title: 'Cadastros por mês',
      rows: Object.entries(data.byMonth)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([k, v]): [string, string | number] => [k, v]),
    },
    {
      title: 'Status KYC',
      rows: Object.entries(data.byKycStatus).map(([k, v]): [string, string | number] => [k, v]),
    },
    ...(data.byUserType && Object.keys(data.byUserType).length > 0
      ? [
          {
            title: 'Por tipo (Tutor, ONG, Parceiro comercial)',
            rows: Object.entries(data.byUserType).map(([k, v]): [string, string | number] => [
              { TUTOR: 'Tutor', ONG: 'ONG', PARTNER_COMMERCIAL: 'Parceiro comercial' }[k] ?? k,
              v,
            ]),
          },
        ]
      : []),
  ].filter((s) => s.rows.length > 0);
  downloadPdfSummary(`usuarios-agregados-${dateStr()}.pdf`, 'Usuários cadastrados', sections);
}

function exportAdoptionsAggregatesCsv(data: AdoptionsReportAggregates) {
  const headers = ['Relatório', 'Categoria', 'Quantidade'];
  const rows: string[][] = [
    ['Resumo', 'Total de adoções', String(data.total)],
    ['Resumo', 'Confirmadas pela Adopet', String(data.confirmedByAdopet)],
    ['Resumo', 'Não confirmadas pela Adopet', String(data.notConfirmedByAdopet)],
  ];
  Object.entries(data.byMonth)
    .sort(([a], [b]) => b.localeCompare(a))
    .forEach(([k, v]) => rows.push(['Por mês', k, String(v)]));
  Object.entries(data.bySpecies).forEach(([k, v]) =>
    rows.push(['Por espécie', speciesLabel[k] ?? k, String(v)])
  );
  downloadCsv(`adocoes-agregados-${dateStr()}.csv`, headers, rows);
}

function exportAdoptionsAggregatesPdf(data: AdoptionsReportAggregates) {
  const sections: { title: string; rows: [string, string | number][] }[] = [
    {
      title: 'Resumo',
      rows: [
        ['Total de adoções', data.total],
        ['Confirmadas pela Adopet', data.confirmedByAdopet],
        ['Não confirmadas pela Adopet', data.notConfirmedByAdopet],
      ] as [string, string | number][],
    },
    {
      title: 'Adoções por mês',
      rows: Object.entries(data.byMonth)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([k, v]): [string, string | number] => [k, v]),
    },
    {
      title: 'Por espécie do pet',
      rows: Object.entries(data.bySpecies).map(
        ([k, v]): [string, string | number] => [speciesLabel[k] ?? k, v]
      ),
    },
  ].filter((s) => s.rows.length > 0);
  downloadPdfSummary(`adocoes-agregados-${dateStr()}.pdf`, 'Adoções - Agregados', sections);
}

type ReportCardProps = {
  title: string;
  description: string;
  onExportCsv: () => void;
  onExportPdf: () => void;
  loading?: boolean;
  disabled?: boolean;
};

function ReportCard({ title, description, onExportCsv, onExportPdf, loading, disabled }: ReportCardProps) {
  return (
    <div className="rounded-xl border border-adopet-primary/20 bg-adopet-card p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-adopet-text-primary">{title}</h3>
      <p className="mt-1 text-sm text-adopet-text-secondary">{description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onExportCsv}
          disabled={disabled || loading}
          className="rounded-lg border border-adopet-primary/40 bg-white px-4 py-2 text-sm font-medium text-adopet-primary hover:bg-adopet-primary/5 disabled:opacity-50"
        >
          Exportar CSV
        </button>
        <button
          type="button"
          onClick={onExportPdf}
          disabled={disabled || loading}
          className="rounded-lg bg-adopet-primary px-4 py-2 text-sm font-medium text-white hover:bg-adopet-primary-dark disabled:opacity-50"
        >
          Exportar PDF
        </button>
      </div>
    </div>
  );
}

export function Relatorios() {
  const toast = useToast();
  const {
    adoptions,
    stats,
    partners,
    reports,
    satisfactionStats,
    satisfactionItems,
    petsAggregates,
    usersAggregates,
    adoptionsAggregates,
  } = useReportData();

  const handleExport = (fn: () => void, name: string) => {
    try {
      fn();
      toast.addToast('success', `${name} exportado.`);
    } catch (e) {
      toast.addToast('error', `Erro ao exportar ${name}.`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-adopet-text-primary">Relatórios</h1>
        <p className="mt-1 text-adopet-text-secondary">
          Gere relatórios e exporte em CSV ou PDF (com logo e formatação Adopet).
        </p>
      </div>

      <h2 className="text-lg font-semibold text-adopet-text-primary">Listas e resumos</h2>
      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        <ReportCard
          title="Adoções (lista)"
          description="Lista de todas as adoções registradas (pet, tutor, adotante, data, confirmação)."
          onExportCsv={() => handleExport(() => exportAdoptionsCsv(adoptions), 'Adoções (CSV)')}
          onExportPdf={() => handleExport(() => exportAdoptionsPdf(adoptions), 'Adoções (PDF)')}
          disabled={adoptions.length === 0}
        />
        <ReportCard
          title="Resumo administrativo"
          description="Indicadores do dashboard: totais de adoções, pendências (anúncios, denúncias, KYC, etc.)."
          onExportCsv={() => stats && handleExport(() => exportResumoCsv(stats), 'Resumo (CSV)')}
          onExportPdf={() => stats && handleExport(() => exportResumoPdf(stats), 'Resumo (PDF)')}
          disabled={!stats}
        />
        <ReportCard
          title="Parceiros"
          description="Lista de parceiros (ONG, clínicas, lojas) com tipo, cidade, ativo e plano pago."
          onExportCsv={() => handleExport(() => exportParceirosCsv(partners), 'Parceiros (CSV)')}
          onExportPdf={() => handleExport(() => exportParceirosPdf(partners), 'Parceiros (PDF)')}
          disabled={partners.length === 0}
        />
        <ReportCard
          title="Pesquisa de satisfação"
          description="Respostas da pesquisa pós-adoção e resumo com médias por pilar e por papel."
          onExportCsv={() =>
            handleExport(
              () => exportSatisfacaoCsv(satisfactionItems, satisfactionStats),
              'Satisfação (CSV)'
            )
          }
          onExportPdf={() =>
            handleExport(
              () => exportSatisfacaoPdf(satisfactionItems, satisfactionStats),
              'Satisfação (PDF)'
            )
          }
          disabled={satisfactionItems.length === 0 && !satisfactionStats?.totalResponses}
        />
        <ReportCard
          title="Denúncias"
          description="Denúncias reportadas (anúncios, usuários, etc.) com motivo e status de resolução."
          onExportCsv={() => handleExport(() => exportDenunciasCsv(reports), 'Denúncias (CSV)')}
          onExportPdf={() => handleExport(() => exportDenunciasPdf(reports), 'Denúncias (PDF)')}
          disabled={reports.length === 0}
        />
      </div>

      <h2 className="text-lg font-semibold text-adopet-text-primary pt-4">Pets cadastrados (agregados)</h2>
      <p className="text-sm text-adopet-text-secondary">
        Relatórios por espécie, raça, idade, sexo, cidade, status de publicação, vacinado e castrado.
      </p>
      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        <ReportCard
          title="Pets cadastrados"
          description="Pets por espécie (cachorro/gato), raça, idade, sexo, cidade, status de publicação, vacinado e castrado."
          onExportCsv={() =>
            petsAggregates && handleExport(() => exportPetsAggregatesCsv(petsAggregates), 'Pets agregados (CSV)')
          }
          onExportPdf={() =>
            petsAggregates && handleExport(() => exportPetsAggregatesPdf(petsAggregates), 'Pets agregados (PDF)')
          }
          disabled={!petsAggregates}
        />
        <ReportCard
          title="Anúncios (status e publicação)"
          description="Anúncios por status de publicação (pendente/aprovado/rejeitado), status (disponível/adotado) e espécie/cidade."
          onExportCsv={() =>
            petsAggregates && handleExport(() => exportAnunciosAggregatesCsv(petsAggregates), 'Anúncios (CSV)')
          }
          onExportPdf={() =>
            petsAggregates && handleExport(() => exportAnunciosAggregatesPdf(petsAggregates), 'Anúncios (PDF)')
          }
          disabled={!petsAggregates}
        />
      </div>

      <h2 className="text-lg font-semibold text-adopet-text-primary pt-4">Usuários (agregados)</h2>
      <p className="text-sm text-adopet-text-secondary">
        Cadastros por cidade, por mês, status KYC e usuários com/sem anúncios.
      </p>
      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        <ReportCard
          title="Usuários cadastrados"
          description="Por cidade, por mês de cadastro, status KYC (verificado/pendente/rejeitado), com ou sem anúncios e desativados."
          onExportCsv={() =>
            usersAggregates && handleExport(() => exportUsersAggregatesCsv(usersAggregates), 'Usuários (CSV)')
          }
          onExportPdf={() =>
            usersAggregates && handleExport(() => exportUsersAggregatesPdf(usersAggregates), 'Usuários (PDF)')
          }
          disabled={!usersAggregates}
        />
      </div>

      <h2 className="text-lg font-semibold text-adopet-text-primary pt-4">Adoções (agregados)</h2>
      <p className="text-sm text-adopet-text-secondary">
        Adoções por mês, por espécie do pet e confirmadas (ou não) pela Adopet.
      </p>
      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        <ReportCard
          title="Adoções (agregados)"
          description="Por mês, por espécie (cachorro/gato), confirmadas pela Adopet e não confirmadas."
          onExportCsv={() =>
            adoptionsAggregates &&
            handleExport(() => exportAdoptionsAggregatesCsv(adoptionsAggregates), 'Adoções agregados (CSV)')
          }
          onExportPdf={() =>
            adoptionsAggregates &&
            handleExport(() => exportAdoptionsAggregatesPdf(adoptionsAggregates), 'Adoções agregados (PDF)')
          }
          disabled={!adoptionsAggregates}
        />
      </div>
    </div>
  );
}
