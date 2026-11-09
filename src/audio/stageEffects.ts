export type StageEffects = { volume: number; reverb: number; echo: number };
export const defaultStageEffects: StageEffects = { volume: 100, reverb: 0, echo: 0 };
export const stageEffectPresets = [
  { name: '원음', settings: defaultStageEffects },
  { name: '작은 공연장', settings: { volume: 100, reverb: 18, echo: 5 } },
  { name: '재즈바', settings: { volume: 100, reverb: 30, echo: 12 } },
];
export function normalizeStageEffects(value: Partial<StageEffects>): StageEffects {
  const clamp = (n: unknown, fallback: number, max: number) =>
    typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : fallback;
  return {
    volume: clamp(value.volume, 100, 150),
    reverb: clamp(value.reverb, 0, 60),
    echo: clamp(value.echo, 0, 50),
  };
}

/** A single stable output track feeds LiveKit; parameter changes never republish it. */
export function createStageEffectChain(context: BaseAudioContext, initial: StageEffects) {
  const source = context.createGain();
  const reverb = context.createConvolver();
  const impulse = context.createBuffer(2, Math.ceil(context.sampleRate * 1.4), context.sampleRate);
  let seed = 97;
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      data[i] = (seed / 2147483648) * Math.pow(1 - i / data.length, 2.5);
    }
  }
  reverb.buffer = impulse;
  const roomGain = context.createGain();
  const delay = context.createDelay(1);
  delay.delayTime.value = 0.24;
  const feedback = context.createGain();
  feedback.gain.value = 0.28;
  const echoGain = context.createGain();
  const sum = context.createGain();
  const volume = context.createGain();
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -3;
  compressor.knee.value = 0;
  compressor.ratio.value = 20;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.12;
  source.connect(sum);
  source.connect(reverb).connect(roomGain).connect(sum);
  source.connect(delay).connect(echoGain).connect(sum);
  delay.connect(feedback).connect(delay);
  sum.connect(volume).connect(compressor);
  function update(value: StageEffects) {
    const settings = normalizeStageEffects(value);
    for (const [param, target] of [
      [volume.gain, settings.volume / 100],
      [roomGain.gain, settings.reverb / 100],
      [echoGain.gain, settings.echo / 100],
    ] as const) {
      param.cancelScheduledValues(context.currentTime);
      param.setTargetAtTime(target, context.currentTime, 0.025);
    }
  }
  volume.gain.value = initial.volume / 100;
  roomGain.gain.value = initial.reverb / 100;
  echoGain.gain.value = initial.echo / 100;
  update(initial);
  let stopped = false;
  return {
    input: source,
    output: compressor,
    update,
    dispose() {
      if (stopped) return;
      stopped = true;
      [source, reverb, roomGain, delay, feedback, echoGain, sum, volume, compressor].forEach(
        (node) => node.disconnect(),
      );
    },
  };
}

export function createStageEffects(
  context: AudioContext,
  stream: MediaStream,
  initial: StageEffects,
) {
  const chain = createStageEffectChain(context, initial);
  const source = context.createMediaStreamSource(stream);
  const destination = context.createMediaStreamDestination();
  source.connect(chain.input);
  chain.output.connect(destination);
  // Monitor the same processed voice locally without a network round trip.
  // Disposing the chain disconnects both the local monitor and outgoing stream.
  chain.output.connect(context.destination);
  return {
    stream: destination.stream,
    update: chain.update,
    dispose() {
      source.disconnect();
      chain.dispose();
      destination.disconnect();
      destination.stream.getTracks().forEach((track) => track.stop());
    },
  };
}
