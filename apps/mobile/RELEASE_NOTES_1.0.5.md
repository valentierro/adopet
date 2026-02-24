# Build de produção – Adopet v1.0.5 (versionCode 11)

## O que será enviado ao Google Play

- **Pacote:** AAB (Android App Bundle) gerado pelo EAS Build.
- **Versão exibida:** 1.0.5  
- **versionCode:** 11 (obrigatório incrementar a cada envio).

Comando para gerar o build:

```bash
cd apps/mobile
pnpm dlx eas-cli build --platform android --profile production
```

---

## Lista completa de alterações nesta versão (nada deixado de fora)

### Mapa (aba Mapa)

- **Correção do mapa que não aparecia:** o mapa deixou de ficar carregando para sempre; agora o mapa é exibido corretamente.
- **Configuração do Google Maps no build:** a chave da API do Google Maps (Android) é injetada no app no momento do build, permitindo que os tiles do mapa carreguem em produção.
- **Uso do Google Maps em todo o app:** o mapa usa explicitamente o provedor Google (PROVIDER_GOOGLE) para exibição consistente.
- **Ajustes de layout do mapa:** o container do mapa ganhou altura mínima e uso de flex para garantir que o mapa tenha espaço visível e não fique com área zerada em alguns dispositivos.
- **Suporte a chave separada para iOS no código:** o app passou a aceitar a variável opcional `GOOGLE_MAPS_API_KEY_IOS` para uso futuro no build iOS (quando houver permissão no time Apple), mantendo a mesma chave ou uma chave dedicada para Android.

### Versão e build

- **Versão exibida ao usuário:** 1.0.4 → 1.0.5.
- **versionCode Android:** 10 → 11 (obrigatório para novo envio na Play Store).

### Documentação interna (não aparece para o usuário)

- **CONFIGURACAO_MAPA_REVISAO.md:** atualizado com o passo a passo de onde fica “Application restrictions” no Google Cloud, como restringir a API key para iOS (bundle ID), e que cada chave só pode ter um tipo de restrição (Android ou iOS); incluída seção para chave opcional `GOOGLE_MAPS_API_KEY_IOS` e uso no EAS.

---

## Texto para “O que há de novo” (Google Play Console)

Copie o bloco abaixo no Google Play Console, no campo **O que há de novo nesta versão**.

### Texto final recomendado (completo)

```
O que há de novo na versão 1.0.5:

• Mapa: correção que faz o mapa ser exibido corretamente em vez de ficar carregando sem parar. Os pins dos pets continuam aparecendo no mapa, com o raio de busca conforme suas Preferências.

• Melhorias de estabilidade e compatibilidade do mapa, além de correções gerais.

Obrigado por usar o Adopet. Sugestões: Perfil → Ajuda.
```

### Opção curta (se precisar reduzir)

```
• Mapa: correção para o mapa ser exibido corretamente (não fica mais carregando para sempre)
• Pins dos pets no mapa com raio conforme Preferências
• Melhorias de estabilidade e correções gerais. Obrigado por usar o Adopet.
```

### Opção mínima

```
Correção na exibição do mapa. Melhorias de estabilidade. Obrigado por usar o Adopet.
```

---

## Dica para a revisão do Google

- Texto claro e verdadeiro; sem referências a versões de Android ou termos técnicos desnecessários.
- A permissão de localização já existia; continua sendo usada para mostrar pets próximos no mapa e na busca.
