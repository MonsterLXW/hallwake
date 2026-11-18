// HALLWAKE — app root. The kiosk has one surface: the corridor shell.
// Kiosk screens (attract/death/run/leaderboard) are phases inside GameShell
// and the T4 ui layer, not routes.

import GameShell from './game/GameShell';

export default function App() {
  return <GameShell />;
}
