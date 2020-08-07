// class defining a sphere
const { vec3, mat3 } = glMatrix;
import { Ray } from "./Ray.js";
import * as util from "./utility.js";
import { Shape } from "./Shape.js";

export class Sphere extends Shape {
  // Given x, y, z coordinates, radius, color values r, g, b, and whether
  // diffuse, ambient, specular components are on, construct an unit sphere
  // centered at origin transformed according to the coordinates and the radius
  constructor(x, y, z, radius, r, g, b, diffuseOn, ambientOn, specularOn) {
    super(r, g, b, diffuseOn, ambientOn, specularOn);
    // transform according to x, y, z and radius
    this.scale(radius, radius, radius);
    this.translate(x, y, z);
  }

  // Given a point and ray direction as vec3 objects, return the normal at the
  // point as a vec3 object
  normal(point, rayDirection) {
    let normal = vec3.normalize(vec3.create(), point);
    if (this.normalMap != null) {
      const uv = this.getUV(point);

      // convert rgb to normal in tangent space
      const rgb = this.normalMap.colorAt(uv[0], uv[1]).map(function(x) {
        return 2 * x - 255;
      });
      const normalTangentSpace = vec3.fromValues(rgb[0], rgb[1], rgb[2]);
      vec3.normalize(normalTangentSpace, normalTangentSpace);

      // compute tbn matrix
      let tangent = vec3.fromValues(0, 0, 1); // any vector not collinear with normal
      if (vec3.equals(normal, tangent)) {
        tangent = vec3.fromValues(0, 1, 0);
      }
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

  // Given a point as a vec3 object, compute and return a texture coordinate u,
  // v as an array
  getUV(point) {
    const theta = Math.acos(point[1]);
    let phi = Math.atan2(point[2], -point[0]);
    if (phi < 0) {
      phi = phi + 2 * Math.PI;
    }
    const u = phi / (2 * Math.PI)
    const v = (Math.PI - theta) / Math.PI;
    return [u, v];
  }
}
