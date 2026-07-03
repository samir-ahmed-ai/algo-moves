/** Solo learning surfaces — Learn Studio, Play mode, Code Studio. */
export { LearnStudio, type LearnStudioProps } from './LearnStudio';
export { ProblemPage, type ProblemPageProps } from './ProblemPage';
export {
  CodeStudioProvider,
  CodeStudioBody,
  CodeStudioFooter,
  CodeStudioToolbar,
  useCodeStudio,
} from './CodeStudio';
export { CodeStudioQuiz, type CodeStudioQuizProps } from './CodeStudioQuiz';
export {
  STUDIO_GROUPS,
  STUDIO_TABS,
  STUDIO_TAB_PERSIST,
  flatOrder,
  isTabAvailable,
  type StudioGroupId,
  type StudioTab,
} from './studioTabs';
