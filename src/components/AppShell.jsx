import { NavLink, Outlet } from 'react-router-dom'

const menus = [
  { to: '/dashboard', label: '대시보드' },
  { to: '/business-units', label: '본부 현황' },
  { to: '/projects', label: '프로젝트' },
  { to: '/cost-entries', label: '원가 항목' },
  { to: '/allocation', label: '배부 / 마감' },
]

export function AppShell() {
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
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Cost Management</p>
            <h1>본부별 원가 운영 현황</h1>
          </div>
        </header>

        <section className="content">
          <Outlet />
        </section>
      </main>
    </div>
  )
}
