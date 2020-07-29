// class defining a light
const { vec3 } = glMatrix;

export class Light {
  // Given a bottom-left corner (vec3), width (vec3), number of columns (int),
  // height (vec3), number of rows (int), and color values r, g, b (int),
  // construct an area light
  constructor(corner, uvecFull, usteps, vvecFull, vsteps, r, g, b) {
    this.corner = corner;
    this.uvecFull = uvecFull;
    this.uvec = vec3.scale(vec3.create(), uvecFull, (1 / usteps));
    this.usteps = usteps;
    this.vvecFull = vvecFull;
    this.vvec = vec3.scale(vec3.create(), vvecFull, (1 / vsteps));
    this.vsteps = vsteps;
    this.samples = usteps * vsteps;
    this.position = vec3.add(
      vec3.create(), vec3.add(vec3.create(), corner,
      vec3.scale(vec3.create(), uvecFull, 1 / 2)),
      vec3.scale(vec3.create(), vvecFull, 1 / 2)); // center
    //this.position = vec3.fromValues(0, 5, 1); // TODO: remove
    this.color = [r, g, b];
    // TODO: add as an argument
    this.diffuseOn = false;
    this.ambientOn = true;
    this.specularOn = false;
    this.texture = null;
  }

  // Given a point as a vec3 object, return an array of color values r, g, b at
  // that point
  colorAt(point) {
    // TODO: add case for texture
    return this.color;
  }

  // Given cell position uc, vc relative to corner, return jittered point in
  // area light as a vec3 object
  pointAt(uc, vc) {
    // jittered point = corner + uvec * (uc + random() * (uvec.length / usteps))
    //                         + vvec * (vc + random() * (vvec.length / vsteps))
    const u = vec3.scale(vec3.create(), this.uvec,
        (uc + Math.random() * (vec3.length(this.uvec) / this.usteps)));
    const v = vec3.scale(vec3.create(), this.vvec,
        (vc + Math.random() * (vec3.length(this.vvec) / this.vsteps)));
    return vec3.add(vec3.create(), vec3.add(vec3.create(), this.corner, u), v);
  }

  // Given a point and ray direction as vec3 objects, return the normal of the
  // plane containing the (rectangular) area light as a vec3 object
  normal(point, rayDirection) {
    const normal = vec3.normalize(vec3.create(), vec3.cross(vec3.create(),
        this.uvec, this.vvec));
    const negNormal = vec3.negate(vec3.create(), normal);
    const normalAngle = vec3.angle(normal, vec3.negate(vec3.create(),
        rayDirection));
    const negNormalAngle = vec3.angle(negNormal, vec3.negate(vec3.create(),
        rayDirection));
    if (normalAngle < negNormalAngle) {
      return normal;
    }
    return negNormal;
  }

  // Given a Ray object, return the t value for the intersection (null if the
  // ray doesn’t intersect with the rectangle)
  intersects(ray) {
    const normal = this.normal(null, ray.direction);

    // check if ray and plane are parallel (no intersection)
    const normalDotRayDirection = vec3.dot(normal, ray.direction);
    if (Math.abs(normalDotRayDirection) < Number.EPSILON) { // almost 0
      return null;
    }

    // compute t
    const d = vec3.dot(this.corner, normal);
    const t = (vec3.dot(normal, ray.origin) + d) / normalDotRayDirection;

    // check if the point of intersection lies within the rectangle
    const point = ray.pointAtParameter(t);
    const cornerPoint = vec3.subtract(vec3.create(), point, this.corner);
    const uvecUnit = vec3.normalize(vec3.create(), this.uvec);
    const uProjection = vec3.scale(vec3.create(), uvecUnit, vec3.dot(cornerPoint,
        uvecUnit));
    const vProjection = vec3.subtract(vec3.create(), cornerPoint, uProjection);
    if (vec3.length(uProjection) >= 0 &&
        vec3.length(uProjection) <= vec3.length(this.uvecFull) &&
        vec3.length(vProjection) >= 0 &&
        vec3.length(vProjection) <= vec3.length(this.vvecFull) &&
        vec3.angle(cornerPoint, this.uvec) <= Math.PI / 2 &&
        vec3.angle(cornerPoint, this.vvec) <= Math.PI / 2) {
          return t;
    }
    return null;
  }
}
