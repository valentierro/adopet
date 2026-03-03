import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { adminApi, type BulkResult } from '@/api/admin';
import { useToast } from '@/context/ToastContext';
import { Button, Card, PageHeading } from '@/components/ui';

const TEMPLATE_PARTNERS = `type,name,slug,city,description,website,logoUrl,phone,email,active,approve,isPaidPartner
ONG,Instituto Exemplo,instituto-exemplo,São Paulo,,,,,,true,true,false`;

const TEMPLATE_PARTNER_MEMBERS = `partner_slug,user_email,role
instituto-exemplo,usuario@email.com,VOLUNTARIO`;

const TEMPLATE_PETS = `owner_email,name,species,breed,age,sex,size,vaccinated,neutered,description,adoption_reason,feeding_type,feeding_notes,energy_level,health_notes,has_special_needs,good_with_dogs,good_with_cats,good_with_children,temperament,is_docile,is_trained,preferred_tutor_housing_type,preferred_tutor_has_yard,preferred_tutor_has_other_pets,preferred_tutor_has_children,preferred_tutor_time_at_home,preferred_tutor_pets_allowed_at_home,preferred_tutor_dog_experience,preferred_tutor_cat_experience,preferred_tutor_household_agrees,preferred_tutor_walk_frequency,has_ongoing_costs,partner_slug,photo_url_1,photo_url_2,photo_url_3
usuario@email.com,Rex,DOG,SRD,2,M,medium,true,true,Cão amigável e dócil.,,dry,,MEDIUM,,false,YES,YES,YES,CALM,true,false,CASA,true,true,false,MOST_DAY,YES,HAVE_NOW,HAVE_NOW,YES,DAILY,false,,,,`;

/** Legenda: nome técnico do cabeçalho CSV → descrição em português (para exibir na tela) */
const LEGENDA_ANUNCIOS: { col: string; desc: string }[] = [
  { col: 'owner_email', desc: 'E-mail do tutor (usuário já cadastrado no app)' },
  { col: 'name', desc: 'Nome do pet' },
  { col: 'species', desc: 'Espécie: DOG ou CAT' },
  { col: 'breed', desc: 'Raça (ex: SRD)' },
  { col: 'age', desc: 'Idade em anos' },
  { col: 'sex', desc: 'Sexo: M ou F' },
  { col: 'size', desc: 'Porte: small, medium, large, xlarge' },
  { col: 'vaccinated', desc: 'Vacinado: true ou false' },
  { col: 'neutered', desc: 'Castrado: true ou false' },
  { col: 'description', desc: 'Descrição do pet' },
  { col: 'adoption_reason', desc: 'Motivo da doação' },
  { col: 'feeding_type', desc: 'Alimentação: dry, wet, mixed, natural, other' },
  { col: 'feeding_notes', desc: 'Observações sobre alimentação' },
  { col: 'energy_level', desc: 'Nível de energia: LOW, MEDIUM, HIGH' },
  { col: 'health_notes', desc: 'Observações de saúde' },
  { col: 'has_special_needs', desc: 'Tem necessidades especiais: true ou false' },
  { col: 'good_with_dogs', desc: 'Convive com cães: YES, NO, UNKNOWN' },
  { col: 'good_with_cats', desc: 'Convive com gatos: YES, NO, UNKNOWN' },
  { col: 'good_with_children', desc: 'Convive com crianças: YES, NO, UNKNOWN' },
  { col: 'temperament', desc: 'Temperamento: CALM, PLAYFUL, SHY, SOCIABLE, INDEPENDENT' },
  { col: 'is_docile', desc: 'É dócil: true ou false' },
  { col: 'is_trained', desc: 'É adestrado: true ou false' },
  { col: 'preferred_tutor_housing_type', desc: 'Moradia preferida: CASA, APARTAMENTO, INDIFERENTE' },
  { col: 'preferred_tutor_has_yard', desc: 'Tutor com quintal: true ou false' },
  { col: 'preferred_tutor_has_other_pets', desc: 'Tutor com outros pets: true ou false' },
  { col: 'preferred_tutor_has_children', desc: 'Tutor com crianças: true ou false' },
  { col: 'preferred_tutor_time_at_home', desc: 'Tempo em casa: MOST_DAY, HALF_DAY, LITTLE, INDIFERENTE' },
  { col: 'preferred_tutor_pets_allowed_at_home', desc: 'Pets permitidos em casa: YES, NO, UNSURE' },
  { col: 'preferred_tutor_dog_experience', desc: 'Experiência com cães: NEVER, HAD_BEFORE, HAVE_NOW' },
  { col: 'preferred_tutor_cat_experience', desc: 'Experiência com gatos: NEVER, HAD_BEFORE, HAVE_NOW' },
  { col: 'preferred_tutor_household_agrees', desc: 'Família concorda: YES ou DISCUSSING' },
  { col: 'preferred_tutor_walk_frequency', desc: 'Frequência de passeios: DAILY, FEW_TIMES_WEEK, RARELY, INDIFERENTE' },
  { col: 'has_ongoing_costs', desc: 'Tem custos contínuos: true ou false' },
  { col: 'partner_slug', desc: 'Slug da ONG parceira (opcional)' },
  { col: 'photo_url_1', desc: 'URL da foto 1 (opcional)' },
  { col: 'photo_url_2', desc: 'URL da foto 2 (opcional)' },
  { col: 'photo_url_3', desc: 'URL da foto 3 (opcional)' },
];

const LEGENDA_PARCEIROS: { col: string; desc: string }[] = [
  { col: 'type', desc: 'Tipo: ONG, CLINIC ou STORE' },
  { col: 'name', desc: 'Nome do parceiro' },
  { col: 'slug', desc: 'Identificador único (ex: instituto-exemplo)' },
  { col: 'city', desc: 'Cidade' },
  { col: 'description', desc: 'Descrição' },
  { col: 'website', desc: 'Site (opcional)' },
  { col: 'logoUrl', desc: 'URL do logo (opcional)' },
  { col: 'phone', desc: 'Telefone (opcional)' },
  { col: 'email', desc: 'E-mail (opcional)' },
  { col: 'active', desc: 'Ativo: true ou false' },
  { col: 'approve', desc: 'Aprovar já no cadastro: true ou false' },
  { col: 'isPaidPartner', desc: 'Parceiro patrocinado: true ou false' },
];

const LEGENDA_MEMBROS: { col: string; desc: string }[] = [
  { col: 'partner_slug', desc: 'Slug do parceiro (ONG já cadastrada)' },
  { col: 'user_email', desc: 'E-mail do usuário (já cadastrado no app)' },
  { col: 'role', desc: 'Função: VOLUNTARIO, COORDENADOR, CUIDADOR, RECEPCIONISTA, VETERINARIO, ADMINISTRATIVO, OUTRO' },
];

function downloadCsv(content: string, filename: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function Section({
  title,
  description,
  templateContent,
  templateFilename,
  legend,
  onUpload,
  isUploading,
  result,
}: {
  title: string;
  description: string;
  templateContent: string;
  templateFilename: string;
  legend?: { col: string; desc: string }[];
  onUpload: (file: File) => void;
  isUploading: boolean;
  result: BulkResult | null;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Card className="mb-6">
      <h2 className="text-lg font-semibold text-adopet-text-primary mb-2">{title}</h2>
      <p className="text-sm text-adopet-text-secondary mb-4">{description}</p>
      {legend && legend.length > 0 && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowLegend(!showLegend)}
            className="text-sm font-medium text-adopet-primary hover:underline"
          >
            {showLegend ? 'Ocultar legenda dos cabeçalhos' : 'Ver legenda dos cabeçalhos do CSV'}
          </button>
          {showLegend && (
            <div className="mt-2 overflow-x-auto rounded-lg border border-adopet-primary/20">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-adopet-header border-b border-adopet-primary/20">
                    <th className="text-left p-2 font-medium text-adopet-text-primary">Cabeçalho no arquivo</th>
                    <th className="text-left p-2 font-medium text-adopet-text-primary">Significado</th>
                  </tr>
                </thead>
                <tbody>
                  {legend.map((row) => (
                    <tr key={row.col} className="border-b border-adopet-primary/10 last:border-0">
                      <td className="p-2 font-mono text-adopet-text-primary">{row.col}</td>
                      <td className="p-2 text-adopet-text-secondary">{row.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Button variant="secondary" size="sm" onClick={() => downloadCsv(templateContent, templateFilename)}>
          Baixar template CSV
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
          {file ? file.name : 'Escolher arquivo'}
        </Button>
        <Button variant="primary" size="sm" disabled={!file || isUploading} loading={isUploading} onClick={() => file && onUpload(file)}>
          {isUploading ? 'Enviando…' : 'Enviar CSV'}
        </Button>
      </div>
      {result && (
        <div className="text-sm">
          <p className="text-adopet-text-primary">
            <strong>{result.created}</strong> registro(s) criado(s).
          </p>
          {result.errors.length > 0 && (
            <div className="mt-2">
              <p className="text-amber-600 font-medium">Erros por linha:</p>
              <ul className="list-disc list-inside mt-1 text-adopet-text-secondary">
                {result.errors.slice(0, 20).map((e, i) => (
                  <li key={i}>
                    Linha {e.row}: {e.message}
                  </li>
                ))}
                {result.errors.length > 20 && (
                  <li>… e mais {result.errors.length - 20} erro(s)</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export function BulkImport() {
  const toast = useToast();
  const [resultPartners, setResultPartners] = useState<BulkResult | null>(null);
  const [resultMembers, setResultMembers] = useState<BulkResult | null>(null);
  const [resultPets, setResultPets] = useState<BulkResult | null>(null);

  const partnersMutation = useMutation({
    mutationFn: (file: File) => adminApi.bulkUploadPartners(file),
    onSuccess: (data) => {
      setResultPartners(data);
      toast.addToast('success', `${data.created} parceiro(s) criado(s).`);
    },
    onError: (e) => {
      toast.addToast('error', e instanceof Error ? e.message : 'Erro ao importar.');
    },
  });

  const membersMutation = useMutation({
    mutationFn: (file: File) => adminApi.bulkUploadPartnerMembers(file),
    onSuccess: (data) => {
      setResultMembers(data);
      toast.addToast('success', `${data.created} membro(s) vinculado(s).`);
    },
    onError: (e) => {
      toast.addToast('error', e instanceof Error ? e.message : 'Erro ao importar.');
    },
  });

  const petsMutation = useMutation({
    mutationFn: (file: File) => adminApi.bulkUploadPets(file),
    onSuccess: (data) => {
      setResultPets(data);
      toast.addToast('success', `${data.created} anúncio(s) criado(s).`);
    },
    onError: (e) => {
      toast.addToast('error', e instanceof Error ? e.message : 'Erro ao importar.');
    },
  });

  return (
    <div>
      <PageHeading
        title="Upload massivo"
        description="Cadastre vários registros de uma vez via CSV. Baixe o template, preencha com os dados e envie o arquivo. O upload de pets é prioridade no início do projeto."
      />

      <Section
        title="Anúncios (pets) — prioridade"
        description="Cadastro em massa de anúncios de pets. Use a legenda abaixo para saber o que preencher em cada coluna do CSV."
        templateContent={TEMPLATE_PETS}
        templateFilename="template-anuncios.csv"
        legend={LEGENDA_ANUNCIOS}
        onUpload={(file) => petsMutation.mutate(file)}
        isUploading={petsMutation.isPending}
        result={resultPets}
      />

      <Section
        title="Parceiros"
        description="Cadastro em massa de parceiros (ONG, Clínica ou Loja). Use a legenda para os cabeçalhos do CSV."
        templateContent={TEMPLATE_PARTNERS}
        templateFilename="template-parceiros.csv"
        legend={LEGENDA_PARCEIROS}
        onUpload={(file) => partnersMutation.mutate(file)}
        isUploading={partnersMutation.isPending}
        result={resultPartners}
      />

      <Section
        title="Membros de ONG"
        description="Vincular usuários como membros de uma ONG. Use a legenda para os cabeçalhos do CSV."
        templateContent={TEMPLATE_PARTNER_MEMBERS}
        templateFilename="template-membros-ong.csv"
        legend={LEGENDA_MEMBROS}
        onUpload={(file) => membersMutation.mutate(file)}
        isUploading={membersMutation.isPending}
        result={resultMembers}
      />
    </div>
  );
}
