import {
  world,
  Block,
  Dimension,
  ItemStack,
  EntityInventoryComponent,
  ItemDurabilityComponent,
  ItemEnchantsComponent
} from '@minecraft/server'

world.afterEvents.blockBreak.subscribe(async (e) => {
  const { dimension, player, block } = e
  const currentBreakBlock = e.brokenBlockPermutation
  const blockTypeId = currentBreakBlock.type.id

  const currentSlot = player.selectedSlot
  /** @type {EntityInventoryComponent} */
  const inventory = player.getComponent('inventory')
  const currentSlotItem = inventory.container.getItem(currentSlot)

  // The player is not stalking or not holding an axe, one of the conditions is not met will end directly
  if (!player.isSneaking || !currentSlotItem?.typeId.endsWith('_axe')) return

  const isSurvivalPlayer = dimension.getPlayers({ gameMode: 'survival' }).find((p) => p.name === player.name)

  /** @type {ItemDurabilityComponent} */
  const itemDurability = currentSlotItem.getComponent('minecraft:durability')
  /** @type {ItemEnchantsComponent} */
  const enchantments = currentSlotItem.getComponent('minecraft:enchantments')
  const unbreaking = enchantments.enchantments.hasEnchantment('unbreaking')
  let itemMaxDamage = itemDurability.damage * (1 + unbreaking)
  const itemMaxDurability = itemDurability.maxDurability * (1 + unbreaking)

  /**
   * Store all coordinates of the same wood type
   * @type { Set<string> }
   */
  const set = new Set()

  const stack = [...filterLogBlock(getBlockNear(dimension, block))]

  // Iterative processing of proximity squares
  while (stack.length > 0) {
    // Get from the last one (will modify the original array)
    const _block = stack.shift()

    if (!_block) continue

    if (blockTypeId === _block.typeId) {
      // output: [1,2,3] => "1,2,3"
      const pos = [_block.x, _block.y, _block.z].toString()

      // If the coordinates exist, skip this iteration and proceed to the next iteration
      if (set.has(pos)) continue

      if (isSurvivalPlayer && itemMaxDamage >= itemMaxDurability) {
        itemMaxDamage++
        continue
      }

      const cmd = `setblock ${pos.replaceAll(',', ' ')} air destroy`
      await player.runCommandAsync(cmd)

      set.add(pos)

      // Get the squares adjacent to the new wood to append to the iteration stack
      stack.push(...filterLogBlock(getBlockNear(dimension, _block)))
    }
  }

  if (isSurvivalPlayer) {
    itemDurability.damage = Math.ceil((itemMaxDamage * 1) / (1 + unbreaking))
    inventory.container.setItem(currentSlot, currentSlotItem)
  }
})

/**
 *
 * @param { Block[] } blocks
 * @returns
 */
function filterLogBlock(blocks) {
  const reg = /(_log|crimson_stem|warped_stem)$/
  const logs = blocks.filter((block) => {
    const typeId = block.typeId
    if (typeId.includes('stripped_')) return false
    if (reg.test(typeId)) return true
  })
  return logs
}

/**
 *
 * @param { Dimension } dimension
 * @param { Block } block
 * @param { number } [radius=1]
 * @returns
 */
function getBlockNear(dimension, block, radius = 1) {
  const centerX = block.x
  const centerY = block.y
  const centerZ = block.z

  /*
    Store a 3x3 list of square objects centered on the current square coordinates

    Top view: 0 is the current square, get the coordinates of all 1's

    First floor
    111
    111
    111

    Second layer
    111
    101
    111

    Third layer
    111
    111
    111
    */
  const positions = []

  for (let x = centerX - radius; x <= centerX + radius; x++) {
    for (let y = centerY - radius; y <= centerY + radius; y++) {
      for (let z = centerZ - radius; z <= centerZ + radius; z++) {
        // Get the list of eligible cube objects
        positions.push(dimension.getBlock({ x, y, z }))
      }
    }
  }

  return positions
}
