import { useEffect, useRef, useState } from 'react';
import { getSocket } from './socket';
import { MatchResult, DownloadStatus } from '../types';

interface UseSocketProps {
  url: string;
  onMatch: (matches: MatchResult[]) => void;
  onDownloadStatus: (data: DownloadStatus) => void;
  onTotalSongs: (count: number) => void;
}

export const useSocket = ({ url, onMatch, onDownloadStatus, onTotalSongs }: UseSocketProps) => {
  const [isConnected, setIsConnected] = useState(false);
  // Use ReturnType to match whatever hooks/socket.ts exports (likely Socket)
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);

  const onMatchRef = useRef(onMatch);
  const onDownloadStatusRef = useRef(onDownloadStatus);
  const onTotalSongsRef = useRef(onTotalSongs);

  useEffect(() => {
    onMatchRef.current = onMatch;
    onDownloadStatusRef.current = onDownloadStatus;
    onTotalSongsRef.current = onTotalSongs;
  }, [onMatch, onDownloadStatus, onTotalSongs]);

  useEffect(() => {
    const socket = getSocket(url);
    socketRef.current = socket;
    let isMounted = true;

    const handleConnect = () => {
      console.log('Socket connected:', socket.id);
      if (isMounted) setIsConnected(true);
      // Request total songs immediately on connect
      socket.emit('totalSongs', '');
    };

    const handleDisconnect = (reason: string) => {
      console.log('Socket disconnected:', reason);
      if (isMounted) setIsConnected(false);
    };

    const handleMatches = (data: any) => {
      // Backend sends a JSON string, need to parse it
      let parsed: MatchResult[] = [];
      try {
        if (typeof data === 'string') {
          parsed = JSON.parse(data);
        } else {
          parsed = data;
        }
      } catch (err) {
        console.error('Error parsing matches:', err);
      }
      onMatchRef.current?.(parsed);
    };

    const handleDownloadStatus = (data: any) => {
      // Backend sends a JSON string
      let parsed: DownloadStatus;
      try {
        if (typeof data === 'string') {
          parsed = JSON.parse(data);
        } else {
          parsed = data;
        }
      } catch (err) {
        console.error('Error parsing download status:', err);
        parsed = { type: 'info', message: typeof data === 'string' ? data : 'Unknown update' };
      }
      onDownloadStatusRef.current?.(parsed);
    };

    const handleTotalSongs = (data: any) => {
      const count = typeof data === 'number' ? data : parseInt(data, 10);
      if (!isNaN(count)) {
        onTotalSongsRef.current?.(count);
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('matches', handleMatches);
    socket.on('downloadStatus', handleDownloadStatus);
    socket.on('totalSongs', handleTotalSongs);

    // Initial check
    if (socket.connected) {
      if (isMounted) setIsConnected(true);
      socket.emit('totalSongs', '');
    }

    // Polling for total songs every minute
    const interval = setInterval(() => {
      if (socket && socket.connected) { 
        socket.emit('totalSongs', '');
      }
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('matches', handleMatches);
      socket.off('downloadStatus', handleDownloadStatus);
      socket.off('totalSongs', handleTotalSongs);
    };
  }, [url]);

  return { socket: socketRef.current, isConnected };
};