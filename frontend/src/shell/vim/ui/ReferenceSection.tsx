import * as Accordion from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import { VimKbd } from './vimUi';

const MOTIONS = [
  { keys: 'h j k l', desc: 'Cardinal moves' },
  { keys: 'w b e', desc: 'Word jumps' },
  { keys: '0 $ ^', desc: 'Line start/end' },
  { keys: 'f F t T', desc: 'Find on line' },
  { keys: 'gg G nG', desc: 'Top / bottom / line n' },
  { keys: '3motion', desc: 'Count prefix' },
];

export function ReferenceSection() {
  return (
    <Accordion.Root type="single" collapsible>
      <Accordion.Item value="motions">
        <Accordion.Header>
          <Accordion.Trigger className="group flex w-full items-center justify-between rounded-md px-1 py-0.5 text-left text-[length:var(--fs-tight)] font-medium text-ink2 transition-colors hover:bg-panel2 hover:text-accent">
            Reference — all motions
            <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]:rotate-180" />
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          <ul className="space-y-1 pb-1 pt-1 text-[length:var(--fs-2xs)] text-ink3">
            {MOTIONS.map((m) => (
              <li key={m.keys}>
                <VimKbd>{m.keys}</VimKbd> — {m.desc}
              </li>
            ))}
            <li className="pt-1">
              Learn Studio: <VimKbd>⌘⇧V</VimKbd>
            </li>
          </ul>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  );
}
