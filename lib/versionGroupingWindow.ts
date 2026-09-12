/**
 * How close two edits of the same character/note must be, in time, to be
 * treated as the same continuous editing session and collapsed into a
 * single backed-up version instead of one version per autosave tick.
 */
export const VERSION_GROUPING_WINDOW_MS = 5 * 60 * 1000
