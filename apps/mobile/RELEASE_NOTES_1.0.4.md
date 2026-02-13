# Build de produção – Adopet v1.0.4 (versionCode 10)

## O que será enviado ao Google Play

- **Pacote:** AAB (Android App Bundle) gerado pelo EAS Build.
- **Versão exibida:** 1.0.4  
- **versionCode:** 10 (obrigatório incrementar a cada envio).

Comando para gerar o build:

```bash
cd apps/mobile
npx eas build --platform android --profile production
```

---

## Texto para “O que há de novo” (Revisão do Google)

Copie o bloco abaixo no Google Play Console, no campo **O que há de novo nesta versão**.

### Texto final recomendado (tudo que sobe nesta versão)

```
O que há de novo na versão 1.0.4:

• Recuperação de senha: na tela de login, toque em "Esqueci minha senha", informe seu e-mail e siga as instruções enviadas por e-mail para redefinir sua senha.

• Mapa: pins dos pets aparecem no mapa; o raio de busca respeita o valor configurado em Preferências (sem fallback fixo).

• Melhorias de estabilidade e desempenho, correções gerais e atualizações de compatibilidade.

Obrigado por usar o Adopet. Sugestões: Perfil → Ajuda.
```

---

### Opção curta (se precisar reduzir)

```
• Recuperação de senha ("Esqueci minha senha") na tela de login
• Mapa com pins dos pets e raio conforme Preferências
• Melhorias de estabilidade e correções gerais. Obrigado por usar o Adopet.
```

---

## Dica para a revisão

- Texto claro e verdadeiro; sem referências a versões de Android ou termos técnicos.
- Permissão de localização: usada para mostrar pets próximos no mapa e na busca.
