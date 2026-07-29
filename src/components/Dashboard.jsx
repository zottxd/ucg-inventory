import React from 'react'
import AssetCard from './AssetCard'

export default function Dashboard({ assets, onOpen }){
  if(assets.length === 0) return <div className="p-6 text-gray-500 dark:text-gray-400">Ничего не найдено.</div>

  return (
    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {assets.map(a=> (
        <AssetCard key={a.id} asset={a} onOpen={onOpen} />
      ))}
    </div>
  )
}
