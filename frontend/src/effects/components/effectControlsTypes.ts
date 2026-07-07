export type EffectPatch = Record<string, unknown>;

export interface EffectControlsProps {
  readonly data: Readonly<Record<string, unknown>>;
  readonly onChange: (patch: EffectPatch) => void;
}
