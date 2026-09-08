import HomePage from '@/components/home/HomePage';

/**
 * Legacy compatibility entry.
 *
 * The Next.js App Router does not use App.tsx as an application entry point.
 * Actual routing/layout is handled by src/app/layout.tsx and src/app/.../page.tsx.
 */
export default function App() {
  return <HomePage />;
}
