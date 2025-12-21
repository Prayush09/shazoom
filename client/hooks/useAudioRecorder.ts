import { useState, useRef, useEffect } from 'react';
import { floatTo16BitPCM, arrayBufferToBase64 } from '../utils/audioHelpers';

interface UseAudioRecorderProps {
  onRecordingComplete: (payload: string) => void;
  onError: (msg: string) => void;
}

export const useAudioRecorder = ({ onRecordingComplete, onError }: UseAudioRecorderProps) => {
  const [isListening, setIsListening] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioDataRef = useRef<number[]>([]);
  const sampleRateRef = useRef<number>(44100);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  const stopListening = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    setIsListening(false);
    
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      setMediaStream(null);
    }
    
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
    }
  };

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMediaStream(stream);
      setIsListening(true);
      audioDataRef.current = [];

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 44100,
      });
      // Capture actual sample rate
      sampleRateRef.current = audioCtx.sampleRate;
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        for (let i = 0; i < inputData.length; i++) {
          audioDataRef.current.push(inputData[i]);
        }
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);

      // Auto-stop after 8 seconds
      timerRef.current = setTimeout(() => {
        processRecording();
      }, 8000);

    } catch (e) {
      console.error(e);
      onError('Microphone denied');
      setIsListening(false);
    }
  };

  const processRecording = () => {
    // If buffer is empty, it means we probably cancelled
    if (audioDataRef.current.length === 0) return;

    const rate = sampleRateRef.current;
    const data = audioDataRef.current;

    stopListening(); // Updates isListening -> false
    
    try {
      const pcmBuffer = floatTo16BitPCM(data);
      const base64Audio = arrayBufferToBase64(pcmBuffer);
      const payload = JSON.stringify({
          audio: base64Audio,
          sampleRate: rate,
          channels: 1,
      });
      onRecordingComplete(payload);
      audioDataRef.current = [];
    } catch (e) {
      console.error(e);
      onError('Error processing audio');
    }
  };

  const cancelRecording = () => {
    stopListening();
    audioDataRef.current = []; // Clear buffer so processRecording doesn't fire
  };

  return { isListening, startListening, cancelRecording, mediaStream };
};