---
layout: default
title: Documentação Adopet
---

# Documentação Adopet

Bem-vindo à documentação do **Adopet** — o app de adoção de pets no Brasil. Esta documentação foi feita para facilitar a manutenção do projeto, inclusive por desenvolvedores iniciantes.

## O que é o Adopet?

O Adopet é uma plataforma que conecta pessoas que querem adotar pets com tutores que estão doando. O app permite:

- **Descobrir pets** — feed com cards, mapa e filtros
- **Curtir e passar** — swipes estilo Tinder
- **Favoritar** — salvar pets de interesse
- **Conversar** — chat entre interessado e tutor
- **Confirmar adoção** — fluxo com termo de responsabilidade e verificação (KYC)
- **Parcerias** — ONGs, clínicas e lojas com cupons e serviços

## Por onde começar?

| Se você quer... | Leia |
|-----------------|------|
| Configurar o projeto na sua máquina | [Configuração inicial](getting-started.md) |
| Entender a estrutura do código | [Arquitetura](architecture.md) |
| Ver diagramas do banco e da API | [Diagramas](architecture-diagrams.md) |
| Saber como rodar o backend | [Backend (API)](backend.md) |
| Saber como rodar o app mobile | [App mobile](mobile-app.md) |
| Ver os endpoints da API | [Referência da API](api-reference.md) |
| Entender o banco de dados | [Banco de dados](database.md) |
| Ver os fluxos principais | [Fluxos do app](flows.md) |
| Gerar builds para as lojas | [Deploy e builds](deployment.md) |
| Resolver problemas comuns | [Manutenção](maintenance.md) |
| Entender termos técnicos | [Glossário](glossary.md) |
| Stack e versões | [Stack de desenvolvimento](technical-stack.md) |
| Serviços e métodos da API | [API — serviços](api-services.md) |
| Componentes e stores do mobile | [Mobile — componentes](mobile-components.md) |
| Schema completo do banco | [Schema do banco](database-schema.md) |
| Rodar e verificar testes | [Suite de testes](testing.md) |

## Tecnologias

| Parte | Tecnologia |
|-------|------------|
| Backend | NestJS, Prisma, PostgreSQL |
| Mobile | React Native, Expo |
| Estado (mobile) | Zustand, React Query |
| Deploy API | Vercel |
| Builds mobile | EAS (Expo) |
