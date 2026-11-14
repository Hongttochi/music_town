import { useEffect } from 'react';
import { useSoundEffects } from './useSoundEffects';

export function useConversationSounds() {
  const play = useSoundEffects();
  useEffect(() => play('conversationStart'), [play]);
  return play;
}
