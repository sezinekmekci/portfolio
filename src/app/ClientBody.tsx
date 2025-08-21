"use client";

import React from "react";

export default function ClientBody({
  children,
}: {
  children: React.ReactNode;
}) {
  // Eğer ileride sadece "/" sayfasında bir şey eklemek istersen
  // const pathname = usePathname();
  // const isHome = pathname === "/";
  return <>{children}</>;
}
