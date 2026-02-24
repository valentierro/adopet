# Verificação: critérios para o administrador

Este documento orienta o que a equipe Adopet deve checar ao aprovar ou rejeitar solicitações de **verificação de perfil** (USER_VERIFIED) e **verificação de pet** (PET_VERIFIED). O selo "Verificado" transmite confiança; por isso, a análise deve ser consistente e criteriosa.

---

## 1. Verificação de perfil (USER_VERIFIED)

**Objetivo:** Atestar que o perfil pertence a uma pessoa real e que os dados são coerentes e utilizáveis para contato no fluxo de adoção.

### O que verificar

| Critério | O que checar | Rejeitar se |
|----------|----------------|-------------|
| **Foto do perfil** | Foto de rosto (pessoa), nítida e adequada. Óculos de grau são aceitáveis; nas evidências da solicitação pede-se rosto sem óculos escuros. | Foto de pet, paisagem, meme, logo, imagem genérica ou ofensiva; foto borrada ou ilegível; óculos escuros que impeçam identificar o rosto. |
| **Identidade** | Nome e foto coerentes (nome parece real, não nickname óbvio de bot). | Nome claramente falso (ex.: "Asdfgh"), perfil claramente fake ou de teste. |
| **Contato** | Telefone preenchido (já exigido para perfil "completo"). | Telefone inválido ou inexistente quando for política exigir contato para verificação. |
| **Consistência** | Dados do perfil (cidade, bio, informações para adoção) coerentes entre si. | Inconsistências graves ou indícios de cópia de outro perfil. |
| **Uso legítimo** | Perfil não é de revenda, comércio irregular ou má-fé. | Linguagem de venda ("vendo filhotes"), múltiplas contas óbvias, histórico de denúncias. |

### Boas práticas

- **Aprovar** quando: foto de rosto clara, nome real, telefone cadastrado, texto e dados plausíveis.
- **Rejeitar com motivo** quando: foto inadequada ("Solicite novamente com uma foto de rosto clara"), dados falsos ("Verifique os dados do perfil antes de solicitar novamente") ou suspeita de má-fé ("Não foi possível confirmar a autenticidade do perfil").
- Em dúvida, **rejeitar com motivo** pedindo ajuste (ex.: "Envie uma foto de rosto mais nítida") em vez de aprovar.

---

## 2. Verificação de pet (PET_VERIFIED)

**Objetivo:** Atestar que o pet existe, que as fotos e as informações do anúncio correspondem a esse pet e que o anunciante tem vínculo legítimo com o animal (tutor/ONG).

### O que verificar

| Critério | O que checar | Rejeitar se |
|----------|----------------|-------------|
| **Fotos do pet** | Fotos mostram o(s) mesmo(s) animal(is), em ambiente plausível (casa, quintal, etc.). | Fotos de banco de imagem, de outros anúncios, de pets diferentes em um mesmo anúncio sem explicação, ou fotos que não mostram o pet. |
| **Correspondência** | Espécie, porte, idade, sexo e características visuais batem com as fotos e a descrição. | Raça/porte/idade incompatíveis com a imagem; descrição genérica que não combina com as fotos. |
| **Autenticidade** | Anúncio parece real (contexto de doação responsável, não venda). | Linguagem de venda ("vendo", "valor", "negociável"), anúncios genéricos copiados, mesmo texto em vários pets. |
| **Tutor** | O dono do anúncio é quem está solicitando a verificação; perfil do tutor não é claramente falso. | Indícios de que o pet não pertence ao tutor (ex.: fotos de outro ambiente/país sem explicação); tutor com perfil fake. |
| **Bem-estar** | Nenhum sinal de maus-tratos ou condições inadequadas nas fotos ou no texto. | Fotos ou descrições que sugiram negligência ou crueldade; nesse caso, rejeitar e, se aplicável, acionar fluxo de denúncia. |

### Boas práticas

- **Aprovar** quando: fotos claras do mesmo pet, descrição coerente, tutor com perfil plausível e anúncio em tom de doação responsável.
- **Rejeitar com motivo** quando: fotos inadequadas ("As fotos não permitem confirmar que são do mesmo pet; adicione fotos mais claras"), dados inconsistentes ("A descrição não confere com as fotos; revise espécie, porte ou idade") ou suspeita de venda ("Anúncios verificados são apenas para doação responsável").
- Em caso de **várias fotos de pets diferentes** no mesmo anúncio (ex.: ninhada), considerar aprovar se estiver explícito na descrição e as fotos forem do mesmo contexto.

---

## 3. Fluxo sugerido no painel admin

1. **Abrir a solicitação** e identificar se é USER_VERIFIED ou PET_VERIFIED (e, no caso de pet, qual pet).
2. **Abrir o perfil do usuário** (e, para pet, o anúncio do pet) no app ou no painel para ver foto(s), nome, descrição, telefone (se disponível).
3. **Percorrer os critérios** acima e anotar qualquer ponto de atenção.
4. **Decisão:**
   - **Aprovar** se todos os critérios relevantes forem atendidos.
   - **Rejeitar** se algum critério não for atendido ou houver dúvida razoável, **sempre informando um motivo curto** (ex.: "Foto do perfil não está clara; use uma foto de rosto nítida").
5. **Salvar** (e, no caso de rejeição, o usuário verá o motivo no app e poderá ajustar e solicitar de novo).

---

## 4. Mensagens padrão de rejeição (sugestão)

Podem ser usadas como base ao preencher o motivo no painel:

**Perfil (USER_VERIFIED):**
- "Use uma foto de rosto clara no perfil (não use foto de pet ou imagem genérica)."
- "Complete o perfil com nome e telefone antes de solicitar novamente."
- "Não foi possível confirmar a autenticidade do perfil. Revise os dados e solicite novamente."

**Pet (PET_VERIFIED):**
- "As fotos do anúncio precisam mostrar claramente o pet. Adicione fotos mais nítidas e solicite novamente."
- "A descrição (espécie, porte ou idade) não confere com as fotos. Corrija e solicite novamente."
- "Anúncios verificados são apenas para doação responsável. Remova qualquer menção a venda."

---

## 5. O que o selo NÃO garante

Para evitar expectativas erradas (inclusive em termos legais), o selo **não** significa:

- Que a Adopet visitou o local ou o pet pessoalmente.
- Que o animal está isento de problemas de saúde ou comportamento.
- Que a adoção será bem-sucedida ou que o tutor/adotante é idôneo em outros contextos.

O selo significa apenas que **o perfil ou o anúncio passou pela análise da equipe** conforme os critérios acima. Vale reforçar isso no texto explicativo do app (ex.: "Perfis e pets verificados passaram por análise da equipe Adopet. Isso não substitui o encontro responsável com o tutor.").

---

## 6. Texto para o app e para termos de uso (redução de responsabilidade)

Use os textos abaixo no aplicativo e, se aplicável, nos Termos de Uso ou na política de verificação, para deixar claro o alcance do selo e reduzir expectativas indevidas.

**Versão curta (já utilizada no app):**
- *"O selo 'Verificado' indica que o perfil ou anúncio passou por análise da equipe Adopet (fotos e dados). O Adopet não garante identidade, posse do animal ou sucesso da adoção. O encontro responsável com o tutor continua essencial."*

**Versão para termos / política (sugestão):**
- *"O selo Verificado significa que o perfil ou anúncio foi analisado pela equipe Adopet conforme critérios internos (fotos, dados cadastrais e coerência das informações). O Adopet não garante a identidade do usuário, a posse do animal, o estado de saúde ou comportamento do pet, nem o sucesso da adoção. A verificação não substitui o encontro presencial e a avaliação responsável pelo usuário. O Adopet não se responsabiliza por condutas de terceiros ou por informações que, após a análise, venham a se revelar incorretas ou fraudulentas."*

---

## 7. Retenção das fotos de evidência e LGPD

As fotos enviadas na **solicitação de verificação** (evidências: rosto do tutor; para pet, também foto do tutor com o pet) são utilizadas **apenas para análise** da equipe Adopet e para conferência dos critérios deste documento.

- **Uso:** exclusivamente para decidir aprovação ou rejeição da solicitação de verificação. Não são exibidas publicamente no app; no painel admin, apenas a equipe com acesso às solicitações pode visualizá-las.
- **Retenção:** definir política interna de retenção (ex.: exclusão das fotos de evidência após X meses da decisão, ou quando a verificação for revogada). Documentar o prazo na política de privacidade e nos procedimentos internos.
- **Base legal (LGPD):** execução de contrato (prestação do serviço de verificação) e/ou legítimo interesse (segurança e confiança na plataforma). Informar o usuário na tela de envio e na política de privacidade que as fotos são usadas só para análise e por quanto tempo são mantidas.
- **Direitos do titular:** garantir que a política de privacidade descreva como solicitar acesso, correção ou exclusão dos dados (incluindo evidências), em conformidade com a LGPD.

---

## 8. Exceção de acessibilidade (“Não consigo enviar fotos”)

O app oferece a opção **“Não consigo enviar fotos”** para usuários que, por motivo de acessibilidade ou outro impedimento legítimo, não conseguem enviar as fotos de evidência (ex.: **deficiência visual**, dificuldade para tirar selfie, falta de suporte para câmera).

- **Fluxo:** o usuário informa um motivo breve (recomendado). A solicitação é enviada **sem fotos** (`evidenceUrls` vazio), com o campo `skipEvidenceReason` preenchido. A análise fica baseada **apenas nos dados do perfil e do anúncio** (nome, foto do perfil, telefone, descrição do pet, fotos já publicadas no anúncio etc.).
- **No painel admin:** a solicitação aparece com a indicação “Sem fotos” e o trecho do motivo informado. A equipe deve avaliar com os dados disponíveis; em caso de dúvida razoável, pode rejeitar com motivo pedindo que o usuário tente enviar as fotos quando possível ou que entre em contato pelo suporte.
- **Documentação:** registrar em procedimento interno que essa exceção existe por acessibilidade e que a análise sem evidências fotográficas é permitida, com decisão baseada nos demais dados.

---

*Documento para uso interno da equipe Adopet. Pode ser revisado e expandido conforme política e jurisprudência aplicáveis.*
