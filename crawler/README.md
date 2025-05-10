```txt
pnpm install
pnpm run dev
```

```txt
pnpm run deploy
```

## Database Migrations

You can generate migrations using the drizzle-kit generate command and then apply them using the drizzle-kit migrate command:

Generate migrations:

```txt
npx drizzle-kit generate
```

Apply migrations:

```txt
npx drizzle-kit migrate
```

Read more about migration process in documentation.

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
pnpm run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiation `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>();
```
