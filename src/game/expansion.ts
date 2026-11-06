export const WORLD = { minX: -40, maxX: 40, minZ: -47, maxZ: 37 };
export const oreDeposits = [
  { id: "quartz-meadow", position: [24, 0.45, 25] as [number, number, number] },
  { id: "quartz-birch", position: [-28, 0.45, 17] as [number, number, number] },
  {
    id: "quartz-cottage",
    position: [29, 0.45, -23] as [number, number, number],
  },
  {
    id: "quartz-ridge",
    position: [-27, 0.45, -30] as [number, number, number],
  },
];
export const landmarks = [
  { name: "花甸", x: 24, z: 25 },
  { name: "白桦林", x: -28, z: 17 },
  { name: "河畔小屋", x: 27, z: -17 },
  { name: "琥珀山径", x: -27, z: -30 },
];
export const mapPoint = (x: number, z: number) => [
  8 + ((x - WORLD.minX) / (WORLD.maxX - WORLD.minX)) * 124,
  8 + ((z - WORLD.minZ) / (WORLD.maxZ - WORLD.minZ)) * 134,
];
