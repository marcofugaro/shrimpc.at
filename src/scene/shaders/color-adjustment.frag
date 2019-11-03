precision highp float;
uniform sampler2D uSampler;
varying vec2 vTextureCoord;

void main() {
  gl_FragColor = texture2D(uSampler, vTextureCoord);

  // make it more blue
  gl_FragColor.b += 0.08;
  gl_FragColor.r -= 0.02;
  gl_FragColor.g -= 0.02;

  // gamma correction

  // TODO make it correct
  // float gamma = 2.2;
  // gl_FragColor.rgb = pow(gl_FragColor.rgb, vec3(1.0 / gamma));
  gl_FragColor.rgb = pow(gl_FragColor.rgb, vec3(0.8));

  // TODO use this on textures
	// texture.format = THREE.RGBFormat
	// texture.mapping = THREE.CubeReflectionMapping
	// texture.encoding = THREE.sRGBEncoding
}
