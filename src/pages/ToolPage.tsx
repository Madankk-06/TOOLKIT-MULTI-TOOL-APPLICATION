import { useParams } from 'react-router-dom'
import { Suspense } from 'react'
import { toolsMap } from '../tools/toolsMap'
import BackButton from '../components/BackButton'
import { AIToolSidekick } from '../components/AIToolSidekick'

export default function ToolPage() {
  const { slug } = useParams<{ slug: string }>()
  const Comp = toolsMap[slug!]

  if (!Comp) {
    return (
      <div className="min-h-screen bg-bg text-text p-8">
        <BackButton />
        <div className="bg-surface border border-danger rounded-lg p-6">
          <h1 className="text-2xl font-bold text-danger mb-2">Tool Not Found</h1>
          <p className="text-text2">The tool "{slug}" doesn't exist yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg text-text p-4">
      <div className="max-w-4xl mx-auto">
        <BackButton />
        <Suspense fallback={<div className="text-text2">Loading tool...</div>}>
          <Comp />
        </Suspense>
      </div>

      {/* AI Sidekick — context-aware assistant for every tool */}
      <AIToolSidekick slug={slug!} />
    </div>
  )
}