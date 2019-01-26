export function playAudioFromBuffer(buffer) {
  const blob = new Blob([buffer], { type: 'audio/mp3' })
  const url = window.URL.createObjectURL(blob)
  const audio = new Audio()
  audio.src = url
  audio.play()
}
