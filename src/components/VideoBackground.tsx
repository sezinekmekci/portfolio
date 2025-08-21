"use client";

export default function VideoBackground() {
  return (
    <>
      <video
        className="video-bg"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/videos/hero-poster.jpg" // opsiyonel; yoksa bu satırı silebilirsin
      >
        <source src="/videos/hero.mp4" type="video/mp4" />
      </video>

      {/* Açık tonları hafifçe beyaza çeken overlay */}
      <div className="video-bg-whiten" aria-hidden />

      {/* Genel karartma: karmaşayı azaltır */}
      <div className="video-bg-dim" aria-hidden />
    </>
  );
}
