# Travas por perfil completo

**Perfil completo** = foto (avatar) + telefone cadastrados.

## Já implementado

| Ação | Onde | Comportamento |
|------|------|----------------|
| **Publicar pet** | Add pet | Alert "Complete seu perfil" + botão "Completar perfil" → `/profile-edit`. |
| **Solicitar verificação** (perfil) | Perfil | Botão visível; ao clicar, se perfil incompleto → Alert + "Completar perfil" → `/profile-edit`. |
| **Solicitar verificação** (pet) | Detalhe do pet + Meus anúncios | Mesmo fluxo: Alert + redirecionamento para edição do perfil. |
| **Conversar com o tutor** | Detalhe do pet + Favoritos | Antes de criar conversa: se perfil incompleto → Alert + "Completar perfil" → `/profile-edit`. |

Assim, **adoção (iniciar conversa)** já fica condicionada ao perfil completo: quem quer adotar precisa completar perfil para conversar.

---

## Sugestões adicionais (opcional)

| Ação | Prós | Contras | Recomendação |
|------|------|---------|--------------|
| **Favoritar** exige perfil completo | Só quem está “comprometido” favorita; reduz favoritos fantasmas. | Pode frustrar quem só quer guardar para depois. | **Opcional**: manter como está (qualquer um pode favoritar); o bloqueio na hora de **Conversar** já filtra. |
| **Confirmar adoção** (adotante) | Garante que quem confirma tem perfil completo no sistema. | Quem já conversou e adotou pode achar chato bloquear só na confirmação. | **Baixa prioridade**: fluxo já exige conversa (e conversa exige perfil completo). |
| **Marcar como adotado** (tutor) | Consistência: tutor sempre com perfil completo. | Quem anuncia já passou pela trava de “publicar pet” (que exige perfil completo). | **Desnecessário**: tutor que tem pet publicado já tem perfil completo. |
| **Denunciar** (pet/usuário/mensagem) | Evita denúncias anônimas sem identificação. | Pode atrapalhar quem quer só reportar algo rápido. | **Opcional**: pode exigir perfil completo para denunciar, com mensagem clara. |
| **Enviar mensagem no chat** | Garante que só perfis completos trocam mensagens. | Quem já abriu o chat (e passou na trava de Conversar) já tem perfil completo. | **Desnecessário** se a trava em **Conversar** estiver em todos os pontos de entrada (detalhe do pet + favoritos). |

---

## Resumo

- **Implementado:** verificação (perfil e pet) e **conversar** (detalhe do pet e favoritos) exigem perfil completo, com Alert e redirecionamento para completar perfil.
- **Adoção:** restringir “conversar” já restringe o início do fluxo de adoção; não é necessário travar de novo ao “marcar como adotado” ou “confirmar adoção” só por perfil.
- **Opcional no futuro:** travar favoritar ou denunciar por perfil completo, se quiserem endurecer critérios.
