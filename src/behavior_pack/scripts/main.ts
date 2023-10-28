import type {
  Dimension,
  Player,
  EntityInventoryComponent,
  Vector3,
  Block,
  ItemDurabilityComponent,
  ItemEnchantsComponent
} from '@minecraft/server'
import { world, ItemStack, system, GameMode, ItemLockMode } from '@minecraft/server'
import { splitGroups, getRadiusRange, calcGameTicks } from '@mcbe-mods/utils'

function isSurvivalPlayer(dimension: Dimension, player: Player) {
  return dimension.getPlayers({ gameMode: GameMode.survival }).some((p) => p.name === player.name)
}

const isStrippedLog = (typeId: string) => typeId.includes('stripped_')
const getPlayerInventory = (player: Player) => player.getComponent('inventory') as EntityInventoryComponent
const getPlayerContainer = (player: Player) => getPlayerInventory(player).container

const getPlayerAction = (player: Player) => {
  const currentSlot = player.selectedSlot
  const currentSlotItem = getPlayerContainer(player).getItem(currentSlot)

  // The player is not stalking or not holding an axe, one of the conditions is not met will end directly
  return player.isSneaking && currentSlotItem?.typeId.endsWith('_axe')
}

function isTree(dimension: Dimension, locations: Vector3[]) {
  const leaves = ['leaves', 'warped_wart_block', 'nether_wart_block']
  for (const location of locations) {
    const blocksLocation = getRadiusRange(location)
    const is = blocksLocation.some((block) => {
      const typeId = dimension.getBlock(block)?.typeId
      if (!typeId) return false

      return leaves.some((item) => typeId.includes(item))
    })
    if (is) return true
  }

  return false
}

function consumeAxeDurability(player: Player, logLocations: Vector3[]) {
  const currentSlot = player.selectedSlot
  const inventory = player.getComponent('inventory') as EntityInventoryComponent
  const axeSlot = inventory.container.getSlot(currentSlot)
  axeSlot.lockMode = ItemLockMode.slot
  const item = axeSlot.getItem() as ItemStack
  const itemDurability = item.getComponent('minecraft:durability') as ItemDurabilityComponent
  const enchantments = item.getComponent('minecraft:enchantments') as ItemEnchantsComponent
  const unbreaking = enchantments.enchantments.hasEnchantment('unbreaking')
  // https://minecraft.fandom.com/wiki/Unbreaking
  const itemMaxDamage = itemDurability.damage * (1 + unbreaking)
  const itemMaxDurability = itemDurability.maxDurability * (1 + unbreaking)
  const consumeItemMaxDamage = itemMaxDamage + logLocations.length

  const overproof = consumeItemMaxDamage >= itemMaxDurability ? consumeItemMaxDamage - itemMaxDurability : 0
  if (overproof > 0) logLocations.splice(-overproof)

  // Set axe damage level
  const damage = Math.ceil((consumeItemMaxDamage * 1) / (1 + unbreaking))
  itemDurability.damage = damage > itemDurability.maxDurability ? itemDurability.maxDurability : damage
  getPlayerContainer(player).setItem(currentSlot, item)
  system.runTimeout(() => {
    axeSlot.lockMode = ItemLockMode.none
  }, calcGameTicks(1000))
}

function getLogLocations(dimension: Dimension, location: Vector3, currentBreakBlockTypeId: string) {
  const visited: Set<string> = new Set()
  const logLocations: Vector3[] = []

  const locations = getRadiusRange(location)
  const reg = /(_log|crimson_stem|warped_stem)$/

  for (const vector3 of locations) {
    const pos = Object.values(vector3).join(',')

    if (visited.has(pos)) continue
    visited.add(pos)

    const block = dimension.getBlock(vector3)

    if (block && block.typeId === currentBreakBlockTypeId && reg.test(block.typeId)) {
      logLocations.push(vector3)
      locations.push(...getRadiusRange(block.location))
    }
  }

  return logLocations.sort((a, b) => a.y - b.y)
}

async function treeCut(location: Vector3, dimension: Dimension, logLocations: Vector3[]) {
  if (!logLocations.length) return
  const block = dimension.getBlock(logLocations[0]) as Block
  const typeId = block.typeId

  for (const location of logLocations) {
    const block = dimension.getBlock(location) as Block
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    block.setType('air')
  }

  splitGroups(logLocations.length).forEach((group) => {
    dimension.spawnItem(new ItemStack(typeId, group), location)
  })
}

// eslint-disable-next-line max-statements
async function clearLeaves(dimension: Dimension, logLocations: Vector3[]) {
  const visited = new Set()
  const batchSize = 27 // Size of each batch
  let counter = 0

  for (const logLocation of logLocations) {
    const locations = getRadiusRange(logLocation)

    for (const location of locations) {
      const pos = Object.values(location).join(',')

      if (visited.has(pos)) continue
      visited.add(pos)

      const block = dimension.getBlock(location)

      if (block && block.typeId.includes('leaves')) {
        const isIncludesLog = getRadiusRange(block.location, 2).some((location) => {
          const block = dimension.getBlock(location)
          if (!block) return false
          const typeId = block.typeId

          if (isStrippedLog(typeId)) return false
          if (/_log$/.test(typeId)) return true
        })

        // eslint-disable-next-line max-depth
        if (isIncludesLog) continue

        locations.push(...getRadiusRange(block.location))

        // eslint-disable-next-line max-depth
        if (counter === batchSize) {
          // Add a short delay to allow the event loop to execute the toggle
          await new Promise<void>((resolve) => system.runTimeout(resolve))
          counter = 0
        }

        counter++

        const command = `setblock ${Object.values(location).join(' ')} air destroy`
        dimension.runCommandAsync(command)
      }
    }
  }
}

world.afterEvents.playerBreakBlock.subscribe(async (e) => {
  try {
    const { dimension, player, block } = e
    const currentBreakBlock = e.brokenBlockPermutation
    const currentBreakBlockTypeId = currentBreakBlock.type.id

    if (isStrippedLog(currentBreakBlockTypeId)) return

    const action = getPlayerAction(player)
    if (!action) return

    const logLocations = getLogLocations(dimension, block.location, currentBreakBlockTypeId)

    const _isTree = isTree(dimension, logLocations)
    if (!_isTree) return

    const survivalPlayer = isSurvivalPlayer(dimension, player)
    if (survivalPlayer) consumeAxeDurability(player, logLocations)

    await treeCut(block.location, dimension, logLocations)

    clearLeaves(dimension, logLocations)
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = error as any
    /* eslint-disable no-console */
    console.log('error', err)
    console.log('error.stack', err && err.stack)
    console.log('error.message', err && err.message)
    /* eslint-enable no-console */
  }
})
