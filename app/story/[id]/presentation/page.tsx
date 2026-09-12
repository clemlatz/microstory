import { notFound } from 'next/navigation'
import { StoryPresentationEditPage } from '@/components/StoryPresentationEditPage'
import { getStoryById } from '@/lib/storiesRepository'

export default async function StoryPresentationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const story = getStoryById(id)
  if (!story) notFound()

  return <StoryPresentationEditPage story={story} />
}
