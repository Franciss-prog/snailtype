import type { Server, Socket } from 'socket.io'
import { generateRoomCode } from '../utils/roomCode'
import { getRandomText } from '../utils/texts'

type Player = {
  id: string
  nickname: string
  progress: number
  wpm: number
  accuracy: number
  finished: boolean
  finishTime: number | null
  position: number | null
  surrendered: boolean
}

type Room = {
  code: string
  hostId: string
  players: Map<string, Player>
  state: 'waiting' | 'countdown' | 'racing' | 'results'
  text: string
  textLength: 'short' | 'medium' | 'long'
  startTime: number | null
  rematchVotes: Set<string>
}

const rooms = new Map<string, Room>()

function getRoomData(room: Room) {
  return {
    code: room.code,
    hostId: room.hostId,
    state: room.state,
    text: room.text,
    textLength: room.textLength,
    startTime: room.startTime,
    players: Array.from(room.players.values()),
    rematchVotes: room.rematchVotes.size,
  }
}

function removePlayerFromRoom(socketId: string) {
  for (const [code, room] of rooms) {
    if (room.players.has(socketId)) {
      const player = room.players.get(socketId)!
      room.players.delete(socketId)

      if (room.players.size === 0) {
        rooms.delete(code)
        return
      }

      if (room.hostId === socketId) {
        const nextHost = room.players.values().next().value
        if (nextHost) room.hostId = nextHost.id
      }

      return { code, room, player }
    }
  }
  return null
}

export function initSocketServer(io: Server) {
  io.on('connection', (socket: Socket) => {
    socket.on('create_room', ({ nickname, textLength }: { nickname: string; textLength?: 'short' | 'medium' | 'long' }) => {
      const code = generateRoomCode()
      const player: Player = {
        id: socket.id,
        nickname: nickname.trim(),
        progress: 0,
        wpm: 0,
        accuracy: 100,
        finished: false,
        finishTime: null,
        position: null,
        surrendered: false,
      }
      const room: Room = {
        code,
        hostId: socket.id,
        players: new Map([[socket.id, player]]),
        state: 'waiting',
        text: '',
        textLength: textLength || 'medium',
        startTime: null,
        rematchVotes: new Set(),
      }
      rooms.set(code, room)
      socket.join(code)
      socket.emit('room_created', { code, room: getRoomData(room) })
      io.to(code).emit('room_updated', { room: getRoomData(room) })
    })

    socket.on('join_room', ({ nickname, code }: { nickname: string; code: string }) => {
      const room = rooms.get(code.toUpperCase())
      if (!room) {
        socket.emit('error', { message: 'Room not found' })
        return
      }
      if (room.state !== 'waiting') {
        socket.emit('error', { message: 'Race already in progress' })
        return
      }
      const player: Player = {
        id: socket.id,
        nickname: nickname.trim(),
        progress: 0,
        wpm: 0,
        accuracy: 100,
        finished: false,
        finishTime: null,
        position: null,
        surrendered: false,
      }
      room.players.set(socket.id, player)
      socket.join(code.toUpperCase())
      socket.emit('room_updated', { room: getRoomData(room) })
      socket.to(code.toUpperCase()).emit('player_joined', { player, room: getRoomData(room) })
      io.to(code.toUpperCase()).emit('room_updated', { room: getRoomData(room) })
    })

    socket.on('set_text_length', (length: 'short' | 'medium' | 'long') => {
      for (const [code, room] of rooms) {
        if (room.hostId === socket.id) {
          room.textLength = length
          io.to(code).emit('room_updated', { room: getRoomData(room) })
          return
        }
      }
    })

    socket.on('leave_room', () => {
      const result = removePlayerFromRoom(socket.id)
      if (result) {
        socket.leave(result.code)
        io.to(result.code).emit('player_left', { playerId: socket.id, room: getRoomData(result.room) })
        io.to(result.code).emit('room_updated', { room: getRoomData(result.room) })
      }
    })

    socket.on('start_race', () => {
      for (const [code, room] of rooms) {
        if (room.hostId === socket.id) {
          if (room.players.size < 2) {
            socket.emit('error', { message: 'Need at least 2 players to start' })
            return
          }
          if (room.state !== 'waiting') {
            socket.emit('error', { message: 'Race already started' })
            return
          }
          room.text = getRandomText(room.textLength)
          room.state = 'countdown'
          room.startTime = null

          io.to(code).emit('countdown_started', { countdown: 3 })

          let count = 3
          const countdownInterval = setInterval(() => {
            count--
            if (count > 0) {
              io.to(code).emit('countdown_started', { countdown: count })
            } else {
              clearInterval(countdownInterval)
              room.state = 'racing'
              room.startTime = Date.now()
              for (const [, p] of room.players) {
                p.progress = 0
                p.wpm = 0
                p.accuracy = 100
                p.finished = false
                p.finishTime = null
                p.position = null
                p.surrendered = false
              }
              io.to(code).emit('race_started', { text: room.text, startTime: room.startTime })
            }
          }, 1000)
          return
        }
      }
    })

    socket.on('progress_update', ({ progress, wpm, accuracy }: { progress: number; wpm: number; accuracy: number }) => {
      for (const [code, room] of rooms) {
        if (room.players.has(socket.id) && room.state === 'racing') {
          const player = room.players.get(socket.id)!
          if (!player.finished) {
            player.progress = progress
            player.wpm = wpm
            player.accuracy = accuracy
          }
          socket.to(code).emit('player_progress', {
            playerId: socket.id,
            progress: player.progress,
            wpm: player.wpm,
            accuracy: player.accuracy,
            finished: player.finished,
            position: player.position,
            surrendered: player.surrendered,
          })
          return
        }
      }
    })

    socket.on('finish_race', ({ wpm, accuracy }: { wpm: number; accuracy: number }) => {
      for (const [code, room] of rooms) {
        if (room.players.has(socket.id) && room.state === 'racing') {
          const player = room.players.get(socket.id)!
          if (player.finished) return

          const finishedPlayers = Array.from(room.players.values()).filter((p) => p.finished)
          player.finished = true
          player.wpm = wpm
          player.accuracy = accuracy
          player.finishTime = Date.now()
          player.position = finishedPlayers.length + 1
          player.progress = 100

          io.to(code).emit('player_progress', {
            playerId: socket.id,
            progress: 100,
            wpm: player.wpm,
            accuracy: player.accuracy,
            finished: true,
            position: player.position,
            surrendered: false,
          })

          const allFinished = Array.from(room.players.values()).every((p) => p.finished)
          if (allFinished) {
            room.state = 'results'
            const results = Array.from(room.players.values())
              .sort((a, b) => (a.position || 99) - (b.position || 99))
            io.to(code).emit('race_finished', { results })
          } else {
            setTimeout(() => {
              if (room.state === 'racing') {
                room.state = 'results'
                const results = Array.from(room.players.values())
                  .sort((a, b) => (a.position || 99) - (b.position || 99))
                io.to(code).emit('race_finished', { results })
              }
            }, 60000)
          }
          return
        }
      }
    })

    socket.on('surrender', () => {
      for (const [code, room] of rooms) {
        if (room.players.has(socket.id) && room.state === 'racing') {
          const player = room.players.get(socket.id)!
          if (player.finished) return

          const finishedPlayers = Array.from(room.players.values()).filter((p) => p.finished)
          player.finished = true
          player.surrendered = true
          player.finishTime = Date.now()
          player.position = finishedPlayers.length + 1

          io.to(code).emit('player_progress', {
            playerId: socket.id,
            progress: player.progress,
            wpm: 0,
            accuracy: 0,
            finished: true,
            position: player.position,
            surrendered: true,
          })

          const allFinished = Array.from(room.players.values()).every((p) => p.finished)
          if (allFinished) {
            room.state = 'results'
            const results = Array.from(room.players.values())
              .sort((a, b) => (a.position || 99) - (b.position || 99))
            io.to(code).emit('race_finished', { results })
          }
          return
        }
      }
    })

    socket.on('rematch_vote', () => {
      for (const [code, room] of rooms) {
        if (room.players.has(socket.id)) {
          room.rematchVotes.add(socket.id)
          io.to(code).emit('room_updated', { room: getRoomData(room) })

          if (room.rematchVotes.size >= room.players.size) {
            room.rematchVotes.clear()
            room.text = getRandomText(room.textLength)
            room.state = 'countdown'
            room.startTime = null
            for (const [, p] of room.players) {
              p.progress = 0
              p.wpm = 0
              p.accuracy = 100
              p.finished = false
              p.finishTime = null
              p.position = null
              p.surrendered = false
            }

            io.to(code).emit('rematch_started', { room: getRoomData(room) })

            let count = 3
            io.to(code).emit('countdown_started', { countdown: count })
            const countdownInterval = setInterval(() => {
              count--
              if (count > 0) {
                io.to(code).emit('countdown_started', { countdown: count })
              } else {
                clearInterval(countdownInterval)
                room.state = 'racing'
                room.startTime = Date.now()
                io.to(code).emit('race_started', { text: room.text, startTime: room.startTime })
              }
            }, 1000)
          }
          return
        }
      }
    })

    socket.on('disconnect', () => {
      const result = removePlayerFromRoom(socket.id)
      if (result) {
        io.to(result.code).emit('player_left', { playerId: socket.id, room: getRoomData(result.room) })
        io.to(result.code).emit('room_updated', { room: getRoomData(result.room) })
      }
    })
  })
}
