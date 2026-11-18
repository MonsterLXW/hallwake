// HALLWAKE — lantern oil economy (architecture.md §6). One resource, four uses.

export const OIL_DRAIN_PER_TICK = 1 / 5400; // 1/90 per second lit at dt=1/60
export const OIL_CINDER_MULT = 4; // x4 while CINDER is active
export const OIL_REFILL = 0.35; // oil cans / sconce relights, cap 1
export const OIL_CRITICAL = 0.2; // below this: tells suppressed, MURMUR/CINDER stronger
export const OIL_RESPAWN = 0.6; // oil on checkpoint respawn
export const OIL_BANISH_FLOOR = 0.6; // CINDER banish restores at least this

export function drainOil(oil: number, mult: number): number {
  return Math.max(0, oil - OIL_DRAIN_PER_TICK * mult);
}

export function refillOil(oil: number, amount: number = OIL_REFILL): number {
  return Math.min(1, oil + amount);
}

export function lanternRadius(oil: number): number {
  return 2 + 6 * oil; // metres — consumed by the renderer's SpotLight distance
}

export function isCritical(oil: number): boolean {
  return oil <= OIL_CRITICAL;
}
