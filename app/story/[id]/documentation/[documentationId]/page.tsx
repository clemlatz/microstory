import { notFound } from 'next/navigation'
import { DocumentationEditPage } from '@/components/DocumentationEditPage'
import { getStoryById } from '@/lib/storiesRepository'
import { getDocumentationEntryById } from '@/lib/documentationRepository'

export default async function DocumentationPage({
  params,
}: {
  params: Promise<{ id: string; documentationId: string }>
}) {
  const { id, documentationId } = await params
  const story = getStoryById(id)
  if (!story) notFound()

  const entry = getDocumentationEntryById(documentationId, id)
  if (!entry) notFound()

  return <DocumentationEditPage storyId={story.id} entry={entry} />
}
