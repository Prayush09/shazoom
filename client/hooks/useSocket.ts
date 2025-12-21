import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket } from './socket';
import { MatchResult, DownloadStatus } from '../types';

interface UseSocketProps {
  url: string;
  onMatch: (matches: MatchResult[]) => void;
  onDownloadStatus: (data: DownloadStatus) => void;
}

export const useSocket = ({ url, onMatch, onDownloadStatus }: UseSocketProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<SocketIOClient.Socket | null>(null);

  const onMatchRef = useRef(onMatch);
  const onDownloadStatusRef = useRef(onDownloadStatus);

  useEffect(() => {
    onMatchRef.current = onMatch;
    onDownloadStatusRef.current = onDownloadStatus;
  }, [onMatch, onDownloadStatus]);

  useEffect(() => {
    const socket = getSocket(url);
    socketRef.current = socket;
    let isMounted = true;

    // Use single set of handlers
    const handleConnect = () => {
      console.log('Socket connected:', socket.id);
      if (isMounted) setIsConnected(true);
    };

    const handleDisconnect = (reason: string) => {
      console.log('Socket disconnected:', reason);
      if (isMounted) setIsConnected(false);
    };

    const handleMatches = (data: MatchResult[]) => {
      onMatchRef.current?.(data);
    };

    const handleDownloadStatus = (data: DownloadStatus) => {
      onDownloadStatusRef.current?.(data);
    };

    // Attach
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('matches', handleMatches);
    socket.on('downloadStatus', handleDownloadStatus);

    if (socket.connected) {
      setIsConnected(true);
    }

    return () => {
      isMounted = false;
      // MUST use the exact same function names used in .on()
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('matches', handleMatches);
      socket.off('downloadStatus', handleDownloadStatus);
    };
  }, [url]);

  return { socket: socketRef.current, isConnected };
};