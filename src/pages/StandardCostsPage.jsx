import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiDelete, apiGet, apiPost, apiPut, getApiErrorMessage } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { formatBasisType, formatCurrency, formatNumber } from '../lib/format'

function getCurrentMonth() {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    timeZone: 'Asia/Seoul',
  }).format(new Date())
}

const emptyForm = {
  standardCode: '',
  planMonth: getCurrentMonth(),
  businessUnitId: '',
  projectId: '',
  basisType: 'BUSINESS_UNIT',
  standardAmount: '',
  memo: '',
}

export function StandardCostsPage() {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState(null)
  const [monthInput, setMonthInput] = useState(getCurrentMonth())
  const [month, setMonth] = useState(getCurrentMonth())
  const [form, setForm] = useState(emptyForm)
  const [message, setMessage] = useState({ text: '', tone: 'success' })

  const unitsQuery = useQuery({
    queryKey: ['business-units'],
    queryFn: () => apiGet('/api/business-units'),
  })

  const projectsQuery = useQuery({
    queryKey: ['projects', 'standard-costs'],
    queryFn: () =>
      apiGet('/api/projects', {
        params: {
          page: 0,
          size: 1000,
        },
      }),
  })

  const standardCostsQuery = useQuery({
    queryKey: ['standard-costs', month],
    queryFn: () => apiGet('/api/standard-costs', { params: { month: month || undefined } }),
  })

  const units = unitsQuery.data ?? []
  const projectsPage = projectsQuery.data ?? { content: [] }
  const projects = projectsPage.content ?? []
  const standardCosts = standardCostsQuery.data ?? []

  const availableProjects = useMemo(() => {
    if (!form.businessUnitId) return projects
    return projects.filter((project) => project.businessUnitId === Number(form.businessUnitId))
  }, [form.businessUnitId, projects])

  const createMutation = useMutation({
    mutationFn: (body) => apiPost('/api/standard-costs', body),
    onSuccess: async () => {
      setMessage({ text: '표준원가를 등록했어요.', tone: 'success' })
      setForm({ ...emptyForm, planMonth: month || getCurrentMonth() })
      setSelectedId(null)
      await queryClient.invalidateQueries({ queryKey: ['standard-costs'] })
      await queryClient.invalidateQueries({ queryKey: ['analysis-summary'] })
    },
    onError: (error) => {
      setMessage({ text: getApiErrorMessage(error, '표준원가 등록에 실패했어요.'), tone: 'error' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => apiPut(`/api/standard-costs/${id}`, body),
    onSuccess: async () => {
      setMessage({ text: '표준원가를 수정했어요.', tone: 'success' })
      setForm({ ...emptyForm, planMonth: month || getCurrentMonth() })
      setSelectedId(null)
      await queryClient.invalidateQueries({ queryKey: ['standard-costs'] })
      await queryClient.invalidateQueries({ queryKey: ['analysis-summary'] })
    },
    onError: (error) => {
      setMessage({ text: getApiErrorMessage(error, '표준원가 수정에 실패했어요.'), tone: 'error' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => apiDelete(`/api/standard-costs/${id}`),
    onSuccess: async () => {
      setMessage({ text: '표준원가를 삭제했어요.', tone: 'success' })
      setForm({ ...emptyForm, planMonth: month || getCurrentMonth() })
      setSelectedId(null)
      await queryClient.invalidateQueries({ queryKey: ['standard-costs'] })
      await queryClient.invalidateQueries({ queryKey: ['analysis-summary'] })
    },
    onError: (error) => {
      setMessage({ text: getApiErrorMessage(error, '표준원가 삭제에 실패했어요.'), tone: 'error' })
    },
  })

  const handleSearch = () => {
    setMonth(monthInput || getCurrentMonth())
    setMessage({ text: '', tone: 'success' })
  }

  const onSubmit = (event) => {
    event.preventDefault()
    setMessage({ text: '', tone: 'success' })
    if (!form.businessUnitId) {
      setMessage({ text: '본부를 선택해 주세요.', tone: 'error' })
      return
    }

    const payload = {
      standardCode: form.standardCode,
      planMonth: form.planMonth || month || getCurrentMonth(),
      businessUnitId: Number(form.businessUnitId),
      projectId: form.projectId ? Number(form.projectId) : null,
      basisType: form.basisType,
      standardAmount: Number(form.standardAmount),
      memo: form.memo || null,
    }

    if (selectedId) {
      updateMutation.mutate({ id: selectedId, body: payload })
      return
    }
    createMutation.mutate(payload)
  }

  const startEdit = (row) => {
    setSelectedId(row.id)
    setForm({
      standardCode: row.standardCode,
      planMonth: row.planMonth ?? month ?? getCurrentMonth(),
      businessUnitId: String(row.businessUnitId),
      projectId: row.projectId ? String(row.projectId) : '',
      basisType: row.basisType,
      standardAmount: String(row.standardAmount ?? 0),
      memo: row.memo ?? '',
    })
  }

  const resetForm = () => {
    setSelectedId(null)
    setForm({ ...emptyForm, planMonth: month || getCurrentMonth() })
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="표준원가"
        description="본부별 표준원가를 등록하고, 실제 원가와 비교할 기준값을 관리하는 화면입니다."
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
          <button className="ghost-button" type="button" onClick={resetForm}>
            새 입력
          </button>
        </div>
      </section>

      {message.text ? <div className={`form-feedback ${message.tone}`}>{message.text}</div> : null}

      <section className="stats-grid">
        <StatItem label="표준원가 건수" value={formatNumber(standardCosts.length)} />
        <StatItem label="본부 수" value={formatNumber(new Set(standardCosts.map((item) => item.businessUnitId)).size)} tone="mint" />
        <StatItem label="프로젝트 연결" value={formatNumber(standardCosts.filter((item) => item.projectId).length)} tone="gold" />
        <StatItem label="표준원가 합계" value={formatCurrency(standardCosts.reduce((sum, item) => sum + Number(item.standardAmount ?? 0), 0))} tone="rose" />
      </section>

      <section className="split-layout">
        <div className="panel">
          <div className="panel-heading">
            <h3>표준원가 목록</h3>
            <span>{month} 기준</span>
          </div>
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>코드</th>
                  <th>적용월</th>
                  <th>본부</th>
                  <th>프로젝트</th>
                  <th>기준</th>
                  <th>표준원가</th>
                  <th>메모</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {standardCosts.length > 0 ? (
                  standardCosts.map((row) => (
                    <tr key={row.id} className={row.id === selectedId ? 'selected-row' : ''}>
                      <td>{row.standardCode}</td>
                      <td>{row.planMonth}</td>
                      <td>{row.businessUnitName}</td>
                      <td>{row.projectName ?? '-'}</td>
                      <td>{formatBasisType(row.basisType)}</td>
                      <td>{formatCurrency(row.standardAmount)}</td>
                      <td>{row.memo ?? '-'}</td>
                      <td className="row-actions">
                        <button className="inline-button" type="button" onClick={() => startEdit(row)}>
                          수정
                        </button>
                        <button className="danger-button" type="button" onClick={() => deleteMutation.mutate(row.id)}>
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="empty-state">
                      등록된 표준원가가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <form className="panel form-panel" onSubmit={onSubmit}>
          <div className="panel-heading">
            <h3>{selectedId ? '표준원가 수정' : '표준원가 등록'}</h3>
          </div>

          <div className="form-feedback success">
            표준원가는 본부 기준, 프로젝트 기준, 인력 기준으로 나눠서 입력할 수 있습니다.
          </div>

          <div className="form-grid">
            <label className="field">
              <span>표준원가 코드</span>
              <input
                className="text-input"
                value={form.standardCode}
                disabled={Boolean(selectedId)}
                onChange={(event) => setForm((prev) => ({ ...prev, standardCode: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>적용월</span>
              <input
                className="text-input"
                type="month"
                value={form.planMonth}
                onChange={(event) => setForm((prev) => ({ ...prev, planMonth: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>본부</span>
              <select
                className="text-input"
                value={form.businessUnitId}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    businessUnitId: event.target.value,
                    projectId: '',
                  }))
                }
              >
                <option value="">선택</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.unitName}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>프로젝트</span>
              <select
                className="text-input"
                value={form.projectId}
                onChange={(event) => setForm((prev) => ({ ...prev, projectId: event.target.value }))}
              >
                <option value="">선택 없음</option>
                {availableProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.projectName}
                  </option>
                ))}
              </select>
              <small className="field-help">프로젝트 기준일 때만 지정하면 됩니다.</small>
            </label>
            <label className="field">
              <span>기준 유형</span>
              <select
                className="text-input"
                value={form.basisType}
                onChange={(event) => setForm((prev) => ({ ...prev, basisType: event.target.value }))}
              >
                <option value="BUSINESS_UNIT">본부 기준</option>
                <option value="PROJECT">프로젝트 기준</option>
                <option value="EMPLOYEE">인력 기준</option>
              </select>
            </label>
            <label className="field">
              <span>표준원가</span>
              <input
                className="text-input"
                type="number"
                value={form.standardAmount}
                onChange={(event) => setForm((prev) => ({ ...prev, standardAmount: event.target.value }))}
              />
            </label>
            <label className="field field-full">
              <span>메모</span>
              <textarea
                className="text-input"
                rows="4"
                value={form.memo}
                onChange={(event) => setForm((prev) => ({ ...prev, memo: event.target.value }))}
              />
            </label>
          </div>

          <div className="button-row">
            <button className="primary-button" type="submit">
              {selectedId ? '수정' : '등록'}
            </button>
            <button className="ghost-button" type="button" onClick={resetForm}>
              초기화
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function StatItem({ label, value, tone = 'default' }) {
  return (
    <article className={`stat-card ${tone}`}>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  )
}
