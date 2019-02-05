precision highp float;
uniform sampler2D tDiffuse;
varying vec2 vUv;

void main() {
	gl_FragColor = texture2D(tDiffuse, vUv);

    // make it more blue
    gl_FragColor.b += 0.1;
    gl_FragColor.r -= 0.025;
    gl_FragColor.g -= 0.025;
}
