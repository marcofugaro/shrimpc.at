import CANNON from 'cannon'

// ⚠️ Watch out!!!
// The ids must be power of 2!
let collisionId = 1
function getCollisionId() {
  collisionId *= 2
  return collisionId
}

export const shrimpCollision = {
  id: getCollisionId(),
  material: new CANNON.Material('shrimp'),
  get collideWith() {
    return (
      armCollision.id |
      delimiterCollision.id |
      shrimpCollision.id |
      headCollision.id |
      vehicleCollision.id |
      bubbleCollision.id
    )
  },
}

export const vehicleCollision = {
  id: getCollisionId(),
  material: new CANNON.Material('vehicle'),
  get collideWith() {
    return (
      armCollision.id |
      headCollision.id |
      shrimpCollision.id |
      vehicleCollision.id |
      delimiterCollision.id |
      bubbleCollision.id
    )
  },
}

export const delimiterCollision = {
  id: getCollisionId(),
  material: new CANNON.Material('delimiter'),
  get collideWith() {
    return shrimpCollision.id | vehicleCollision.id
  },
}

export const armCollision = {
  id: getCollisionId(),
  material: new CANNON.Material('arm'),
  get collideWith() {
    return shrimpCollision.id | armCollision.id | vehicleCollision.id | bubbleCollision.id
  },
}

export const headCollision = {
  id: getCollisionId(),
  material: new CANNON.Material('head'),
  get collideWith() {
    return shrimpCollision.id | vehicleCollision.id
  },
}

export const bubbleCollision = {
  id: getCollisionId(),
  material: new CANNON.Material('bubble'),
  get collideWith() {
    return shrimpCollision.id | bubbleCollision.id | vehicleCollision.id | armCollision.id
  },
}

// by default the friction is 0.3 and the restitution is 0.3
// but here you can customize them
export function initCustomCollisions(world) {
  world.addContactMaterial(
    new CANNON.ContactMaterial(shrimpCollision.material, shrimpCollision.material, {
      friction: 1,
      restitution: 0.5,
    }),
  )

  world.addContactMaterial(
    new CANNON.ContactMaterial(vehicleCollision.material, shrimpCollision.material, {
      friction: 1,
      restitution: 0.5,
    }),
  )

  world.addContactMaterial(
    new CANNON.ContactMaterial(shrimpCollision.material, delimiterCollision.material, {
      friction: 0,
      restitution: 0,
    }),
  )

  world.addContactMaterial(
    new CANNON.ContactMaterial(vehicleCollision.material, delimiterCollision.material, {
      friction: 0,
      restitution: 0,
    }),
  )

  world.addContactMaterial(
    new CANNON.ContactMaterial(shrimpCollision.material, headCollision.material, {
      friction: 0.2,
      restitution: 0.1,
    }),
  )

  world.addContactMaterial(
    new CANNON.ContactMaterial(bubbleCollision.material, armCollision.material, {
      friction: 0.5,
      restitution: 0,
    }),
  )

  world.addContactMaterial(
    new CANNON.ContactMaterial(bubbleCollision.material, shrimpCollision.material, {
      friction: 0.5,
      restitution: 0,
    }),
  )
}
