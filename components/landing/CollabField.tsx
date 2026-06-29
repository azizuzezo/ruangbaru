'use client';

import { useEffect, useRef } from 'react';

/**
 * Subtle Three.js "collaboration field" — a slow-drifting cloud of nodes
 * connected by faint lines, with light mouse-reactive parallax. Designed to
 * sit *behind* hero content as ambient depth, never to dominate.
 *
 * Performance & accessibility guards:
 *  - three is imported dynamically so it stays out of the initial bundle.
 *  - Respects prefers-reduced-motion (renders nothing).
 *  - DPR capped at 2; animation paused when tab hidden or canvas off-screen.
 *  - Cleans up renderer / geometries / RAF on unmount.
 */
export function CollabField({ className }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    // Dynamic import keeps three out of the critical path.
    import('three').then((THREE) => {
      if (disposed || !mount) return;

      const BLUE = new THREE.Color('#106CD8');
      const TEAL = new THREE.Color('#10B29F');
      const YELLOW = new THREE.Color('#FDB31A');

      const width = mount.clientWidth;
      const height = mount.clientHeight;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
      camera.position.z = 14;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      renderer.setClearColor(0x000000, 0);
      mount.appendChild(renderer.domElement);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';

      // ── Nodes ───────────────────────────────────────────────
      const COUNT = 46;
      const positions = new Float32Array(COUNT * 3);
      const colors = new Float32Array(COUNT * 3);
      const velocities: number[] = [];
      const palette = [BLUE, BLUE, BLUE, TEAL, TEAL, YELLOW];

      for (let i = 0; i < COUNT; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 26;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 16;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
        const c = palette[i % palette.length];
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
        velocities.push(
          (Math.random() - 0.5) * 0.006,
          (Math.random() - 0.5) * 0.006,
          (Math.random() - 0.5) * 0.004,
        );
      }

      const pointsGeo = new THREE.BufferGeometry();
      pointsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      pointsGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const pointsMat = new THREE.PointsMaterial({
        size: 0.42,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: true,
      });
      const points = new THREE.Points(pointsGeo, pointsMat);
      scene.add(points);

      // ── Connecting lines (rebuilt each frame for nearby nodes) ─
      const lineGeo = new THREE.BufferGeometry();
      const linePositions = new Float32Array(COUNT * COUNT * 3);
      lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
      const lineMat = new THREE.LineBasicMaterial({
        color: new THREE.Color('#106CD8'),
        transparent: true,
        opacity: 0.12,
      });
      const lines = new THREE.LineSegments(lineGeo, lineMat);
      scene.add(lines);

      // ── Mouse parallax ──────────────────────────────────────
      const mouse = { x: 0, y: 0 };
      const target = { x: 0, y: 0 };
      const onMouse = (e: MouseEvent) => {
        target.x = (e.clientX / window.innerWidth - 0.5) * 2;
        target.y = (e.clientY / window.innerHeight - 0.5) * 2;
      };
      window.addEventListener('mousemove', onMouse, { passive: true });

      // ── Visibility / viewport gating ────────────────────────
      let visible = true;
      let inView = true;
      const onVisibility = () => { visible = !document.hidden; };
      document.addEventListener('visibilitychange', onVisibility);
      const io = new IntersectionObserver(
        ([entry]) => { inView = entry.isIntersecting; },
        { threshold: 0 },
      );
      io.observe(mount);

      // ── Resize ──────────────────────────────────────────────
      const onResize = () => {
        const w = mount.clientWidth;
        const h = mount.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener('resize', onResize);

      // ── Loop ────────────────────────────────────────────────
      const CONNECT_DIST = 5.2;
      let raf = 0;
      const tick = () => {
        raf = requestAnimationFrame(tick);
        if (!visible || !inView) return;

        const pos = pointsGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < COUNT; i++) {
          for (let a = 0; a < 3; a++) {
            const idx = i * 3 + a;
            pos[idx] += velocities[idx];
            const bound = a === 0 ? 13 : a === 1 ? 8 : 5;
            if (pos[idx] > bound || pos[idx] < -bound) velocities[idx] *= -1;
          }
        }
        pointsGeo.attributes.position.needsUpdate = true;

        // Rebuild nearby connections.
        let ptr = 0;
        for (let i = 0; i < COUNT; i++) {
          for (let j = i + 1; j < COUNT; j++) {
            const dx = pos[i * 3] - pos[j * 3];
            const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
            const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
            if (dx * dx + dy * dy + dz * dz < CONNECT_DIST * CONNECT_DIST) {
              linePositions[ptr++] = pos[i * 3];
              linePositions[ptr++] = pos[i * 3 + 1];
              linePositions[ptr++] = pos[i * 3 + 2];
              linePositions[ptr++] = pos[j * 3];
              linePositions[ptr++] = pos[j * 3 + 1];
              linePositions[ptr++] = pos[j * 3 + 2];
            }
          }
        }
        lineGeo.setDrawRange(0, ptr / 3);
        lineGeo.attributes.position.needsUpdate = true;

        mouse.x += (target.x - mouse.x) * 0.04;
        mouse.y += (target.y - mouse.y) * 0.04;
        scene.rotation.y = mouse.x * 0.18;
        scene.rotation.x = mouse.y * 0.12;

        renderer.render(scene, camera);
      };
      tick();

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('mousemove', onMouse);
        window.removeEventListener('resize', onResize);
        document.removeEventListener('visibilitychange', onVisibility);
        io.disconnect();
        pointsGeo.dispose();
        pointsMat.dispose();
        lineGeo.dispose();
        lineMat.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === mount) {
          mount.removeChild(renderer.domElement);
        }
      };
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return <div ref={mountRef} aria-hidden className={className} />;
}

export default CollabField;
