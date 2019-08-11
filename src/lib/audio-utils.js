function playAudioHtml5(audioBuffer) {
  const blob = new Blob([audioBuffer], { type: 'audio/mp3' })
  const url = window.URL.createObjectURL(blob)
  const audio = new Audio()
  audio.src = url
  audio.play()
}

async function playAudioWebAudioApi(audioBuffer, audioContext) {
  const source = audioContext.createBufferSource()
  source.buffer = await audioContext.decodeAudioData(audioBuffer.slice())
  source.connect(audioContext.destination)
  source.start()
}

export function playAudio(audioBuffer, audioContext) {
  if (audioContext) {
    playAudioWebAudioApi(audioBuffer, audioContext)
  } else {
    playAudioHtml5(audioBuffer)
  }
}
