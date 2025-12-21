import { useState, useRef, useEffect } from 'react';
import { floatTo16BitPCM, arrayBufferToBase64 } from '../utils/audioHelpers';

interface UseAudioRecorderProps {
  onRecordingComplete: (payload: string) => void;
  onError: (msg: string) => void;
}

export const useAudioRecorder = ({ onRecordingComplete, onError }: UseAudioRecorderProps) => {
  const [isListening, setIsListening] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    setIsListening(false);
  };

  const cancelRecording = () => {
    chunksRef.current = [];
    stopListening();
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      setMediaStream(null);
    }
  };

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          autoGainControl: false,
          noiseSuppression: false,
          channelCount: 1
        } 
      });
      
      setMediaStream(stream);
      setIsListening(true);
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (chunksRef.current.length === 0) {
            if (stream) stream.getTracks().forEach(t => t.stop());
            setMediaStream(null);
            return;
        }

        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        
        if (stream) stream.getTracks().forEach(t => t.stop());
        setMediaStream(null);
        
        await processRecording(blob);
      };

      mediaRecorder.start();

      timerRef.current = setTimeout(() => {
        stopListening();
      }, 8000);

    } catch (e) {
      console.error(e);
      onError('Microphone denied or not available');
      setIsListening(false);
    }
  };

  const processRecording = async (blob: Blob) => {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      // Enforce 44.1kHz sample rate for backend compatibility
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 44100,
      });
      
      const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      
      const sampleRate = audioCtx.sampleRate;
      const pcmData = decodedBuffer.getChannelData(0); // Mono
      
      const pcm16Buffer = floatTo16BitPCM(Array.from(pcmData));
      const base64Audio = arrayBufferToBase64(pcm16Buffer);
      
      const payload = JSON.stringify({
          audio: base64Audio,
          sampleRate: sampleRate,
          channels: 1,
          sampleSize: 16, // Explicitly add sampleSize as required by backend
          duration: decodedBuffer.duration
      });

      onRecordingComplete(payload);

      if (audioCtx.state !== 'closed') {
        audioCtx.close();
      }

    } catch (e) {
      console.error("Processing failed", e);
      onError('Error processing audio recording');
    }
  };

  return { isListening, startListening, cancelRecording, mediaStream };
};