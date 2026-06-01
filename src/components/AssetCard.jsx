import React from 'react'

function TypeIcon({ type }){
  if(type === 'Printer') return <span className="text-2xl">🖨️</span>
  if(type === 'Laptop') return <span className="text-2xl">💻</span>
  if(type === 'Cash Register') return <span className="text-2xl">🧾</span>
  if(type === 'Tablet') return <span className="text-2xl">📱</span>
  return <span className="text-2xl">📦</span>
}

export default function AssetCard({ asset, onOpen }){
  return (
    <div onClick={()=>onOpen(asset)} className="cursor-pointer bg-white rounded-lg border hover:shadow-lg p-4 flex items-center gap-4">
      <div className="flex-shrink-0 w-12 h-12 rounded bg-gray-100 flex items-center justify-center">
        <TypeIcon type={asset.type} />
      </div>

      <div className="flex-1">
        <div className="font-semibold">{asset.name}</div>
        <div className="text-sm text-gray-500">{asset.type}</div>
      </div>

      <div className="flex flex-col items-end gap-2">
        <div className="text-lg font-medium">{asset.quantity}</div>
        <div className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">{asset.location}</div>
      </div>
    </div>
  )
}
