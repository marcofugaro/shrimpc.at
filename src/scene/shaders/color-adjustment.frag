precision highp float;
uniform sampler2D uSampler;
varying vec2 vTextureCoord;

void main() {
  gl_FragColor = texture2D(uSampler, vTextureCoord);

  // make it more blue
  gl_FragColor.b += 0.08;
  gl_FragColor.r -= 0.02;
  gl_FragColor.g -= 0.02;
}
