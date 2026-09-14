/**
 * Small trash-can icon used as the delete affordance on list items
 * (characters, notes, documentation) — see issue #23. Matches the stroke
 * style of `StoryNavDrawer`'s sidebar icons (24x24 viewBox, `currentColor`
 * stroke, 1.8 stroke width, rounded caps/joins) for visual consistency.
 */
export function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M9 7V4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V7" />
      <path d="M6 7l.8 12.1a2 2 0 0 0 2 1.9h6.4a2 2 0 0 0 2-1.9L18 7" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
}
