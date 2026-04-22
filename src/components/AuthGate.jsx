import { useQuery } from '@tanstack/react-query'
import { Navigate, useLocation } from 'react-router-dom'
import { apiGet } from '../lib/api'
import { getToken } from '../lib/auth'
import { FullPageLoader } from './FullPageLoader'

export function AuthGate({ children }) {
  const location = useLocation()
  const token = getToken()

  const { isLoading, isError } = useQuery({
    queryKey: ['me'],
    enabled: Boolean(token),
    queryFn: () => apiGet('/api/auth/me'),
  })

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (isLoading) {
    return <FullPageLoader title="세션 확인 중" subtitle="잠시만 기다려 주세요." />
  }

  if (isError) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
