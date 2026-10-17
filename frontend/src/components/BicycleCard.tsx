import { ArrowUpRight, Bike, MapPin, Clock3 } from 'lucide-react'
import type { Bicycle } from '../types'

export function BicycleCard({ bicycle, onSelect, onRide }: { bicycle: Bicycle; onSelect: (b: Bicycle) => void; onRide: (b: Bicycle) => void }) {
  const available = bicycle.status === 'Available'
  return <article className="bike-card">
    <div className="bike-visual" style={{ background: bicycle.color }}>
      <div className="bike-card-top"><span className={`status-chip ${bicycle.status.toLowerCase().replace(' ', '-')}`}><i />{bicycle.status}</span><button className="mini-arrow" onClick={() => onSelect(bicycle)} aria-label={`View ${bicycle.id}`}><ArrowUpRight size={16} /></button></div>
      <div className="bike-art"><Bike size={90} strokeWidth={1.15} /></div>
      <div className="bike-id">{bicycle.id}</div>
    </div>
    <div className="bike-card-body">
      <div><h3>{bicycle.label}</h3><p className="muted-text">Ready for your next campus hop</p></div>
      <div className="bike-meta"><span><MapPin size={14} />{bicycle.location}</span><span><Clock3 size={14} />{bicycle.distance}</span></div>
      <div className="bike-card-actions"><button className="button button-light" onClick={() => onSelect(bicycle)}>Details</button><button className="button button-primary" disabled={!available} onClick={() => onRide(bicycle)}>{available ? 'Start ride' : bicycle.status === 'In use' ? 'In use' : 'Unavailable'}</button></div>
    </div>
  </article>
}
