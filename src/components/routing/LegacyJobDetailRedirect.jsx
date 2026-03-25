import { Navigate, useSearchParams } from 'react-router-dom'
import { CANONICAL_JOB_DETAIL_PATH } from '@/utils/fieldRoutes'

/**
 * Preserves `id` and `tab` when redirecting /JobDetail → /FieldJobDetail.
 */
export default function LegacyJobDetailRedirect() {
  const [params] = useSearchParams()
  const id = params.get('id')
  const tab = params.get('tab')
  const next = new URLSearchParams()
  if (id) next.set('id', id)
  if (tab) next.set('tab', tab)
  const qs = next.toString()
  return <Navigate to={`${CANONICAL_JOB_DETAIL_PATH}${qs ? `?${qs}` : ''}`} replace />
}
