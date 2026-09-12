import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const storyId = 'story-1'

describe('conversationSummariesRepository', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('DATABASE_PATH', ':memory:')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns an empty array when no summary has been recorded', async () => {
    const { getAllConversationSummaries } = await import('./conversationSummariesRepository')
    expect(getAllConversationSummaries(storyId)).toEqual([])
  })

  it('addConversationSummary records a summary retrievable via getAllConversationSummaries', async () => {
    const { addConversationSummary, getAllConversationSummaries } = await import(
      './conversationSummariesRepository'
    )

    addConversationSummary('Résumé automatique.', 'msg-1', 'auto', storyId)

    const summaries = getAllConversationSummaries(storyId)
    expect(summaries).toHaveLength(1)
    expect(summaries[0]).toMatchObject({
      content: 'Résumé automatique.',
      cutoffMessageId: 'msg-1',
      type: 'auto',
    })
    expect(summaries[0].id).toBeTypeOf('string')
    expect(summaries[0].createdAt).toBeTypeOf('number')
  })

  it('keeps every summary ever recorded, in creation order, rather than only the latest', async () => {
    const { addConversationSummary, getAllConversationSummaries } = await import(
      './conversationSummariesRepository'
    )

    addConversationSummary('Premier résumé.', 'msg-1', 'auto', storyId)
    addConversationSummary('Deuxième résumé.', 'msg-3', 'manual', storyId)

    const summaries = getAllConversationSummaries(storyId)
    expect(summaries.map((summary) => summary.content)).toEqual(['Premier résumé.', 'Deuxième résumé.'])
    expect(summaries.map((summary) => summary.type)).toEqual(['auto', 'manual'])
  })

  it('scopes summaries by storyId', async () => {
    const { addConversationSummary, getAllConversationSummaries } = await import(
      './conversationSummariesRepository'
    )
    const otherStoryId = 'story-2'

    addConversationSummary('Résumé histoire 1.', 'msg-1', 'auto', storyId)
    addConversationSummary('Résumé histoire 2.', 'msg-1', 'auto', otherStoryId)

    expect(getAllConversationSummaries(storyId).map((s) => s.content)).toEqual(['Résumé histoire 1.'])
    expect(getAllConversationSummaries(otherStoryId).map((s) => s.content)).toEqual(['Résumé histoire 2.'])
  })

  it('clearConversationSummaries removes every recorded summary for that story only', async () => {
    const { addConversationSummary, getAllConversationSummaries, clearConversationSummaries } = await import(
      './conversationSummariesRepository'
    )
    const otherStoryId = 'story-2'

    addConversationSummary('Résumé.', 'msg-1', 'auto', storyId)
    addConversationSummary('Résumé autre histoire.', 'msg-1', 'auto', otherStoryId)
    clearConversationSummaries(storyId)

    expect(getAllConversationSummaries(storyId)).toEqual([])
    expect(getAllConversationSummaries(otherStoryId)).toHaveLength(1)
  })

  it('updateConversationSummary corrects the content of an existing summary', async () => {
    const { addConversationSummary, getAllConversationSummaries, updateConversationSummary } =
      await import('./conversationSummariesRepository')

    addConversationSummary('Résumé initial.', 'msg-1', 'auto', storyId)
    const [existing] = getAllConversationSummaries(storyId)

    const updated = updateConversationSummary(existing.id, storyId, 'Résumé corrigé.')

    expect(updated).toMatchObject({
      id: existing.id,
      content: 'Résumé corrigé.',
      cutoffMessageId: 'msg-1',
      type: 'auto',
    })
    expect(updated?.createdAt).toBe(existing.createdAt)

    const summaries = getAllConversationSummaries(storyId)
    expect(summaries).toHaveLength(1)
    expect(summaries[0].content).toBe('Résumé corrigé.')
  })

  it('updateConversationSummary returns null for an unknown id', async () => {
    const { updateConversationSummary } = await import('./conversationSummariesRepository')

    expect(updateConversationSummary('does-not-exist', storyId, 'Nouveau contenu.')).toBeNull()
  })

  it('updateConversationSummary returns null when the id exists but belongs to a different story', async () => {
    const { addConversationSummary, getAllConversationSummaries, updateConversationSummary } =
      await import('./conversationSummariesRepository')
    const otherStoryId = 'story-2'

    addConversationSummary('Résumé initial.', 'msg-1', 'auto', storyId)
    const [existing] = getAllConversationSummaries(storyId)

    expect(updateConversationSummary(existing.id, otherStoryId, 'Nouveau contenu.')).toBeNull()
  })
})
