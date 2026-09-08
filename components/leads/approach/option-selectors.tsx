"use client";

import {
  BadgeCheck,
  Crosshair,
  Handshake,
  MessagesSquare,
  Minus,
  Rocket,
  Smile,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PERSONALITIES,
  TONES,
  type PersonalityIcon,
  type PersonalityId,
  type ToneId,
} from "@/lib/ai/outreach-options";

const personalityIcons: Record<PersonalityIcon, LucideIcon> = {
  "messages-square": MessagesSquare,
  zap: Zap,
  handshake: Handshake,
  "badge-check": BadgeCheck,
  rocket: Rocket,
  smile: Smile,
  crosshair: Crosshair,
  minus: Minus,
};

export function PersonalitySelector({
  value,
  onChange,
  disabled,
}: {
  value: PersonalityId;
  onChange: (value: PersonalityId) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled}>
      <legend className="field-label">Quem vai fazer a abordagem?</legend>
      <div
        role="radiogroup"
        aria-label="Personalidade da abordagem"
        className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
      >
        {PERSONALITIES.map((personality) => {
          const Icon = personalityIcons[personality.icon];
          const selected = personality.id === value;
          return (
            <button
              key={personality.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(personality.id)}
              className={cn(
                "min-h-24 rounded-xl border p-3 text-left transition-colors",
                selected
                  ? "border-primary bg-primary/8 ring-1 ring-primary/20"
                  : "bg-background/40 hover:border-muted-foreground/50 hover:bg-muted/40",
              )}
            >
              <span className="mb-2 flex items-center gap-2 text-xs font-medium">
                <Icon
                  className={cn(
                    "size-4",
                    selected ? "text-primary" : "text-muted-foreground",
                  )}
                />
                {personality.name}
              </span>
              <span className="block text-[10px] leading-4 text-muted-foreground">
                {personality.description}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function ToneSelector({
  value,
  onChange,
  disabled,
}: {
  value: ToneId;
  onChange: (value: ToneId) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled}>
      <legend className="field-label">Tom da abordagem</legend>
      <div
        role="radiogroup"
        aria-label="Tom da abordagem"
        className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
      >
        {TONES.map((tone) => {
          const selected = tone.id === value;
          return (
            <button
              key={tone.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(tone.id)}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-left transition-colors",
                selected
                  ? "border-primary bg-primary/8 ring-1 ring-primary/20"
                  : "bg-background/40 hover:border-muted-foreground/50 hover:bg-muted/40",
              )}
            >
              <span className="block text-[11px] font-medium">{tone.name}</span>
              <span className="mt-1 block text-[10px] leading-4 text-muted-foreground">
                {tone.description}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
