// Shared data types for socket events (no socket.io imports — safe in client components)

export interface UserInfo {
  name: string;
  language: string; // BCP-47 code
}

export interface RoomMessageData {
  senderName: string;
  senderLang: string;
  text: string;          // translated into receiver's language
  originalText: string;  // sender's original text in their own language
  isOwn: boolean;
  timestamp: number;
}
