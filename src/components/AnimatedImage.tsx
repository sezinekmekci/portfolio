"use client";

import React, { useLayoutEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import Image from "next/image";

export interface ImageState {
  id: string;
  src: string;
  isAnimating: boolean;
  animationPhase: "idle" | "moving-to-center";
  justAdded?: boolean;
  justPromoted?: boolean;
  isLeaving?: boolean;
}

interface AnimatedImageProps {
  image: ImageState;
  initialX: number;
  initialY: number;
  duration: number;
  curveStrength?: number;
  curveOffsetAngle?: number;
  initialScale: number;
  initialRotation: number;
  initialZIndex: number;
  onAnimationStart?: () => void;
  onPortalReady?: () => void;
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function bezierToCenterPath(
  t: number,
  startX: number,
  startY: number,
  curveStrength: number = 100,
  curveOffsetAngle: number = 0
) {
  const cx =
    startX / 2 + curveStrength * Math.cos((curveOffsetAngle * Math.PI) / 180);
  const cy =
    startY / 2 + curveStrength * Math.sin((curveOffsetAngle * Math.PI) / 180);

  const x = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * cx;
  const y = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * cy;

  return { x, y };
}

const AnimatedImage: React.FC<AnimatedImageProps> = ({
  image,
  initialX,
  initialY,
  duration,
  curveStrength = 100,
  curveOffsetAngle = 0,
  initialScale,
  initialRotation,
  initialZIndex,
  onAnimationStart,
  onPortalReady,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [finished, setFinished] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    // İlk anda pozisyonla yerleş
    el.style.transform = `translate(-50%,-50%) translate3d(${initialX}px,${initialY}px,0px) rotate(${initialRotation}deg) scale(${initialScale})`;

    el.style.opacity = "0.5"; // 🔴 başlangıç %90
    el.style.visibility = "visible";

    requestAnimationFrame(() => {
      let startTime: number | null = null;

      const animate = (timestamp: number) => {
        if (!startTime) {
          startTime = timestamp;
          onAnimationStart?.();
        }

        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const t = easeInOut(progress);
        const { x, y } = bezierToCenterPath(
          t,
          initialX,
          initialY,
          curveStrength,
          curveOffsetAngle
        );
        const scale = initialScale + t * (0.3 - initialScale);
        const opacity = 0.5 * (1 - t); // 🔴 %90’dan sön

        el.style.transform = `translate(-50%,-50%) translate3d(${x}px,${y}px,0px) rotate(${initialRotation}deg) scale(${scale})`;
        el.style.opacity = `${opacity}`;
        el.style.zIndex = `${initialZIndex}`;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setFinished(true);
        }
      };

      requestAnimationFrame(animate);
    });

    onPortalReady?.();
  }, [
    initialX,
    initialY,
    duration,
    curveStrength,
    curveOffsetAngle,
    initialScale,
    initialRotation,
    initialZIndex,
  ]);

  if (typeof window === "undefined") return null;

  const portalRoot = document.getElementById("animation-root");
  if (!portalRoot || finished) return null;

  return ReactDOM.createPortal(
    <div
      ref={ref}
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: "160px",
        height: `${120 * 1.3}px`,
        zIndex: initialZIndex,
        pointerEvents: "none",
        visibility: "hidden",
        opacity: 0,
        transform: `translate(-50%,-50%) translate3d(${initialX}px,${initialY}px,0px) rotate(${initialRotation}deg) scale(${initialScale})`,
        willChange: "transform, opacity",
      }}
    >
      <img
        src={image.src}
        alt=""
        width={80}
        height={104}
        style={{ width: "auto", height: "auto" }}
        className="object-cover rounded-md"
      />
    </div>,
    portalRoot
  );
};

export default AnimatedImage;
