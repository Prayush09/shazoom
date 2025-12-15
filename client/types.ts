
export interface SongResult {
  title: string;
  artist: string;
  album: string;
  coverArt: string;
  timeAgo: string;
}

export interface WebSocketMessage {
  type: 'status' | 'result' | 'error';
  data?: any;
  message?: string;
}
