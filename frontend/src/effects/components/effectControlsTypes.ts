export interface EffectControlsProps {
  data: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}
