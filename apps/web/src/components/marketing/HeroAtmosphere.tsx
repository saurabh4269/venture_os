"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type { Mesh } from "three";

function SoftMesh() {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.x = clock.getElapsedTime() * 0.08;
    ref.current.rotation.y = clock.getElapsedTime() * 0.12;
  });
  return (
    <mesh ref={ref} scale={1.8}>
      <icosahedronGeometry args={[1, 2]} />
      <meshStandardMaterial color="#059669" wireframe opacity={0.12} transparent />
    </mesh>
  );
}

export function HeroAtmosphere() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setEnabled(!reduced);
  }, []);
  if (!enabled) return null;
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 opacity-40" aria-hidden>
      <Canvas camera={{ position: [0, 0, 4], fov: 50 }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.6} />
        <SoftMesh />
      </Canvas>
    </div>
  );
}
