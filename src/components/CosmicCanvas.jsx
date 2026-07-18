import { useEffect, useRef } from 'react';

export default function CosmicCanvas({ isInsideForm }) {
  const canvasRef = useRef(null);
  const targetRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    let points = [];
    let animationFrameId;

    // Helper: calculate distance squared
    const getDistance = (p1, p2) => {
      return Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
    };

    // Initialize points in a grid
    const initPoints = () => {
      points = [];
      const stepX = width / 20;
      const stepY = height / 20;

      for (let x = 0; x < width; x += stepX) {
        for (let y = 0; y < height; y += stepY) {
          const px = x + Math.random() * stepX;
          const py = y + Math.random() * stepY;
          points.push({
            x: px,
            y: py,
            originX: px,
            originY: py,
            // Pre-assign randomized phase and speed for natural shifting
            angleX: Math.random() * Math.PI * 2,
            angleY: Math.random() * Math.PI * 2,
            speedX: 0.01 + Math.random() * 0.02,
            speedY: 0.01 + Math.random() * 0.02,
            range: 30 + Math.random() * 30, // shift range (px)
            radius: 2 + Math.random() * 2,
            active: 0,
            circleActive: 0,
            closest: []
          });
        }
      }

      // For each point, find the 5 closest points
      for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const closest = [];

        for (let j = 0; j < points.length; j++) {
          const p2 = points[j];
          if (p1 !== p2) {
            if (closest.length < 5) {
              closest.push(p2);
            } else {
              // find the index of the furthest point in our closest array
              let maxDist = getDistance(p1, closest[0]);
              let maxIdx = 0;
              for (let k = 1; k < closest.length; k++) {
                const d = getDistance(p1, closest[k]);
                if (d > maxDist) {
                  maxDist = d;
                  maxIdx = k;
                }
              }
              // if this point is closer than the furthest closest point, swap them
              if (getDistance(p1, p2) < maxDist) {
                closest[maxIdx] = p2;
              }
            }
          }
        }
        p1.closest = closest;
      }
    };

    initPoints();

    // Mouse move handler
    const handleMouseMove = (e) => {
      if (isInsideForm) {
        targetRef.current = { x: -1000, y: -1000 };
      } else {
        targetRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      initPoints();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // If cursor is inside the form container, force target off-screen
      const target = isInsideForm ? { x: -1000, y: -1000 } : targetRef.current;

      for (let i = 0; i < points.length; i++) {
        const p = points[i];

        // Shift point positions smoothly using sine/cosine (alternative to TweenLite)
        p.angleX += p.speedX;
        p.angleY += p.speedY;
        p.x = p.originX + Math.sin(p.angleX) * p.range;
        p.y = p.originY + Math.cos(p.angleY) * p.range;

        // Proximity check to target cursor
        const dist = getDistance(target, p);
        if (dist < 4000) {
          p.active = 0.3;
          p.circleActive = 0.6;
        } else if (dist < 20000) {
          p.active = 0.1;
          p.circleActive = 0.3;
        } else if (dist < 40000) {
          p.active = 0.02;
          p.circleActive = 0.1;
        } else {
          p.active = 0;
          p.circleActive = 0;
        }

        // Draw connections (lines) in White
        if (p.active > 0) {
          for (let j = 0; j < p.closest.length; j++) {
            const neighbor = p.closest[j];
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(neighbor.x, neighbor.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${p.active})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }

          // Draw node (circle) in White
          if (p.circleActive > 0) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, 2 * Math.PI, false);
            ctx.fillStyle = `rgba(255, 255, 255, ${p.circleActive})`;
            ctx.fill();
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isInsideForm]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1, // behind the login card, but on top of video background
        pointerEvents: 'none',
      }}
    />
  );
}
