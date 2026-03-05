import { useEffect, useRef } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useChatStore } from '@/stores/chatStore';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function drawWaveformBars(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  getHeight: (index: number, barCount: number) => number,
  dimmed: boolean,
) {
  const barCount = 38;
  const spacing = 4;
  const barWidth = (canvas.width - spacing * (barCount - 1)) / barCount;
  const centerY = canvas.height / 2;

  for (let i = 0; i < barCount; i++) {
    const height = Math.max(4, getHeight(i, barCount));
    const x = i * (barWidth + spacing);
    const y = centerY - height / 2;

    const gradientRatio = i / barCount;
    const alpha = dimmed ? 0.35 : 1;

    let r: number;
    let g: number;
    let b: number;

    if (gradientRatio < 0.5) {
      const mix = gradientRatio * 2;
      r = 16 * (1 - mix) + 20 * mix;
      g = 185 * (1 - mix) + 184 * mix;
      b = 129 * (1 - mix) + 166 * mix;
    } else {
      const mix = (gradientRatio - 0.5) * 2;
      r = 20 * (1 - mix) + 59 * mix;
      g = 184 * (1 - mix) + 130 * mix;
      b = 166 * (1 - mix) + 246 * mix;
    }

    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, height, 2);
    ctx.fill();
  }
}

export function AudioWaveform({ className }: { className?: string }) {
  const isVoiceRecording = useChatStore((state) => state.isVoiceRecording);
  const prefersReducedMotion = usePrefersReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  useEffect(() => {
    let audioContext: AudioContext;
    let localStream: MediaStream | null = null;

    if (isVoiceRecording) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((mediaStream) => {
          localStream = mediaStream;
          const AudioContextClass =
            window.AudioContext ||
            (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

          if (!AudioContextClass) {
            return;
          }

          audioContext = new AudioContextClass();
          const source = audioContext.createMediaStreamSource(mediaStream);
          const analyser = audioContext.createAnalyser();

          analyser.fftSize = 256;
          source.connect(analyser);

          const bufferLength = analyser.frequencyBinCount;
          dataArrayRef.current = new Uint8Array(new ArrayBuffer(bufferLength));
          analyserRef.current = analyser;
        })
        .catch((err) => {
          console.error('Microphone access denied:', err);
        });
    }

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }

      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }

      analyserRef.current = null;
      dataArrayRef.current = null;
    };
  }, [isVoiceRecording]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    if (prefersReducedMotion) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawWaveformBars(
        ctx,
        canvas,
        (i, barCount) => {
          const center = Math.abs((barCount - 1) / 2 - i);
          return 6 + Math.max(0, 16 - center * 0.9);
        },
        !isVoiceRecording,
      );
      return;
    }

    const draw = () => {
      time += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isVoiceRecording && analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      }

      drawWaveformBars(
        ctx,
        canvas,
        (i, barCount) => {
          if (isVoiceRecording && dataArrayRef.current) {
            const dataIndex = Math.floor((i * (dataArrayRef.current.length * 0.5)) / barCount);
            const rawValue = dataArrayRef.current[dataIndex];
            return 4 + (rawValue / 255.0) * 38;
          }

          if (isVoiceRecording && !dataArrayRef.current) {
            const baseWave = Math.sin(time + i * 0.2);
            const fastWave = Math.sin(time * 3 + i * 0.5);
            return 5 + Math.abs(baseWave * 9 + fastWave * 4);
          }

          const idlePulse = Math.sin(time + i * 0.08);
          return 4 + Math.abs(idlePulse * 2);
        },
        !isVoiceRecording,
      );

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isVoiceRecording, prefersReducedMotion]);

  return (
    <div className={cn('relative flex h-[42px] w-full items-center justify-center', className)}>
      <canvas ref={canvasRef} width={300} height={42} className="h-full w-full max-w-[300px]" />
    </div>
  );
}
