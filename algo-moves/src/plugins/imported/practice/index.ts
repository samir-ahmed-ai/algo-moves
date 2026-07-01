import type { PracticeBundle } from '../../_shared/pluginKit';
import { codePiecesFromSource } from '../../_shared/pluginKit';
import { IMPORTED_PRACTICE } from './bundles';
import { MIGRATED_BUNDLES } from './migrated';
import { EXTRA_CASE_BUNDLES } from './extraCases';

function mergeBundles(a?: PracticeBundle, b?: PracticeBundle): PracticeBundle | undefined {
  if (!a && !b) return undefined;
  const mergedCases =
    a?.cases || b?.cases
      ? {
          good: b?.cases?.good ?? a?.cases?.good ?? [],
          bad: b?.cases?.bad ?? a?.cases?.bad,
          goodLabel: b?.cases?.goodLabel ?? a?.cases?.goodLabel,
          badLabel: b?.cases?.badLabel ?? a?.cases?.badLabel,
          intro: b?.cases?.intro ?? a?.cases?.intro,
        }
      : undefined;
  return {
    quiz: b?.quiz ?? a?.quiz,
    codePieces: b?.codePieces ?? a?.codePieces,
    cases: mergedCases,
    simulateQuestion: b?.simulateQuestion ?? a?.simulateQuestion,
  };
}

/** Resolve teaching bundle: migrated native content > split item bundles > extra cases. */
export function resolvePracticeBundle(manifestId: string, goSource: string): PracticeBundle | undefined {
  const fromSplit = IMPORTED_PRACTICE[manifestId];
  const fromMigrated = MIGRATED_BUNDLES[manifestId];

  let bundle = mergeBundles(fromSplit, fromMigrated);
  const extra = EXTRA_CASE_BUNDLES[manifestId];
  if (extra?.cases?.good.length && (!bundle?.cases?.good.length)) {
    bundle = mergeBundles(bundle, extra);
  }

  if (bundle && !bundle.codePieces) {
    const generated = codePiecesFromSource(goSource);
    if (generated) bundle = { ...bundle, codePieces: generated };
  }

  return bundle;
}

export { IMPORTED_PRACTICE } from './bundles';
export { MIGRATED_BUNDLES } from './migrated';
