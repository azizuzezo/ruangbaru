"use client";

import { Float, OrbitControls, Text } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import { skills } from "@/lib/content/profile";
import { categoryColor } from "@/components/skills/category-colors";

function fibonacciSphere(count: number, radius: number) {
  const points: [number, number, number][] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;
    points.push([Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius]);
  }
  return points;
}

function SkillNode({
  position,
  label,
  color,
}: {
  position: [number, number, number];
  label: string;
  color: string;
}) {
  return (
    <Float speed={1.4} rotationIntensity={0.3} floatIntensity={1.1}>
      <group position={position}>
        <mesh>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
        <Text
          position={[0, 0.24, 0]}
          fontSize={0.16}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.008}
          outlineColor="#05060a"
        >
          {label}
        </Text>
      </group>
    </Float>
  );
}

function GalaxyGroup() {
  const positions = useMemo(() => fibonacciSphere(skills.length, 2.6), []);

  return (
    <group>
      {skills.map((skill, i) => (
        <SkillNode
          key={skill.name}
          position={positions[i]}
          label={skill.name}
          color={categoryColor[skill.category]}
        />
      ))}
    </group>
  );
}

export default function SkillsGalaxyScene() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 6.2], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={1.2} />
      <GalaxyGroup />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={1.1}
      />
    </Canvas>
  );
}
