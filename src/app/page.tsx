"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import CircularImageAnimation from "@/components/CircularImageAnimation";
import ScrollVortex from "@/components/ScrollVortex";
import VideoBackground from "@/components/VideoBackground";

export default function Home() {
  const router = useRouter();

  // 1) intent -> collapse köprüsü (ScrollVortex eskiyse intent atıyor olabilir)
  useEffect(() => {
    const bridge = () =>
      window.dispatchEvent(
        new CustomEvent("vortex:collapse", { detail: { boost: 10 } })
      );
    window.addEventListener("vortex:intentCollapse", bridge);
    return () => window.removeEventListener("vortex:intentCollapse", bridge);
  }, []);

  // 2) collapse bittiğinde /work'a geç
  useEffect(() => {
    const onDone = () => router.push("/work");
    window.addEventListener("vortex:doneCollapse", onDone);
    return () => window.removeEventListener("vortex:doneCollapse", onDone);
  }, [router]);

  return (
    <div className="dark min-h-screen bg-[#0d0d0d] text-[#dededa] relative overflow-x-hidden">
      <ScrollVortex scene={"intro"} />

      <VideoBackground />
      <div className="vignette-focus" />

      <CircularImageAnimation initialPhase="idle" />

      <section className="relative z-10 section-padding h-screen flex flex-col justify-center items-center text-center">
        <h1 className="hero-title hero-outline mb-5">SEZIN EKMEKCI</h1>

        <div className="hero-sub hero-animate text-2xl md:text-3xl lg:text-4xl">
          Welcome to my portfolio
        </div>

        <a
          href="/work"
          onClick={(e) => {
            e.preventDefault();
            // doğrudan collapse yayınla (köprüye gerek kalmadan)
            window.dispatchEvent(
              new CustomEvent("vortex:collapse", { detail: { boost: 10 } })
            );
          }}
          className="hero-animate scroll-hint mt-6 flex flex-col items-center gap-2 text-lg md:text-xl transition-colors"
          aria-label="Scroll to explore"
        >
          <span>Scroll to explore</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5 opacity-70"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              d="M6 9l6 6 6-6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      </section>
    </div>
  );
}
