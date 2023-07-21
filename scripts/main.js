import {
  world,
  Dimension,
  ItemStack,
  Player,
  EntityInventoryComponent,
  ItemDurabilityComponent,
  ItemEnchantsComponent,
  MinecraftBlockTypes,
  MinecraftItemTypes
} from '@minecraft/server'
import { isSurvivalPlayer, simulateProbability, splitGroups, getBlockNear, getRandomRangeValue } from './utils'
import { leavesMap } from './leaves'

/**
 * @typedef { {x: number; y: number; z: number} } Location
 */

world.afterEvents.blockBreak.subscribe(async (e) => {
  const { dimension, player, block } = e
  const currentBreakBlock = e.brokenBlockPermutation
  const blockTypeId = currentBreakBlock.type.id
  treeCut(player, dimension, block.location, blockTypeId)
})

/**
 *
 * @param {Player} player
 * @param {Dimension} dimension
 * @param {Location} location
 * @param {string} blockTypeId
 * @returns
 */
async function treeCut(player, dimension, location, blockTypeId) {
  const currentSlot = player.selectedSlot
  /** @type {EntityInventoryComponent} */
  const inventory = player.getComponent('inventory')
  const currentSlotItem = inventory.container.getItem(currentSlot)
  const axeSlot = inventory.container.getSlot(currentSlot)

  // The player is not stalking or not holding an axe, one of the conditions is not met will end directly
  if (!player.isSneaking || !currentSlotItem?.typeId.endsWith('_axe')) return

  const survivalPlayer = isSurvivalPlayer(dimension, player)

  if (survivalPlayer) axeSlot.lockMode = 'slot'

  /** @type {ItemDurabilityComponent} */
  const itemDurability = currentSlotItem.getComponent('minecraft:durability')
  /** @type {ItemEnchantsComponent} */
  const enchantments = currentSlotItem.getComponent('minecraft:enchantments')
  const unbreaking = enchantments.enchantments.hasEnchantment('unbreaking')
  // https://minecraft.fandom.com/wiki/Unbreaking
  let itemMaxDamage = itemDurability.damage * (1 + unbreaking)
  const itemMaxDurability = itemDurability.maxDurability * (1 + unbreaking)

  /**
   * Store all coordinates of the same wood type
   * @type { Set<string> }
   */
  const set = new Set()

  const stack = [...getBlockNear(dimension, location)]
  // Iterative processing of proximity squares
  while (stack.length > 0) {
    // Get from the last one (will modify the original array)
    const _block = stack.shift()

    if (!_block || _block?.typeId.includes('stripped_')) continue

    const typeId = _block.typeId
    const reg = /(_log|crimson_stem|warped_stem)$/

    if (reg.test(typeId) && typeId === blockTypeId) {
      const pos = JSON.stringify(_block.location)

      // If the coordinates exist, skip this iteration and proceed to the next iteration
      if (set.has(pos)) continue

      itemMaxDamage++
      if (survivalPlayer && itemMaxDamage >= itemMaxDurability) {
        continue
      }

      // Asynchronous execution to reduce game lag and game crashes
      await new Promise((resolve) => {
        _block.setType(MinecraftBlockTypes.air)
        resolve()
      })

      set.add(pos)

      // Get the squares adjacent to the new wood to append to the iteration stack
      stack.push(...getBlockNear(dimension, _block.location))
    }
  }

  splitGroups(set.size).forEach((group) => {
    dimension.spawnItem(new ItemStack(blockTypeId, group), location)
  })

  if (survivalPlayer) {
    // Set axe damage level
    const damage = Math.ceil((itemMaxDamage * 1) / (1 + unbreaking))
    itemDurability.damage = damage > itemDurability.maxDurability ? itemDurability.maxDurability : damage
    inventory.container.setItem(currentSlot, currentSlotItem)
    axeSlot.lockMode = 'none'
  }

  set.forEach((pos) => {
    const location = JSON.parse(pos)
    clearLeaves(dimension, player, location, blockTypeId)
  })
}

/**
 *
 * @param {Dimension} dimension
 * @param {Player} player
 * @param {Location} location
 * @param {string} blockTypeId
 */
async function clearLeaves(dimension, player, location, blockTypeId) {
  /** @type { Set<string> } */
  const set = new Set()

  const stack = [...getBlockNear(dimension, location, 2)]
  // Iterative processing of proximity squares
  while (stack.length > 0) {
    // Get from the last one (will modify the original array)
    const _block = stack.shift()

    if (!_block) continue

    const { typeId, permutation } = _block
    const reg = /leaves/g

    if (reg.test(typeId)) {
      const isIncludesLog = getBlockNear(dimension, _block.location, 2).some((block) => {
        const _typeId = block.typeId
        if (_typeId.includes('stripped_')) return false
        if (/_log$/.test(_typeId)) return true
      })
      // Leaves will not fall quickly if there is wood within a two-frame radius
      if (isIncludesLog) continue

      const pos = JSON.stringify(_block.location)

      // If the coordinates exist, skip this iteration and proceed to the next iteration
      if (set.has(pos)) continue

      // Asynchronous execution to reduce game lag and game crashes
      await new Promise((resolve) => {
        _block.setType(MinecraftBlockTypes.air)

        /** @type {'oak' | 'spruce' | 'birch' | 'jungle' | 'acacia' | 'dark_oak' | 'azalea_leaves' | 'azalea_leaves_flowered' | 'mangrove_leaves'} */
        const leaf_type = permutation.getState('old_leaf_type') || permutation.getState('new_leaf_type') || typeId.split(':')[1]
        const leafMap = leavesMap[leaf_type]

        if (leafMap?.apple_probability && simulateProbability(leafMap.apple_probability)) {
          const count = getRandomRangeValue(...leafMap.apple_count)
          dimension.spawnItem(new ItemStack(MinecraftItemTypes.apple, count), location)
        }

        if (leafMap?.stick_probability && simulateProbability(leafMap.stick_probability)) {
          const count = getRandomRangeValue(...leafMap.stick_count)
          dimension.spawnItem(new ItemStack(MinecraftItemTypes.stick, count), location)
        }

        if (leafMap?.sapling_probability && simulateProbability(leafMap.sapling_probability)) {
          const count = getRandomRangeValue(...leafMap.sapling_count)
          const type = leafMap.type

          if (isNaN(type)) {
            dimension.spawnItem(new ItemStack(type, count), location)
          } else {
            const command = `give ${player.name} sapling ${count} ${type}`
            dimension.runCommandAsync(command)
          }
        }
        resolve()
      })

      set.add(pos)

      stack.push(...getBlockNear(dimension, _block.location, 2))
    }
  }
}
