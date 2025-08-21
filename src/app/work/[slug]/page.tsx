// src/app/work/[slug]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";

const CATEGORIES = [
  { slug: "brand-identity", title: "Brand Identity" },
  { slug: "logo-design", title: "Logo Design" },
  { slug: "catalog-design", title: "Catalog Design" },
  { slug: "poster", title: "Poster" },
  { slug: "illustration", title: "Illustration" },
];

export const dynamicParams = false;
export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export default function WorkCategoryPage({
  params,
}: {
  params: { slug: string };
}) {
  const cat = CATEGORIES.find((c) => c.slug === params.slug);
  if (!cat) return notFound();

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-[#dededa] flex items-center justify-center p-8">
      <div className="max-w-3xl text-center">
        <h1 className="text-4xl md:text-6xl font-light mb-4">{cat.title}</h1>
        <p className="text-[#9aa09a] mb-10">
          Placeholder page for <b>{cat.title}</b>. Your projects will appear
          here.
        </p>
        <Link
          href="/discover"
          className="inline-flex items-center px-4 py-2 rounded-full border border-[#2a2826] bg-white/5 text-[#e2e1db] hover:bg-white/10 transition-colors"
        >
          ← Back to Discover
        </Link>
      </div>
    </main>
  );
}
