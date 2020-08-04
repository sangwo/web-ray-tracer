// class defining a triangle
const { vec3, mat4 } = glMatrix;
import { Ray } from "./Ray.js";
import * as util from "./utility.js";

export class Triangle {
  // Given the vertices v0, v1, v2 as vec3 objects, color values r, g, b, and
  // whether diffuse, ambient, specular components are on, construct a triangle
  constructor(v0, v1, v2, r, g, b, diffuseOn, ambientOn, specularOn) {
    // vertices
    this.v0 = v0;
    this.v1 = v1;
    this.v2 = v2;
    // color
    this.color = [r, g, b];
    this.ambientPercent = 0.5;
    this.specularColor = [255, 255, 255];
    this.specularLight = [255, 255, 255];
    this.reflectedColor = null; // glow
    // shading options
    this.diffuseOn = diffuseOn;
    this.ambientOn = ambientOn;
    this.specularOn = specularOn;
    this.shininess = 200; // Phong exponent
    // reflection and refraction
    this.reflective = 0;
    this.transparent = 0; // amount of light allowed to go through
    this.ior = 1; // index of refraction
    this.colorFilter = [1, 1, 1]; // Math.exp(-absorbance)
    // transformation
    this.transform = mat4.create(); // identity matrix
    this.inverseTransform = mat4.create(); // inverse identity matrix
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

  /********** COLOR **********/
  // Given a point as a vec3 object, return an array of color values r, g, b at
  // that point
  colorAt(point) {
    return this.color;
  }

  // Given a percentage to tone down the surface color to make an ambient color,
  // set it as an ambient percent
  setAmbientPercent(percent) {
    this.ambientPercent = percent;
  }

  // Given a point as a vec3 object, return an array of color values r, g, b of
  // ambient color at that point
  ambientColorAt(point) {
    const self = this;
    return this.color.map(function(x) { return self.ambientPercent * x; });
  }

  // Given an array of color values r, g, b, set it as the object's specular
  // color
  setSpecularColor(r, g, b) {
    this.specularColor = [r, g, b];
  }

  // Given a point as a vec3 object, return an array of color values r, g, b of
  // specular color at that point
  specularColorAt(point) {
    return this.specularColor;
  }

  // Given a point as a vec3 object, return an array of color values r, g, b of
  // specular light at that point
  specularLightAt(point) {
    return this.specularLight;
  }

  /********** SHADING OPTIONS **********/
  // Given a shininess, set it as the object's shininess
  setShininess(shininess) {
    this.shininess = shininess;
  }

  /********** REFLECTION/REFRACTION **********/
  // Given a reflectivity coefficient in the range between 0 and 1, set the
  // object's reflectivity
  setReflectivity(ks) {
    if (ks < 0 || ks > 1) {
      throw new RangeError("The argument must be between 0 and 1");
    }
    this.reflective = ks;
  }

  // Given a point as a vec3 object, return reflectivity at that point
  getReflectivity(point) {
    return this.reflective;
  }

  // Given a transparency coefficient in the range between 0 and 1 and index of
  // refraction, set the object's transparency and index of refraction
  setTransparency(kt, ior) {
    if (kt < 0 || kt > 1) {
      throw new RangeError("The argument must be between 0 and 1");
    }
    this.transparent = kt;
    this.ior = ior;
  }

  // Given a point as a vec3 object, return transparency at that point
  getTransparency(point) {
    return this.transparent;
  }

  // TODO: this does not have any effect as triangle has no depth
  /*
  // Given a color filter for each color channel (r, g, b), set it as the
  // object's color filter
  setColorFilter(cr, cg, cb) {
    this.colorFilter = [cr, cg, cb];
  }
  */

  // Given color values r, g, b, set it as the object's reflected (glow) color
  setReflectedColor(r, g, b) {
    this.reflectedColor = [r, g, b];
  }

  /********** TRANSFORMATION **********/
  // TODO: repetitive (copied from Sphere.js)
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
