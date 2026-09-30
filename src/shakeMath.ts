export type Accel = { readonly x: number; readonly y: number; readonly z: number };

export function magnitude({ x, y, z }: Accel): number {
  return Math.sqrt(x * x + y * y + z * z);
}

export function isShake(sample: Accel, threshold: number): boolean {
  return magnitude(sample) >= threshold;
}
