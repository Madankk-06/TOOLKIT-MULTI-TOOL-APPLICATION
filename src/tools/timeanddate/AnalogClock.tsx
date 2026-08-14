import { useEffect, useRef, useState } from 'react';
import ToolWrapper from '../../components/ToolWrapper';
import { useTheme } from '../../context/ThemeContext';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

const shapeScaleGLSL = `
    uniform vec3 u_shapeWeights;
    uniform float u_hueShift;
    
    float getShapeScale(float theta) {
        float scaleCircle = 1.0;
        
        float cosT = cos(theta);
        float sinT = sin(theta);
        float scaleSquare = 0.85 / max(abs(cosT), abs(sinT)); 
        
        float theta_hex = mod(theta + 0.52359877, 1.04719755) - 0.52359877; 
        float scaleHex = 0.92 / cos(theta_hex); 
        
        return u_shapeWeights.x * scaleCircle + 
               u_shapeWeights.y * scaleSquare + 
               u_shapeWeights.z * scaleHex;
    }

    vec3 rgb2hsv(vec3 c) {
        vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
        vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
        vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
        float d = q.x - min(q.w, q.y);
        float e = 1.0e-10;
        return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
    }

    vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    vec3 shiftHue(vec3 color, float shift) {
        vec3 hsv = rgb2hsv(color);
        hsv.x = fract(hsv.x + shift);
        return hsv2rgb(hsv);
    }
`;

const faceVertexShader = `
    uniform float time;
    uniform float u_secondAngle;
    attribute float size;
    varying vec3 vColor;
    
    ${shapeScaleGLSL}
    
    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
    float snoise(vec2 v){
        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod(i, 289.0);
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m ; m = m*m ;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5; vec3 ox = floor(x + 0.5); vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
        vec3 g; g.x = a0.x*x0.x + h.x*x0.y; g.yz = a0.yz*x12.xz + h.yz*x12.yw;
        return 130.0 * dot(m, g);
    }

    void main() {
        vec3 pos = position;
        
        float r = length(pos.xy);
        float theta = atan(pos.x, pos.y); 
        
        float orbitSpeed = 1.0 / (r + 1.0);
        float newTheta = theta - time * 0.1 * orbitSpeed;
        
        float shapeScale = getShapeScale(newTheta);
        pos.x = r * shapeScale * sin(newTheta);
        pos.y = r * shapeScale * cos(newTheta);
        
        float angleDiff = mod(u_secondAngle - newTheta + 6.2831853, 6.2831853);
        
        float trail = exp(-angleDiff * 3.0); 
        float crest = exp(-abs(angleDiff) * 15.0);
        
        float noise = snoise(pos.xy * 0.3 + time * 0.2);
        
        pos.z += (trail * 0.8) + (crest * 1.5) + (noise * 0.5);
        
        vec3 shiftedColor = shiftHue(color, u_hueShift);
        vec3 trailColor = shiftHue(vec3(0.4, 0.1, 0.6), u_hueShift);

        vec3 baseColor = shiftedColor + trailColor * trail; 
        vColor = baseColor + vec3(crest * 0.8); 
        
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        float dynamicSize = size * (1.0 + trail * 1.5 + noise * 0.5);
        gl_PointSize = dynamicSize * (25.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const markerVertexShader = `
    uniform float time;
    uniform float u_secondAngle;
    attribute float size;
    attribute float a_angle;
    varying vec3 vColor;
    
    ${shapeScaleGLSL}

    void main() {
        vec3 pos = position;
        
        float shapeScale = getShapeScale(a_angle);
        pos.xy *= shapeScale;
        
        float diff = mod(u_secondAngle - a_angle + 6.2831853, 6.2831853);
        float sweepGlow = exp(-diff * 6.0);
        float pulse = sin(time * 2.0 + a_angle * 12.0) * 0.5 + 0.5;
        
        pos.z += sweepGlow * 1.0;

        vec3 shiftedColor = shiftHue(color, u_hueShift);
        vColor = shiftedColor + shiftedColor * sweepGlow * 2.5 + vec3(pulse * 0.2);

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = size * (1.0 + sweepGlow * 1.5) * (25.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const handVertexShader = `
    uniform float time;
    uniform float u_handAngle; 
    attribute float size;
    attribute float a_progress;
    varying vec3 vColor;
    
    ${shapeScaleGLSL}

    void main() {
        vec3 pos = position;
        
        float shapeScale = getShapeScale(u_handAngle);
        pos.xy *= shapeScale; 
        
        float flow = fract(-time * 1.5 + a_progress);
        float highlight = smoothstep(0.0, 0.15, flow) * smoothstep(0.4, 0.15, flow);
        
        pos.x += sin(a_progress * 15.0 - time * 8.0) * 0.08 * a_progress;

        vec3 shiftedColor = shiftHue(color, u_hueShift);
        vColor = mix(shiftedColor, vec3(1.0, 1.0, 1.0), highlight * 0.8);

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = size * (1.0 + highlight * 1.5) * (30.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const particleFragmentShader = `
    varying vec3 vColor;

    void main() {
        vec2 uv = gl_PointCoord.xy - vec2(0.5);
        float dist = length(uv);
        
        if(dist > 0.5) discard;
        
        float strength = pow(1.0 - (dist * 2.0), 2.0);
        gl_FragColor = vec4(vColor * strength, strength);
    }
`;

export default function AnalogClock() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { tokens } = useTheme();

  const [shapeName, setShapeName] = useState('Square');
  const shapeIndexRef = useRef(0);
  const targetShapeWeights = useRef(new THREE.Vector3(1, 0, 0));
  const targetHueShift = useRef(0.0);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let width = container.clientWidth || 600;
    let height = 680;

    // ThreeJS Scene Variables
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020205, 0.025);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 18.5);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: "high-performance"
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x020205);

    const uniforms = {
      time: { value: 0 },
      u_secondAngle: { value: 0 },
      u_minuteAngle: { value: 0 },
      u_hourAngle: { value: 0 },
      u_shapeWeights: { value: new THREE.Vector3(1, 0, 0) },
      u_hueShift: { value: 0.0 }
    };

    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 1.2, 0.45, 0.65);
    bloomPass.threshold = 0.12;
    bloomPass.strength = 1.2; 
    bloomPass.radius = 0.65;

    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 40;
    controls.maxPolarAngle = Math.PI / 1.5;

    const clockGroup = new THREE.Group();
    scene.add(clockGroup);

    // ── Create Clock Face ──
    const faceCount = 50000;
    const facePos: number[] = [];
    const faceCol: number[] = [];
    const faceSizes: number[] = [];
    
    const colorCenter = new THREE.Color(0x00ffff);
    const colorEdge = new THREE.Color(0x7a00ff);
    const tempColor = new THREE.Color();

    for (let i = 0; i < faceCount; i++) {
      const r = 5.8 * Math.pow(Math.random(), 0.5); 
      const theta = Math.random() * 2 * Math.PI;
      
      facePos.push(
        r * Math.sin(theta), 
        r * Math.cos(theta), 
        (Math.random() - 0.5) * 1.5 - 1.0 
      );

      tempColor.lerpColors(colorCenter, colorEdge, r / 5.8);
      tempColor.r += (Math.random() - 0.5) * 0.2;
      tempColor.b += (Math.random() - 0.5) * 0.2;
      
      faceCol.push(tempColor.r, tempColor.g, tempColor.b);
      faceSizes.push(Math.random() * 2.0 + 0.5);
    }

    const faceGeo = new THREE.BufferGeometry();
    faceGeo.setAttribute('position', new THREE.Float32BufferAttribute(facePos, 3));
    faceGeo.setAttribute('color', new THREE.Float32BufferAttribute(faceCol, 3));
    faceGeo.setAttribute('size', new THREE.Float32BufferAttribute(faceSizes, 1));

    const faceMat = new THREE.ShaderMaterial({
      vertexShader: faceVertexShader,
      fragmentShader: particleFragmentShader,
      uniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true
    });
    clockGroup.add(new THREE.Points(faceGeo, faceMat));

    // ── Create Markers ──
    const markerPos: number[] = [];
    const markerCol: number[] = [];
    const markerSizes: number[] = [];
    const markerAngles: number[] = [];
    
    for (let i = 0; i < 60; i++) {
      const isHour = i % 5 === 0;
      const pCount = isHour ? 180 : 20; 
      const rBase = 5.2;
      const angle = (i / 60) * Math.PI * 2; 
      
      const c = new THREE.Color(isHour ? 0xffffff : 0x00aaff);

      for (let j = 0; j < pCount; j++) {
        const spread = isHour ? 0.18 : 0.05;
        const r = rBase + (Math.random() - 0.5) * spread;
        const a = angle + (Math.random() - 0.5) * (spread / rBase);
        
        markerPos.push(
          r * Math.sin(a),
          r * Math.cos(a),
          (Math.random() - 0.5) * 0.2 + 0.2 
        );
        
        markerCol.push(c.r, c.g, c.b);
        markerSizes.push(isHour ? Math.random() * 3.0 + 1.5 : Math.random() * 1.5 + 0.5);
        markerAngles.push(angle);
      }
    }

    const markerGeo = new THREE.BufferGeometry();
    markerGeo.setAttribute('position', new THREE.Float32BufferAttribute(markerPos, 3));
    markerGeo.setAttribute('color', new THREE.Float32BufferAttribute(markerCol, 3));
    markerGeo.setAttribute('size', new THREE.Float32BufferAttribute(markerSizes, 1));
    markerGeo.setAttribute('a_angle', new THREE.Float32BufferAttribute(markerAngles, 1));

    const markerMat = new THREE.ShaderMaterial({
      vertexShader: markerVertexShader,
      fragmentShader: particleFragmentShader,
      uniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true
    });
    clockGroup.add(new THREE.Points(markerGeo, markerMat));

    // ── Create Hands Geometry helper ──
    const createHandGeometry = (length: number, width: number, count: number, colorHex: number, zOffset: number) => {
      const positions: number[] = [];
      const colors: number[] = [];
      const sizes: number[] = [];
      const progress: number[] = [];
      const baseColor = new THREE.Color(colorHex);
      
      for (let i = 0; i < count; i++) {
        const y = Math.pow(Math.random(), 0.6) * length; 
        const p = y / length; 
        const taper = 1.0 - p * 0.85; 
        const x = (Math.random() - 0.5) * width * taper;
        const z = (Math.random() - 0.5) * 0.15 + zOffset;
        
        positions.push(x, y, z);
        
        const tipIntensity = 0.6 + 0.4 * p;
        colors.push(
          baseColor.r * tipIntensity, 
          baseColor.g * tipIntensity, 
          baseColor.b * tipIntensity
        );
        
        sizes.push(Math.random() * 1.6 + 0.8);
        progress.push(p);
      }
      
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
      geometry.setAttribute('a_progress', new THREE.Float32BufferAttribute(progress, 1));
      return geometry;
    };

    const baseHandMaterial = new THREE.ShaderMaterial({
      vertexShader: handVertexShader,
      fragmentShader: particleFragmentShader,
      uniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true
    });

    const hourMat = baseHandMaterial.clone();
    hourMat.uniforms = { ...uniforms, u_handAngle: { value: 0 } };
    const hourHand = new THREE.Points(createHandGeometry(2.5, 0.38, 1500, 0x00ff88, 0.8), hourMat);
    clockGroup.add(hourHand);

    const minMat = baseHandMaterial.clone();
    minMat.uniforms = { ...uniforms, u_handAngle: { value: 0 } };
    const minuteHand = new THREE.Points(createHandGeometry(3.8, 0.28, 2000, 0x00aaff, 1.2), minMat);
    clockGroup.add(minuteHand);

    const secMat = baseHandMaterial.clone();
    secMat.uniforms = { ...uniforms, u_handAngle: { value: 0 } };
    const secondHand = new THREE.Points(createHandGeometry(4.6, 0.1, 1000, 0xff0055, 1.6), secMat);
    
    // Add counter weight to second hand
    const counterGeo = createHandGeometry(1.2, 0.1, 300, 0xff0055, 1.6);
    const posAttr = counterGeo.getAttribute('position').array as Float32Array;
    for (let i = 1; i < posAttr.length; i += 3) {
      posAttr[i] *= -1; 
    }
    
    const mergedGeo = new THREE.BufferGeometry();
    ['position', 'color', 'size', 'a_progress'].forEach(attrName => {
      const arr1 = (secondHand.geometry.getAttribute(attrName) as any).array as Float32Array;
      const arr2 = (counterGeo.getAttribute(attrName) as any).array as Float32Array;
      const merged = new Float32Array(arr1.length + arr2.length);
      merged.set(arr1);
      merged.set(arr2, arr1.length);
      mergedGeo.setAttribute(attrName, new THREE.BufferAttribute(merged, attrName === 'position' || attrName === 'color' ? 3 : 1));
    });
    secondHand.geometry = mergedGeo;
    clockGroup.add(secondHand);

    // Center Core
    const coreGeo = new THREE.BufferGeometry();
    const corePos: number[] = [];
    const coreCol: number[] = [];
    const coreSize: number[] = [];
    for (let i = 0; i < 150; i++) {
      corePos.push((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, 1.8 + Math.random() * 0.2);
      coreCol.push(1, 1, 1);
      coreSize.push(Math.random() * 4.0 + 2.0);
    }
    coreGeo.setAttribute('position', new THREE.Float32BufferAttribute(corePos, 3));
    coreGeo.setAttribute('color', new THREE.Float32BufferAttribute(coreCol, 3));
    coreGeo.setAttribute('size', new THREE.Float32BufferAttribute(coreSize, 1));
    clockGroup.add(new THREE.Points(coreGeo, baseHandMaterial));

    // ── Resizing observer ──
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        width = entry.contentRect.width || 600;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        composer.setSize(width, height);
      }
    });
    resizeObserver.observe(container);

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Time updates
      uniforms.time.value = performance.now() * 0.001;
      uniforms.u_shapeWeights.value.lerp(targetShapeWeights.current, 0.05);
      uniforms.u_hueShift.value = THREE.MathUtils.lerp(uniforms.u_hueShift.value, targetHueShift.current, 0.05);

      // Update hands rotation
      const now = new Date();
      const hours = now.getHours() % 12;
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();
      const milliseconds = now.getMilliseconds();

      const hourAngle = ((hours + minutes / 60) / 12) * Math.PI * 2;
      const minuteAngle = ((minutes + seconds / 60) / 60) * Math.PI * 2;
      const secondAngle = ((seconds + milliseconds / 1000) / 60) * Math.PI * 2;

      hourHand.rotation.z = -hourAngle;
      minuteHand.rotation.z = -minuteAngle;
      secondHand.rotation.z = -secondAngle;

      uniforms.u_hourAngle.value = hourAngle;
      uniforms.u_minuteAngle.value = minuteAngle;
      uniforms.u_secondAngle.value = secondAngle;
      
      hourMat.uniforms.u_handAngle.value = hourAngle;
      minMat.uniforms.u_handAngle.value = minuteAngle;
      secMat.uniforms.u_handAngle.value = secondAngle;

      controls.update();
      composer.render();
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      composer.dispose();
      faceGeo.dispose();
      faceMat.dispose();
      markerGeo.dispose();
      markerMat.dispose();
      hourHand.geometry.dispose();
      hourMat.dispose();
      minuteHand.geometry.dispose();
      minMat.dispose();
      secondHand.geometry.dispose();
      secMat.dispose();
      coreGeo.dispose();
      baseHandMaterial.dispose();
    };
  }, []);

  const handleTransform = () => {
    const shapeNames = ["Square", "Hexagon", "Circle"];
    shapeIndexRef.current = (shapeIndexRef.current + 1) % 3;
    
    if (shapeIndexRef.current === 0) targetShapeWeights.current.set(1, 0, 0); 
    else if (shapeIndexRef.current === 1) targetShapeWeights.current.set(0, 1, 0); 
    else if (shapeIndexRef.current === 2) targetShapeWeights.current.set(0, 0, 1); 

    targetHueShift.current += 0.33333;
    setShapeName(shapeNames[shapeIndexRef.current]);
  };

  return (
    <ToolWrapper toolName="Analog Clock">
      <div style={styles.container}>
        <div ref={containerRef} style={styles.clockWrap}>
          <canvas ref={canvasRef} style={styles.canvas} />
          
          <button onClick={handleTransform} style={styles.glassBtn}>
            <svg style={styles.glassIcon} viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span>
              Transform: <strong style={{ color: tokens.accent, fontWeight: 700 }}>{shapeName}</strong>
            </span>
          </button>
        </div>
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    padding: '20px',
    boxSizing: 'border-box'
  },
  clockWrap: {
    position: 'relative',
    width: '100%',
    maxWidth: '1000px',
    height: '680px',
    background: '#020205',
    borderRadius: '24px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 24px 70px rgba(0, 0, 0, 0.8)',
    overflow: 'hidden',
  },
  canvas: {
    width: '100%',
    height: '100%',
    display: 'block'
  },
  glassBtn: {
    position: 'absolute',
    bottom: '30px',
    left: '30px',
    padding: '12px 24px',
    background: 'rgba(20, 20, 30, 0.65)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '16px',
    color: '#fff',
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
    transition: 'all 0.3s ease',
    outline: 'none',
    zIndex: 10
  },
  glassIcon: {
    width: '18px',
    height: '18px',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round'
  }
};
