// class defining a triangle
const { vec3 } = glMatrix;
import { Ray } from "./Ray.js";
import * as util from "./utility.js";
import { Shape } from "./Shape.js";

export class Triangle extends Shape {
  // Given the vertices v0, v1, v2 as vec3 objects, color values r, g, b, and
  // whether diffuse, ambient, specular components are on, construct a triangle
  constructor(v0, v1, v2, r, g, b, diffuseOn, ambientOn, specularOn) {
    super(r, g, b, diffuseOn, ambientOn, specularOn);
    // vertices
    this.v0 = v0;
    this.v1 = v1;
    this.v2 = v2;
  }

  // Given a point and ray direction as vec3 objects, return the normal of the
  // plane containing the triangle as a vec3 object
  normal(point, rayDirection) {
    const v0v1 = vec3.subtract(vec3.create(), this.v1, this.v0);
    const v0v2 = vec3.subtract(vec3.create(), this.v2, this.v0);
    const normal = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), v0v1,
        v0v2));
    const negNormal = vec3.negate(vec3.create(), normal);
    const normalAngle = vec3.angle(normal, vec3.negate(vec3.create(),
        rayDirection));
    const negNormalAngle = vec3.angle(negNormal, vec3.negate(vec3.create(),
        rayDirection));
    // regardless of order of vertices, normal will always point towards z+
    if (normalAngle < negNormalAngle) {
      return normal;
    }
    return negNormal;
  }

  // Given a Ray object, return the t value for the intersection (null if the
  // ray doesn’t intersect with the triangle)
  intersects(ray) {
    // transform the ray according to the object's inverse transformation matrix
    const transOrigin = util.transformPosition(ray.origin, this.inverseTransform);
    const transDirection = util.transformDirection(ray.direction, this.inverseTransform);
    const transRay = new Ray(transOrigin, transDirection);

    // compute intersection of the (transformed) ray and the object
    const E = transRay.origin;
    const D = transRay.direction;
    const a = this.v0[0] - this.v1[0];
    const b = this.v0[1] - this.v1[1];
    const c = this.v0[2] - this.v1[2];
    const d = this.v0[0] - this.v2[0];
    const e = this.v0[1] - this.v2[1];
    const f = this.v0[2] - this.v2[2];
    const g = D[0];
    const h = D[1];
    const i = D[2];
    const j = this.v0[0] - E[0];
    const k = this.v0[1] - E[1];
    const l = this.v0[2] - E[2];

    const ei_hf = e*i - h*f;
    const gf_di = g*f - d*i;
    const dh_eg = d*h - e*g;
    const ak_jb = a*k - j*b;
    const jc_al = j*c - a*l;
    const bl_kc = b*l - k*c;
    const M = a*ei_hf + b*gf_di + c*dh_eg;

    const beta = (j*ei_hf + k*gf_di + l*dh_eg) / M;
    const gamma = (i*ak_jb + h*jc_al + g*bl_kc) / M;

    // ray doesn't intersect with triangle
    if (beta < 0 || gamma < 0 || beta + gamma > 1) {
      return null;
    }

    // ray intersects with triangle
    const t = - (f*ak_jb + e*jc_al + d*bl_kc) / M;
    return t;
  }

  // Given a Texture object and texture (u, v) coordinates of each vertex as
  // an array, set the object's texture
  setTexture(texture, uv0, uv1, uv2) {
    super.setTexture(texture);
    this.uv0 = uv0;
    this.uv1 = uv1;
    this.uv2 = uv2;
  }

  // Given a point as a vec3 object, compute and return a texture coordinate u,
  // v as an array
  getUV(point) {
    // convert point in cartesian coordinates to barycentric coordinates
    const v0v1 = vec3.subtract(vec3.create(), this.v1, this.v0);
    const v0v2 = vec3.subtract(vec3.create(), this.v2, this.v0);
    const v2v0 = vec3.subtract(vec3.create(), this.v0, this.v2);
    const v0p = vec3.subtract(vec3.create(), point, this.v0);
    const v2p = vec3.subtract(vec3.create(), point, this.v2);

    const n = vec3.cross(vec3.create(), v0v1, v0v2);
    const nLength = vec3.length(n);
    const n1 = vec3.cross(vec3.create(), v2v0, v2p);
    const n2 = vec3.cross(vec3.create(), v0v1, v0p);

    const beta = vec3.dot(n, n1) / (nLength * nLength);
    const gamma = vec3.dot(n, n2) / (nLength * nLength);

    // compute uv coordinates
    const u = this.uv0[0] + beta * (this.uv1[0] - this.uv0[0]) + gamma * (this.uv2[0] - this.uv0[0]);
    const v = this.uv0[1] + beta * (this.uv1[1] - this.uv0[1]) + gamma * (this.uv2[1] - this.uv0[1]);

    return [u, v];
  }
}
