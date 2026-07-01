import { useEffect, useMemo, useState } from 'react';
import * as Accordion from '@radix-ui/react-accordion';
import { ChevronRight, LayoutGrid } from 'lucide-react';
import { catalog } from '../content';
import { useWorkspace } from '../lib/workspace';
import { cn } from '../lib/cn';
import { chromeText } from './chromeUi';
import { courseIcon } from './courseIcon';

function matchesSearch(query: string, ...fields: (string | undefined)[]): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return fields.some((f) => f?.toLowerCase().includes(needle));
}

export function CatalogTree({ searchQuery = '' }: { searchQuery?: string }) {
  const { activeItemId, activeTopicId, setActiveTopicId } = useWorkspace();

  // Highlight the topic that owns the open problem even when no grid is open.
  const currentTopicId = activeTopicId ?? catalog.breadcrumb(activeItemId).topic?.id ?? '';
  const activeCourseId =
    catalog.topics.find((t) => t.id === currentTopicId)?.courseId ?? catalog.courses[0]?.id ?? '';
  const [openCourseId, setOpenCourseId] = useState(activeCourseId);

  useEffect(() => {
    if (activeCourseId) setOpenCourseId(activeCourseId);
  }, [activeCourseId]);

  const searching = !!searchQuery.trim();

  const filteredCourses = useMemo(() => {
    if (!searching) return catalog.courses;
    return catalog.courses
      .map((course) => {
        const courseMatch = matchesSearch(searchQuery, course.title, course.id);
        const topics = course.topics.filter(
          (t) => courseMatch || matchesSearch(searchQuery, t.title, t.id, course.title),
        );
        return { ...course, topics };
      })
      .filter((c) => c.topics.length > 0);
  }, [searchQuery, searching]);

  const matchingCourseIds = filteredCourses.map((c) => c.id);

  const courseItems = filteredCourses.map((course) => {
    const Icon = courseIcon(course.icon);
    return (
      <Accordion.Item key={course.id} value={course.id} className="border-b border-edge last:border-0">
        <Accordion.Header className="flex">
          <Accordion.Trigger
            className="group/row flex w-full min-h-[var(--row)] items-center gap-1.5 pr-2 text-left transition-colors hover:bg-panel2"
          >
            <span className="grid h-6 w-5 shrink-0 place-items-center text-ink3">
              <ChevronRight className="h-3 w-3 transition-transform duration-200 group-data-[state=open]/row:rotate-90" />
            </span>
            <Icon className="h-3.5 w-3.5 shrink-0 opacity-80 text-ink2" />
            <span className={cn('min-w-0 flex-1 truncate font-medium text-ink2 group-hover/row:text-ink', chromeText.sm)}>
              {course.title}
            </span>
            <span className={cn('shrink-0 font-mono tabular-nums text-ink3', chromeText.xs)}>
              {course.topics.length}
            </span>
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          <div className="pb-1">
            {course.topics.map((topic) => {
              const active = topic.id === currentTopicId;
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => setActiveTopicId(topic.id)}
                  title={`Open the ${topic.title} grid`}
                  className={cn(
                    'group/topic flex w-full min-h-[var(--row)] items-center gap-2 py-0 pl-[26px] pr-[var(--hpad)] text-left transition-colors',
                    active ? 'bg-accentbg text-accent' : 'text-ink2 hover:bg-panel2 hover:text-ink',
                  )}
                >
                  <span className={cn('min-w-0 flex-1 truncate', chromeText.sm)}>{topic.title}</span>
                  <span className={cn('shrink-0 font-mono tabular-nums text-ink3', chromeText.xs)}>
                    {topic.items.length}
                  </span>
                  <LayoutGrid
                    className={cn(
                      'h-3 w-3 shrink-0 transition-opacity',
                      active ? 'opacity-100 text-accent' : 'opacity-0 group-hover/topic:opacity-60',
                    )}
                  />
                </button>
              );
            })}
          </div>
        </Accordion.Content>
      </Accordion.Item>
    );
  });

  if (searching && filteredCourses.length === 0) {
    return <div className={cn('px-[var(--hpad)] py-2 leading-snug text-ink3', chromeText.sm)}>No matching topics</div>;
  }

  if (searching) {
    return (
      <Accordion.Root type="multiple" value={matchingCourseIds} className="py-1">
        {courseItems}
      </Accordion.Root>
    );
  }

  return (
    <Accordion.Root
      type="single"
      collapsible
      value={openCourseId}
      onValueChange={(v) => setOpenCourseId(v)}
      className="py-1"
    >
      {courseItems}
    </Accordion.Root>
  );
}
