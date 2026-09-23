import { notFound } from 'next/navigation'
import { NoteEditPage } from '@/components/NoteEditPage'
import { getStoryById } from '@/lib/storiesRepository'
import { getNoteById } from '@/lib/notesRepository'

export default async function NotePage({ params }: { params: Promise<{ id: string; noteId: string }> }) {
  const { id, noteId } = await params
  const story = getStoryById(id)
  if (!story) notFound()

  const note = getNoteById(noteId, id)
  if (!note) notFound()

  return <NoteEditPage story={story} note={note} />
}
