import { redirect } from 'next/navigation'
import { getCurrentStoryId } from '@/lib/settingsRepository'
import { storyExists } from '@/lib/storiesRepository'

// Forces this route to be rendered on every request instead of prerendered
// once at build time — its redirect target depends on current DB state
// (getCurrentStoryId), which is empty/different at build time vs runtime.
export const dynamic = 'force-dynamic'

export default function Home() {
  const currentStoryId = getCurrentStoryId()
  if (currentStoryId && storyExists(currentStoryId)) {
    redirect(`/story/${currentStoryId}`)
  }
  redirect('/stories')
}
