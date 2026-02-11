# Adopet — Landing Page

Landing de apresentação do app [Adopet](https://github.com/valentierro/adopet), com identidade visual alinhada ao app (teal, sage, Outfit).

**Repositório:** [github.com/valentierro/adopetlanding](https://github.com/valentierro/adopetlanding)

## Desenvolvimento

```bash
pnpm install
pnpm dev
```

Abre em [http://localhost:5173](http://localhost:5173).

## Build

```bash
pnpm build
```

Saída em `dist/`. Pode ser implantada na Vercel, Netlify ou qualquer host estático.

## Deploy na Vercel

1. Conecte este repositório no [Vercel](https://vercel.com).
2. Build command: `pnpm build`
3. Output directory: `dist`
4. Instale as dependências com pnpm (Vercel detecta automaticamente).

## Links

- **App na Google Play:** [play.google.com/store/apps/details?id=br.com.adopet.app](https://play.google.com/store/apps/details?id=br.com.adopet.app)
- Atualize os links de Política de privacidade e Termos de uso no `src/sections/Footer.tsx` quando tiver as URLs públicas.
