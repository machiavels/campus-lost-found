const variants = {
  LOST:    'badge-lost',
  FOUND:   'badge-found',
  PENDING: 'badge-pending',
  ACTIVE:  'badge-active',
  CLAIMED: 'badge-claimed',
  REJECTED:'inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700',
};

export default function Badge({ label }) {
  return <span className={variants[label] ?? variants.ACTIVE}>{label}</span>;
}
