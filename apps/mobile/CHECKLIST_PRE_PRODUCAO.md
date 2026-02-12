# Checklist antes de publicar em produção

Sugestões para o app Adopet antes de subir para a Play Store (e depois para a App Store).

---

## Já coberto pelo projeto

- **401 / sessão:** o app renova o token e, se falhar, faz logout e redireciona para login.
- **Botão voltar:** telas com header têm botão de voltar (incl. Favoritos, Conversas, Anunciar).
- **Teclado:** `softwareKeyboardLayoutMode: resize` no Android + `KeyboardAvoidingView` em login, signup e chat.
- **Mapa:** API key do Google Maps no EAS; overlay de loading removido; mensagem de erro no rodapé.
- **Assinatura parceiro:** renovação e cancelamento com refetch ao voltar do Stripe; mensagem quando não há vínculo.
- **LGPD:** fluxo de desativar conta e excluir dados implementado na API e no app.
- **Error boundary:** `AppErrorBoundary` no root para evitar tela branca em erros não tratados.

---

## Sugestões rápidas (opcional antes do primeiro release)

1. **Política de privacidade em URL pública**  
   A Play Store (e depois a App Store) exige link para a política de privacidade. Use a URL da landing (ex.: `https://adopet.com.br/#privacidade`) ou uma página estática. Já existe tela de privacidade no app; o link é para a loja e para usuários externos.

2. **Versão e release notes**  
   Confirme que `version` e `versionCode` em `app.json` estão corretos para este release. Use o texto de `NOTA_VERSAO_5.md` (ou equivalente) no campo “O que há de novo” da Play Console.

3. **Teste em dispositivo real**  
   Antes de publicar: login, cadastro, feed, mapa, favoritos, conversa, anunciar pet, perfil, portal do parceiro e “Gerenciar assinatura”. Confirme que o mapa carrega e que os formulários não ficam cobertos pelo teclado.

4. **Credenciais de teste (Play Console)**  
   Se o app tem áreas restritas (login), mantenha as instruções de acesso para revisores (e-mail/senha de teste) atualizadas em “Acesso de apps”.

---

## Melhorias para as próximas versões

5. **Sem conexão**  
   Mostrar uma mensagem ou banner quando não houver internet (ex.: “Sem conexão. Verifique sua rede.”) em vez de só falha genérica. Pode usar `@react-native-community/netinfo` e um componente global ou por tela.

6. **Crash reporting**  
   Ferramentas como **Sentry** ou **Firebase Crashlytics** (Expo tem suporte) ajudam a ver erros em produção. Configurar depois do primeiro release já traz bastante valor.

7. **Timeout de requisições**  
   O client já usa timeout (20s). Se quiser, pode tratar especificamente timeout (ex.: “Demorou demais. Tente de novo.”) em telas críticas (login, feed, mapa).

8. **Acessibilidade**  
   Revisar `accessibilityLabel` e `accessibilityHint` em botões e links importantes (login, cadastro, ações no feed e no perfil). Melhora uso com leitor de tela e pode ser exigido em revisões futuras.

9. **Deep links**  
   Os links `adopet://partner-success`, `adopet://partner-cancel` e `adopet://partner-subscription` já estão no fluxo. Se for enviar links por e-mail ou push, garantir que o scheme e as rotas estejam documentados.

10. **Analytics / eventos**  
    O módulo `src/analytics.ts` já existe. Quando tiver backend de analytics, conectar eventos (ex.: cadastro, anúncio criado, início de conversa) para medir uso e funil.

---

## Resumo

Para este build: **política de privacidade em URL**, **notas de versão** e **teste manual** em dispositivo real (incluindo mapa e teclado) são os itens mais importantes. O restante pode ser planejado para as próximas atualizações.
