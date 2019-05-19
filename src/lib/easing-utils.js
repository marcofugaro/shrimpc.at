// from Inigo Quilez
// http://www.iquilezles.org/www/articles/functions/functions.htm
export function impulse(x, strength) {
  const h = strength * x
  return h * Math.exp(1 - h)
}
