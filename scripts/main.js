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
    clearLeaves(dimension, location, blockTypeId)
  })
}

/**
 *
 * @param {Dimension} dimension
 * @param {Location} location
 * @param {string} blockTypeId
 */
async function clearLeaves(dimension, location, blockTypeId) {
  /** @type { Set<string> } */
  const set = new Set()

  const [, log] = blockTypeId.split(':')

  /**
   * https://minecraft.fandom.com/wiki/Sapling?so=search#Data_values
   * Because the sapling id of the bedrock version is only oak wood and cherry wood
   * The other trees can't drop the corresponding saplings correctly after felling
   * Therefore, at present, only the leaves of oak and cherry trees can be dropped quickly.
   */
  if (!['cherry_log', 'oak_log'].includes(log)) return

  const stack = [...getBlockNear(dimension, location, 2)]
  // Iterative processing of proximity squares
  while (stack.length > 0) {
    // Get from the last one (will modify the original array)
    const _block = stack.shift()

    if (!_block) continue

    const typeId = _block.typeId
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

        // Drop stick
        const stick = simulateProbability(2)
        if (stick) {
          const stickCounter = Math.round(Math.random() + 1)
          dimension.spawnItem(new ItemStack(MinecraftItemTypes.stick, stickCounter), location)
        }

        if (log === 'oak_log') {
          // Drop apple
          const apple = simulateProbability(0.5)
          if (apple) dimension.spawnItem(new ItemStack(MinecraftItemTypes.apple), location)

          // Drop sapling
          const sapling = simulateProbability(5)
          if (sapling) dimension.spawnItem(new ItemStack(MinecraftItemTypes.sapling), location)
        }

        // Drop sapling
        if (log === 'cherry_log') {
          const sapling = simulateProbability(5)
          if (sapling) dimension.spawnItem(new ItemStack(MinecraftItemTypes.cherrySapling), location)
        }
        resolve()
      })

      set.add(pos)

      stack.push(...getBlockNear(dimension, _block.location, 2))
    }
  }
}

/**
 * Determine if the current player is in survival mode, if not then no item durability is consumed
 * @param {Dimension} dimension
 * @param {Player} player
 * @returns
 */
function isSurvivalPlayer(dimension, player) {
  return dimension.getPlayers({ gameMode: 'survival' }).some((p) => p.name === player.name)
}

/**
 *
 * @param {number} probability
 * @returns
 */
function simulateProbability(probability) {
  return Math.random() < probability / 100
}

/**
 *
 * @param {number} number
 * @param {number} groupSize
 * @returns
 */
function splitGroups(number, groupSize = 64) {
  const groups = []
  while (number > 0) {
    const group = Math.min(number, groupSize)
    groups.push(group)
    number -= group
  }
  return groups
}

/**
 *
 * @param { Dimension } dimension
 * @param { Location } location
 * @param { number } [radius=1]
 * @returns
 */
function getBlockNear(dimension, location, radius = 1) {
  const centerX = location.x
  const centerY = location.y
  const centerZ = location.z

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
        const _location = { x, y, z }
        const _block = dimension.getBlock(_location)
        // Get the list of eligible cube objects
        positions.push(_block)
      }
    }
  }
  return positions
}
