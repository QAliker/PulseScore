'use client';

import { Volume2, VolumeX } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { setSoundEnabled } from '@/hooks/use-goal-notifications';

const KEY = 'pulse-sound-enabled';
const EVENT = 'pulse-sound-change';

function subscribe(cb: () => void) {
  window.addEventListener('storage', cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener('storage', cb);
    window.removeEventListener(EVENT, cb);
  };
}
const getSnapshot = () =>
  typeof window === 'undefined' ? false : localStorage.getItem(KEY) === '1';
const getServerSnapshot = () => false;

export function SoundToggle() {
  const enabled = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const toggle = () => {
    setSoundEnabled(!enabled);
    window.dispatchEvent(new Event(EVENT));
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label={enabled ? 'Mute goal sound' : 'Enable goal sound'}
          aria-pressed={enabled}
          className="size-9 rounded-full"
        >
          {enabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{enabled ? 'Mute goals' : 'Goal sound off'}</TooltipContent>
    </Tooltip>
  );
}
