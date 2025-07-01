"use client";

/* eslint-disable react-hooks/immutability -- R3F/WebGL mutates textures, uniforms, and meshes each frame */
import { OrthographicCamera, useFBO, useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { cn } from "@/lib/utils";
import * as React from "react";
import * as THREE from "three";
import { WebGLErrorBoundary, WebGLFallback } from "./webgl-error-boundary";

const fragmentShader = `
uniform sampler2D uTexture;
uniform sampler2D uDisplacement;
uniform float uStrength;

varying vec2 vUv;

const float PI = 3.141592653589793238;

void main() {
  vec4 displacement = texture2D(uDisplacement, vUv);
  float theta = displacement.r * 2.0 * PI;

  vec2 dir = vec2(sin(theta), cos(theta));
  vec2 uv = vUv + dir * displacement.r * uStrength;
  vec4 color = texture2D(uTexture, uv);

  gl_FragColor = color;
}
`;

const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const BRUSH_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">
    <defs>
      <radialGradient id="g" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="white" stop-opacity="1"/>
        <stop offset="65%" stop-color="white" stop-opacity="0.55"/>
        <stop offset="100%" stop-color="white" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="128" height="128" fill="url(#g)"/>
  </svg>
`)}`;

function createDemoImage(title: string, colorA: string, colorB: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${colorA}" />
          <stop offset="100%" stop-color="${colorB}" />
        </linearGradient>
      </defs>
      <rect width="800" height="1000" fill="url(#g)"/>
      <circle cx="610" cy="180" r="130" fill="white" fill-opacity="0.12"/>
      <circle cx="180" cy="760" r="190" fill="white" fill-opacity="0.12"/>
      <text x="64" y="900" fill="white" font-size="64" font-family="system-ui, sans-serif" opacity="0.9">
        ${title}
      </text>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const DEFAULT_IMAGE_URLS = [createDemoImage("Aurora", "#0f172a", "#155e75")];

export interface RippleImageItem {
  src: string;
  x?: number;
  y?: number;
  widthScale?: number;
  heightScale?: number;
}

export interface ImageRippleEffectProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  className?: string;
  images?: RippleImageItem[];
  brushTextureUrl?: string;
  distortionStrength?: number;
  waveCount?: number;
  waveSize?: number;
  waveRotationSpeed?: number;
  waveFadeMultiplier?: number;
  waveGrowth?: number;
  waveSpawnThreshold?: number;
  /** CSS/hex color used when clearing FBOs (theme letterboxing). */
  clearColor?: string;
  children?: React.ReactNode;
}

type ViewportDimensions = {
  width: number;
  height: number;
  pixelRatio: number;
};

function useContainerDimensions(
  ref: React.RefObject<HTMLElement | null>,
): ViewportDimensions {
  const [dimensions, setDimensions] = React.useState<ViewportDimensions>({
    width: 0,
    height: 0,
    pixelRatio: 1,
  });

  React.useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      setDimensions({
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        pixelRatio:
          typeof window !== "undefined" ? Math.min(window.devicePixelRatio, 2) : 1,
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    window.addEventListener("resize", updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, [ref]);

  return dimensions;
}

interface RippleSceneProps {
  pointerRef: React.RefObject<{ x: number; y: number }>;
  images: RippleImageItem[];
  brushTextureUrl: string;
  distortionStrength: number;
  waveCount: number;
  waveSize: number;
  waveRotationSpeed: number;
  waveFadeMultiplier: number;
  waveGrowth: number;
  waveSpawnThreshold: number;
  clearColor: string;
}

function RippleScene({
  pointerRef,
  images,
  brushTextureUrl,
  distortionStrength,
  waveCount,
  waveSize,
  waveRotationSpeed,
  waveFadeMultiplier,
  waveGrowth,
  waveSpawnThreshold,
  clearColor,
}: RippleSceneProps) {
  const { gl, camera, size } = useThree();
  const materialRef = React.useRef<THREE.ShaderMaterial>(null);
  const clearColorRef = React.useRef(new THREE.Color(clearColor));

  React.useEffect(() => {
    clearColorRef.current.set(clearColor);
  }, [clearColor]);

  const imageUrls = React.useMemo(
    () => images.map((item) => item.src),
    [images],
  );

  const brushTexture = useTexture(brushTextureUrl);
  const loadedTextures = useTexture(imageUrls);
  const imageTextures = React.useMemo(
    () => (Array.isArray(loadedTextures) ? loadedTextures : [loadedTextures]),
    [loadedTextures],
  );

  const rippleScene = React.useMemo(() => new THREE.Scene(), []);
  const imageScene = React.useMemo(() => new THREE.Scene(), []);

  const waveMeshesRef = React.useRef<THREE.Mesh[]>([]);
  const prevMouseRef = React.useRef({ x: 0, y: 0 });
  const currentWaveRef = React.useRef(0);

  const uniforms = React.useMemo(
    () => ({
      uDisplacement: { value: null as THREE.Texture | null },
      uTexture: { value: null as THREE.Texture | null },
      uStrength: { value: distortionStrength },
    }),
    // Stable uniforms object; strength updates below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const fboBase = useFBO(Math.max(size.width, 1), Math.max(size.height, 1), {
    depthBuffer: false,
    stencilBuffer: false,
    samples: 0,
  });
  const fboTexture = useFBO(Math.max(size.width, 1), Math.max(size.height, 1), {
    depthBuffer: false,
    stencilBuffer: false,
    samples: 0,
  });

  const imageCamera = React.useMemo(() => {
    const next = new THREE.OrthographicCamera(
      size.width / -2,
      size.width / 2,
      size.height / 2,
      size.height / -2,
      -1000,
      1000,
    );
    next.position.set(0, 0, 2);
    return next;
  }, [size.width, size.height]);

  React.useEffect(() => {
    uniforms.uStrength.value = distortionStrength;
  }, [distortionStrength, uniforms]);

  React.useEffect(() => {
    brushTexture.minFilter = THREE.LinearFilter;
    brushTexture.magFilter = THREE.LinearFilter;
    brushTexture.wrapS = THREE.ClampToEdgeWrapping;
    brushTexture.wrapT = THREE.ClampToEdgeWrapping;
    brushTexture.needsUpdate = true;
  }, [brushTexture]);

  React.useEffect(() => {
    waveMeshesRef.current.forEach((mesh) => {
      rippleScene.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((material) => material.dispose());
      } else {
        mesh.material.dispose();
      }
    });

    const meshes: THREE.Mesh[] = [];
    for (let i = 0; i < waveCount; i += 1) {
      const geometry = new THREE.PlaneGeometry(waveSize, waveSize, 1, 1);
      const material = new THREE.MeshBasicMaterial({
        transparent: true,
        map: brushTexture,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = false;
      mesh.rotation.z = Math.random();
      rippleScene.add(mesh);
      meshes.push(mesh);
    }

    waveMeshesRef.current = meshes;
    currentWaveRef.current = 0;

    return () => {
      meshes.forEach((mesh) => {
        rippleScene.remove(mesh);
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((material) => material.dispose());
        } else {
          mesh.material.dispose();
        }
      });
    };
  }, [brushTexture, rippleScene, waveCount, waveSize]);

  React.useEffect(() => {
    while (imageScene.children.length > 0) {
      const child = imageScene.children[0] as THREE.Object3D;
      imageScene.remove(child);
    }

    const group = new THREE.Group();

    images.forEach((item, index) => {
      const texture = imageTextures[index];
      if (!texture?.image) {
        return;
      }

      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      texture.needsUpdate = true;

      const imageSource = texture.image as {
        width?: number;
        height?: number;
      };
      const imageAspect =
        imageSource.width && imageSource.height
          ? imageSource.width / imageSource.height
          : 1;
      const widthScale = item.widthScale ?? 0.22;
      const heightScale = item.heightScale ?? widthScale / imageAspect;

      const geometry = new THREE.PlaneGeometry(1, 1);
      const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      mesh.position.x =
        (item.x ?? (index - (images.length - 1) / 2) * 0.25) * size.width;
      mesh.position.y = (item.y ?? 0) * size.height;
      mesh.position.z = 0;
      mesh.scale.set(size.width * widthScale, size.width * heightScale, 1);
      group.add(mesh);
    });

    imageScene.add(group);

    return () => {
      group.children.forEach((child) => {
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose?.();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((material) => material.dispose());
        } else {
          mesh.material?.dispose?.();
        }
      });
      imageScene.remove(group);
    };
  }, [imageScene, imageTextures, images, size.width, size.height]);

  useFrame(() => {
    const viewW = size.width;
    const viewH = size.height;
    const x = pointerRef.current.x - viewW / 2;
    const y = -pointerRef.current.y + viewH / 2;
    const prev = prevMouseRef.current;
    const moved =
      Math.abs(x - prev.x) > waveSpawnThreshold ||
      Math.abs(y - prev.y) > waveSpawnThreshold;

    if (moved && waveMeshesRef.current.length > 0) {
      const waveIndex = currentWaveRef.current % waveMeshesRef.current.length;
      const mesh = waveMeshesRef.current[waveIndex];
      if (mesh) {
        mesh.position.x = x;
        mesh.position.y = y;
        mesh.visible = true;
        mesh.scale.set(1.75, 1.75, 1);
        mesh.rotation.z = Math.random() * Math.PI;
        const material = mesh.material as THREE.MeshBasicMaterial;
        material.opacity = 1;
      }
      currentWaveRef.current = (waveIndex + 1) % waveMeshesRef.current.length;
    }
    prevMouseRef.current = { x, y };

    waveMeshesRef.current.forEach((mesh) => {
      if (!mesh.visible) {
        return;
      }
      mesh.rotation.z += waveRotationSpeed;
      mesh.scale.x = 0.98 * mesh.scale.x + waveGrowth;
      mesh.scale.y = 0.98 * mesh.scale.y + waveGrowth;
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.opacity *= waveFadeMultiplier;
      if (material.opacity <= 0.01) {
        mesh.visible = false;
      }
    });

    const material = materialRef.current;
    if (material) {
      material.uniforms.uTexture.value = fboTexture.texture;
      material.uniforms.uDisplacement.value = fboBase.texture;
      material.uniforms.uStrength.value = uniforms.uStrength.value;
    }

    const previousClear = gl.getClearColor(new THREE.Color());
    const previousAlpha = gl.getClearAlpha();
    const previousAutoClear = gl.autoClear;

    gl.autoClear = false;

    gl.setRenderTarget(fboBase);
    gl.setClearColor(0x000000, 1);
    gl.clear(true, true, true);
    gl.render(rippleScene, camera);

    gl.setRenderTarget(fboTexture);
    gl.setClearColor(clearColorRef.current, 1);
    gl.clear(true, true, true);
    gl.render(imageScene, imageCamera);

    gl.setRenderTarget(null);
    gl.setClearColor(previousClear, previousAlpha);
    gl.autoClear = previousAutoClear;
  });

  return (
    <mesh position={[0, 0, 0]}>
      <planeGeometry args={[Math.max(size.width, 1), Math.max(size.height, 1)]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={false}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

export function ImageRippleEffect({
  className,
  images = DEFAULT_IMAGE_URLS.map((src) => ({ src })),
  brushTextureUrl = BRUSH_DATA_URI,
  distortionStrength = 0.075,
  waveCount = 100,
  waveSize = 60,
  waveRotationSpeed = 0.025,
  waveFadeMultiplier = 0.95,
  waveGrowth = 0.155,
  waveSpawnThreshold = 0.1,
  clearColor = "#000000",
  children,
  style,
  ...props
}: ImageRippleEffectProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { width, height } = useContainerDimensions(containerRef);
  const pointerRef = React.useRef({ x: 0, y: 0 });

  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      pointerRef.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    },
    [],
  );

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      className={cn(
        "relative h-140 w-full overflow-hidden bg-background text-foreground",
        className,
      )}
      style={{ backgroundColor: clearColor, ...style }}
      {...props}
    >
      {width > 0 && height > 0 && (
        <WebGLErrorBoundary fallback={<WebGLFallback className="absolute inset-0 size-full" />}>
          <Canvas
            dpr={[1, 2]}
            gl={{ alpha: true, antialias: true }}
            style={{ background: clearColor }}
          >
            <OrthographicCamera
              makeDefault
              near={-1000}
              far={1000}
              position={[0, 0, 2]}
            />
            <React.Suspense fallback={null}>
              <RippleScene
                pointerRef={pointerRef}
                images={images}
                brushTextureUrl={brushTextureUrl}
                distortionStrength={distortionStrength}
                waveCount={waveCount}
                waveSize={waveSize}
                waveRotationSpeed={waveRotationSpeed}
                waveFadeMultiplier={waveFadeMultiplier}
                waveGrowth={waveGrowth}
                waveSpawnThreshold={waveSpawnThreshold}
                clearColor={clearColor}
              />
            </React.Suspense>
          </Canvas>
        </WebGLErrorBoundary>
      )}
      {children ? (
        <div className="pointer-events-none absolute inset-0 z-10">{children}</div>
      ) : null}
    </div>
  );
}
