import { useEffect, useRef } from 'react';
import lottieLight from 'lottie-web/build/player/lottie_light.js';

const treasureAnimation = {
  v: '5.12.2',
  fr: 60,
  ip: 0,
  op: 120,
  w: 300,
  h: 300,
  nm: 'Little Explorers Treasure Open',
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0, ind: 1, ty: 4, nm: 'Glow', sr: 1,
      ks: {
        o: { a: 1, k: [{ t: 0, s: [0] }, { t: 18, s: [0] }, { t: 34, s: [70] }, { t: 72, s: [0] }] },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [150, 160, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [{ t: 18, s: [65, 65, 100] }, { t: 58, s: [125, 125, 100] }] },
      },
      shapes: [
        { ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [190, 190] }, nm: 'Glow ellipse' },
        { ty: 'fl', c: { a: 0, k: [1, 0.84, 0.24, 1] }, o: { a: 0, k: 50 }, r: 1, nm: 'Glow fill' },
      ],
      ip: 0, op: 120, st: 0, bm: 1,
    },
    {
      ddd: 0, ind: 2, ty: 4, nm: 'Reward Gem', sr: 1,
      ks: {
        o: { a: 1, k: [{ t: 0, s: [0] }, { t: 42, s: [0] }, { t: 50, s: [100] }, { t: 86, s: [100] }, { t: 102, s: [0] }] },
        r: { a: 1, k: [{ t: 44, s: [0] }, { t: 82, s: [180] }] },
        p: { a: 1, k: [{ t: 42, s: [150, 188, 0] }, { t: 78, s: [150, 78, 0] }, { t: 104, s: [150, 58, 0] }] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [{ t: 42, s: [45, 45, 100] }, { t: 62, s: [105, 105, 100] }, { t: 88, s: [90, 90, 100] }] },
      },
      shapes: [
        { ty: 'rc', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [46, 46] }, r: { a: 0, k: 8 }, nm: 'Gem' },
        { ty: 'fl', c: { a: 0, k: [0.66, 0.30, 0.96, 1] }, o: { a: 0, k: 100 }, r: 1, nm: 'Gem fill' },
      ],
      ip: 0, op: 120, st: 0, bm: 0,
    },
    ...[
      { ind: 3, x: 93, y: 135, dx: -44, dy: -63, color: [1, 0.47, 0.20, 1] },
      { ind: 4, x: 207, y: 135, dx: 44, dy: -68, color: [0.06, 0.74, 0.92, 1] },
      { ind: 5, x: 110, y: 165, dx: -58, dy: 15, color: [1, 0.85, 0.24, 1] },
      { ind: 6, x: 190, y: 165, dx: 58, dy: 20, color: [0.13, 0.79, 0.41, 1] },
    ].map(({ ind, x, y, dx, dy, color }) => ({
      ddd: 0, ind, ty: 4, nm: `Burst ${ind}`, sr: 1,
      ks: {
        o: { a: 1, k: [{ t: 0, s: [0] }, { t: 42, s: [0] }, { t: 50, s: [100] }, { t: 88, s: [0] }] },
        r: { a: 0, k: 0 },
        p: { a: 1, k: [{ t: 44, s: [x, y, 0] }, { t: 78, s: [x + dx, y + dy, 0] }] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [{ t: 44, s: [55, 55, 100] }, { t: 70, s: [115, 115, 100] }] },
      },
      shapes: [
        { ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [16, 16] }, nm: 'Star particle' },
        { ty: 'fl', c: { a: 0, k: color }, o: { a: 0, k: 100 }, r: 1, nm: 'Particle fill' },
      ],
      ip: 0, op: 120, st: 0, bm: 0,
    })),
    {
      ddd: 0, ind: 7, ty: 4, nm: 'Chest Lid', sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 1, k: [{ t: 0, s: [0] }, { t: 24, s: [0] }, { t: 46, s: [-34] }, { t: 90, s: [-34] }] },
        p: { a: 1, k: [{ t: 0, s: [150, 142, 0] }, { t: 5, s: [145, 142, 0] }, { t: 10, s: [155, 142, 0] }, { t: 15, s: [150, 142, 0] }, { t: 46, s: [145, 128, 0] }] },
        a: { a: 0, k: [0, 18, 0] },
        s: { a: 0, k: [100, 100, 100] },
      },
      shapes: [
        { ty: 'rc', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [176, 48] }, r: { a: 0, k: 16 }, nm: 'Lid' },
        { ty: 'fl', c: { a: 0, k: [1, 0.49, 0.20, 1] }, o: { a: 0, k: 100 }, r: 1, nm: 'Lid fill' },
        { ty: 'rc', p: { a: 0, k: [0, 4] }, s: { a: 0, k: [26, 34] }, r: { a: 0, k: 7 }, nm: 'Lid lock' },
        { ty: 'fl', c: { a: 0, k: [1, 0.85, 0.24, 1] }, o: { a: 0, k: 100 }, r: 1, nm: 'Lock fill' },
      ],
      ip: 0, op: 120, st: 0, bm: 0,
    },
    {
      ddd: 0, ind: 8, ty: 4, nm: 'Chest Body', sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 1, k: [{ t: 0, s: [150, 194, 0] }, { t: 5, s: [145, 194, 0] }, { t: 10, s: [155, 194, 0] }, { t: 15, s: [150, 194, 0] }] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100, 100] },
      },
      shapes: [
        { ty: 'rc', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [176, 92] }, r: { a: 0, k: 18 }, nm: 'Body' },
        { ty: 'fl', c: { a: 0, k: [0.91, 0.32, 0.09, 1] }, o: { a: 0, k: 100 }, r: 1, nm: 'Body fill' },
        { ty: 'rc', p: { a: 0, k: [0, -5] }, s: { a: 0, k: [30, 52] }, r: { a: 0, k: 8 }, nm: 'Body lock' },
        { ty: 'fl', c: { a: 0, k: [1, 0.85, 0.24, 1] }, o: { a: 0, k: 100 }, r: 1, nm: 'Lock fill' },
      ],
      ip: 0, op: 120, st: 0, bm: 0,
    },
  ],
} as const;

export default function TreasureLottie() {
  const hostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = hostRef.current;
    if (!container) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animation = lottieLight.loadAnimation({
      container,
      renderer: 'svg',
      loop: false,
      autoplay: !reduceMotion,
      animationData: treasureAnimation,
      rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
    });
    if (reduceMotion) animation.goToAndStop(46, true);
    return () => animation.destroy();
  }, []);
  return <div ref={hostRef} className="v4-treasure-lottie" aria-hidden="true" />;
}
