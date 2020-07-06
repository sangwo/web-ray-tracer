// class defining a triangle
const { vec3 } = glMatrix;

export class Triangle {
  // Given the vertices v0, v1, v2 as vec3 objects and the color values r, g, b,
  // construct a triangle
  constructor(v0, v1, v2, r, g, b) {
    this.v0 = v0;
    this.v1 = v1;
    this.v2 = v2;
    this.r = r;
    this.g = g;
    this.b = b;
  }

  // Given a point and ray direction as vec3 objects, return the normal of the
  // plane containing the triangle as a vec3 object
  normal(point = null, rayDirection) {
    var v0v1 = vec3.subtract(vec3.create(), this.v1, this.v0);
    var v0v2 = vec3.subtract(vec3.create(), this.v2, this.v0);
    var normal = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), v0v1,
        v0v2));
    var negNormal = vec3.negate(vec3.create(), normal);
    var normalAngle = vec3.angle(normal, vec3.negate(vec3.create(), rayDirection));
    var negNormalAngle = vec3.angle(negNormal, vec3.negate(vec3.create(),
        rayDirection));
    // regardless of order of vertices, normal will always point towards z+
    if (normalAngle < negNormalAngle) {
      return normal;
    }
    return negNormal;
  }

  // Given a Ray object, return the t value for the intersection (null if the
  // ray doesn’t intersect the triangle)
  intersects(ray) {
    var normal = this.normal(null, ray.direction);

    // check if ray and plane are parallel
    var nDotRayDirection = vec3.dot(normal, ray.direction);
    if (nDotRayDirection == 0) {
      return null;
    }

    // compute t
    var d = vec3.dot(this.v0, normal);
    var t = (vec3.dot(normal, ray.origin) + d) / nDotRayDirection;

    // check if the point is inside triangle (inside-outside test)
    var point = ray.pointAtParameter(t);
    var edge0 = vec3.subtract(vec3.create(), this.v1, this.v0);
    var edge1 = vec3.subtract(vec3.create(), this.v2, this.v1);
    var edge2 = vec3.subtract(vec3.create(), this.v0, this.v2);
    var c0 = vec3.subtract(vec3.create(), point, this.v0);
    var c1 = vec3.subtract(vec3.create(), point, this.v1);
    var c2 = vec3.subtract(vec3.create(), point, this.v2);

    if (vec3.dot(normal, vec3.cross(vec3.create(), edge0, c0)) < 0 &&
        vec3.dot(normal, vec3.cross(vec3.create(), edge1, c1)) < 0 &&
        vec3.dot(normal, vec3.cross(vec3.create(), edge2, c2)) < 0) {
      return t;
    }

    return null;
  }
}
