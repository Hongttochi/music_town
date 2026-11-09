// Speech processing can gate sustained notes and cancel the singer's local monitor.
// Keep the captured waveform intact for both monitoring and broadcast.
export const stageMicrophoneConstraints: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
  channelCount: { ideal: 1 },
  sampleRate: { ideal: 48000 },
};
