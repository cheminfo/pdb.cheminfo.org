import { useCallback, useEffect, useRef, useState } from 'react';
import { downloadBlob } from 'react-cheminfo/core';

export interface CanvasRecording {
  /** True while a MediaRecorder is actively writing to the buffer. */
  recording: boolean;
  /**
   * Begin recording the given canvas. No-op if a recording is already in
   * progress. The recorded file is downloaded automatically when `stop()` is
   * called.
   */
  start: (canvas: HTMLCanvasElement) => void;
  /** Stop recording and trigger a download of the captured video. */
  stop: () => void;
}

/**
 * React hook around the `HTMLCanvasElement.captureStream()` + `MediaRecorder`
 * pair that lets a caller record the contents of a WebGL canvas (e.g. the
 * Mol* viewport) to a `.webm` (or `.mp4`, depending on browser support) file.
 * @returns A `{ recording, start, stop }` controller.
 */
export function useCanvasRecording(): CanvasRecording {
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    recorderRef.current = null;
    setRecording(false);
    if (recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        // MediaRecorder may already be transitioning to inactive — ignore.
      }
    }
  }, []);

  const start = useCallback((canvas: HTMLCanvasElement) => {
    if (recorderRef.current) return;
    if (typeof canvas.captureStream !== 'function') {
      throw new Error('Canvas recording is not supported in this browser.');
    }
    // 30 fps captureStream + 8 Mbps VP9 keeps Mol*'s ribbon edges, echo text,
    // and atom highlights crisp without ballooning the file size (~1 MB/s).
    const stream = canvas.captureStream(30);
    const mimeType = pickSupportedMimeType();
    const options: MediaRecorderOptions = { videoBitsPerSecond: 8_000_000 };
    if (mimeType) options.mimeType = mimeType;
    const recorder = new MediaRecorder(stream, options);
    chunksRef.current = [];
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    });
    recorder.addEventListener('stop', () => {
      // Tracks are stopped here (rather than inline with `recorder.stop()`)
      // so MediaRecorder has finished flushing data into chunksRef before we
      // tear down the canvas stream — otherwise the trailing dataavailable
      // can be dropped and the saved video comes out empty.
      for (const track of recorder.stream.getTracks()) track.stop();
      // Source of truth: whenever the recorder reaches `inactive` (whether
      // via our `stop()` or because the underlying canvas stream ended), the
      // React `recording` flag must follow — otherwise the toolbar can be
      // left showing "Stop & save" after a recording has already finished.
      if (recorderRef.current === recorder) recorderRef.current = null;
      setRecording(false);
      const type = recorder.mimeType || 'video/webm';
      const blob = new Blob(chunksRef.current, { type });
      chunksRef.current = [];
      if (blob.size === 0) return;
      downloadBlob(blob, suggestedFilename(type));
    });
    recorder.start();
    recorderRef.current = recorder;
    setRecording(true);
  }, []);

  useEffect(() => {
    return () => {
      const recorder = recorderRef.current;
      if (!recorder) return;
      recorderRef.current = null;
      // The `stop` listener tears down the tracks; just trigger the stop.
      if (recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {
          // Recorder may already be inactive on unmount — ignore.
        }
      }
    };
  }, []);

  return { recording, start, stop };
}

function pickSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];
  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  return undefined;
}

function suggestedFilename(mimeType: string): string {
  const timestamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
  const extension = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm';
  return `scripting-${timestamp}.${extension}`;
}
