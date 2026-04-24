import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { formatCurrency, formatPercent, formatSignedCurrency, formatNumber } from '../lib/format'

function getCurrentMonth() {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    timeZone: 'Asia/Seoul',
  }).format(new Date())
}

function clampPercent(value, maxValue) {
  if (!maxValue) return 0
  return Math.max(10, Math.min(100, Math.round((value / maxValue) * 100)))
}

export function AnalysisPage() {
  const [monthInput, setMonthInput] = useState(getCurrentMonth())
  const [month, setMonth] = useState(getCurrentMonth())

  const summaryQuery = useQuery({
    queryKey: ['analysis-summary', month],
    queryFn: () => apiGet('/api/analysis/summary', { params: { month: month || undefined } }),
  })

  const summary = summaryQuery.data ?? {
    month,
    businessUnitCount: 0,
    projectCount: 0,
    employeeCount: 0,
    actualCostTotal: 0,
    standardCostTotal: 0,
    laborCostTotal: 0,
    transferAmountTotal: 0,
    varianceTotal: 0,
    businessUnits: [],
  }

  const units = summary.businessUnits ?? []
  const maxRate = useMemo(
    () => Math.max(1, ...units.map((unit) => Number(unit.performanceRate ?? 0))),
    [units],
  )

  const handleSearch = () => {
    setMonth(monthInput || getCurrentMonth())
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="원가/성과 분석"
        description="표준원가, 실제 원가, 인건비, 내부대체를 함께 비교해서 본부별 성과를 보는 화면입니다."
      />

      <section className="toolbar panel allocation-toolbar">
        <label className="field inline-field">
          <span>분석 월</span>
          <input
            className="text-input"
            type="month"
            value={monthInput}
            onChange={(event) => setMonthInput(event.target.value)}
          />
        </label>
        <div className="allocation-toolbar-actions">
          <button className="secondary-button" type="button" onClick={handleSearch}>
            조회
          </button>
        </div>
      </section>

      {summaryQuery.isError ? (
      <div className="form-feedback error">
        {summaryQuery.error?.response?.data?.message ?? '원가/성과 분석을 불러오지 못했어요.'}
      </div>
    ) : null}

      <section className="stats-grid">
        <StatCard label="실제 원가" value={formatCurrency(summary.actualCostTotal)} hint={summary.month} />
        <StatCard label="표준 원가" value={formatCurrency(summary.standardCostTotal)} tone="mint" />
        <StatCard label="인건비" value={formatCurrency(summary.laborCostTotal)} tone="gold" />
        <StatCard label="편차" value={formatSignedCurrency(summary.varianceTotal)} tone="rose" />
      </section>

      <section className="panel-grid">
        <article className="panel">
          <div className="panel-heading">
            <h3>분석 기준</h3>
            <span>원가 구조와 비교 기준</span>
          </div>

          <div className="metric-row metric-row-wide">
            <div>
              <p>분석 본부</p>
              <strong>{formatNumber(summary.businessUnitCount)}</strong>
            </div>
            <div>
              <p>프로젝트</p>
              <strong>{formatNumber(summary.projectCount)}</strong>
            </div>
            <div>
              <p>참여 인력</p>
              <strong>{formatNumber(summary.employeeCount)}</strong>
            </div>
          </div>

          <div className="allocation-notes">
            <div>
              <strong>실제 원가</strong>
              <p>배부 결과에 인건비와 내부대체 순증을 더해 실제 운영 원가를 봅니다.</p>
            </div>
            <div>
              <strong>표준 원가</strong>
              <p>본부, 프로젝트, 인력 기준으로 미리 잡아둔 원가 기준과 비교합니다.</p>
            </div>
            <div>
              <strong>편차</strong>
              <p>실제 원가와 표준 원가의 차이로 과다 집행이나 절감 여부를 확인합니다.</p>
            </div>
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h3>본부별 성과</h3>
            <span>성과율 기준</span>
          </div>

          <div className="unit-bars analysis-bars">
            {units.map((unit) => {
              const rate = Number(unit.performanceRate ?? 0)
              const variance = Number(unit.variance ?? 0)
              const actualCost = Number(unit.actualCost ?? 0)
              const standardCost = Number(unit.standardCost ?? 0)
              const barColor =
                variance >= 0
                  ? 'linear-gradient(90deg, #fb7185 0%, #f97316 100%)'
                  : 'linear-gradient(90deg, #22c55e 0%, #3b82f6 100%)'

              return (
                <div className="unit-bar-card" key={unit.id}>
                  <div className="unit-bar-title">
                    <strong>{unit.unitName}</strong>
                    <span>{unit.managerName}</span>
                  </div>
                  <div className="unit-bar-track">
                    <div
                      className="unit-bar-fill"
                      style={{
                        width: `${clampPercent(rate, maxRate)}%`,
                        background: barColor,
                      }}
                    />
                  </div>
                  <div className="unit-bar-meta">
                    <span>인력 {formatNumber(unit.employeeCount)}</span>
                    <span>프로젝트 {formatNumber(unit.projectCount)}</span>
                    <span>성과율 {formatPercent(rate)}</span>
                  </div>
                  <div className="unit-bar-meta allocation-meta">
                    <span>실제 {formatCurrency(actualCost)}</span>
                    <span>표준 {formatCurrency(standardCost)}</span>
                    <span>편차 {formatSignedCurrency(variance)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h3>본부별 분석 상세</h3>
          <span>실제 원가 / 표준 원가 / 인건비 / 내부대체 / 편차</span>
        </div>
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>본부</th>
                <th>인력</th>
                <th>프로젝트</th>
                <th>실제 원가</th>
                <th>표준 원가</th>
                <th>인건비</th>
                <th>내부대체 순증</th>
                <th>편차</th>
                <th>성과율</th>
              </tr>
            </thead>
            <tbody>
              {units.length > 0 ? (
                units.map((unit) => (
                  <tr key={unit.id}>
                    <td>
                      <strong>{unit.unitName}</strong>
                      <div className="table-subtext">{unit.managerName}</div>
                    </td>
                    <td>{formatNumber(unit.employeeCount)}</td>
                    <td>{formatNumber(unit.projectCount)}</td>
                    <td>{formatCurrency(unit.actualCost)}</td>
                    <td>{formatCurrency(unit.standardCost)}</td>
                    <td>{formatCurrency(unit.laborCost)}</td>
                    <td>{formatSignedCurrency(unit.transferNetAmount)}</td>
                    <td>{formatSignedCurrency(unit.variance)}</td>
                    <td>{formatPercent(unit.performanceRate)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="empty-state">
                    분석할 본부 정보가 없습니다.
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
