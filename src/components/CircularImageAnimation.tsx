"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import vortexImages from "@/lib/vortesImages";
import AnimatedImage, { ImageState } from "./AnimatedImage";

interface StackPosition {
  x: number;
  y: number;
  rotation: number;
  curveStrength?: number;
  curveOffsetAngle?: number;
}

type Phase = "idle" | "collapsing" | "collapsed" | "expanding";

// ⏱️ Vortex süresi (DOWN & UP)
const VORTEX_MS = 700;

export default function CircularImageAnimation({
  initialPhase = "idle",
}: {
  initialPhase?: Phase;
}) {
  const [stacks, setStacks] = useState<ImageState[][]>([]);
  const [stackPositions, setStackPositions] = useState<StackPosition[]>([]);
  const [animatedImages, setAnimatedImages] = useState<any[]>([]);
  const [ready, setReady] = useState(false);

  // 🌪 container vortex state
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [spinDeg, setSpinDeg] = useState(
    initialPhase === "collapsed" ? 720 : 0
  );
  const [scale, setScale] = useState(initialPhase === "collapsed" ? 0.06 : 1);
  const [opacity, setOpacity] = useState(initialPhase === "collapsed" ? 0 : 1);

  // 🔕 loop'u geçici durdurmak için
  const [suppressLoop, setSuppressLoop] = useState(
    initialPhase === "collapsed"
  );

  // normal loop timer’ları
  const animationTimeouts = useRef<NodeJS.Timeout[][]>([]);
  // 🌊 burst (sel) için timer havuzu
  const burstTimers = useRef<NodeJS.Timeout[]>([]);

  const STACKS_COUNT = 6;
  const IMAGES_PER_STACK = 10;
  const TOTAL_IMAGES = vortexImages.length;
  const IMAGES_PER_STACK_TOTAL = Math.floor(TOTAL_IMAGES / STACKS_COUNT);
  const localImageIndexes = useRef<number[]>(Array(STACKS_COUNT).fill(0));

  const CIRCLE_RADIUS_X =
    typeof window !== "undefined" ? window.innerWidth * 0.45 : 500;
  const CIRCLE_RADIUS_Y =
    typeof window !== "undefined" ? window.innerHeight * 0.55 : 700;

  // ⏱️ dinamik hız (loop için)
  const BASE_ANIMATION_DURATION = 1500;
  const BASE_FOLLOW_DELAY = 10;
  const durationRef = useRef(BASE_ANIMATION_DURATION);
  const delayRef = useRef(BASE_FOLLOW_DELAY);

  const FAN_SPREAD = 20;
  const FAN_ROTATION = 3;

  // --- robust unique id (Date.now çakışmalarını önler)
  const uidRef = useRef(0);
  const makeId = (si: number) => `img-${si}-${(++uidRef.current).toString(36)}`;

  // ----------------- helpers -----------------
  const clearAnimationLoopTimers = () => {
    animationTimeouts.current.forEach((g) => g.forEach(clearTimeout));
    animationTimeouts.current = [];
  };
  const clearBurstTimers = () => {
    burstTimers.current.forEach(clearTimeout);
    burstTimers.current = [];
  };

  function getVisualPropsForStackSlot(
    stackIndex: number,
    slotIndex: number
  ): { x: number; y: number; rotation: number; scale: number } {
    const pos = stackPositions[stackIndex];
    if (!pos) return { x: 0, y: 0, rotation: 0, scale: 1 };

    const baseAngle = ((stackIndex * 360) / STACKS_COUNT) * (Math.PI / 180);
    const tangentAngle = baseAngle + Math.PI / 2;
    const fanX = Math.cos(tangentAngle);
    const fanY = Math.sin(tangentAngle);

    const offsetX = slotIndex * FAN_SPREAD * fanX;
    const offsetY = slotIndex * FAN_SPREAD * fanY;

    const x = pos.x + offsetX;
    const y = pos.y + offsetY;

    const angleToCenter = (Math.atan2(-pos.y, -pos.x) * 180) / Math.PI;
    const rotation = angleToCenter + slotIndex * FAN_ROTATION;
    const scale = 0.7 + (slotIndex / IMAGES_PER_STACK) * 0.7;

    return { x, y, rotation, scale };
  }

  function getNextImage(stackIndex: number): string {
    const baseIndex = stackIndex * IMAGES_PER_STACK_TOTAL;
    const localIndex = localImageIndexes.current[stackIndex];
    const actualIndex = (baseIndex + localIndex) % TOTAL_IMAGES;
    localImageIndexes.current[stackIndex] =
      (localIndex + 1) % IMAGES_PER_STACK_TOTAL;
    return vortexImages[actualIndex];
  }

  // --- TEK BİR ATIM: slot-0'ı merkeze uçur, yerine yenisini koy ---
  function advanceStackOnce(si: number, durationOverride?: number) {
    setStacks((prevStacks) => {
      const newStacks = [...prevStacks];
      const stack = [...newStacks[si]];
      const leave = stack[0];
      if (!leave) return prevStacks;

      const { x, y, rotation, scale } = getVisualPropsForStackSlot(si, 0);
      const pos = stackPositions[si];

      // slot-0: orijinali gizle, portal kopyasını gönder
      stack[0] = { ...leave, isLeaving: true, isAnimating: true };
      newStacks[si] = stack;

      const D = durationOverride ?? durationRef.current;

      setAnimatedImages((prev) => [
        ...prev,
        {
          image: { ...leave, animationPhase: "moving-to-center" },
          initialX: x,
          initialY: y,
          duration: D,
          curveStrength: pos?.curveStrength,
          curveOffsetAngle: pos?.curveOffsetAngle,
          initialScale: scale,
          initialRotation: rotation,
          initialZIndex: 120,
          startOpacity: 0.9,
          boxShadow: `
            0px -8px 16px rgba(0,0,0,.35),
            10px 0px 18px rgba(0,0,0,.25),
            -10px 0px 18px rgba(0,0,0,.25),
            0px 14px 30px rgba(0,0,0,.10)
          `,
          borderRadius: "12px",
          mixBlendMode: "overlay",
        },
      ]);

      // süre bitince stack'i bir kaydır ve yeni görsel ekle
      setTimeout(() => {
        setStacks((curr) => {
          const c = [...curr];
          const s = [...c[si]].slice(1);
          const nextImage: ImageState = {
            id: makeId(si),
            src: getNextImage(si),
            isAnimating: false,
            animationPhase: "idle",
            justAdded: true,
            isLeaving: false,
            justPromoted: false,
          };
          c[si] = [...s, nextImage];
          return c;
        });
      }, D);

      return newStacks;
    });
  }

  // 🔁 tüm stack’leri bayraklardan arındır + uzunluğu sabitle
  const normalizeStacksHard = () => {
    setAnimatedImages([]); // ekranda kalan portal kopyaları temizle
    setStacks(
      (curr) =>
        curr.map((stack, si) => {
          // fazla elemanı kes + bayrak sıfırla
          let s: ImageState[] = stack.slice(0, IMAGES_PER_STACK).map((img) => ({
            ...img,
            isLeaving: false,
            isAnimating: false,
            animationPhase: "idle" as const,
            justAdded: false,
            justPromoted: false,
          })) as ImageState[];

          // eksikse doldur
          while (s.length < IMAGES_PER_STACK) {
            s.push({
              id: makeId(si),
              src: getNextImage(si),
              isAnimating: false,
              animationPhase: "idle",
              isLeaving: false,
              justAdded: false,
              justPromoted: false,
            });
          }
          return s;
        }) as ImageState[][]
    );
  };

  // 🧱 ilklendirme: stacks + pozisyonlar
  useEffect(() => {
    const initialStacks: ImageState[][] = [];
    for (let i = 0; i < STACKS_COUNT; i++) {
      const stack: ImageState[] = [];
      for (let j = 0; j < IMAGES_PER_STACK; j++) {
        const baseIndex = i * IMAGES_PER_STACK_TOTAL;
        const actualIndex = baseIndex + j;
        stack.push({
          id: makeId(i),
          src: vortexImages[actualIndex % TOTAL_IMAGES],
          isAnimating: false,
          animationPhase: "idle",
          isLeaving: false,
          justAdded: false,
          justPromoted: false,
        });
      }
      initialStacks.push(stack);
    }
    setStacks(initialStacks);

    const positions: StackPosition[] = [];
    const curveConfigs = [
      { curveStrength: 200, curveOffsetAngle: -70 },
      { curveStrength: 300, curveOffsetAngle: 0 },
      { curveStrength: 200, curveOffsetAngle: 0 },
      { curveStrength: 200, curveOffsetAngle: 75 },
      { curveStrength: 300, curveOffsetAngle: 150 },
      { curveStrength: 200, curveOffsetAngle: -70 },
    ];

    for (let i = 0; i < STACKS_COUNT; i++) {
      const angle = (i * 60 * Math.PI) / 180;
      const x = Math.cos(angle) * CIRCLE_RADIUS_X;
      const y = Math.sin(angle) * CIRCLE_RADIUS_Y;
      const cfg = curveConfigs[i];
      positions.push({ x, y, rotation: i * 60, ...cfg });
    }

    setStackPositions(positions);
  }, []);

  // Overlay READY — page.tsx bu olayı bekleyip expand tetikleyecek
  useEffect(() => {
    if (!ready && stacks.length && stackPositions.length) {
      setReady(true);
      requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent("vortex:ready"));
      });
    }
  }, [ready, stacks.length, stackPositions.length]);

  // 🔁 sürekli loop — suppressLoop TRUE iken hiç çalışmaz
  useEffect(() => {
    clearAnimationLoopTimers();

    if (!stacks.length || !stackPositions.length || suppressLoop) return;

    const timeouts: NodeJS.Timeout[][] = Array.from(
      { length: STACKS_COUNT },
      () => []
    );

    const loop = (si: number) => {
      const anim = () => {
        if (suppressLoop) return;

        setStacks((prevStacks) => {
          const newStacks = [...prevStacks];
          const stack = [...newStacks[si]];
          const leave = stack[0];
          if (!leave) return prevStacks;

          const startOpacity = 0.9;

          const baseStrength = 0.35;
          const boxShadow = `
            0px -8px 16px rgba(0,0,0,${baseStrength}),
            10px 0px 18px rgba(0,0,0,${baseStrength * 0.7}),
            -10px 0px 18px rgba(0,0,0,${baseStrength * 0.7}),
            0px 14px 30px rgba(0,0,0,${baseStrength * 0.25})
          `;
          const borderRadius = "12px";
          const mixBlendMode: React.CSSProperties["mixBlendMode"] = "overlay";

          // slot0'ı bırak
          stack[0] = { ...leave, isLeaving: true, isAnimating: true };

          // portalını başlat
          const { x, y, rotation, scale } = getVisualPropsForStackSlot(si, 0);
          const pos = stackPositions[si];

          setAnimatedImages((prev) => [
            ...prev,
            {
              image: { ...leave, animationPhase: "moving-to-center" },
              initialX: x,
              initialY: y,
              duration: durationRef.current,
              curveStrength: pos?.curveStrength,
              curveOffsetAngle: pos?.curveOffsetAngle,
              initialScale: scale,
              initialRotation: rotation,
              initialZIndex: 100,
              startOpacity,
              boxShadow,
              borderRadius,
              mixBlendMode,
            },
          ]);

          if (stack[1]) stack[1] = { ...stack[1], justPromoted: true };

          newStacks[si] = stack;
          return newStacks;
        });

        const to = setTimeout(() => {
          if (suppressLoop) return;
          setStacks((prevStacks) => {
            const newStacks = [...prevStacks];
            const stack = [...newStacks[si]].slice(1);

            const nextImage: ImageState = {
              id: makeId(si),
              src: getNextImage(si),
              isAnimating: false,
              animationPhase: "idle",
              justAdded: true,
              isLeaving: false,
              justPromoted: false,
            };
            newStacks[si] = [...stack, nextImage];
            return newStacks;
          });

          if (!suppressLoop) {
            timeouts[si].push(setTimeout(anim, delayRef.current));
          }
        }, durationRef.current);

        timeouts[si].push(to);
      };

      anim();
    };

    for (let i = 0; i < STACKS_COUNT; i++) {
      const t = setTimeout(() => loop(i), i * 200);
      timeouts[i].push(t);
    }

    animationTimeouts.current = timeouts;

    return () => {
      timeouts.forEach((g) => g.forEach(clearTimeout));
    };
  }, [stacks.length, stackPositions.length, suppressLoop]);

  // 📣 collapse / expand olayları → container spin/scale/opacity + hız ayarı
  useEffect(() => {
    const speedUp = (boost = 10) => {
      durationRef.current = Math.max(
        180,
        Math.floor(BASE_ANIMATION_DURATION / boost)
      );
      delayRef.current = Math.max(
        2,
        Math.floor(BASE_FOLLOW_DELAY / Math.max(1, Math.log2(boost) + 0.5))
      );
    };
    const resetSpeed = () => {
      durationRef.current = BASE_ANIMATION_DURATION;
      delayRef.current = BASE_FOLLOW_DELAY;
    };

    const onCollapse = (ev: Event) => {
      const boost = (ev as CustomEvent).detail?.boost ?? 10;
      if (phase === "collapsing" || phase === "collapsed") return;

      setPhase("collapsing");
      speedUp(boost);
      setSpinDeg((d) => d + 720);
      setScale(0.06);
      setOpacity(0);

      const t = setTimeout(() => {
        setPhase("collapsed");
        window.dispatchEvent(new CustomEvent("vortex:doneCollapse"));
      }, VORTEX_MS);
      return () => clearTimeout(t);
    };

    const onExpand = (ev: Event) => {
      const boost = (ev as CustomEvent).detail?.boost ?? 10;
      if (phase === "expanding" || phase === "idle") return;

      // ⛔ expand başlamadan HER ŞEYİ TEMİZLE
      setSuppressLoop(true);
      clearAnimationLoopTimers();
      clearBurstTimers();
      normalizeStacksHard(); // uzunluk & bayrak reset
      setAnimatedImages([]);

      setPhase("expanding");
      speedUp(boost);
      setSpinDeg((d) => d - 720);
      setScale(1);
      setOpacity(1);

      const t = setTimeout(() => {
        // expand bitti → hızları sıfırla, loop'u tekrar AÇ
        resetSpeed();
        setPhase("idle");
        setSuppressLoop(false);
        window.dispatchEvent(new CustomEvent("vortex:doneExpand"));
      }, VORTEX_MS);
      return () => clearTimeout(t);
    };

    window.addEventListener("vortex:collapse", onCollapse as any);
    window.addEventListener("vortex:expand", onExpand as any);
    return () => {
      window.removeEventListener("vortex:collapse", onCollapse as any);
      window.removeEventListener("vortex:expand", onExpand as any);
    };
  }, [phase]);

  // 🌊 BURST MODU: collapse'ta sel gibi merkeze akış
  useEffect(() => {
    const onBurstCollapse = () => {
      if (!stacks.length || !stackPositions.length) return;

      clearBurstTimers();

      // 🔧 yoğunluk ayarları
      const PER_STACK = 14; // her stack'ten kaç görsel aksın?
      const STEP_MS = 45; // aynı stack içindeki atış aralığı
      const STAGGER = 35; // stack'ler arası gecikme
      const DURATION = 240; // tek görselin merkeze uçuş süresi (ms)

      for (let k = 0; k < PER_STACK; k++) {
        for (let si = 0; si < STACKS_COUNT; si++) {
          const delay = si * STAGGER + k * STEP_MS;
          const t = setTimeout(() => advanceStackOnce(si, DURATION), delay);
          burstTimers.current.push(t);
        }
      }
    };

    window.addEventListener(
      "vortex:collapse",
      onBurstCollapse as EventListener
    );
    return () => {
      window.removeEventListener(
        "vortex:collapse",
        onBurstCollapse as EventListener
      );
      clearBurstTimers();
    };
  }, [stacks.length, stackPositions.length]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.08)",
        perspective: "1200px",
        overflow: "hidden",
        transform: `translateZ(0) rotate(${spinDeg}deg) scale(${scale})`,
        opacity,
        transition:
          `transform ${VORTEX_MS}ms cubic-bezier(.2,.8,.2,1), ` +
          `opacity ${VORTEX_MS}ms cubic-bezier(.2,.8,.2,1)`,
        pointerEvents: phase === "collapsed" ? "none" : "auto",
        zIndex: 1,
      }}
    >
      {stacks.map((stack, stackIndex) =>
        stack.map((image, slotIndex) => {
          const { x, y, rotation, scale } = getVisualPropsForStackSlot(
            stackIndex,
            slotIndex
          );

          const opacityFactor =
            0.9 - (slotIndex / Math.max(1, IMAGES_PER_STACK - 1)) * 0.9;

          const zIdx = 100 - slotIndex;
          const isMoving =
            slotIndex === 0 && image.animationPhase === "moving-to-center";

          const baseStrength =
            0.35 * (1 - slotIndex / Math.max(1, IMAGES_PER_STACK - 1));
          const boxShadow = `
            0px -8px 16px rgba(0,0,0,${baseStrength}),
            10px 0px 18px rgba(0,0,0,${baseStrength * 0.7}),
            -10px 0px 18px rgba(0,0,0,${baseStrength * 0.7}),
            0px 14px 30px rgba(0,0,0,${baseStrength * 0.25})
          `;

          const style: React.CSSProperties = {
            position: "absolute",
            left: "50%",
            top: "50%",
            width: "160px",
            height: `${120 * 1.3}px`,
            transform: `translate(-50%,-50%) translate3d(${x}px,${y}px,${
              -slotIndex * 10
            }px) rotate(${rotation}deg) scale(${scale})`,
            transformOrigin: "center center",
            transition: isMoving
              ? "opacity 0.18s ease"
              : "transform 0.5s ease, opacity 0.5s ease",
            zIndex: zIdx,
            opacity: isMoving ? 0 : image.isLeaving ? 0 : opacityFactor,
            pointerEvents: "none",
            boxShadow,
            borderRadius: "12px",
          };

          return (
            <div id={`stack-${image.id}`} key={image.id} style={style}>
              <Image
                src={image.src}
                alt=""
                width={80}
                height={104}
                style={{
                  width: "auto",
                  height: "auto",
                  mixBlendMode: "overlay",
                  borderRadius: "12px",
                }}
                className={`object-cover ${
                  image.justAdded ? "image-fade-in" : ""
                } ${image.justPromoted ? "image-rise" : ""}`}
                priority={image.isAnimating}
              />
            </div>
          );
        })
      )}

      {animatedImages.map((img, index) => (
        <AnimatedImage key={`anim-${img.image.id}-${index}`} {...img} />
      ))}
    </div>
  );
}
