void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
	vec2 uv = fragCoord.xy / iResolution.xy;
    float t = iTime;

    // the texture moving
    uv.y += sin(t + uv.x * 4.0) * 0.1;
    uv.y += sin(t + uv.y * 2.0) * 0.1;
    uv.x += t * 0.1;

    vec4 color = vec4(0.0);
	float total = 0.0;

    // how much to smear
    vec2 delta = vec2(uv.y * 0.01, uv.y * 0.01);

    // how many passes
    float range = 5.0;

	for (float i = -range; i <= range; i++){
	  float percent = i / range;

      // this function is more heavy in the center
      // and 0 at the extremities
	  float weight = 1.0 - abs(percent);

	  vec4 smp = (texture(iChannel0, uv + delta * percent) * 2.0 - .5);
	  smp.rgb *= smp.a;
	  color += smp * weight;
	  total += weight;
	}

	fragColor = color / total;
    fragColor.rgb /= fragColor.a + 0.00001;

    // make it more blue
    fragColor.r -= 0.3;
    fragColor.g -= 0.15;
}
