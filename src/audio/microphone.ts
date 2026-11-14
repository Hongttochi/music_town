// Speech processing can gate sustained notes and cancel the singer's local monitor.
// Keep the captured waveform intact for both monitoring and broadcast.
// latency is standardized but not yet included in every DOM type definition.
// An ideal constraint remains optional on browsers/devices that cannot satisfy it.
export const stageMicrophoneConstraints: MediaTrackConstraints & {
  latency: { ideal: number };
} = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
  latency: { ideal: 0.01 },
  channelCount: { ideal: 1 },
  sampleRate: { ideal: 48000 },
};
