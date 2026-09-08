# App.tsx Refactor

`src/App.tsx` has been reduced to a component-only compatibility entry.

```tsx
import HomePage from '@/components/home/HomePage';

export default function App() {
  return <HomePage />;
}
```

In the current Next.js App Router project, `App.tsx` is not used for routing.

- Global layout: `src/app/layout.tsx`
- Home route: `src/app/page.tsx`
- Home UI composition: `src/components/home/HomePage.tsx`
- Shared state/API actions: `src/context/MarketProvider.tsx`

After confirming no legacy Vite entry imports `App.tsx`, the file can be deleted entirely.
