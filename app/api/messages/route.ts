import { NextResponse } from 'next/server'
import { getAllMessages, clearMessages } from '@/lib/messagesRepository'
import { clearConversationSummary } from '@/lib/settingsRepository'
import { clearConversationSummaries } from '@/lib/conversationSummariesRepository'
import { requireExistingStoryId } from '@/lib/requestStoryId'

export async function GET(request: Request): Promise<Response> {
  const storyIdResult = requireExistingStoryId(request)
  if ('error' in storyIdResult) return storyIdResult.error

  const messages = getAllMessages(storyIdResult.storyId)

  return NextResponse.json({ messages })
}

export async function DELETE(request: Request): Promise<Response> {
  const storyIdResult = requireExistingStoryId(request)
  if ('error' in storyIdResult) return storyIdResult.error

  clearMessages(storyIdResult.storyId)
  clearConversationSummary(storyIdResult.storyId)
  clearConversationSummaries(storyIdResult.storyId)
  return NextResponse.json({ success: true })
}
