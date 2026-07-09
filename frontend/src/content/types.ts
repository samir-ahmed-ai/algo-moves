export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type ItemKind = 'problem' | 'reading' | 'quiz';
export type ItemStatus = 'todo' | 'in-progress' | 'done';

export interface SourceLink {
  label: string;
  url: string;
}

/**
 * An item as authored in the content manifest. Only `id` and `kind` are
 * required; for a `problem` item, title/summary/difficulty/source/tags are
 * hydrated from the referenced plugin's meta unless overridden here.
 */
export interface ItemDef {
  id: string;
  kind: ItemKind;
  pluginId?: string;
  /** For a `reading` item: the LessonDef id (defaults to the item id). */
  lessonId?: string;
  title?: string;
  summary?: string;
  difficulty?: Difficulty;
  tags?: string[];
  source?: SourceLink;
  estimatedMinutes?: number;
  status?: ItemStatus;
  /** Item ids that should be mastered first (#61 prerequisite graph). */
  prereqs?: string[];
}

export interface TopicDef {
  id: string;
  title: string;
  summary?: string;
  items: ItemDef[];
}

export interface CourseDef {
  id: string;
  title: string;
  summary?: string;
  icon?: string;
  topics: TopicDef[];
}

/** A fully resolved item used throughout the app. */
export interface Item {
  id: string;
  kind: ItemKind;
  pluginId?: string;
  /** For a `reading` item: the LessonDef id (defaults to the item id). */
  lessonId?: string;
  title: string;
  summary?: string;
  difficulty?: Difficulty;
  tags: string[];
  source?: SourceLink;
  estimatedMinutes?: number;
  status: ItemStatus;
  prereqs: string[];
  courseId: string;
  topicId: string;
}

export interface Topic {
  id: string;
  title: string;
  summary?: string;
  courseId: string;
  items: Item[];
}

export interface Course {
  id: string;
  title: string;
  summary?: string;
  icon?: string;
  topics: Topic[];
}
