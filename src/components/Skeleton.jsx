import React from 'react'

export default function Skeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-4 bg-gray-200 dark:bg-slate-700 rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}
