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
| Ver diagramas do banco e da API | [Diagramas da arquitetura](architecture-diagrams.md) |
| Saber como rodar o backend | [Backend (API)](backend.md) |
| Saber como rodar o app mobile | [App mobile](mobile-app.md) |
| Ver os endpoints da API | [Referência da API](api-reference.md) |
| Entender o banco de dados | [Banco de dados](database.md) |
| Ver o schema completo e relacionamentos | [Schema do banco](database-schema.md) |
| Ver os fluxos principais (login, adoção, etc.) | [Fluxos do app](flows.md) |
| Gerar builds para as lojas | [Deploy e builds](deployment.md) |
| Resolver problemas comuns | [Manutenção e troubleshooting](maintenance.md) |
| Entender termos técnicos | [Glossário](glossary.md) |

### Documentação técnica

| Conteúdo | Documento |
|----------|-----------|
| Stack completa (versões) | [Stack de desenvolvimento](technical-stack.md) |
| Serviços e métodos da API | [API — serviços e controllers](api-services.md) |
| Componentes e stores do mobile | [Mobile — componentes e stores](mobile-components.md) |
| Schema completo do banco | [Banco de dados — schema](database-schema.md) |
| Rodar testes e verificar resultados | [Suite de testes](testing.md) |

## Links rápidos

- **API (local):** http://localhost:3000/v1
- **Swagger (documentação interativa):** http://localhost:3000/api/docs (ou `docs/swagger/index.html` standalone com Try it out)
- **Repositório:** GitHub do projeto

Para exportar o spec OpenAPI: `pnpm openapi:fetch` (com a API em execução).

## Tecnologias usadas

| Parte | Tecnologia |
|-------|------------|
| Backend | NestJS, Prisma, PostgreSQL |
| Mobile | React Native, Expo |
| Estado (mobile) | Zustand, React Query |
| Banco | PostgreSQL (local Docker ou Neon) |
| Storage de fotos | S3 (AWS ou MinIO local) |
| Deploy API | Vercel |
| Builds mobile | EAS (Expo Application Services) |

---

## Publicar no GitHub Pages

1. No repositório no GitHub, vá em **Settings** → **Pages**
2. Em **Source**, escolha **Deploy from a branch**
3. Em **Branch**, selecione `main` e a pasta **/docs**
4. Salve — a documentação estará em `https://SEU_ORG.github.io/adopet/`

O GitHub usa Jekyll para renderizar os arquivos `.md`. O `_config.yml` na pasta `docs/` configura o tema.
