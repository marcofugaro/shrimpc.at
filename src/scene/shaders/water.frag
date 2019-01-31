uniform sampler2D tDiffuse;
varying vec2 vUv;
uniform float t;

void main() {
	vec2 uv = vUv;

    // the texture moving
    uv.y += sin(t + uv.x * 4.0) * 0.1;
    uv.y += sin(t + uv.y * 2.0) * 0.1;
    // uv.x += t * 0.1;

    vec4 color = vec4(0.0);
	float total = 0.0;

    // how much to smear
    vec2 delta = vec2(uv.y * 0.01, uv.y * 0.01);

    // how many passes
    // can't use a variable because the for loop complains
    #define range 50.0

	for (float i = -range; i <= range; i++){
	  float percent = i / range;

      // this function is more heavy in the center
      // and 0 at the extremities
	  float weight = 1.0 - abs(percent);

	  vec4 smp = texture2D(tDiffuse, uv + delta * percent) * 2.0 - 0.5;
	  smp.rgb *= smp.a;
	  color += smp * weight;
	  total += weight;
	}

	gl_FragColor = color / total;
    gl_FragColor.rgb /= gl_FragColor.a + 0.00001;

    // make it more blue
    gl_FragColor.r -= 0.3;
    gl_FragColor.g -= 0.15;
}
