import { MinecraftItemTypes } from '@minecraft/server'

const public_map = {
  sapling: { sapling_probability: 5, sapling_count: [1, 1] },
  stick: { stick_probability: 2, stick_count: [1, 2] },
  apple: { apple_probability: 0.5, apple_count: [1, 1] }
}
const sapling_data = { oak: 0, spruce: 1, birch: 2, jungle: 3, acacia: 4, dark_oak: 5 }

export const leavesMap = {
  oak: {
    type: MinecraftItemTypes.sapling,
    ...public_map.sapling,
    ...public_map.stick,
    ...public_map.apple
  },
  spruce: {
    type: sapling_data.birch,
    ...public_map.sapling,
    ...public_map.stick
  },
  birch: {
    type: sapling_data.birch,
    ...public_map.sapling,
    ...public_map.stick
  },
  jungle: {
    type: sapling_data.jungle,
    sapling_probability: 2.5,
    sapling_count: [1, 1],
    ...public_map.stick
  },
  acacia: {
    type: sapling_data.acacia,
    ...public_map.sapling,
    ...public_map.stick
  },
  dark_oak: {
    type: sapling_data.dark_oak,
    ...public_map.sapling,
    ...public_map.stick,
    ...public_map.apple
  },
  azalea_leaves: {
    type: MinecraftItemTypes.azalea,
    ...public_map.sapling,
    ...public_map.stick
  },
  azalea_leaves_flowered: {
    type: MinecraftItemTypes.floweringAzalea,
    ...public_map.sapling,
    ...public_map.stick
  },
  mangrove_leaves: {
    type: null,
    ...public_map.stick
  },
  cherry_leaves: {
    type: MinecraftItemTypes.cherrySapling,
    ...public_map.sapling,
    ...public_map.stick
  }
}
