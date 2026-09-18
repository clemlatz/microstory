"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { CharactersPanel } from "./CharactersPanel";
import { NotesPanel } from "./NotesPanel";
import { DocumentationPanel } from "./DocumentationPanel";
import { SearchPanel } from "./SearchPanel";
import type { StorySection } from "./StoryNavDrawer";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useScrollRestoration } from "@/lib/useScrollRestoration";
import type { Story } from "@/lib/types";

/**
 * The knowledge-base shell for a story (issue #74, reworked by issue #13):
 * renders exactly one of its sections at a time — Overview (title +
 * presentation preview), Characters, Notes, or Documentation — driven by
 * the `section` prop `StoryPageClient` owns. Navigating between sections
 * (and to the manuscript, or back to the stories list) happens through
 * `StoryNavDrawer`, toggled open/closed via `StoryTitleBar`'s button (a
 * persistent sidebar on desktop, an overlay on narrower viewports — see
 * `StoryNavDrawer`'s own doc comment); the ad hoc
 * `stories-back-button`/`open-manuscript-button` this view used to render
 * itself are gone, superseded by that drawer. `StoryTitleBar` itself is
 * rendered by `StoryPageClient`, above this component rather than inside
 * it, since it must span the full window width rather than just this
 * view's own content pane (see its own doc comment).
 *
 * `SearchPanel` (issue #12) used to sit persistently above every section;
 * issue #21 moved it to its own dedicated `'search'` section instead
 * (its own sidebar entry, above "Overview") — it now renders on its own,
 * full-page, the same way every other section does.
 *
 * The story's presentation text (issue #1, a free-form synopsis/pitch) is
 * shown read-only here, as part of the Overview section — editing it
 * happens on its own dedicated Notion-style page
 * (`/story/[id]/presentation`, `StoryPresentationEditPage`).
 */
export function StoryHomeView({
  story,
  section,
}: {
  story: Story;
  section: StorySection;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  useScrollRestoration(scrollContainerRef, `${story.id}:${section}`);

  return (
    <div
      ref={scrollContainerRef}
      className="h-full flex-1 overflow-y-auto bg-[var(--reader-bg)] font-reader-label"
    >
      <div className="mx-auto w-full max-w-2xl px-6 py-10 text-[var(--reader-ink)] sm:px-10">
        {section === "search" && <SearchPanel storyId={story.id} />}

        {section !== "search" && (
          <>
            {section === "overview" && (
              <div>
                <div className="mb-2 flex items-center justify-between gap-2 border-b border-[var(--reader-rule)] pb-2">
                  <h3 className="text-xs font-semibold tracking-[0.09em] text-[var(--reader-muted)] uppercase">
                    {t("presentation.title")}
                  </h3>
                  <button
                    type="button"
                    data-testid="story-presentation-edit-button"
                    className="inline-flex min-h-11 items-center rounded-md px-3 text-sm text-[var(--reader-accent)] hover:underline"
                    onClick={() =>
                      router.push(`/story/${story.id}/presentation`)
                    }
                  >
                    {t("presentation.edit")}
                  </button>
                </div>
                <p
                  data-testid="story-presentation-preview"
                  className="font-reader-body text-[15px] leading-relaxed break-words whitespace-pre-line text-[var(--reader-body)]"
                >
                  {story.presentation.trim() || t("presentation.empty")}
                </p>
              </div>
            )}

            {section === "characters" && <CharactersPanel storyId={story.id} />}

            {section === "notes" && <NotesPanel storyId={story.id} />}

            {section === "documentation" && (
              <DocumentationPanel storyId={story.id} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
