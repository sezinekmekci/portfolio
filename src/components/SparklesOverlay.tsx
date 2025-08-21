"use client";

import React from "react";

/**
 * Kartların üstünde (z=2), metinlerin altında (z-10) duran ince parıltı videosu.
 * /public/videos/sparkles.mp4 dosyasını kullanır.
 */
export default function SparklesOverlay() {
  return (
    <video
      className="sparkles-overlay"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden
    >
      <source src="/videos/sparkles.mp4" type="video/mp4" />
    </video>
  );
}
