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
  normal(point, rayDirection) {
    var v0v1 = vec3.subtract(vec3.create(), this.v1, this.v0);
    var v0v2 = vec3.subtract(vec3.create(), this.v2, this.v0);
    var normal = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), v0v1,
        v0v2));
    var negNormal = vec3.negate(vec3.create(), normal);
    var normalAngle = vec3.angle(normal, vec3.negate(vec3.create(),
        rayDirection));
    var negNormalAngle = vec3.angle(negNormal, vec3.negate(vec3.create(),
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
    var E = ray.origin;
    var D = ray.direction;
    var a = this.v0[0] - this.v1[0];
    var b = this.v0[1] - this.v1[1];
    var c = this.v0[2] - this.v1[2];
    var d = this.v0[0] - this.v2[0];
    var e = this.v0[1] - this.v2[1];
    var f = this.v0[2] - this.v2[2];
    var g = D[0];
    var h = D[1];
    var i = D[2];
    var j = this.v0[0] - E[0];
    var k = this.v0[1] - E[1];
    var l = this.v0[2] - E[2];

    var ei_hf = e*i - h*f;
    var gf_di = g*f - d*i;
    var dh_eg = d*h - e*g;
    var ak_jb = a*k - j*b;
    var jc_al = j*c - a*l;
    var bl_kc = b*l - k*c;
    var M = a*ei_hf + b*gf_di + c*dh_eg;

    var beta = (j*ei_hf + k*gf_di + l*dh_eg) / M;
    var gamma = (i*ak_jb + h*jc_al + g*bl_kc) / M;

    // ray doesn't intersect with triangle
    if (beta < 0 || gamma < 0 || beta + gamma > 1) {
      return null;
    }

    // ray intersects with triangle
    var t = - (f*ak_jb + e*jc_al + d*bl_kc) / M;
    return t;
  }
}
