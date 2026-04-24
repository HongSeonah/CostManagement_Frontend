import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiDownload, apiGet, apiPost, getApiErrorMessage } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { formatCurrency, formatDateTime, formatNumber, formatPercent } from '../lib/format'

function getCurrentMonth() {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    timeZone: 'Asia/Seoul',
  }).format(new Date())
}

export function AllocationPage() {
  const queryClient = useQueryClient()
  const [monthInput, setMonthInput] = useState(getCurrentMonth())
  const [month, setMonth] = useState(getCurrentMonth())
  const [message, setMessage] = useState({ text: '', tone: 'success' })

  const summaryQuery = useQuery({
    queryKey: ['allocation-summary', month],
    queryFn: () => apiGet('/api/allocation/summary', { params: { month: month || undefined } }),
  })

  const summary = summaryQuery.data ?? {
    month,
    closed: false,
    closedAt: null,
    businessUnitCount: 0,
    projectCount: 0,
    entryCount: 0,
    activeProjectCount: 0,
    totalCost: 0,
    directCost: 0,
    sharedCost: 0,
    businessUnits: [],
  }

  const units = useMemo(() => summary.businessUnits ?? [], [summary.businessUnits])

  const handleSearch = () => {
    setMonth(monthInput || getCurrentMonth())
    setMessage({ text: '', tone: 'success' })
  }

  const closeMutation = useMutation({
    mutationFn: (body) => apiPost('/api/allocation/close', body),
    onSuccess: async (data) => {
      setMessage({
        text: data?.alreadyClosed ? '이미 마감된 월이에요.' : '월 마감을 확정했어요.',
        tone: 'success',
      })
      await queryClient.invalidateQueries({ queryKey: ['allocation-summary', month] })
    },
    onError: (error) => {
      setMessage({ text: getApiErrorMessage(error, '월 마감에 실패했어요.'), tone: 'error' })
    },
  })

  const downloadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiDownload('/api/allocation/export', { params: { month } })
      const fileName = `cost-management-allocation-${month || getCurrentMonth()}.xlsx`
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    },
    onSuccess: () => {
      setMessage({ text: '엑셀 파일을 내려받았어요.', tone: 'success' })
    },
    onError: (error) => {
      setMessage({ text: getApiErrorMessage(error, '엑셀 다운로드에 실패했어요.'), tone: 'error' })
    },
  })

  const handleClose = () => {
    if (summary.closed) {
      setMessage({ text: '이미 마감된 월이에요.', tone: 'error' })
      return
    }
    if (!window.confirm(`${month || getCurrentMonth()} 월을 마감 확정할까요?`)) {
      return
    }
    setMessage({ text: '', tone: 'success' })
    closeMutation.mutate({ month: month || getCurrentMonth() })
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="배부 / 마감"
        description="이번 달 원가를 본부별로 배부하고 마감하는 화면입니다."
      />

      <section className="toolbar panel allocation-toolbar">
        <label className="field inline-field">
          <span>조회 월</span>
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
          <button
            className="primary-button"
            type="button"
            onClick={handleClose}
            disabled={summary.closed || closeMutation.isPending}
          >
            {summary.closed ? '마감 완료' : '마감 확정'}
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={() => downloadMutation.mutate()}
            disabled={downloadMutation.isPending}
          >
            엑셀 다운로드
          </button>
        </div>
      </section>

      {message.text ? <div className={`form-feedback ${message.tone}`}>{message.text}</div> : null}

      {summaryQuery.isError ? (
        <div className="form-feedback error">
          {getApiErrorMessage(summaryQuery.error, '배부 요약을 불러오지 못했어요.')}
        </div>
      ) : null}

      <section className="stats-grid">
        <StatCard label="총 원가" value={formatCurrency(summary.totalCost)} hint={summary.month} />
        <StatCard label="직접비" value={formatCurrency(summary.directCost)} tone="mint" />
        <StatCard label="공통비" value={formatCurrency(summary.sharedCost)} tone="gold" />
        <StatCard label="배부 대상 본부" value={formatNumber(summary.businessUnitCount)} tone="rose" />
      </section>

      <section className="panel-grid">
        <article className="panel">
          <div className="panel-heading">
            <h3>배부 기준</h3>
            <span className={`status-badge ${summary.closed ? 'status-closed' : 'status-success'}`}>
              {summary.closed ? '마감 완료' : '마감 전'}
            </span>
          </div>

          <p className="field-help allocation-status">
            {summary.closed
              ? `마감 일시: ${formatDateTime(summary.closedAt)}`
              : '마감 확정 후에는 해당 월에 원가를 더 이상 입력할 수 없습니다.'}
          </p>

          <div className="allocation-notes">
            <div>
              <strong>직접비</strong>
              <p>인건비와 외주비는 발생한 프로젝트에 그대로 반영합니다.</p>
            </div>
            <div>
              <strong>공통비</strong>
              <p>인프라와 기타 비용은 활성 프로젝트 수 비율로 본부별 배부합니다.</p>
            </div>
            <div>
              <strong>마감 포인트</strong>
              <p>배부된 총액은 이번 달 원가와 같아야 하므로, 심사위원이 흐름을 바로 확인할 수 있습니다.</p>
            </div>
          </div>

          <div className="metric-row metric-row-wide">
            <div>
              <p>원가 건수</p>
              <strong>{formatNumber(summary.entryCount)}</strong>
            </div>
            <div>
              <p>가동 프로젝트</p>
              <strong>{formatNumber(summary.activeProjectCount)}</strong>
            </div>
            <div>
              <p>프로젝트 수</p>
              <strong>{formatNumber(summary.projectCount)}</strong>
            </div>
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h3>본부별 배부 현황</h3>
            <span>활성 프로젝트 비율 기준</span>
          </div>

          <div className="unit-bars allocation-bars">
            {units.map((unit) => (
              <div className="unit-bar-card" key={unit.id}>
                <div className="unit-bar-title">
                  <strong>{unit.unitName}</strong>
                  <span>{unit.managerName}</span>
                </div>
                <div className="unit-bar-track">
                  <div
                    className="unit-bar-fill"
                    style={{ width: `${Math.max(12, Math.min(100, Number(unit.allocationRate ?? 0)))}%` }}
                  />
                </div>
                <div className="unit-bar-meta">
                  <span>직접비 {formatCurrency(unit.directCost)}</span>
                  <span>배부 {formatCurrency(unit.sharedCost)}</span>
                  <span>합계 {formatCurrency(unit.totalCost)}</span>
                </div>
                <div className="unit-bar-meta allocation-meta">
                  <span>프로젝트 {formatNumber(unit.projectCount)}</span>
                  <span>가동 {formatNumber(unit.activeProjectCount)}</span>
                  <span>비율 {formatPercent(unit.allocationRate)}</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h3>배부 상세</h3>
          <span>본부별 직접비 / 공통비 / 합계</span>
        </div>
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>본부</th>
                <th>책임자</th>
                <th>직접비</th>
                <th>배부 공통비</th>
                <th>합계</th>
                <th>배부 비율</th>
              </tr>
            </thead>
            <tbody>
              {units.length > 0 ? (
                units.map((unit) => (
                  <tr key={unit.id}>
                    <td>{unit.unitName}</td>
                    <td>{unit.managerName}</td>
                    <td>{formatCurrency(unit.directCost)}</td>
                    <td>{formatCurrency(unit.sharedCost)}</td>
                    <td>{formatCurrency(unit.totalCost)}</td>
                    <td>{formatPercent(unit.allocationRate)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="empty-state">
                    배부할 본부 정보가 없습니다.
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
