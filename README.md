# [shrimpc.at](http://shrimpc.at)

> Inspired from [picklecat](https://dn.ht/picklecat/)

[![screenshot](public/assets/screenshot.jpg)](http://shrimpc.at)

Wanna understand more how it works? Go to:

#### http://shrimpc.at?debug

## Tools used

- [**three.js**](https://github.com/mrdoob/three.js/)
- [**cannon.js**](https://github.com/schteppe/cannon.js) for physics
- [**tween.js**](https://github.com/tweenjs/tween.js/) to animate the arms
- [**pixi.js**](https://github.com/pixijs/pixi.js) for the postprocessing

[**threejs-modern-app**](https://github.com/marcofugaro/threejs-modern-app) was used as a starter-kit, to glue all those libraries together, also as a component organizer, three.js boilerplate concealer and asset loader.

## Highlights

- Simulate quadratic drag force in cannon.js! [[link to code](https://github.com/marcofugaro/shrimpc.at/blob/master/src/lib/CannonSuperBody.js)]

```js
class CannonSuperBody extends CANNON.Body {
  // Fd = - Constant * getMagnitude(velocity)**2 * normalize(velocity)
  applyDrag(coefficient) {
    const speed = this.velocity.length()

    const dragMagnitude = coefficient * speed ** 2

    const drag = this.velocity.clone()
    drag.scale(-1, drag)

    drag.normalize()

    drag.scale(dragMagnitude, drag)

    this.applyGenericForce(drag)
  }

  // apply a force in its center of mass
  applyGenericForce(force) {
    const centerInWorldCoords = this.pointToWorldFrame(new CANNON.Vec3())
    this.applyForce(force, centerInWorldCoords)
  }
}
```

<img src="screenshots/drag-force.gif" width="500">

---

- Shrimps jumping up and down in the van (this was fun!) [[link to code](https://github.com/marcofugaro/shrimpc.at/blob/b6651e24c0cea9c0b1149426640f3f106902c336/src/scene/Van.js#L101-L110)]

```js
// make the shrimps jump up and down
this.vanShrimps.forEach((shrimp, i) => {
  shrimp.position.y = this.initialY + Math.sin(time * 20 + i) * 0.09
})
```

<img src="screenshots/happy.gif" width="500">

---

- 3D effect for the cat face was made using a displacement imege on a plane geometry. I created the displacement image using Blender, here is the process:

<img src="design/original-fat-cat.jpg" width="300">

![](screenshots/blender.png)

<img src="public/assets/cat-head-displacement.png" width="300">
