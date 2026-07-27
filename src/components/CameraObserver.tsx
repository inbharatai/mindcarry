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
  const smoothedMovement = useRef(0);
  const [status, setStatus] = useState<'off' | 'starting' | 'on' | 'error'>('off');
  const [movement, setMovement] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setStatus('off');
      setMovement(0);
      onMovementChange(0);
      return undefined;
    }

    let cancelled = false;
    let timer: number | undefined;

    const stopStream = (stream?: MediaStream | null) => {
      stream?.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Track may already be stopped.
        }
      });
    };

    async function start() {
      setStatus('starting');
      let acquiredStream: MediaStream | null = null;
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera API is unavailable.');
        acquiredStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 320 },
            height: { ideal: 240 },
            facingMode: 'user',
            frameRate: { ideal: 15, max: 20 },
          },
          audio: false,
        });
        if (cancelled) {
          stopStream(acquiredStream);
          return;
        }
        streamRef.current = acquiredStream;
        const video = videoRef.current;
        if (!video) throw new Error('Camera preview is unavailable.');
        video.srcObject = acquiredStream;
        await video.play();
        if (cancelled) {
          video.srcObject = null;
          stopStream(acquiredStream);
          return;
        }
        setStatus('on');

        timer = window.setInterval(() => {
          const currentVideo = videoRef.current;
          const canvas = canvasRef.current;
          if (!currentVideo || !canvas || currentVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
          const context = canvas.getContext('2d', { willReadFrequently: true });
          if (!context) return;
          context.drawImage(currentVideo, 0, 0, canvas.width, canvas.height);
          const current = context.getImageData(0, 0, canvas.width, canvas.height).data;
          const previous = previousFrame.current;
          if (previous && previous.length === current.length) {
            let difference = 0;
            let samples = 0;
            for (let index = 0; index < current.length; index += 16) {
              difference += Math.abs(current[index] - previous[index]);
              difference += Math.abs(current[index + 1] - previous[index + 1]);
              difference += Math.abs(current[index + 2] - previous[index + 2]);
              samples += 1;
            }
            const raw = samples ? Math.min(1, (difference / (samples * 255 * 3)) * 8) : 0;
            smoothedMovement.current = smoothedMovement.current * 0.65 + raw * 0.35;
            const rounded = Number(smoothedMovement.current.toFixed(3));
            setMovement(rounded);
            onMovementChange(rounded);
          }
          previousFrame.current = new Uint8ClampedArray(current);
        }, 700);
      } catch {
        stopStream(acquiredStream);
        if (streamRef.current === acquiredStream) streamRef.current = null;
        const video = videoRef.current;
        if (video) video.srcObject = null;
        if (!cancelled) {
          setStatus('error');
          setMovement(0);
          onMovementChange(0);
        }
      }
    }

    void start();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearInterval(timer);
      const video = videoRef.current;
      if (video) video.srcObject = null;
      stopStream(streamRef.current);
      streamRef.current = null;
      previousFrame.current = null;
      smoothedMovement.current = 0;
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