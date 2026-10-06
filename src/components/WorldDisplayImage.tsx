import { useRef, useState } from 'react';
import { useWorldDisplayPath } from '../useWorldDisplayPath';
import { useRobotBlink } from '../useRobotBlink';

export default function WorldDisplayImage({ itemId, slot, fallback, className, alt }: {
  itemId: string; slot: string; fallback: string; className: string; alt: string;
}) {
  const ref = useRef<HTMLImageElement>(null);
  const preferred = useWorldDisplayPath(itemId, slot, ref) ?? fallback;
  const [failed, setFailed] = useState<string>();
  const [decodedBlinkFrame, setDecodedBlinkFrame] = useState<string>();
  const src = failed === preferred ? fallback : preferred;
  const isRobot = slot === 'robot';
  const blink = useRobotBlink(ref, src, isRobot ? itemId : undefined);
  const showBlink = isRobot && !!blink.frame && decodedBlinkFrame === blink.frame && blink.src === blink.frame;
  if (failed === fallback) return null;
  if (!isRobot) return <img ref={ref} src={src || undefined} className={className} alt={alt} decoding="async" onError={() => setFailed(src)} />;
  return <>
    <img ref={ref} src={src || undefined} className={className} alt={alt} decoding="async" style={showBlink ? { visibility: 'hidden' } : undefined} onError={() => setFailed(src)} />
    {blink.frame && <img
      className="v64-robot-blink-buffer"
      src={blink.frame}
      alt=""
      aria-hidden="true"
      data-robot-motion={showBlink ? 'blink' : undefined}
      decoding="sync"
      style={{ visibility: showBlink ? 'visible' : 'hidden' }}
      onLoad={event => {
        const element = event.currentTarget;
        const frame = blink.frame;
        void element.decode().then(() => { if (element.isConnected) setDecodedBlinkFrame(frame); }, blink.disableFrame);
      }}
      onError={blink.disableFrame}
    />}
  </>;
}
