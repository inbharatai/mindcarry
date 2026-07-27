import { useEffect, useRef, useState } from 'react';

type Props = {
  enabled: boolean;
  onMovementChange: (value: number) => void;
};

export function CameraObserver({ enabled, onMovementChange }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previousFrame = useRef<Uint8ClampedArray | null>(null);
  const [status, setStatus] = useState<'off' | 'starting' | 'on' | 'error'>('off');
  const [movement, setMovement] = useState(0);

  useEffect(() => {
    let timer: number | undefined;
    async function start() {
      if (!enabled) return;
      setStatus('starting');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: 'user' },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus('on');
        timer = window.setInterval(() => {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (!video || !canvas || video.readyState < 2) return;
          const context = canvas.getContext('2d', { willReadFrequently: true });
          if (!context) return;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const current = context.getImageData(0, 0, canvas.width, canvas.height).data;
          const previous = previousFrame.current;
          if (previous) {
            let difference = 0;
            for (let index = 0; index < current.length; index += 16) {
              difference += Math.abs(current[index] - previous[index]);
              difference += Math.abs(current[index + 1] - previous[index + 1]);
              difference += Math.abs(current[index + 2] - previous[index + 2]);
            }
            const sampleCount = current.length / 16;
            const score = Math.min(1, difference / (sampleCount * 255 * 3) * 8);
            const rounded = Number(score.toFixed(3));
            setMovement(rounded);
            onMovementChange(rounded);
          }
          previousFrame.current = new Uint8ClampedArray(current);
        }, 700);
      } catch {
        setStatus('error');
      }
    }
    start();
    return () => {
      if (timer) window.clearInterval(timer);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      previousFrame.current = null;
      if (!enabled) setStatus('off');
    };
  }, [enabled, onMovementChange]);

  if (!enabled) {
    return (
      <div className="camera-card camera-off">
        <span className="status-dot" /> Camera observation is off
      </div>
    );
  }

  return (
    <div className="camera-card">
      <div className="camera-header">
        <span><span className={`status-dot ${status}`} /> Local camera observation</span>
        <strong>{status === 'on' ? `Movement ${Math.round(movement * 100)}%` : status}</strong>
      </div>
      <video ref={videoRef} muted playsInline aria-label="Local camera preview" />
      <canvas ref={canvasRef} width="80" height="60" hidden />
      <p>Frames are analysed locally. Raw video is not stored or sent to Gemini.</p>
    </div>
  );
}
