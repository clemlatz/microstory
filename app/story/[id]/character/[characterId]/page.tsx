import { notFound } from 'next/navigation'
import { CharacterEditPage } from '@/components/CharacterEditPage'
import { getStoryById } from '@/lib/storiesRepository'
import { getCharacterById } from '@/lib/charactersRepository'

export default async function CharacterPage({
  params,
}: {
  params: Promise<{ id: string; characterId: string }>
}) {
  const { id, characterId } = await params
  const story = getStoryById(id)
  if (!story) notFound()

  const character = getCharacterById(characterId, id)
  if (!character) notFound()

  return <CharacterEditPage story={story} character={character} />
}
