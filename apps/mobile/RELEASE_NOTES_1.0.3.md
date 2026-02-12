# Build de produção – Adopet v1.0.3 (versionCode 9)

## O que será enviado ao Google Play

- **Pacote:** AAB (Android App Bundle) gerado pelo EAS Build.
- **Versão exibida:** 1.0.3  
- **versionCode:** 9 (obrigatório incrementar a cada envio).

Comando para gerar o build:

```bash
cd apps/mobile
eas build --platform android --profile production
```

O artefato final será um arquivo `.aab` que você envia no Google Play Console em **Produção** (ou **Teste interno** / **Teste fechado**, se preferir).

---

## Texto para “O que há de novo” (Revisão do Google)

Use um dos blocos abaixo no Google Play Console, no campo **O que há de novo nesta versão** (ou “Release notes” / “Novidades”).

### Opção 1 – Curta (até ~500 caracteres)

```
• Recuperação de senha: use "Esqueci minha senha" na tela de login para receber um e-mail e redefinir sua senha
• Melhorias de estabilidade e desempenho
• Correções gerais

Obrigado por usar o Adopet. Envie sugestões pelo app (Perfil → Ajuda).
```

### Opção 2 – Um pouco mais detalhada

```
O que há de novo na versão 1.0.3:

• Recuperação de senha: na tela de login, toque em "Esqueci minha senha", informe seu e-mail e siga as instruções enviadas por e-mail para redefinir sua senha
• Melhorias de estabilidade e desempenho do app
• Ajustes na interface e correções gerais

Sua opinião é importante: use Perfil → Ajuda para enviar sugestões ou reportar problemas. Obrigado por fazer parte do Adopet.
```

### Opção 3 – Mínima (se o Google pedir algo bem breve)

```
Recuperação de senha ("Esqueci minha senha") na tela de login. Melhorias de estabilidade e correções gerais. Obrigado por usar o Adopet.
```

---

## Dica para a revisão do Google

- O texto deve ser **claro e verdadeiro**: não prometa recursos que não existem.
- Evite referências a versões de Android/API ou termos técnicos, a menos que seja necessário.
- Se esta versão tiver **novas permissões**, descreva de forma simples o uso (ex.: “Acesso à localização para mostrar pets próximos no mapa”).
