# LGPD – Checklist e orientações

Este documento resume o que foi implementado no Adopet para alinhamento à Lei Geral de Proteção de Dados (Lei 13.709/2018) e o que você ainda deve fazer ou revisar.

---

## O que já está no app

### 1. Política de Privacidade (tela /privacy)
- Menção à LGPD e bases legais (art. 7º).
- Descrição dos dados coletados, finalidade e quem vê (outros usuários **não** veem email/telefone; admin usa telefone só para confirmar adoção).
- Retenção e como solicitar exclusão.
- **Direitos do titular (art. 18):** acesso, correção, portabilidade, eliminação, revogação de consentimento, etc., e como exercer.
- Canal de contato (email) para dúvidas e exercício de direitos.

### 2. Termos de Uso (tela /terms)
- Cláusula de conta e dados com referência à LGPD e ao consentimento ao tratamento conforme a Política de Privacidade.

### 3. Cadastro (signup)
- Usuário aceita Termos e Política de Privacidade antes de criar conta.
- Caixa “Seus dados estão seguros” explicando que nome, email e telefone não são compartilhados com outros usuários.

### 4. Perfil do usuário
- **Exportar meus dados (LGPD):** chama a API de portabilidade e permite compartilhar/salvar um JSON com os dados (art. 18 V).
- **Desativar conta:** desativa a conta (soft delete); a política informa que a exclusão definitiva pode ser solicitada por contato.
- Links para Termos e Política de Privacidade.

### 5. API
- **GET /me/export:** retorna dados do usuário logado (perfil, preferências, lista de pets) em JSON para portabilidade.

---

## O que você deve fazer

### Obrigatório
1. **Email de contato/DPO**  
   Atualize `apps/mobile/src/constants/support.ts`: troque `SUPPORT_EMAIL` pelo email real de suporte ou do encarregado (DPO). Esse email aparece na Política de Privacidade e é usado para o usuário exercer direitos.

2. **Revisar textos com um advogado**  
   As telas de Política de Privacidade e Termos são modelos. Um advogado deve adaptar ao seu negócio, operação e bases legais (ex.: consentimento, legítimo interesse, execução de contrato).

### Recomendado
3. **Registro de operações**  
   A LGPD (art. 37) pode exigir registro das operações de tratamento. Vale documentar quais dados são tratados, finalidade, base legal e compartilhamentos (mesmo que internos ou com fornecedores).

4. **Exclusão definitiva**  
   Hoje há apenas “Desativar conta”. Se quiser atender pedidos de exclusão definitiva (art. 18 VI), você pode:
   - criar um fluxo (ex.: “Solicitar exclusão” que envia email ou gera ticket), ou
   - implementar um endpoint (ex.: DELETE /me) que anonimiza ou remove os dados do usuário, com confirmação e senha.

5. **Cookies / identificadores**  
   Se no futuro o app ou um site usar cookies/identificadores para marketing ou analytics, será necessário aviso e consentimento específico (e atualizar a Política).

6. **Menores**  
   Se o serviço for oferecido a menores de 18 anos, a LGPD exige cuidado extra (art. 14); pode ser necessário consentimento dos pais ou não tratar dados de menores.

---

## Resumo dos direitos do titular (art. 18 LGPD)

| Direito | No app |
|--------|--------|
| Confirmação de tratamento | Política + contato |
| Acesso | Perfil + exportar dados |
| Correção | Edição de perfil |
| Anonimização / bloqueio / eliminação | Desativar conta + contato para exclusão definitiva |
| Portabilidade | Botão “Exportar meus dados” + GET /me/export |
| Informação sobre compartilhamento | Política, seção 4 |
| Revogação do consentimento | Contato + desativar conta |

---

## Referências

- [LGPD – Lei 13.709/2018](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [Guia ANPD](https://www.gov.br/anpd/pt-br) (Autoridade Nacional de Proteção de Dados)
