import { ChannelMeta, ChannelSource } from '../types';

export const CHANNEL_CONFIG: Record<ChannelSource, ChannelMeta> = {
  airbnb: {
    id: 'airbnb',
    name: 'Airbnb',
    shortName: 'Airbnb',
    bgColor: 'bg-rose-500/15',
    textColor: 'text-rose-400',
    borderColor: 'border-rose-500/30',
    tagColor: '#FF385C',
    logoPlaceholder: 'ABNB',
  },
  makemytrip: {
    id: 'makemytrip',
    name: 'MakeMyTrip (MMT)',
    shortName: 'MMT',
    bgColor: 'bg-red-500/15',
    textColor: 'text-red-400',
    borderColor: 'border-red-500/30',
    tagColor: '#EA2330',
    logoPlaceholder: 'MMT',
  },
  booking: {
    id: 'booking',
    name: 'Booking.com',
    shortName: 'Booking',
    bgColor: 'bg-sky-500/15',
    textColor: 'text-sky-400',
    borderColor: 'border-sky-500/30',
    tagColor: '#003580',
    logoPlaceholder: 'BKNG',
  },
  agoda: {
    id: 'agoda',
    name: 'Agoda',
    shortName: 'Agoda',
    bgColor: 'bg-indigo-500/15',
    textColor: 'text-indigo-400',
    borderColor: 'border-indigo-500/30',
    tagColor: '#5392F9',
    logoPlaceholder: 'AGD',
  },
  vrbo: {
    id: 'vrbo',
    name: 'VRBO',
    shortName: 'VRBO',
    bgColor: 'bg-teal-500/15',
    textColor: 'text-teal-400',
    borderColor: 'border-teal-500/30',
    tagColor: '#2A5B84',
    logoPlaceholder: 'VRBO',
  },
  direct: {
    id: 'direct',
    name: 'Direct / Offline Booking',
    shortName: 'Direct',
    bgColor: 'bg-emerald-500/15',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    tagColor: '#10B981',
    logoPlaceholder: 'DIR',
  },
  block: {
    id: 'block',
    name: 'Blocked Dates / Maintenance',
    shortName: 'Blocked',
    bgColor: 'bg-slate-500/20',
    textColor: 'text-slate-400',
    borderColor: 'border-slate-500/40',
    tagColor: '#64748B',
    logoPlaceholder: 'BLK',
  },
};

export function getChannelBadge(source: ChannelSource) {
  return CHANNEL_CONFIG[source] || CHANNEL_CONFIG.direct;
}
