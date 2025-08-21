"use client";

import dynamic from "next/dynamic";

// 3D sahneyi yalnızca client'ta yükle
const Discover3DScene = dynamic(() => import("@/components/Discover3DScene"), {
  ssr: false,
  loading: () => null,
});

export default function DiscoverSceneClient() {
  return <Discover3DScene />;
}
