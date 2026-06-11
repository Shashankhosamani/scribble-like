import { useRef, useCallback, useEffect } from 'react';
import type Ably from 'ably';
import type { DrawLine, Phase } from '../types';

export function useCanvas(
  chRef: React.MutableRefObject<Ably.RealtimeChannel | null>,
  isMyTurnToDrawRef: React.MutableRefObject<boolean>,
  phase: Phase,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paintingRef = useRef(false);
  const lxRef = useRef(0);
  const lyRef = useRef(0);
  const colorRef = useRef('#000000');
  const sizeRef = useRef(4);
  const erasingRef = useRef(false);
  const fillingRef = useRef(false);
  const drawBufRef = useRef<DrawLine[]>([]);
  const flushIvRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const localLine = useCallback((x1: number, y1: number, x2: number, y2: number, c: string, s: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = c;
    ctx.lineWidth = s;
    ctx.stroke();
  }, []);

  const localFill = useCallback((x: number, y: number, color: string, broadcast: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const sx = Math.round(x);
    const sy = Math.round(y);
    if (sx < 0 || sy < 0 || sx >= width || sy >= height) return;

    const h = color.replace('#', '');
    const fr = parseInt(h.slice(0, 2), 16);
    const fg = parseInt(h.slice(2, 4), 16);
    const fb = parseInt(h.slice(4, 6), 16);

    const i0 = (sy * width + sx) * 4;
    const tr = data[i0], tg = data[i0 + 1], tb = data[i0 + 2];
    if (tr === fr && tg === fg && tb === fb) return;

    const TOL = 32 * 32;
    const matches = (i: number) => {
      const dr = data[i] - tr, dg = data[i + 1] - tg, db = data[i + 2] - tb;
      return dr * dr + dg * dg + db * db <= TOL;
    };

    const stack: number[] = [sy * width + sx];
    const visited = new Uint8Array(width * height);
    visited[sy * width + sx] = 1;

    while (stack.length) {
      const pos = stack.pop()!;
      const px = pos % width;
      const py = (pos - px) / width;
      const i4 = pos * 4;
      data[i4] = fr; data[i4 + 1] = fg; data[i4 + 2] = fb; data[i4 + 3] = 255;

      if (px > 0            && !visited[pos - 1]     && matches((pos - 1) * 4))     { visited[pos - 1] = 1;     stack.push(pos - 1); }
      if (px < width - 1    && !visited[pos + 1]     && matches((pos + 1) * 4))     { visited[pos + 1] = 1;     stack.push(pos + 1); }
      if (py > 0            && !visited[pos - width] && matches((pos - width) * 4)) { visited[pos - width] = 1; stack.push(pos - width); }
      if (py < height - 1   && !visited[pos + width] && matches((pos + width) * 4)) { visited[pos + width] = 1; stack.push(pos + width); }
    }

    ctx.putImageData(imageData, 0, 0);
    if (broadcast && chRef.current) chRef.current.publish('fill', { x, y, color });
  }, [chRef]);

  const resetCanvas = useCallback((broadcast: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (broadcast && chRef.current) chRef.current.publish('clear', {});
  }, [chRef]);

  const flushDraw = useCallback(() => {
    if (!drawBufRef.current.length || !chRef.current) return;
    chRef.current.publish('draw', { lines: drawBufRef.current });
    drawBufRef.current = [];
  }, [chRef]);

  const getPos = (e: MouseEvent | TouchEvent): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    const sx = canvas.width / r.width;
    const sy = canvas.height / r.height;
    const src = 'touches' in e ? e.touches[0] : e;
    return { x: (src.clientX - r.left) * sx, y: (src.clientY - r.top) * sy };
  };

  useEffect(() => {
    if (phase !== 'game') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onDown = (e: MouseEvent) => {
      if (!isMyTurnToDrawRef.current) return;
      const p = getPos(e);
      if (fillingRef.current) {
        localFill(p.x, p.y, colorRef.current, true);
        return;
      }
      paintingRef.current = true;
      lxRef.current = p.x;
      lyRef.current = p.y;
    };

    const onMove = (e: MouseEvent) => {
      if (!paintingRef.current || !isMyTurnToDrawRef.current || fillingRef.current) return;
      const p = getPos(e);
      const c = erasingRef.current ? '#ffffff' : colorRef.current;
      const s = erasingRef.current ? sizeRef.current * 3 : sizeRef.current;
      localLine(lxRef.current, lyRef.current, p.x, p.y, c, s);
      drawBufRef.current.push({ x1: lxRef.current, y1: lyRef.current, x2: p.x, y2: p.y, c, s });
      lxRef.current = p.x;
      lyRef.current = p.y;
    };

    const onUp = () => { paintingRef.current = false; };

    const onTouchStart = (e: TouchEvent) => {
      if (!isMyTurnToDrawRef.current) return;
      const p = getPos(e);
      if (fillingRef.current) {
        localFill(p.x, p.y, colorRef.current, true);
        return;
      }
      paintingRef.current = true;
      lxRef.current = p.x;
      lyRef.current = p.y;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!paintingRef.current || !isMyTurnToDrawRef.current || fillingRef.current) return;
      e.preventDefault();
      const p = getPos(e);
      const c = erasingRef.current ? '#ffffff' : colorRef.current;
      const s = erasingRef.current ? sizeRef.current * 3 : sizeRef.current;
      localLine(lxRef.current, lyRef.current, p.x, p.y, c, s);
      drawBufRef.current.push({ x1: lxRef.current, y1: lyRef.current, x2: p.x, y2: p.y, c, s });
      lxRef.current = p.x;
      lyRef.current = p.y;
    };

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onUp);
    canvas.addEventListener('mouseleave', onUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onUp);

    return () => {
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('mouseleave', onUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onUp);
    };
  }, [phase, localLine, localFill, isMyTurnToDrawRef]);

  return { canvasRef, colorRef, sizeRef, erasingRef, fillingRef, drawBufRef, flushIvRef, localLine, localFill, resetCanvas, flushDraw };
}
