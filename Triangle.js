// class defining a triangle
const { vec3 } = glMatrix;

export class Triangle {
  // Given the vertices v0, v1, v2 as vec3 objects and the color values r, g, b,
  // construct a triangle
  constructor(v0, v1, v2, r, g, b) {
    this.v0 = v0;
    this.v1 = v1;
    this.v2 = v2;
    this.color = [r, g, b];
    // TODO: add as an argument
    this.diffuseOn = true;
    this.ambientOn = true;
    this.specularOn = true;
    this.texture = null;
  }

  // Given a point as a vec3 object, return an array of color values r, g, b at
  // that point
  colorAt(point) {
    // TODO: add case for texture
    return this.color;
  }

  // Given a point as a vec3 object, return an array of color values r, g, b of
  // specular color at that point
  specularColorAt(point) {
    // TODO: add case for specular map
    return [255, 255, 255];
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
    const E = ray.origin;
    const D = ray.direction;
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
}
