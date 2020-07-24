// class defining a sphere
const { vec3, mat3, mat4 } = glMatrix;
import { Ray } from "./Ray.js";
import * as util from "./utility.js";

export class Sphere {
  // Given x, y, z coordinates, radius, color values r, g, b, whether diffuse,
  // ambient, specular components are on, and optionally a Texture object,
  // construct an unit sphere centered at origin (possibly transformed)
  constructor(x, y, z, radius, r, g, b, diffuseOn, ambientOn, specularOn, texture=null, normalMap=null, specularMap=null) {
    this.color = [r, g, b];
    this.texture = texture;
    this.normalMap = normalMap;
    this.specularMap = specularMap;
    this.diffuseOn = diffuseOn;
    this.ambientOn = ambientOn;
    this.specularOn = specularOn;
    this.transform = mat4.create(); // identity matrix
    this.inverseTransform = mat4.create(); // inverse identity matrix

    // transform according to x, y, z and radius
    this.scale(radius, radius, radius);
    this.translate(x, y, z);
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

  // Given a point as a vec3 object, return an array of color values r, g, b of
  // specular color at that point
  specularColorAt(point) {
    if (this.specularMap != null) {
      // TODO: repetitive
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
    return [255, 255, 255];
  }

  // Given a point and ray direction as vec3 objects, return the normal at the
  // point as a vec3 object
  normal(point, rayDirection) {
    let normal = vec3.normalize(vec3.create(), point);
    if (this.normalMap != null) {
      // TODO: repetitive
      // compute u, v
      const theta = Math.acos(point[1]);
      let phi = Math.atan2(point[2], -point[0]);
      if (phi < 0) {
        phi = phi + 2 * Math.PI;
      }
      const u = phi / (2 * Math.PI)
      const v = (Math.PI - theta) / Math.PI;

      // convert rgb to normal in tangent space
      const rgb = this.normalMap.colorAt(u, v).map(function(x) {
        return 2 * x - 255;
      });
      const normalTangentSpace = vec3.fromValues(rgb[0], rgb[1], rgb[2]);
      vec3.normalize(normalTangentSpace, normalTangentSpace);

      // compute tbn matrix
      /*
      // TODO: repetitive
      let t = vec3.fromValues(0, 1, 0); // any vector not collinear with normal
      if (vec3.equals(normal, t)) {
        t = vec3.fromValues(0, 0, 1);
      }
      const tangent = vec3.cross(vec3.create(), t, normal);
      */
      const tangent = vec3.fromValues(Math.sin(phi), 0, Math.cos(phi));
      const bitangent = vec3.cross(vec3.create(), normal, tangent);
      const tbn = mat3.fromValues(
        tangent[0], tangent[1], tangent[2],
        bitangent[0], bitangent[1], bitangent[2],
        normal[0], normal[1], normal[2]
      );

      // convert normal in tangent space to object space
      vec3.transformMat3(normal, normalTangentSpace, tbn);
    }
    return normal;
  }

  // Given a Ray object, return the t value for the intersection (null if the
  // ray doesn’t intersect with the sphere)
  intersects(ray) {
    // transform the ray according to the object's inverse transformation matrix
    const transOrigin = util.transformPosition(ray.origin, this.inverseTransform);
    const transDirection = util.transformDirection(ray.direction, this.inverseTransform);
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
    let t = vec3.fromValues(0, 0, 1); // any vector not collinear with w
    if (vec3.equals(w, t)) {
      t = vec3.fromValues(0, 1, 0);
    }
    const u = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), w, t));
    const v = vec3.cross(vec3.create(), w, u);
    const objectToWorld = mat4.fromValues(
      u[0], v[0], w[0], 0,
      u[1],v[1], w[1], 0,
      u[2], v[2], w[2], 0,
      0, 0, 0, 1
    );
    const rotationMat = mat4.fromValues(
      Math.cos(angle), Math.sin(angle), 0, 0,
      -Math.sin(angle), Math.cos(angle), 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    );
    const worldToObject = mat4.transpose(mat4.create(), objectToWorld);
    const result = mat4.multiply(mat4.create(), mat4.multiply(mat4.create(), worldToObject, rotationMat), objectToWorld);
    mat4.multiply(this.transform, result, this.transform);
    mat4.multiply(this.inverseTransform, this.inverseTransform, mat4.invert(mat4.create(), result));
  }

  // Given scaling factors in x, y, z directions, compute scaling matrix and
  // multiply it to transformation matrix
  scale(sx, sy, sz) {
    const scalingMat = mat4.fromValues(
      sx, 0, 0, 0,
      0, sy, 0, 0,
      0, 0, sz, 0,
      0, 0, 0, 1
    );
    mat4.multiply(this.transform, scalingMat, this.transform);
    mat4.multiply(this.inverseTransform, this.inverseTransform, mat4.invert(mat4.create(), scalingMat));
  }

  // Given x, y, z to translate by, compute translation matrix and multiply it
  // to transformation matrix
  translate(x, y, z) {
    const translMat = mat4.fromValues(
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      x, y, z, 1
    );
    mat4.multiply(this.transform, translMat, this.transform);
    mat4.multiply(this.inverseTransform, this.inverseTransform, mat4.invert(mat4.create(), translMat));
  }
}
