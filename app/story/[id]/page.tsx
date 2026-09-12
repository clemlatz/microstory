import { notFound } from 'next/navigation'
import { StoryPageClient } from '@/components/StoryPageClient'
import { setCurrentStoryId } from '@/lib/settingsRepository'
import { getStoryById } from '@/lib/storiesRepository'
import { isLlmWritingEnabled } from '@/lib/llmWritingFlag'

export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const story = getStoryById(id)
  if (!story) notFound()
  setCurrentStoryId(id)
  return <StoryPageClient story={story} llmWritingEnabled={isLlmWritingEnabled()} />
}
