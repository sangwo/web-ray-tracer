// class defining a sphere
const { vec3 } = glMatrix;

export class Sphere {
  // Given x, y, z coordinates, radius, color values r, g, b, and a Texture
  // object, construct a sphere
  constructor(x, y, z, radius, r, g, b, texture) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.radius = radius;
    this.color = [r, g, b];
    this.texture = texture;
  }

  // return the center of the sphere as a vec3 object
  get center() {
    return vec3.fromValues(this.x, this.y, this.z);
  }

  // Given a point as a vec3 object, return an array of color values r, g, b at
  // that point
  colorAt(point) {
    if (this.texture != null) {
      // compute u, v
      const theta = Math.acos((point[1] - this.center[1]) / this.radius);
      let phi = Math.atan2(point[2] - this.center[2], -point[0] - -this.center[0]);
      if (phi < 0) {
        phi = phi + 2 * Math.PI;
      }
      const u = phi / (2 * Math.PI)
      const v = (Math.PI - theta) / Math.PI;
      return this.texture.colorAt(u, v);
    }
    return this.color;
  }

  // Given a point and ray direction as vec3 objects, return the normal at the
  // point as a vec3 object
  normal(point, rayDirection) {
    return vec3.normalize(vec3.create(), vec3.subtract(vec3.create(), point,
        this.center));
  }

  // Given a Ray object, return the t value for the intersection (null if the
  // ray doesn’t intersect with the sphere)
  intersects(ray) {
    const oc = vec3.subtract(vec3.create(), ray.origin, this.center);
    const a = vec3.dot(ray.direction, ray.direction);
    const b = 2 * vec3.dot(ray.direction, oc);
    const c = vec3.dot(oc, oc) - this.radius * this.radius;
    const discriminant = b*b - 4*a*c;

    if (discriminant < 0) {
      return null;
    }
    // keep the smaller (closer) value of t
    const t = (-b - Math.sqrt(discriminant)) / 2*a;
    return t;
  }
}
