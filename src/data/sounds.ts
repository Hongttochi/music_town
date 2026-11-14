import grassWalk from '../sounds/grass_walk.mp3';
import barWalk from '../sounds/bar_walk.mp3';
import conversationStart from '../sounds/conversation_start.mp3';
import conversationEnd from '../sounds/conversation_end.mp3';
import error from '../sounds/error.mp3';
import timeChange from '../sounds/time_change.mp3';
import screenChange from '../sounds/screen_change.mp3';
import clap from '../sounds/clap.mp3';
import complete from '../sounds/complete.mp3';
import heart from '../sounds/heart.mp3';
import lightstick from '../sounds/Lightstick.mp3';
import click from '../sounds/click.mp3';
import ok from '../sounds/ok.mp3';
import cancel from '../sounds/cancel.mp3';

import coffeemachine from '../sounds/coffeemachine.mp3';
import coffeemachineEnd from '../sounds/coffeemachine_end.mp3';
import drink from '../sounds/drink.mp3';
import sitdown from '../sounds/sitdown.mp3';

export const sources = {
  grassWalk,
  barWalk,
  conversationStart,
  conversationEnd,
  error,
  timeChange,
  screenChange,
  clap,
  complete,
  heart,
  lightstick,
  click,
  ok,
  cancel,
  coffeemachine,
  coffeemachineEnd,
  drink,
  sitdown,
};
export type SoundEffect = keyof typeof sources;
