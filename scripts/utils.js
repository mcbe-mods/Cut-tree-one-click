import { Dimension, Player } from '@minecraft/server'

/**
 *
 * @param {number} min
 * @param {number} max
 * @returns
 */
export function getRandomRangeValue(min, max) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Determine if the current player is in survival mode, if not then no item durability is consumed
 * @param {Dimension} dimension
 * @param {Player} player
 * @returns
 */
export function isSurvivalPlayer(dimension, player) {
  return dimension.getPlayers({ gameMode: 'survival' }).some((p) => p.name === player.name)
}

/**
 *
 * @param {number} probability
 * @returns
 */
export function simulateProbability(probability) {
  return Math.random() < probability / 100
}

/**
 *
 * @param {number} number
 * @param {number} groupSize
 * @returns
 */
export function splitGroups(number, groupSize = 64) {
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
export function getBlockNear(dimension, location, radius = 1) {
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
