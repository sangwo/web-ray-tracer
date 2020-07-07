// class defining a ray
const { vec3 } = glMatrix;

export class Ray {
  // Given origin and direction as vec3 objects, construct a ray
  constructor(origin, direction) {
    this.origin = origin;
    this.direction = direction;
  }

  // Given the t value, return the point on the ray as a vec3 object
  pointAtParameter(t) {
    // p(t) = e + td
    return vec3.add(vec3.create(), this.origin, vec3.scale(vec3.create(),
        this.direction, t));
  }
}
