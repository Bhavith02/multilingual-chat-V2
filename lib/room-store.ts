export interface RoomUser {
  socketId: string;
  name: string;
  language: string; // BCP-47 code e.g. "hi", "en"
}

interface Room {
  id: string;
  users: Map<string, RoomUser>; // socketId → user
  createdAt: number;
}

const rooms = new Map<string, Room>();

const MAX_ROOMS = 200;
const MAX_USERS_PER_ROOM = 20;

// No confusable characters (0/O, 1/I/l excluded)
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateRoomId(): string {
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return rooms.has(id) ? generateRoomId() : id;
}

export function createRoom(): string | null {
  if (rooms.size >= MAX_ROOMS) return null;
  const id = generateRoomId();
  rooms.set(id, { id, users: new Map(), createdAt: Date.now() });
  return id;
}

export function roomExists(id: string): boolean {
  return rooms.has(id);
}

export function isRoomFull(id: string): boolean {
  const room = rooms.get(id);
  return !!room && room.users.size >= MAX_USERS_PER_ROOM;
}

export function getUserInRoom(roomId: string, socketId: string): RoomUser | undefined {
  return rooms.get(roomId)?.users.get(socketId);
}

/**
 * Returns false if room not found or name already taken (case-insensitive).
 */
export function addUser(roomId: string, user: RoomUser): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;
  if (room.users.size >= MAX_USERS_PER_ROOM) return false;
  for (const u of room.users.values()) {
    if (u.name.toLowerCase() === user.name.toLowerCase()) return false;
  }
  room.users.set(user.socketId, user);
  return true;
}

/**
 * Removes user from whichever room they're in.
 * Returns info needed to broadcast, or null if not found.
 */
export function removeUser(
  socketId: string,
): { roomId: string; user: RoomUser; roomEmpty: boolean } | null {
  for (const [roomId, room] of rooms.entries()) {
    const user = room.users.get(socketId);
    if (user) {
      room.users.delete(socketId);
      const roomEmpty = room.users.size === 0;
      if (roomEmpty) rooms.delete(roomId);
      return { roomId, user, roomEmpty };
    }
  }
  return null;
}

export function getUsersInRoom(roomId: string): RoomUser[] {
  return Array.from(rooms.get(roomId)?.users.values() ?? []);
}
