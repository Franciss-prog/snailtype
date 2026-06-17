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

export const gameState = $state({
  nickname: '',
  playerId: '',
  roomCode: '',
  isHost: false,
  hostId: '',
  players: [] as Player[],
  roomState: 'idle' as 'idle' | 'waiting' | 'countdown' | 'racing' | 'results',
  raceText: '',
  textLength: 'medium' as 'short' | 'medium' | 'long',
  countdown: 0,
  countdownStartedAt: null as number | null,
  raceStartedAt: null as number | null,
  myProgress: 0,
  myWpm: 0,
  myAccuracy: 0,
  results: [] as Player[],
  rematchVotes: 0,
  error: '',
})
