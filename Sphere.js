// class defining a sphere
const { vec3, mat3 } = glMatrix;
import { Ray } from "./Ray.js";

export class Sphere {
  // Given x, y, z coordinates, radius, color values r, g, b, whether diffuse,
  // ambient, specular components are on, and optionally a Texture object,
  // construct an unit sphere centered at origin (possibly transformed)
  constructor(x, y, z, radius, r, g, b, diffuseOn, ambientOn, specularOn, texture=null) {
    this.color = [r, g, b];
    this.texture = texture;
    this.diffuseOn = diffuseOn;
    this.ambientOn = ambientOn;
    this.specularOn = specularOn;
    this.transform = mat3.fromValues(1, 0, 0, 0, 1, 0, 0, 0, 1); // identity matrix
    this.inverseTransform = mat3.fromValues(1, 0, 0, 0, 1, 0, 0, 0, 1); // inverse identity matrix
    // TODO: change to given x, y, z, translate
    this.scale(radius, radius, radius);
  }

  // Given a point as a vec3 object, return an array of color values r, g, b at
  // that point
  colorAt(point) {
    if (this.texture != null) {
      // compute u, v
      const theta = Math.acos(point[1]);
      let phi = Math.atan2(point[2], -point[0]);
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
    return vec3.normalize(vec3.create(), point);
  }

  // Given a Ray object, return the t value for the intersection (null if the
  // ray doesn’t intersect with the sphere)
  intersects(ray) {
    // transform the ray according to the object's inverse transformation matrix
    const transOrigin = vec3.transformMat3(vec3.create(), ray.origin, this.inverseTransform);
    const transDirection = vec3.transformMat3(vec3.create(), ray.direction, this.inverseTransform);
    const transRay = new Ray(transOrigin, transDirection);

    // compute intersection of the (transformed) ray and the object
    const a = vec3.dot(transRay.direction, transRay.direction);
    const b = 2 * vec3.dot(transRay.direction, transRay.origin);
    const c = vec3.dot(transRay.origin, transRay.origin) - 1;
    const discriminant = b * b - 4 * a * c;

    if (discriminant < 0) {
      return null;
    }

    // compute t value
    if (vec3.length(transRay.origin) < 1) { // ray origin inside the sphere
      return (-b + Math.sqrt(discriminant)) / (2 * a);
    } else { // choose smaller (closer) value of t
      return (-b - Math.sqrt(discriminant)) / (2 * a);
    }
  }

  // Given an axis to rotate about as a vec3 object and an angle to rotate by in
  // radians, compute rotation matrix and multiply it to transformation matrix
  rotate(axis, angle) {
    const w = vec3.normalize(vec3.create(), axis);
    // TODO: how do I compute non-collinear vector?
    const t = vec3.fromValues(w[0] + 1,  2 * w[1] + 1, 3 * w[2] + 1); // any vector not collinear with w
    const u = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), w, t));
    const v = vec3.cross(vec3.create(), w, u);
    const objectToWorld = mat3.fromValues(u[0], v[0], w[0], u[1], v[1], w[1], u[2], v[2], w[2]);
    const rotationMat = mat3.fromValues(Math.cos(angle), Math.sin(angle), 0, -Math.sin(angle), Math.cos(angle), 0, 0, 0, 1);
    const worldToObject = mat3.fromValues(u[0], u[1], u[2], v[0], v[1], v[2], w[0], w[1], w[2]);
    const result = mat3.multiply(mat3.create(), mat3.multiply(mat3.create(), worldToObject, rotationMat), objectToWorld);
    mat3.multiply(this.transform, result, this.transform);
    mat3.multiply(this.inverseTransform, this.inverseTransform, mat3.invert(mat3.create(), result));
  }

  // Given scaling factors in x, y, z directions, compute scaling matrix and
  // multiply it to transformation matrix
  scale(sx, sy, sz) {
    const scalingMat = mat3.fromValues(sx, 0, 0, 0, sy, 0, 0, 0, sz);
    mat3.multiply(this.transform, scalingMat, this.transform);
    mat3.multiply(this.inverseTransform, this.inverseTransform, mat3.invert(mat3.create(), scalingMat));
  }
}
