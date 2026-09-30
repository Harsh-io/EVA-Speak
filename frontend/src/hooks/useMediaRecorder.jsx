// WebRTC media recorder hook for EVA Speak
import { useState, useRef, useCallback, useEffect } from 'react';

export function useMediaRecorder({ maxDurationMs = 120000, onStop } = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [stream, setStream] = useState(null);
  const [blob, setBlob] = useState(null);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const videoRef = useRef(null);

  const startStream = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      setStream(mediaStream);
      setError(null);
      return mediaStream;
    } catch (err) {
      setError('Camera/microphone access denied. Please allow access and try again.');
      return null;
    }
  }, []);

  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const startRecording = useCallback(async () => {
    let mediaStream = stream;
    if (!mediaStream) {
      mediaStream = await startStream();
      if (!mediaStream) return;
    }

    chunksRef.current = [];
    setBlob(null);

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm';

    const recorder = new MediaRecorder(mediaStream, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const recordedBlob = new Blob(chunksRef.current, { type: mimeType });
      setBlob(recordedBlob);
      setIsRecording(false);
      setIsPaused(false);
      clearInterval(timerRef.current);
      onStop?.(recordedBlob);
    };

    recorder.start(1000); // Collect data every second
    setIsRecording(true);
    setIsPaused(false);
    startTimeRef.current = Date.now();
    setElapsed(0);

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      setElapsed(elapsed);
      if (elapsed >= maxDurationMs) {
        recorder.stop();
      }
    }, 100);
  }, [stream, startStream, maxDurationMs, onStop]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    clearInterval(timerRef.current);
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      clearInterval(timerRef.current);
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      startTimeRef.current = Date.now() - elapsed;
      timerRef.current = setInterval(() => {
        const newElapsed = Date.now() - startTimeRef.current;
        setElapsed(newElapsed);
        if (newElapsed >= maxDurationMs) {
          mediaRecorderRef.current.stop();
        }
      }, 100);
    }
  }, [elapsed, maxDurationMs]);

  const resetRecording = useCallback(() => {
    setBlob(null);
    setElapsed(0);
    chunksRef.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  return {
    isRecording,
    isPaused,
    elapsed,
    stream,
    blob,
    error,
    videoRef,
    startStream,
    stopStream,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
  };
}
