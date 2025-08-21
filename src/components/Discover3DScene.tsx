"use client";

import * as React from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { CameraControls, Stars, Text, Html } from "@react-three/drei";
import { useRouter } from "next/navigation";

/** ---------- Ayarlar ---------- */
const GALAXY_RADIUS = 9.5; // galaksinin yarıçapı
const DISK_THICKNESS = 1.6; // disk kalınlığı
const BULGE_RADIUS = 3.2; // merkezdeki şişkinlik
const PARTICLES_DISK = 9000; // disk parçacık sayısı
const PARTICLES_BULGE = 2500; // merkez parçacık sayısı
const ROTATION_SPEED = 0.02; // sahnenin yavaş dönüşü (radyan/sn)
const MARKER_RING_RADIUS = 0.35; // işaretçi halkası
const MARKER_TEXT_SIZE = 0.56; // 3B Text boyutu

/** ---------- Kategoriler + koordinatlar ---------- */
/** lat = enlem (-90..90), lon = boylam (0..360) */
const CATEGORIES = [
  { slug: "brand-identity", title: "Brand Identity", lat: -8, lon: 20 },
  { slug: "logo-design", title: "Logo Design", lat: 10, lon: 105 },
  { slug: "catalog-design", title: "Catalog Design", lat: 3, lon: 195 },
  { slug: "poster", title: "Poster", lat: -12, lon: 270 },
  { slug: "illustration", title: "Illustration", lat: 18, lon: 325 },
] as const;

/** Küresel koordinatı (lat/lon) → 3B nokta */
function sphericalToVec3(
  latDeg: number,
  lonDeg: number,
  r = GALAXY_RADIUS * 0.85
) {
  const lat = THREE.MathUtils.degToRad(90 - latDeg);
  const lon = THREE.MathUtils.degToRad(lonDeg);
  const x = r * Math.sin(lat) * Math.cos(lon);
  const y = r * Math.cos(lat);
  const z = r * Math.sin(lat) * Math.sin(lon);
  return new THREE.Vector3(x, y, z);
}

/** Disk parçacığı üret (ince ama biraz “spherical bulge” karışımı) */
function makeDiskPositions(count: number) {
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = THREE.MathUtils.mapLinear(
      Math.random(),
      0,
      1,
      BULGE_RADIUS * 0.8,
      GALAXY_RADIUS
    );
    const theta = Math.random() * Math.PI * 2;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    // disk kalınlığı + hafif küresel etki
    const y =
      (Math.random() - 0.5) * DISK_THICKNESS +
      (Math.random() - 0.5) * 0.15 * (1 - r / GALAXY_RADIUS);
    arr[i * 3 + 0] = x;
    arr[i * 3 + 1] = y;
    arr[i * 3 + 2] = z;
  }
  return arr;
}

/** Merkez şişkinlik (yaklaşık küresel dağılım) */
function makeBulgePositions(count: number) {
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const dir = new THREE.Vector3().randomDirection();
    const rad = Math.cbrt(Math.random()) * BULGE_RADIUS; // merkeze yoğun
    dir.multiplyScalar(rad);
    arr[i * 3 + 0] = dir.x;
    arr[i * 3 + 1] = dir.y;
    arr[i * 3 + 2] = dir.z;
  }
  return arr;
}

/** Parçacık sistemi */
function PointsCloud({
  positions,
  size = 0.035,
  opacity = 0.75,
}: {
  positions: Float32Array;
  size?: number;
  opacity?: number;
}) {
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={positions.length / 3}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        sizeAttenuation
        color="#e7e7e2"
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </points>
  );
}

/** Bir kategori işaretçisi (halkalı + label) */
function CategoryMarker({
  pos,
  title,
  onSelect,
}: {
  pos: THREE.Vector3;
  title: string;
  onSelect: () => void;
}) {
  const ringRef = React.useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ringRef.current) ringRef.current.rotation.z += delta * 0.6; // hafif spin
  });

  return (
    <group position={pos}>
      {/* halka */}
      <mesh
        ref={ringRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "default")}
      >
        <torusGeometry args={[MARKER_RING_RADIUS, 0.035, 12, 48]} />
        <meshStandardMaterial
          color="#f2f2ec"
          emissive="#90908b"
          emissiveIntensity={0.35}
        />
      </mesh>

      {/* 3B text (kameraya doğru billboard) */}
      <Text
        position={[0, 0.9, 0]}
        fontSize={MARKER_TEXT_SIZE}
        color="#e7e7e1"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.008}
        outlineColor="rgba(0,0,0,0.55)"
      >
        {title}
      </Text>

      {/* Küçük tıklanabilir HTML kart (isteğe bağlı) */}
      <Html position={[0, -0.8, 0]} center transform distanceFactor={10}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="rounded-full px-3 py-1 text-xs bg-white/10 hover:bg-white/20 border border-white/15 text-[#eae9e3]"
          style={{ backdropFilter: "blur(6px)" }}
        >
          Explore →
        </button>
      </Html>
    </group>
  );
}

/** Ana sahne */
export default function Discover3DScene() {
  const router = useRouter();
  const controlsRef = React.useRef<any>(null);
  const galaxyRef = React.useRef<THREE.Group>(null);

  const diskPositions = React.useMemo(
    () => makeDiskPositions(PARTICLES_DISK),
    []
  );
  const bulgePositions = React.useMemo(
    () => makeBulgePositions(PARTICLES_BULGE),
    []
  );

  // yavaş sahne dönüşü
  useFrame((_, delta) => {
    if (galaxyRef.current) {
      galaxyRef.current.rotation.y += ROTATION_SPEED * delta;
    }
  });

  // işaretçiye tıklanınca: kamerayı uçur, sonra sayfaya git
  const flyToAndOpen = React.useCallback(
    (target: THREE.Vector3, slug: string) => {
      if (!controlsRef.current) return;

      const dir = target.clone().normalize();
      const camPos = dir
        .clone()
        .multiplyScalar(GALAXY_RADIUS + 2.5)
        .add(new THREE.Vector3(0, 0.8, 0));

      controlsRef.current.setLookAt(
        camPos.x,
        camPos.y,
        camPos.z,
        target.x,
        target.y,
        target.z,
        true
      );

      // --- değişen kısım: expect-error yok, küçük bir cast ---
      const cc = controlsRef.current as any;

      const done = () => {
        router.push(`/work/${slug}`);
        cc?.removeEventListener?.("transitionend", done);
      };

      cc?.addEventListener?.("transitionend", done);
      // emniyet: 1.2s sonra yine git
      setTimeout(done, 1200);
    },
    [router]
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-[40]">
      <Canvas
        camera={{ position: [0, 0, GALAXY_RADIUS + 6], fov: 50 }}
        eventSource={document.getElementById("__next") as HTMLElement}
        className="pointer-events-auto"
      >
        {/* arka plan & fog */}
        <color attach="background" args={["#0b0b0b"]} />
        <fog attach="fog" args={["#0b0b0b", 10, 55]} />
        <ambientLight intensity={0.3} />
        <Stars
          radius={120}
          depth={80}
          count={12000}
          factor={3}
          saturation={0}
          fade
          speed={0.1}
        />

        <CameraControls ref={controlsRef} />

        {/* Galaksi + işaretçiler aynı grupta → birlikte döner */}
        <group ref={galaxyRef}>
          <PointsCloud positions={diskPositions} size={0.032} opacity={0.8} />
          <PointsCloud positions={bulgePositions} size={0.038} opacity={0.85} />

          {CATEGORIES.map((c) => {
            const pos = sphericalToVec3(c.lat, c.lon);
            return (
              <CategoryMarker
                key={c.slug}
                pos={pos}
                title={c.title}
                onSelect={() => flyToAndOpen(pos, c.slug)}
              />
            );
          })}
        </group>
      </Canvas>
    </div>
  );
}
