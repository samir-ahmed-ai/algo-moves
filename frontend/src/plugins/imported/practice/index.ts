import type { PracticeBundle } from '../../_shared/pluginKit';
import { splitCodeIntoPieces } from '@/lib/code';
import { IMPORTED_PRACTICE } from './bundles';
import { MIGRATED_BUNDLES } from './migrated';
import { EXTRA_CASE_BUNDLES } from './extraCases';

function mergeCases(
  a?: PracticeBundle['cases'],
  b?: PracticeBundle['cases'],
): PracticeBundle['cases'] | undefined {
  if (!a && !b) return undefined;
  const good = b?.good ?? a?.good ?? [];
  const out: NonNullable<PracticeBundle['cases']> = { good };
  const bad = b?.bad ?? a?.bad;
  if (bad !== undefined) out.bad = bad;
  const goodLabel = b?.goodLabel ?? a?.goodLabel;
  if (goodLabel !== undefined) out.goodLabel = goodLabel;
  const badLabel = b?.badLabel ?? a?.badLabel;
  if (badLabel !== undefined) out.badLabel = badLabel;
  const intro = b?.intro ?? a?.intro;
  if (intro !== undefined) out.intro = intro;
  return out;
}

function mergeBundles(a?: PracticeBundle, b?: PracticeBundle): PracticeBundle | undefined {
  if (!a && !b) return undefined;
  const mergedCases = mergeCases(a?.cases, b?.cases);
  const out: PracticeBundle = {};
  const quiz = b?.quiz ?? a?.quiz;
  const codePieces = b?.codePieces ?? a?.codePieces;
  const simulateQuestion = b?.simulateQuestion ?? a?.simulateQuestion;
  if (quiz !== undefined) out.quiz = quiz;
  if (codePieces !== undefined) out.codePieces = codePieces;
  if (mergedCases !== undefined) out.cases = mergedCases;
  if (simulateQuestion !== undefined) out.simulateQuestion = simulateQuestion;
  return out;
}

/** Resolve teaching bundle: migrated native content > split item bundles > extra cases. */
export function resolvePracticeBundle(
  manifestId: string,
  goSource: string,
): PracticeBundle | undefined {
  const fromSplit = IMPORTED_PRACTICE[manifestId];
  const fromMigrated = MIGRATED_BUNDLES[manifestId];

  let bundle = mergeBundles(fromSplit, fromMigrated);
  const extra = EXTRA_CASE_BUNDLES[manifestId];
  if (extra?.cases?.good.length && !bundle?.cases?.good.length) {
    bundle = mergeBundles(bundle, extra);
  }

  if (bundle && !bundle.codePieces) {
    const generated = splitCodeIntoPieces(goSource) ?? undefined;
    if (generated) bundle = { ...bundle, codePieces: generated };
  }

  return bundle;
}

export { IMPORTED_PRACTICE } from './bundles';
export { MIGRATED_BUNDLES } from './migrated';
