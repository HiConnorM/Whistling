interface Props {
  biggestWin: string
  biggestRisk: string
  bestAction: string
}

export function KeyInsightCards({ biggestWin, biggestRisk, bestAction }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3 h-full">
      <div className="rounded-xl border border-green-200 bg-green-50 p-5">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-green-700">
          Biggest Win
        </div>
        <p className="text-sm leading-relaxed text-gray-800">{biggestWin}</p>
      </div>
      <div className="rounded-xl border border-red-200 bg-red-50 p-5">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-red-700">
          Biggest Risk
        </div>
        <p className="text-sm leading-relaxed text-gray-800">{biggestRisk}</p>
      </div>
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-700">
          Best Move This Week
        </div>
        <p className="text-sm leading-relaxed text-gray-800">{bestAction}</p>
      </div>
    </div>
  )
}
