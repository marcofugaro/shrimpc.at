// ⚠️ Watch out!!!
// The ids must be power of 2!
let collisionId = 1
function getCollisionId() {
  collisionId *= 2
  return collisionId
}

export const shrimpCollision = {
  id: getCollisionId(),
  get collideWith() {
    return (
      armCollision.id |
      delimiterCollision.id |
      shrimpCollision.id |
      headCollision.id |
      vanCollision.id
    )
  },
}

export const vanCollision = {
  id: getCollisionId(),
  get collideWith() {
    return (
      armCollision.id |
      headCollision.id |
      shrimpCollision.id |
      vanCollision.id |
      delimiterCollision.id
    )
  },
}

export const delimiterCollision = {
  id: getCollisionId(),
  get collideWith() {
    return shrimpCollision.id | vanCollision.id
  },
}

export const armCollision = {
  id: getCollisionId(),
  get collideWith() {
    return shrimpCollision.id | armCollision.id | vanCollision.id
  },
}

export const headCollision = {
  id: getCollisionId(),
  get collideWith() {
    return shrimpCollision.id | vanCollision.id
  },
}
