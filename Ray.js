// class defining a ray
const { vec3 } = glMatrix;

const l = -2;   // position of the left edge of the image
const r = 2;    // position of the right edge of the image
const b = -1;   // position of the bottom edge of the image
const t = 1;    // position of the top edge of the image
const nx = 500; // canvas width
const ny = 500; // canvas height
const d = 1;    // distance from origin to the image

export class Ray {
  // Given pixel coordinates i, j to shoot the ray at, construct a ray by
  // storing the origin and the unit direction
  constructor(i, j) {
    var u = l + (r - l) * (i + 0.5) / nx;
    var v = b + (t - b) * (j + 0.5) / ny;
    this.origin = vec3.fromValues(0, 0, 0);
    this.direction = vec3.normalize(vec3.create(), vec3.fromValues(u, v, -d));
  }
}
