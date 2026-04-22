import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { clearToken } from '../lib/auth'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../lib/api'

const menus = [
  { to: '/dashboard', label: '대시보드' },
  { to: '/systems', label: '시스템 정보' },
  { to: '/interfaces', label: 'API 연동 정보' },
  { to: '/executions', label: '실행 이력' },
  { to: '/logs', label: '처리 기록' },
  { to: '/schedules', label: '스케줄' },
]

export function AppShell() {
  const navigate = useNavigate()

  const { data } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiGet('/api/auth/me'),
  })

  const handleLogout = () => {
    clearToken()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
            <div className="brand">
              <span className="brand-badge">IH</span>
              <div>
                <strong>InterLinkHub</strong>
                <p>통합정보시스템</p>
              </div>
            </div>

          <nav className="nav">
            {menus.map((menu) => (
              <NavLink
                key={menu.to}
                to={menu.to}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                {menu.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <button className="logout-button" type="button" onClick={handleLogout}>
          로그아웃
        </button>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">통합정보시스템</p>
            <h1>업무 현황</h1>
          </div>
          <div className="user-chip">
            <span>{data?.displayName ?? data?.username ?? '사용자'}</span>
            <small>{data?.role ?? '사용자'}</small>
          </div>
        </header>

        <section className="content">
          <Outlet />
        </section>
      </main>
    </div>
  )
}
