# Alertas de uptime e Sentry

Guia para configurar monitoramento da API e alertas de erros (app e API). Tudo é configurado em serviços externos; o Adopet já expõe o que precisam.

---

## 1. Alertas de uptime (API)

Objetivo: ser avisado quando a API ficar fora do ar (ex.: Vercel, banco ou rede).

### URL a monitorar

- **Produção:** `GET https://SUA-API.vercel.app/v1/health` (ou o domínio real da API).
- O endpoint retorna **200** quando a API e o banco estão ok, e **503** quando o banco está inacessível. O monitor deve alertar em qualquer resposta diferente de 200 (ou em timeout).

### Uptime Robot (gratuito)

1. Acesse **[uptimerobot.com](https://uptimerobot.com)** e crie uma conta ou faça login.
2. Clique em **+ Add New Monitor**.
3. Preencha:
   - **Monitor Type:** HTTP(s).
   - **Friendly Name:** ex. `Adopet API`.
   - **URL:** `https://SUA-API.vercel.app/v1/health`.
   - **Monitoring Interval:** 5 minutos (plano gratuito permite 5 min).
4. Em **Alert Contacts**, adicione pelo menos um contato (e-mail). Opcional: Slack, SMS, etc.
5. Salve. O Uptime Robot passará a checar a URL a cada 5 min e enviar alerta se falhar (timeout, 5xx, 4xx, ou indisponibilidade).

### Better Stack (ex. Better Uptime)

1. Acesse **[betterstack.com](https://betterstack.com)** (ou o serviço escolhido).
2. Crie um **HTTP monitor** apontando para `https://SUA-API.vercel.app/v1/health`.
3. Defina o intervalo (ex.: 5 min) e os canais de notificação (e-mail, Slack, etc.).

### O que fazer quando receber o alerta

- Verificar o status no painel da Vercel e logs da API.
- Se for 503, checar conexão com o banco (Neon, etc.) e variáveis de ambiente.
- Revisar [DEPLOY_PRODUCTION.md](./DEPLOY_PRODUCTION.md) e [VERCEL_DEPLOY.md](../apps/api/VERCEL_DEPLOY.md) se precisar de checklist de deploy.

---

## 2. Alertas do Sentry (app mobile e API)

Objetivo: receber notificações quando houver **novo erro** ou **pico de erros** no app ou na API.

O Adopet já envia erros para o Sentry quando o DSN está configurado (mobile: `EXPO_PUBLIC_SENTRY_DSN`; API: `SENTRY_DSN`). Falta só configurar **regras de alerta** e **canais** (e-mail/Slack) no projeto do Sentry.

### 2.1 Onde configurar

- **App mobile:** projeto **React Native / Expo** no Sentry (o mesmo do [SENTRY.md](../apps/mobile/SENTRY.md)).
- **API:** projeto **NestJS / Node** no Sentry (se você criou um projeto separado para a API).

### 2.2 Criar regra: “Novo issue”

Útil para ser avisado assim que um erro novo aparecer.

1. No Sentry, abra o projeto (mobile ou API).
2. Vá em **Alerts** → **Alert Rules** (ou **Settings** → **Alerts** → **Create Alert**).
3. **Create a new alert rule.**
4. Escolha um template ou “When a new issue is created” / “An event is first seen”.
5. Defina **Actions**: enviar notificação por e-mail e/ou Slack (veja 2.4).
6. Salve a regra.

### 2.3 Criar regra: “Pico de erros”

Útil para quando o mesmo erro disparar muitas vezes em pouco tempo.

1. Em **Alert Rules**, crie outra regra.
2. Condição do tipo: “The number of events in an issue is above X” ou “The event count has increased by more than Y% in Z minutes”.
3. Ajuste o limite (ex.: mais de 10 eventos em 1 hora, ou aumento de 200% em 15 min).
4. Actions: e-mail e/ou Slack.
5. Salve.

### 2.4 Notificações por e-mail e Slack

- **E-mail:** no Sentry, em **Settings** → **Notifications**, o e-mail da conta já recebe alertas. Para mais destinatários, use **Alert Rules** e adicione “Send a notification to…” → **Email** (ou membros do time).
- **Slack:**
  1. **Settings** → **Integrations** → **Slack** → instale/conecte o workspace.
  2. Ao criar ou editar uma **Alert Rule**, em **Actions** escolha “Send a notification via Slack” e selecione o canal (ex. `#adopet-alerts`).

### 2.5 Resumo recomendado

| Regra              | Quando dispara              | Uso                         |
|--------------------|----------------------------|-----------------------------|
| Novo issue         | Primeira vez que um erro aparece | Saber de bugs novos         |
| Pico de eventos    | Muitos eventos no mesmo issue    | Saber de surtos/incidentes  |

Configurar pelo menos **“novo issue”** com e-mail (e Slack se tiver) já cobre a maior parte dos alertas. Depois você pode adicionar a regra de pico e afinar os limites.

---

## 3. Checklist rápido

- [ ] Monitor de uptime criado para `GET https://SUA-API/v1/health` (intervalo 5 min).
- [ ] Pelo menos um contato (e-mail) no monitor de uptime.
- [ ] No Sentry (mobile): regra de alerta “novo issue” com e-mail (e Slack opcional).
- [ ] No Sentry (API): mesmo se usar projeto separado; regra “novo issue” e, se quiser, “pico de erros”.
- [ ] Slack conectado ao Sentry (opcional) e canal escolhido nas regras.

Com isso, você passa a ser alertado quando a API cair (uptime) e quando surgirem erros ou picos no app e na API (Sentry).
