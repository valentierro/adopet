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
  onUpload,
  isUploading,
  result,
}: {
  title: string;
  description: string;
  templateContent: string;
  templateFilename: string;
  onUpload: (file: File) => void;
  isUploading: boolean;
  result: BulkResult | null;
}) {
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Card className="mb-6">
      <h2 className="text-lg font-semibold text-adopet-text-primary mb-2">{title}</h2>
      <p className="text-sm text-adopet-text-secondary mb-4">{description}</p>
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
        description="Cadastro em massa de anúncios de pets. owner_email = usuário já cadastrado. Inclui campos para match score (energy_level, preferred_tutor_*, etc). Opcional: partner_slug (ONG aprovada), photo_url_1 a photo_url_3 (URLs públicas)."
        templateContent={TEMPLATE_PETS}
        templateFilename="template-anuncios.csv"
        onUpload={(file) => petsMutation.mutate(file)}
        isUploading={petsMutation.isPending}
        result={resultPets}
      />

      <Section
        title="Parceiros"
        description="Cadastro em massa de parceiros (ONG, Clínica ou Loja). type: ONG | CLINIC | STORE. approve: true para já aprovar o parceiro."
        templateContent={TEMPLATE_PARTNERS}
        templateFilename="template-parceiros.csv"
        onUpload={(file) => partnersMutation.mutate(file)}
        isUploading={partnersMutation.isPending}
        result={resultPartners}
      />

      <Section
        title="Membros de ONG"
        description="Vincular usuários como membros de uma ONG. partner_slug: slug do parceiro ONG. user_email: email do usuário (já cadastrado). role: VOLUNTARIO | COORDENADOR | CUIDADOR | RECEPCIONISTA | VETERINARIO | ADMINISTRATIVO | OUTRO."
        templateContent={TEMPLATE_PARTNER_MEMBERS}
        templateFilename="template-membros-ong.csv"
        onUpload={(file) => membersMutation.mutate(file)}
        isUploading={membersMutation.isPending}
        result={resultMembers}
      />
    </div>
  );
}
