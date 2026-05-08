import { Server, Socket } from 'socket.io';
import * as store from './room-store';
import { translateText, detectLanguage } from './translation';

const VALID_LANG = /^[a-z]{2}$/;
const MAX_NAME_LEN = 50;

export interface UserInfo {
  name: string;
  language: string;
}

function toUserInfoList(roomId: string): UserInfo[] {
  return store.getUsersInRoom(roomId).map((u) => ({ name: u.name, language: u.language }));
}

function handleLeave(socket: Socket, io: Server) {
  const result = store.removeUser(socket.id);
  if (!result) return;

  const { roomId, user, roomEmpty } = result;

  if (roomEmpty) {
    // Last person left — room auto-deleted
    io.to(roomId).emit('room-deleted', { message: 'All participants left. Room closed.' });
    console.log(`[room] deleted: ${roomId}`);
  } else {
    io.to(roomId).emit('user-left', { name: user.name, users: toUserInfoList(roomId) });
    console.log(`[room] ${user.name} left ${roomId}`);
  }
}

// Per-socket rate limiting: prevents message spam
const messageCooldown = new Map<string, number>();

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    // ── Create Room ────────────────────────────────────────────────────────
    socket.on('create-room', async ({ name, language }: { name: string; language: string }) => {
      const trimmedName = typeof name === 'string' ? name.trim().slice(0, MAX_NAME_LEN) : '';
      if (!trimmedName) {
        socket.emit('join-error', 'Name cannot be empty.');
        return;
      }
      if (!VALID_LANG.test(language)) {
        socket.emit('join-error', 'Invalid language code.');
        return;
      }

      const roomId = store.createRoom();
      if (!roomId) {
        socket.emit('join-error', 'Server is at capacity. Please try again later.');
        return;
      }
      store.addUser(roomId, { socketId: socket.id, name: trimmedName, language });
      socket.join(roomId);

      socket.emit('room-joined', { roomId, users: toUserInfoList(roomId) });
      console.log(`[room] created: ${roomId} by "${trimmedName}"`);
    });

    // ── Join Room ──────────────────────────────────────────────────────────
    socket.on(
      'join-room',
      async ({ roomId, name, language }: { roomId: string; name: string; language: string }) => {
        const trimmedName = typeof name === 'string' ? name.trim().slice(0, MAX_NAME_LEN) : '';
        const upperRoomId = typeof roomId === 'string' ? roomId.trim().toUpperCase() : '';

        if (!trimmedName) {
          socket.emit('join-error', 'Name cannot be empty.');
          return;
        }
        if (!VALID_LANG.test(language)) {
          socket.emit('join-error', 'Invalid language code.');
          return;
        }
        if (!store.roomExists(upperRoomId)) {
          socket.emit('join-error', `Room "${upperRoomId}" not found. Check the code and try again.`);
          return;
        }

        const added = store.addUser(upperRoomId, { socketId: socket.id, name: trimmedName, language });
        if (!added) {
          // addUser returns false for duplicate name OR full room
          const isFull = store.isRoomFull(upperRoomId);
          socket.emit(
            'join-error',
            isFull
              ? 'This room is full (max 20 participants).'
              : `Name "${trimmedName}" is already taken in this room. Choose a different name.`,
          );
          return;
        }

        socket.join(upperRoomId);
        const users = toUserInfoList(upperRoomId);

        socket.emit('room-joined', { roomId: upperRoomId, users });
        socket.to(upperRoomId).emit('user-joined', { name: trimmedName, users });
        console.log(`[room] "${trimmedName}" joined ${upperRoomId}`);
      },
    );

    // ── Send Message ───────────────────────────────────────────────────────
    socket.on('send-message', async ({ roomId, text }: { roomId: string; text: string }) => {
      const sender = store.getUserInRoom(roomId, socket.id);
      if (!sender) return;

      // Input validation
      if (!text || typeof text !== 'string' || text.trim().length === 0) return;
      const safeText = text.slice(0, 2000);

      // Rate limit: max 1 message per 500ms per socket
      const now = Date.now();
      if (now - (messageCooldown.get(socket.id) ?? 0) < 500) return;
      messageCooldown.set(socket.id, now);

      // Detect the language the sender actually typed in.
      // They may type in English OR their selected language — both are valid.
      // Fall back to sender.language if detection is low-confidence.
      const detected = await detectLanguage(safeText);
      const sourceLang = detected.confidence >= 0.5 ? detected.code : sender.language;
      const users = store.getUsersInRoom(roomId);

      // Translate to all unique target languages in parallel.
      // Skip translation for any user whose language matches the detected source.
      const uniqueTargetLangs = [...new Set(users.map(u => u.language).filter(l => l !== sourceLang))];
      const settled = await Promise.allSettled(
        uniqueTargetLangs.map(lang =>
          translateText(safeText, lang, sourceLang).then(t => ({ lang, t }))
        )
      );
      const cache = new Map<string, string>([[sourceLang, safeText]]);
      for (const r of settled) {
        if (r.status === 'fulfilled') cache.set(r.value.lang, r.value.t);
      }

      const timestamp = now;
      for (const user of users) {
        io.to(user.socketId).emit('message', {
          senderName: sender.name,
          senderLang: sourceLang,
          text: cache.get(user.language) ?? safeText,
          originalText: safeText,
          isOwn: user.socketId === socket.id,
          timestamp,
        });
      }
    });

    // ── Leave / Disconnect ─────────────────────────────────────────────────
    socket.on('leave-room', () => {
      handleLeave(socket, io);
      socket.disconnect();
    });

    socket.on('disconnect', () => {
      messageCooldown.delete(socket.id);
      handleLeave(socket, io);
      console.log(`[socket] disconnected: ${socket.id}`);
    });
  });
}
