'use client'
import { Button } from '@/core/components/v4'

/** Opens the assistant with a question about the community (AssistantChat listens for 'myconet:ask'). */
export default function AskAboutButton({ name }: { name: string }) {
  return (
    <Button variant="secondary" icon="spark" onClick={() => window.dispatchEvent(new CustomEvent('myconet:ask', { detail: `Tell me about ${name}` }))}>
      Ask about {name}
    </Button>
  )
}
