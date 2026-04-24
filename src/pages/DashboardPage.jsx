import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { formatCurrency, formatNumber } from '../lib/format'

function clampPercent(value, maxValue) {
  if (!maxValue) return 0
  return Math.max(10, Math.min(100, Math.round((value / maxValue) * 100)))
}

export function DashboardPage() {
  const summaryQuery = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => apiGet('/api/dashboard/summary'),
  })

  const summary = summaryQuery.data ?? {
    businessUnitCount: 0,
    projectCount: 0,
    activeProjectCount: 0,
    totalBudget: 0,
    totalSpent: 0,
    thisMonthSpent: 0,
    thisMonthEntryCount: 0,
    businessUnits: [],
  }

  const units = summary.businessUnits ?? []
  const maxRate = Math.max(
    1,
    ...units.map((unit) => Number(unit.utilizationRate ?? 0)),
  )

  return (
    <div className="page-stack">
      <PageHeader
        title="대시보드"
        description="여러 본부의 프로젝트와 원가 집행을 한 화면에서 확인하는 운영 현황입니다."
      />

      <section className="stats-grid">
        <StatCard label="본부 수" value={formatNumber(summary.businessUnitCount)} hint="운영 조직" />
        <StatCard label="프로젝트 수" value={formatNumber(summary.projectCount)} tone="mint" />
        <StatCard label="가동 프로젝트" value={formatNumber(summary.activeProjectCount)} tone="gold" />
        <StatCard label="이번 달 원가" value={formatCurrency(summary.thisMonthSpent)} tone="rose" />
      </section>

      <section className="panel-grid">
        <article className="panel">
          <div className="panel-heading">
            <h3>전체 집계</h3>
            <span>예산 / 집행 / 등록 건수</span>
          </div>
          <div className="metric-row metric-row-wide">
            <div>
              <p>총 예산</p>
              <strong>{formatCurrency(summary.totalBudget)}</strong>
            </div>
            <div>
              <p>총 집행</p>
              <strong>{formatCurrency(summary.totalSpent)}</strong>
            </div>
            <div>
              <p>이번 달 원가 건수</p>
              <strong>{formatNumber(summary.thisMonthEntryCount)}</strong>
            </div>
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h3>본부별 동시 수행 현황</h3>
            <span>활성 프로젝트 기준</span>
          </div>
          <div className="unit-bars">
            {units.map((unit) => (
              <div className="unit-bar-card" key={unit.id}>
                <div className="unit-bar-title">
                  <strong>{unit.unitName}</strong>
                  <span>{unit.managerName}</span>
                </div>
                <div className="unit-bar-track">
                  <div
                    className="unit-bar-fill"
                    style={{ width: `${clampPercent(Number(unit.utilizationRate ?? 0), maxRate)}%` }}
                  />
                </div>
                <div className="unit-bar-meta">
                  <span>프로젝트 {formatNumber(unit.projectCount)}</span>
                  <span>가동 {formatNumber(unit.activeProjectCount)}</span>
                  <span>한도 {formatNumber(unit.activeProjectLimit)}</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h3>본부별 요약</h3>
          <span>프로젝트 수 / 예산 / 집행</span>
        </div>
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>본부</th>
                <th>책임자</th>
                <th>가동 프로젝트</th>
                <th>전체 프로젝트</th>
                <th>예산</th>
                <th>집행</th>
                <th>가동률</th>
              </tr>
            </thead>
            <tbody>
              {units.length > 0 ? (
                units.map((unit) => (
                  <tr key={unit.id}>
                    <td>{unit.unitName}</td>
                    <td>{unit.managerName}</td>
                    <td>{formatNumber(unit.activeProjectCount)}</td>
                    <td>{formatNumber(unit.projectCount)}</td>
                    <td>{formatCurrency(unit.totalBudget)}</td>
                    <td>{formatCurrency(unit.totalSpent)}</td>
                    <td>{formatNumber(unit.utilizationRate)}%</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="empty-state">
                    등록된 본부 정보가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
