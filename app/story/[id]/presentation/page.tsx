import { notFound } from 'next/navigation'
import { StoryPresentationEditPage } from '@/components/StoryPresentationEditPage'
import { getStoryById } from '@/lib/storiesRepository'
import { isLlmWritingEnabled } from '@/lib/llmWritingFlag'

export default async function StoryPresentationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const story = getStoryById(id)
  if (!story) notFound()

  return <StoryPresentationEditPage story={story} llmWritingEnabled={isLlmWritingEnabled()} />
}
