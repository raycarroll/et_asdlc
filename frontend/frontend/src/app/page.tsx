// Root page - redirected via next.config.ts
// Force dynamic to prevent static generation
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Home() {
  return null;
}
