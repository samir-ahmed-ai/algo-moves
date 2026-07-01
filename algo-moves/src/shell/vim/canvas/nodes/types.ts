export type VimNodeKind = 'maze' | 'hud' | 'level' | 'progress' | 'status' | 'motions';

export interface VimNodeData extends Record<string, unknown> {
  kind?: VimNodeKind;
}
