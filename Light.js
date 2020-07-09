// class defining a light
const { vec3 } = glMatrix;

export class Light {
  // Given a bottom-left corner (vec3), width (vec3), number of columns (int),
  // height (vec3), number of rows (int), and color values r, g, b (int),
  // construct an area light
  constructor(corner, uvecFull, usteps, vvecFull, vsteps, r, g, b) {
    this.corner = corner;
    this.uvec = vec3.scale(vec3.create(), uvecFull, (1 / usteps));
    this.usteps = usteps;
    this.vvec = vec3.scale(vec3.create(), vvecFull, (1 / vsteps));
    this.vsteps = vsteps;
    this.samples = usteps * vsteps;
    this.r = r;
    this.g = g;
    this.b = b;
  }

  // Given cell position uc, vc relative to corner, return jittered point in
  // area light as a vec3 object
  pointAt(uc, vc) {
    // jittered point = corner + uvec * (uc + random() * (uvec.length / usteps))
    //                         + vvec * (vc + random() * (vvec.length / vsteps))
    var u = vec3.scale(vec3.create(), this.uvec,
        (uc + Math.random() * (vec3.length(this.uvec) / this.usteps)));
    var v = vec3.scale(vec3.create(), this.vvec,
        (vc + Math.random() * (vec3.length(this.vvec) / this.vsteps)));
    return vec3.add(vec3.create(), vec3.add(vec3.create(), this.corner, u), v);
  }
}
