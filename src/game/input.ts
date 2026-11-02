export const input = {
  x: 0,
  z: 0,
  jump: false,
  interact: false,
  yaw: 0,
  pitch: 0.48,
  keys: new Set<string>(),
};
export function clearInput() {
  input.x = 0;
  input.z = 0;
  input.jump = false;
  input.interact = false;
  input.keys.clear();
}
