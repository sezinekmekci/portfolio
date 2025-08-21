"use client";

import { useEffect, useRef } from "react";

type Scene = "intro" | "discover";

export default function ScrollVortex({ scene }: { scene: Scene }) {
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    const intentCollapse = () =>
      window.dispatchEvent(new CustomEvent("vortex:intentCollapse"));
    const intentExpand = () =>
      window.dispatchEvent(new CustomEvent("vortex:intentExpand"));

    const onWheel = (e: WheelEvent) => {
      // INTRO sahnesinde aşağı kaydırmayı kilitle ve collapse niyetini gönder
      if (scene === "intro" && e.deltaY > 0) {
        e.preventDefault();
        intentCollapse();
        return;
      }
      // DISCOVER sahnesinde yukarı kaydırmayı kilitle ve expand niyetini gönder
      if (scene === "discover" && e.deltaY < 0) {
        e.preventDefault();
        intentExpand();
        return;
      }
    };

    // Mobile swipe
    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (touchStartY.current == null) return;
      const dy = e.touches[0].clientY - touchStartY.current;
      if (scene === "intro" && dy < -20) {
        e.preventDefault();
        intentCollapse();
      } else if (scene === "discover" && dy > 20) {
        e.preventDefault();
        intentExpand();
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      window.removeEventListener("wheel", onWheel as any);
      window.removeEventListener("touchstart", onTouchStart as any);
      window.removeEventListener("touchmove", onTouchMove as any);
    };
  }, [scene]);

  return null;
}
