import React, { useEffect, useMemo, useRef, useState } from "react";

export const THEMES = {
  pinkBlue: ["#FF0032", "#FF5C00", "#00FFB8", "#53FF00"],
  yellowGreen: ["#F7F6AF", "#9BD6A3", "#4E8264", "#1C2124", "#D62822"],
  yellowRed: ["#ECD078", "#D95B43", "#C02942", "#542437", "#53777A"],
  blueGray: ["#343838", "#005F6B", "#008C9E", "#00B4CC", "#00DFFC"],
  blackWhite: ["#FFFFFF", "#000000", "#FFFFFF", "#000000", "#FFFFFF"],
} as const;

export type ThemeName = keyof typeof THEMES;
type Mode = "cubic" | "conic";

type Props = {
  className?: string;
  audioUrl: string;
  mode?: Mode;
  theme?: ThemeName;
  numParticles?: number;
  radius?: number;
  distance?: number;
  size?: number; // 0..1
};

type Particle = {
  x0: number;
  y0: number;
  x: number;
  y: number;
  s: number;
  band: number;
  rad: number;
  colIdx: number;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function hexToRgb(hex: string) {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export default function AudioCloudCanvas({
  className,
  audioUrl,
  mode = "cubic",
  theme = "pinkBlue",
  numParticles = 4200,
  radius = 3,
  distance = 650,
  size = 0.55,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // audio
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);

  // animation
  const rafRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const dimsRef = useRef({ w: 0, h: 0, cx: 0, cy: 0 });

  // pointer
  const pointerRef = useRef({ x: 0, y: 0, tx: 0, ty: 0, has: false });

  const [status, setStatus] = useState<"play" | "loading" | "playing">("play");

  const palette = useMemo(() => THEMES[theme].map(hexToRgb), [theme]);

  // build particles
  const rebuild = () => {
    const { w, h, cx, cy } = dimsRef.current;
    if (!w || !h) return;
    particlesRef.current = buildParticles({
      w, h, cx, cy,
      size,
      mode,
      n: numParticles,
      paletteLen: THEMES[theme].length,
    });
  };

  useEffect(() => {
    rebuild();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, theme, size, numParticles]);

  // resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onResize = () => {
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const w = window.innerWidth;
      const h = window.innerHeight;

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      dimsRef.current = { w, h, cx: w * 0.5, cy: h * 0.5 };
      rebuild();
    };

    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, theme, size, numParticles]);

  // pointer
  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      const p = pointerRef.current;
      p.has = true;

      if (e instanceof MouseEvent) {
        p.tx = e.clientX;
        p.ty = e.clientY;
      } else {
        const t = e.changedTouches[0];
        if (!t) return;
        p.tx = t.clientX;
        p.ty = t.clientY;
      }
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMove as any);
      window.removeEventListener("touchmove", onMove as any);
    };
  }, []);

  // audio init on first gesture
  useEffect(() => {
    const start = async () => {
      if (status !== "play") return;

      try {
        setStatus("loading");

        const audio = new Audio();
        audio.crossOrigin = "anonymous";
        audio.src = audioUrl;
        audio.loop = true;

        const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
        const ctx = new Ctx();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512; // 256 bins

        const source = ctx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(ctx.destination);

        dataRef.current = new Uint8Array(analyser.frequencyBinCount);

        audioRef.current = audio;
        ctxRef.current = ctx;
        analyserRef.current = analyser;

        await new Promise<void>((resolve, reject) => {
          const ok = () => resolve();
          const bad = () => reject(new Error("Audio load failed"));
          audio.addEventListener("canplay", ok, { once: true });
          audio.addEventListener("error", bad, { once: true });
        });

        await ctx.resume();
        await audio.play();

        setStatus("playing");
      } catch (err) {
        console.error(err);
        setStatus("play");
      }
    };

    const onFirst = () => start();
    window.addEventListener("pointerdown", onFirst, { once: true });
    return () => window.removeEventListener("pointerdown", onFirst);
  }, [audioUrl, status]);

  // loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);

      const ctx2d = canvas.getContext("2d");
      if (!ctx2d) return;

      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const { w, h, cx, cy } = dimsRef.current;

      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx2d.clearRect(0, 0, w, h);

      const analyser = analyserRef.current;
      const data = dataRef.current;
      if (analyser && data && status === "playing") analyser.getByteFrequencyData(data);

      const ptr = pointerRef.current;
      if (ptr.has) {
        ptr.x += (ptr.tx - ptr.x) * 0.035;
        ptr.y += (ptr.ty - ptr.y) * 0.035;
      } else {
        const t = performance.now() * 0.0006;
        ptr.x = cx + Math.cos(t) * 100;
        ptr.y = cy + Math.sin(t) * 100;
      }

      const particles = particlesRef.current;

      ctx2d.save();
      ctx2d.globalCompositeOperation = theme === "blackWhite" ? "source-over" : "lighter";

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        let energy = 0.08;
        if (data && status === "playing") {
          const n = data[p.band] / 255;
          energy = Math.pow(n, 1.65);
        }

        const target = (energy * (p.s * 2.8) + 0.02) * radius;
        const pr = Math.max(0.25, target * 10);

        const dx = ptr.x - p.x0;
        const dy = ptr.y - p.y0;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const ang = Math.atan2(dy, dx);

        const pull = 1 - clamp01(dist / Math.max(60, distance));
        const r = pull * distance * p.rad + 25;

        const tx = p.x0 - Math.cos(ang) * r;
        const ty = p.y0 - Math.sin(ang) * r;

        p.x += (tx - p.x) * 0.11;
        p.y += (ty - p.y) * 0.11;

        const c = palette[p.colIdx % palette.length];
        ctx2d.fillStyle = `rgba(${c.r},${c.g},${c.b},${0.28 + energy * 0.62})`;

        ctx2d.beginPath();
        ctx2d.arc(p.x, p.y, pr, 0, Math.PI * 2);
        ctx2d.fill();
      }

      ctx2d.restore();

      // tiny overlay label (optional)
      if (status !== "playing") {
        ctx2d.save();
        ctx2d.globalCompositeOperation = "source-over";
        ctx2d.font = "12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
        ctx2d.fillStyle = "rgba(255,255,255,0.75)";
        ctx2d.fillText(status === "loading" ? "LOADING MUSIC..." : "CLICK TO PLAY", 16, h - 18);
        ctx2d.restore();
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [palette, radius, distance, status, theme]);

  // cleanup
  useEffect(() => {
    return () => {
      try {
        audioRef.current?.pause();
        audioRef.current = null;
        analyserRef.current = null;
        dataRef.current = null;
        ctxRef.current?.close();
        ctxRef.current = null;
      } catch {}
    };
  }, []);

  return (
    <div className={className}>
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}

function buildParticles(opts: {
  w: number;
  h: number;
  cx: number;
  cy: number;
  size: number;
  mode: "cubic" | "conic";
  n: number;
  paletteLen: number;
}): Particle[] {
  const { w, h, cx, cy, size, mode, n, paletteLen } = opts;

  const sizeW = h * size;
  const sizeH = h * size;

  const TOTAL_BANDS = 256;
  const minBand = 24;
  const maxBand = TOTAL_BANDS - 1;

  const padColor = Math.ceil(n / paletteLen);
  let colIdx = 0;

  const out: Particle[] = new Array(n);

  for (let i = 0; i < n; i++) {
    if (i % padColor === 0 && i > 0) colIdx++;

    const group = (colIdx * padColor) / n;
    let band = Math.round(group * (TOTAL_BANDS - 56)) - 1;
    if (band < minBand) band = minBand;
    if (band > maxBand) band = maxBand;

    const s = (Math.random() + (paletteLen - colIdx) * 0.2) * 0.1;

    let x0 = cx;
    let y0 = cy;

    if (mode === "cubic") {
      x0 = cx + (Math.random() * sizeW - sizeW / 2);
      y0 = cy + (Math.random() * sizeH - sizeH / 2);
    } else {
      const a = Math.random() * Math.PI * 2;
      x0 = cx + Math.cos(a) * sizeW;
      y0 = cy + Math.sin(a) * sizeH;
    }

    out[i] = {
      x0, y0, x: x0, y: y0,
      s,
      band,
      rad: Math.random(),
      colIdx: colIdx % Math.max(1, paletteLen),
    };
  }

  return out;
}
