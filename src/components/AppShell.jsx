import { NavLink, Outlet } from 'react-router-dom'

const menus = [
  { to: '/dashboard', label: '대시보드' },
  { to: '/business-units', label: '본부 현황' },
  { to: '/projects', label: '프로젝트' },
  { to: '/cost-entries', label: '원가 항목' },
  { to: '/allocation', label: '배부 / 마감' },
]

export function AppShell() {
  const isDev = import.meta.env.DEV

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand">
            <span className="brand-badge">CM</span>
            <div>
              <strong>Cost Management</strong>
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

        <div className="sidebar-footer">
          <p>{isDev ? '로컬 개발 환경' : '배포 환경'}</p>
          <small>{isDev ? '백엔드: localhost:8081' : '백엔드: /api proxy'}</small>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Cost Management</p>
            <h1>본부별 원가 운영 현황</h1>
          </div>
          <div className="user-chip">
            <span>{isDev ? '로컬 테스트' : '운영 화면'}</span>
            <small>{isDev ? 'MySQL + IntelliJ + VSCode' : 'EC2 + Vercel'}</small>
          </div>
        </header>

        <section className="content">
          <Outlet />
        </section>
      </main>
    </div>
  )
}
