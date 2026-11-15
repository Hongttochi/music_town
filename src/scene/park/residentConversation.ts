export type ResidentMood = 'neutral' | 'happy' | 'sad' | 'surprised';
type Beat = { mood: ResidentMood; listener: ResidentMood };
export const residentConversations: readonly (readonly Beat[])[] = [
  [
    { mood: 'neutral', listener: 'neutral' },
    { mood: 'sad', listener: 'sad' },
    { mood: 'happy', listener: 'surprised' },
    { mood: 'happy', listener: 'happy' },
  ],
  [
    { mood: 'sad', listener: 'neutral' },
    { mood: 'neutral', listener: 'sad' },
    { mood: 'sad', listener: 'surprised' },
    { mood: 'happy', listener: 'surprised' },
    { mood: 'happy', listener: 'happy' },
  ],
  [
    { mood: 'surprised', listener: 'surprised' },
    { mood: 'sad', listener: 'sad' },
    { mood: 'surprised', listener: 'happy' },
    { mood: 'happy', listener: 'happy' },
  ],
  [
    { mood: 'happy', listener: 'neutral' },
    { mood: 'sad', listener: 'sad' },
    { mood: 'neutral', listener: 'neutral' },
    { mood: 'happy', listener: 'happy' },
  ],
];
export type ConversationMember = { id: string; x: number; z: number; available: boolean };
export type ConversationState = {
  partner: string;
  mood: ResidentMood;
  speaking: boolean;
  target?: { x: number; z: number };
  ready: boolean;
};
const TURN_MS = 3700;
/** One shared clock per pair: turns cannot overlap or drift when the scene pauses. */
export function createResidentConversations(random = Math.random) {
  let clock = 0;
  const pairs: {
    ids: [string, string];
    script: number;
    started: number;
    created: number;
    targets?: [{ x: number; z: number }, { x: number; z: number }];
  }[] = [];
  const cooldown = new Map<string, number>();
  let lastScript = -1;
  return {
    reset() {
      pairs.length = 0;
      cooldown.clear();
    },
    update(
      members: ConversationMember[],
      dt: number,
      paused: boolean,
      interrupted?: string,
      canTalk: (a: ConversationMember, b: ConversationMember) => boolean = () => true,
      arrange?: (
        a: ConversationMember,
        b: ConversationMember,
      ) => [{ x: number; z: number }, { x: number; z: number }] | null,
    ) {
      if (!paused) clock += Math.max(0, dt) * 1000;
      const byId = new Map(members.map((m) => [m.id, m]));
      const free = (m: ConversationMember) =>
        m.available &&
        m.id !== interrupted &&
        (cooldown.get(m.id) ?? 0) <= clock &&
        !pairs.some((p) => p.ids.includes(m.id));
      for (let i = pairs.length - 1; i >= 0; i--) {
        const pair = pairs[i];
        const a = byId.get(pair.ids[0]),
          b = byId.get(pair.ids[1]);
        if (
          !a?.available ||
          !b?.available ||
          !canTalk(a, b) ||
          pair.ids.includes(interrupted ?? '') ||
          Math.hypot(a.x - b.x, a.z - b.z) > 4 ||
          (pair.started < 0
            ? clock - pair.created > 9000
            : clock - pair.started >= residentConversations[pair.script].length * TURN_MS + 1200)
        ) {
          pair.ids.forEach((id) => cooldown.set(id, clock + 26000));
          pairs.splice(i, 1);
        }
      }
      if (!paused)
        for (const a of members) {
          if (!free(a)) continue;
          const b = members.find(
            (b) =>
              b.id !== a.id &&
              free(b) &&
              canTalk(a, b) &&
              Math.hypot(a.x - b.x, a.z - b.z) >= (arrange ? 0 : 1) &&
              Math.hypot(a.x - b.x, a.z - b.z) <= (arrange ? 3.2 : 2.4),
          );
          if (!b) continue;
          const targets = arrange?.(a, b);
          if (arrange && !targets) continue;
          let script = Math.floor(random() * residentConversations.length);
          if (script === lastScript) script = (script + 1) % residentConversations.length;
          lastScript = script;
          pairs.push({
            ids: [a.id, b.id],
            script,
            started: targets ? -1 : clock,
            created: clock,
            targets: targets ?? undefined,
          });
        }
      const states = new Map<string, ConversationState>();
      for (const pair of pairs) {
        const script = residentConversations[pair.script];
        if (
          pair.started < 0 &&
          pair.targets &&
          pair.ids.every((id, i) => {
            const member = byId.get(id)!;
            return Math.hypot(member.x - pair.targets![i].x, member.z - pair.targets![i].z) < 0.08;
          })
        )
          pair.started = clock;
        const ready = pair.started >= 0;
        const elapsed = ready ? clock - pair.started : 0;
        const turn = Math.min(script.length - 1, Math.floor(elapsed / TURN_MS));
        const beat = script[turn];
        const speaking = elapsed < script.length * TURN_MS && elapsed % TURN_MS < 3200;
        pair.ids.forEach((id, index) =>
          states.set(id, {
            partner: pair.ids[1 - index],
            mood: ready ? (index === turn % 2 ? beat.mood : beat.listener) : 'neutral',
            target: pair.targets?.[index],
            ready,
            speaking: ready && index === turn % 2 && speaking,
          }),
        );
      }
      return states;
    },
  };
}
