const { vec3, vec4 } = glMatrix;

// Given a direction as a vec3 object and a 4x4 transformation matrix, return
// the transformed direction as a vec3 object
export function transformDirection(direction, transMat) {
  const wDirection = vec4.fromValues(direction[0], direction[1], direction[2], 0);
  const transDirection = vec4.transformMat4(vec4.create(), wDirection, transMat);
  const result = vec3.fromValues(transDirection[0], transDirection[1], transDirection[2]);
  return result;
}

// Given a position as a vec3 object and a 4x4 transformation matrix, return the
// transformed position as a vec3 object
export function transformPosition(position, transMat) {
  const wPosition = vec4.fromValues(position[0], position[1], position[2], 1);
  const transPosition = vec4.transformMat4(vec4.create(), wPosition, transMat);
  const result = vec3.fromValues(transPosition[0], transPosition[1], transPosition[2]);
  return result;
}
