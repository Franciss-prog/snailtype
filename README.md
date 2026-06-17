<div align="center">
  <img src="./snailtype-logo.png" alt="SnailType logo" width="100">
  <h1>SnailType</h1>
</div>

A realtime multiplayer typing race where players compete by guiding their snails to the finish line.

SnailType is a WebSocket-powered project built to explore realtime communication, room management, live synchronization, and multiplayer game mechanics using **SvelteKit** and **TailwindCSS**. No accounts required — just create a room, share the code, and start racing.

---

## Concept

Every player receives the same text. As they type, their snail moves across the track in realtime. The first snail to cross the finish line wins. Players can watch opponents' progress live, compare typing speed, and immediately start a rematch.

```
Franciss 🐌──────────────🏁 82%
John     🐌──────────🏁 65%
Mike     🐌──────🏁 31%
```

---

## Goals

- Learn WebSockets
- Learn realtime state synchronization
- Learn multiplayer room management
- Learn server-authoritative game state
- Build something fun and interactive

---

## Core Features

### Room System

- Create a room or join with a room code (e.g. `ABCD12`)
- Nickname only — no authentication required

### Waiting Room

- Live player list with host badge
- Realtime join/leave updates
- Host controls race settings (text length, etc.)

### Typing Race

- Shared text prompt for all players
- Live progress, WPM, and accuracy updates
- Live race position tracking

### Results

- Final ranking with WPM, accuracy, and completion time for all players

### Rematch

- Vote to rematch → new text generated → countdown starts again instantly

---

## User Flow

```
Home
 ├── Enter nickname
 ├── Create Room → room code generated → host redirected to waiting room
 └── Join Room   → enter nickname + room code → join waiting room

Waiting Room
 ├── See room code, connected players, host badge
 └── Host: select text length → click Start

Race Start
 └── Countdown: 3... 2... 1... SCOOT! 🐌

During Race
 ├── Player types text
 ├── Client sends: progress %, WPM, finished status
 └── Server broadcasts updates to all players

Finish
 ├── Finish time + position recorded per player
 └── Race ends when everyone finishes or timeout is reached

Results → Rematch (optional)
```

---

## WebSocket Events

### Client → Server

| Event             | Description            |
| ----------------- | ---------------------- |
| `create_room`     | Create a new room      |
| `join_room`       | Join an existing room  |
| `leave_room`      | Leave the current room |
| `start_race`      | Host starts the race   |
| `progress_update` | Send typing progress   |
| `finish_race`     | Signal race completion |
| `rematch_vote`    | Vote for a rematch     |

### Server → Client

| Event               | Description                  |
| ------------------- | ---------------------------- |
| `room_created`      | Confirm room creation        |
| `room_updated`      | Room state changed           |
| `player_joined`     | A player joined              |
| `player_left`       | A player left                |
| `countdown_started` | Race countdown begins        |
| `race_started`      | Race is live                 |
| `player_progress`   | Progress update for a player |
| `race_finished`     | Race has ended               |
| `rematch_started`   | Rematch countdown begins     |

---

## MVP Scope

Version 1 includes only the essentials:

- Room creation and joining
- Waiting room
- Live typing race
- Results screen
- Rematch

No authentication. No leaderboard. No profiles. Keep it simple and ship it.

---

## Future Features

- Global leaderboard
- Match history
- Ghost races (race against your previous run)
- Ranked matchmaking
- Team races
- Battle Royale mode
- Spectator mode
- Private rooms with custom text packs
- Daily challenges
- Achievements
- Replay system

---

## UI & Theme

SnailType goes for a **terminal-core aesthetic** — like a dev tool that somehow became a typing game.

```
┌─────────────────────────────────────────────┐
│  SNAILTYPE 🐌          room: ABCD12         │
├─────────────────────────────────────────────┤
│  > franciss  🐌████████████░░░░  82%  91wpm │
│  > john      🐌█████████░░░░░░░  65%  74wpm │
│  > mike      🐌████░░░░░░░░░░░░  31%  58wpm │
├─────────────────────────────────────────────┤
│  the quick brown fox jumps over the lazy... │
│  the quick brown fox jumps over the lazy_   │
└─────────────────────────────────────────────┘
```

### Color Palette

| Role       | Hex       | Usage                             |
| ---------- | --------- | --------------------------------- |
| Background | `#1e1e1e` | Dark charcoal base                |
| Surface    | `#2c2c2c` | Cards, panels                     |
| Accent     | `#7ab648` | Progress bars, highlights, cursor |
| Muted      | `#555555` | Borders, inactive text            |
| Foreground | `#f0f0f0` | Primary text                      |

### Typography

- **Font:** [JetBrains Mono](https://www.jetbrains.com/lp/mono/) — monospaced throughout, no exceptions
- All text, UI labels, stats, and ASCII decorations use the same typeface for that pure terminal feel

### Design Principles

- ASCII borders and box-drawing characters (`┌ ─ ┐ │ └ ┘`) for layout structure
- No rounded corners, no shadows, no gradients — flat and deliberate
- Blinking cursor `_` on the active typing input
- Progress shown as filled blocks `█` and empty blocks `░`
- Minimal iconography — emoji used sparingly and intentionally (🐌 🏁 🥇)

---

## Tech Stack

- **Frontend:** SvelteKit
- **Database:** Neon (Postgres)
- **Realtime:** WebSockets

---

_Built to learn. Built for fun. Built to race._ 🐌🏁
