// class defining a sphere
const { vec3 } = glMatrix;

export class Sphere {
  // Given x, y, z coordinates, radius, and the color values r, g, b, construct
  // a sphere
  constructor(x, y, z, radius, r, g, b) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.radius = radius;
    this.r = r;
    this.g = g;
    this.b = b;
  }

  // return the center of the sphere as a vec3 object
  get center() {
    return vec3.fromValues(this.x, this.y, this.z);
  }

  // Given a point and ray direction as vec3 objects, return the normal at the
  // point as a vec3 object
  normal(point, rayDirection = null) {
    return vec3.normalize(vec3.create(), vec3.subtract(vec3.create(), point,
        this.center));
  }

  // Given a Ray object, return the t value for the intersection (null if the
  // ray doesn’t intersect the sphere)
  intersects(ray) {
    var oc = vec3.subtract(vec3.create(), ray.origin, this.center);
    var a = vec3.dot(ray.direction, ray.direction);
    var b = 2 * vec3.dot(ray.direction, oc);
    var c = vec3.dot(oc, oc) - this.radius * this.radius;
    var discriminant = b * b - 4 * a * c;

    if (discriminant < 0) {
      return null;
    } else {
      // keep the smaller (closer) value of t
      var t = (-b - Math.sqrt(discriminant)) / 2 * a;
      return t;
    }
  }
}
