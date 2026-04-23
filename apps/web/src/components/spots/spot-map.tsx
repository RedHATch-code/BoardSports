'use client'

import Link from 'next/link'
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'

type SpotMapPoint = {
  id: string
  slug: string
  title: string
  latitude: number
  longitude: number
  visibility: 'public' | 'sensitive' | 'private'
  locationLabel: string
  sportName?: string | null
}

type SpotMapProps = {
  spots: SpotMapPoint[]
  activeSpotId?: string
  heightClassName?: string
}

const portugalCenter: [number, number] = [39.6, -8.2]

function getMarkerColor(visibility: SpotMapPoint['visibility']) {
  if (visibility === 'private') return '#fb7185'
  if (visibility === 'sensitive') return '#22d3ee'
  return '#f59e0b'
}

export function SpotMap({ spots, activeSpotId, heightClassName = 'min-h-[460px]' }: SpotMapProps) {
  const activeSpot = spots.find((spot) => spot.id === activeSpotId)
  const center: [number, number] = activeSpot
    ? [activeSpot.latitude, activeSpot.longitude]
    : portugalCenter

  return (
    <div className={`overflow-hidden rounded-[28px] border border-white/10 ${heightClassName}`}>
      <MapContainer
        center={center}
        zoom={activeSpot ? 11 : 7}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {spots.map((spot) => (
          <CircleMarker
            key={spot.id}
            center={[spot.latitude, spot.longitude]}
            radius={spot.id === activeSpotId ? 10 : 8}
            pathOptions={{
              color: '#e2e8f0',
              weight: 1,
              fillColor: getMarkerColor(spot.visibility),
              fillOpacity: spot.id === activeSpotId ? 0.95 : 0.82
            }}
          >
            <Popup>
              <div className="space-y-2 text-sm">
                <p className="font-semibold">{spot.title}</p>
                <p>{spot.locationLabel}</p>
                {spot.sportName ? <p>{spot.sportName}</p> : null}
                <Link href={`/spots/${spot.slug}`} className="font-semibold text-sky-600">
                  Abrir spot
                </Link>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}
