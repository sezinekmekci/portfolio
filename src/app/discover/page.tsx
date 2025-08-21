// src/app/discover/page.tsx
import DiscoverSceneClient from "./DiscoverSceneClient";

export default function DiscoverPage() {
  return (
    <main className="min-h-screen relative bg-[#0d0d0d] text-[#dededa] overflow-hidden">
      {/* 3D arka plan (tamamen client tarafında yüklenecek) */}
      <DiscoverSceneClient />

      {/* İçerik (3D’nin üstünde) */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-8 pointer-events-none">
        {/* ...kategori grid’in burada... */}
      </div>
    </main>
  );
}
