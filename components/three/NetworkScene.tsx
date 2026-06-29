'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Props {
  className?: string;
  /** 'dark' = particles visible on dark bg. 'light' = visible on white bg. */
  variant?: 'dark' | 'light';
}

export function NetworkScene({ className = '', variant = 'dark' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const container = containerRef.current;
    if (!container) return;

    const isMobile = window.innerWidth < 768;
    // Fewer nodes on mobile, even fewer for light variant (it's background-only)
    const COUNT = isMobile ? 50 : (variant === 'light' ? 90 : 140);
    const CONNECT_DIST = isMobile ? 4 : 5.5;

    // Colors
    const particleColor = variant === 'light'
      ? new THREE.Color('#6d28d9')   // dark violet — visible on white
      : new THREE.Color('#8b5cf6');  // medium violet — visible on dark
    const particleOpacity = variant === 'light' ? 0.18 : 0.55;
    const lineColor = variant === 'light'
      ? new THREE.Color('#7c3aed')
      : new THREE.Color('#7c3aed');
    const lineOpacity = variant === 'light' ? 0.07 : 0.12;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 18;

    const positions = new Float32Array(COUNT * 3);
    const speeds = new Float32Array(COUNT * 2);

    for (let i = 0; i < COUNT; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 32;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 22;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
      speeds[i * 2 + 0] = (Math.random() - 0.5) * 0.010;
      speeds[i * 2 + 1] = (Math.random() - 0.5) * 0.010;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3));

    const particleMat = new THREE.PointsMaterial({
      color: particleColor,
      size: variant === 'light' ? 0.18 : 0.14,
      transparent: true,
      opacity: particleOpacity,
      sizeAttenuation: true,
    });

    const particleMesh = new THREE.Points(particleGeo, particleMat);
    scene.add(particleMesh);

    const MAX_LINES = COUNT * COUNT;
    const linePositionsBuf = new Float32Array(MAX_LINES * 6);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositionsBuf, 3));

    const lineMat = new THREE.LineBasicMaterial({
      color: lineColor,
      transparent: true,
      opacity: lineOpacity,
    });

    const linesMesh = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(linesMesh);

    // Subtle glowing nodes (fewer, larger spheres)
    const nodeCount = isMobile ? 5 : (variant === 'light' ? 8 : 14);
    const glowMat = new THREE.MeshBasicMaterial({
      color: variant === 'light' ? new THREE.Color('#8b5cf6') : new THREE.Color('#a78bfa'),
      transparent: true,
      opacity: variant === 'light' ? 0.12 : 0.25,
    });

    for (let i = 0; i < nodeCount; i++) {
      const geo = new THREE.SphereGeometry(0.22 + Math.random() * 0.14, 8, 8);
      const mesh = new THREE.Mesh(geo, glowMat.clone());
      mesh.position.set(
        (Math.random() - 0.5) * 28,
        (Math.random() - 0.5) * 18,
        (Math.random() - 0.5) * 5,
      );
      scene.add(mesh);
    }

    let targetX = 0, targetY = 0;
    let camX = 0, camY = 0;

    const onMouseMove = (e: MouseEvent) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * (variant === 'light' ? 1.8 : 2.5);
      targetY = (e.clientY / window.innerHeight - 0.5) * (variant === 'light' ? -1.2 : -1.8);
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize, { passive: true });

    let raf: number;
    const workingPos = positions.slice();

    const animate = () => {
      raf = requestAnimationFrame(animate);

      for (let i = 0; i < COUNT; i++) {
        workingPos[i * 3 + 0] += speeds[i * 2 + 0];
        workingPos[i * 3 + 1] += speeds[i * 2 + 1];
        if (Math.abs(workingPos[i * 3 + 0]) > 16) speeds[i * 2 + 0] *= -1;
        if (Math.abs(workingPos[i * 3 + 1]) > 11) speeds[i * 2 + 1] *= -1;
      }

      const posAttr = particleGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < COUNT * 3; i++) {
        (posAttr.array as Float32Array)[i] = workingPos[i];
      }
      posAttr.needsUpdate = true;

      let lineIdx = 0;
      const lArr = lineGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < COUNT; i++) {
        for (let j = i + 1; j < COUNT; j++) {
          const dx = workingPos[i * 3] - workingPos[j * 3];
          const dy = workingPos[i * 3 + 1] - workingPos[j * 3 + 1];
          const dz = workingPos[i * 3 + 2] - workingPos[j * 3 + 2];
          if (dx * dx + dy * dy + dz * dz < CONNECT_DIST * CONNECT_DIST) {
            if (lineIdx + 6 <= MAX_LINES * 6) {
              lArr[lineIdx++] = workingPos[i * 3];
              lArr[lineIdx++] = workingPos[i * 3 + 1];
              lArr[lineIdx++] = workingPos[i * 3 + 2];
              lArr[lineIdx++] = workingPos[j * 3];
              lArr[lineIdx++] = workingPos[j * 3 + 1];
              lArr[lineIdx++] = workingPos[j * 3 + 2];
            }
          }
        }
      }
      lineGeo.attributes.position.needsUpdate = true;
      lineGeo.setDrawRange(0, lineIdx / 3);

      camX += (targetX - camX) * 0.04;
      camY += (targetY - camY) * 0.04;
      camera.position.x = camX;
      camera.position.y = camY;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      particleGeo.dispose();
      lineGeo.dispose();
      particleMat.dispose();
      lineMat.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [variant]);

  return <div ref={containerRef} className={`absolute inset-0 w-full h-full ${className}`} />;
}
