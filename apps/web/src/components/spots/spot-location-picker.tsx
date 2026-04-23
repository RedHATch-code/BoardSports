'use client'

import { useEffect } from 'react'
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'

type SpotLocationPickerProps = {
  latitude: number
  longitude: number
  onChange: (coordinates: { latitude: number; longitude: number }) => void
}

const portugalCenter: [number, number] = [39.6, -8.2]

function PickerEvents({
  latitude,
  longitude,
  onChange
}: SpotLocationPickerProps) {
  const map = useMap()

  useEffect(() => {
    map.setView([latitude, longitude], map.getZoom())
  }, [latitude, longitude, map])

  useMapEvents({
    click(event) {
      onChange({
        latitude: Number(event.latlng.lat.toFixed(6)),
        longitude: Number(event.latlng.lng.toFixed(6))
      })
    }
  })

  return (
    <CircleMarker
      center={[latitude, longitude]}
      radius={10}
      pathOptions={{
        color: '#f8fafc',
        weight: 1,
        fillColor: '#22d3ee',
        fillOpacity: 0.9
      }}
    />
  )
}

export function SpotLocationPicker({
  latitude,
  longitude,
  onChange
}: SpotLocationPickerProps) {
  const center =
    Number.isFinite(latitude) && Number.isFinite(longitude)
      ? ([latitude, longitude] as [number, number])
      : portugalCenter

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10">
      <MapContainer center={center} zoom={7} scrollWheelZoom={false} className="min-h-[360px] w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <PickerEvents latitude={center[0]} longitude={center[1]} onChange={onChange} />
      </MapContainer>
    </div>
  )
}
