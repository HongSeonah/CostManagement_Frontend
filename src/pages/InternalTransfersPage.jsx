import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiDelete, apiGet, apiPost, apiPut, getApiErrorMessage } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { formatCurrency, formatDate, formatNumber } from '../lib/format'

function getCurrentMonth() {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    timeZone: 'Asia/Seoul',
  }).format(new Date())
}

function getToday() {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Seoul',
  }).format(new Date())
}

const emptyForm = {
  transferCode: '',
  transferDate: getToday(),
  sourceBusinessUnitId: '',
  targetBusinessUnitId: '',
  sourceProjectId: '',
  targetProjectId: '',
  amount: '',
  memo: '',
}

export function InternalTransfersPage() {
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
    queryKey: ['projects', 'internal-transfers'],
    queryFn: () =>
      apiGet('/api/projects', {
        params: {
          page: 0,
          size: 1000,
        },
      }),
  })

  const transfersQuery = useQuery({
    queryKey: ['internal-transfers', month],
    queryFn: () => apiGet('/api/internal-transfers', { params: { month: month || undefined } }),
  })

  const units = unitsQuery.data ?? []
  const projectsPage = projectsQuery.data ?? { content: [] }
  const projects = projectsPage.content ?? []
  const transfers = transfersQuery.data ?? []

  const sourceProjects = useMemo(() => {
    if (!form.sourceBusinessUnitId) return projects
    return projects.filter((project) => project.businessUnitId === Number(form.sourceBusinessUnitId))
  }, [form.sourceBusinessUnitId, projects])

  const targetProjects = useMemo(() => {
    if (!form.targetBusinessUnitId) return projects
    return projects.filter((project) => project.businessUnitId === Number(form.targetBusinessUnitId))
  }, [form.targetBusinessUnitId, projects])

  const createMutation = useMutation({
    mutationFn: (body) => apiPost('/api/internal-transfers', body),
    onSuccess: async () => {
      setMessage({ text: '내부대체가액을 등록했어요.', tone: 'success' })
      setForm({ ...emptyForm, transferDate: getToday() })
      setSelectedId(null)
      await queryClient.invalidateQueries({ queryKey: ['internal-transfers'] })
      await queryClient.invalidateQueries({ queryKey: ['analysis-summary'] })
      await queryClient.invalidateQueries({ queryKey: ['allocation-summary'] })
    },
    onError: (error) => {
      setMessage({ text: getApiErrorMessage(error, '내부대체가액 등록에 실패했어요.'), tone: 'error' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => apiPut(`/api/internal-transfers/${id}`, body),
    onSuccess: async () => {
      setMessage({ text: '내부대체가액을 수정했어요.', tone: 'success' })
      setForm({ ...emptyForm, transferDate: getToday() })
      setSelectedId(null)
      await queryClient.invalidateQueries({ queryKey: ['internal-transfers'] })
      await queryClient.invalidateQueries({ queryKey: ['analysis-summary'] })
      await queryClient.invalidateQueries({ queryKey: ['allocation-summary'] })
    },
    onError: (error) => {
      setMessage({ text: getApiErrorMessage(error, '내부대체가액 수정에 실패했어요.'), tone: 'error' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => apiDelete(`/api/internal-transfers/${id}`),
    onSuccess: async () => {
      setMessage({ text: '내부대체가액을 삭제했어요.', tone: 'success' })
      setForm({ ...emptyForm, transferDate: getToday() })
      setSelectedId(null)
      await queryClient.invalidateQueries({ queryKey: ['internal-transfers'] })
      await queryClient.invalidateQueries({ queryKey: ['analysis-summary'] })
      await queryClient.invalidateQueries({ queryKey: ['allocation-summary'] })
    },
    onError: (error) => {
      setMessage({ text: getApiErrorMessage(error, '내부대체가액 삭제에 실패했어요.'), tone: 'error' })
    },
  })

  const handleSearch = () => {
    setMonth(monthInput || getCurrentMonth())
    setMessage({ text: '', tone: 'success' })
  }

  const onSubmit = (event) => {
    event.preventDefault()
    setMessage({ text: '', tone: 'success' })
    if (!form.sourceBusinessUnitId || !form.targetBusinessUnitId) {
      setMessage({ text: '출발 본부와 도착 본부를 모두 선택해 주세요.', tone: 'error' })
      return
    }
    if (form.sourceBusinessUnitId === form.targetBusinessUnitId) {
      setMessage({ text: '출발 본부와 도착 본부는 같을 수 없어요.', tone: 'error' })
      return
    }

    const payload = {
      transferCode: form.transferCode,
      transferDate: form.transferDate,
      sourceBusinessUnitId: Number(form.sourceBusinessUnitId),
      targetBusinessUnitId: Number(form.targetBusinessUnitId),
      sourceProjectId: form.sourceProjectId ? Number(form.sourceProjectId) : null,
      targetProjectId: form.targetProjectId ? Number(form.targetProjectId) : null,
      amount: Number(form.amount),
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
      transferCode: row.transferCode,
      transferDate: row.transferDate ?? getToday(),
      sourceBusinessUnitId: String(row.sourceBusinessUnitId),
      targetBusinessUnitId: String(row.targetBusinessUnitId),
      sourceProjectId: row.sourceProjectId ? String(row.sourceProjectId) : '',
      targetProjectId: row.targetProjectId ? String(row.targetProjectId) : '',
      amount: String(row.amount ?? 0),
      memo: row.memo ?? '',
    })
  }

  const resetForm = () => {
    setSelectedId(null)
    setForm({ ...emptyForm, transferDate: getToday() })
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="내부대체가액"
        description="본부 간 비용 이동을 기록하고, 월별 내부대체 현황을 확인하는 화면입니다."
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
        <StatItem label="내부대체 건수" value={formatNumber(transfers.length)} />
        <StatItem label="출발 본부" value={formatNumber(new Set(transfers.map((item) => item.sourceBusinessUnitId)).size)} tone="mint" />
        <StatItem label="도착 본부" value={formatNumber(new Set(transfers.map((item) => item.targetBusinessUnitId)).size)} tone="gold" />
        <StatItem label="총 대체액" value={formatCurrency(transfers.reduce((sum, item) => sum + Number(item.amount ?? 0), 0))} tone="rose" />
      </section>

      <section className="split-layout">
        <div className="panel">
          <div className="panel-heading">
            <h3>내부대체가액 목록</h3>
            <span>{month} 기준</span>
          </div>
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>코드</th>
                  <th>일자</th>
                  <th>출발 본부</th>
                  <th>도착 본부</th>
                  <th>출발 프로젝트</th>
                  <th>도착 프로젝트</th>
                  <th>금액</th>
                  <th>메모</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {transfers.length > 0 ? (
                  transfers.map((row) => (
                    <tr key={row.id} className={row.id === selectedId ? 'selected-row' : ''}>
                      <td>{row.transferCode}</td>
                      <td>{formatDate(row.transferDate)}</td>
                      <td>{row.sourceBusinessUnitName}</td>
                      <td>{row.targetBusinessUnitName}</td>
                      <td>{row.sourceProjectName ?? '-'}</td>
                      <td>{row.targetProjectName ?? '-'}</td>
                      <td>{formatCurrency(row.amount)}</td>
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
                    <td colSpan="9" className="empty-state">
                      등록된 내부대체가액이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <form className="panel form-panel" onSubmit={onSubmit}>
          <div className="panel-heading">
            <h3>{selectedId ? '내부대체가액 수정' : '내부대체가액 등록'}</h3>
          </div>

          <div className="form-feedback success">
            본부 간 비용 이동을 기록합니다. 같은 본부끼리는 등록할 수 없습니다.
          </div>

          <div className="form-grid">
            <label className="field">
              <span>내부대체 코드</span>
              <input
                className="text-input"
                value={form.transferCode}
                disabled={Boolean(selectedId)}
                onChange={(event) => setForm((prev) => ({ ...prev, transferCode: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>발생일</span>
              <input
                className="text-input"
                type="date"
                value={form.transferDate}
                onChange={(event) => setForm((prev) => ({ ...prev, transferDate: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>출발 본부</span>
              <select
                className="text-input"
                value={form.sourceBusinessUnitId}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    sourceBusinessUnitId: event.target.value,
                    sourceProjectId: '',
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
              <span>도착 본부</span>
              <select
                className="text-input"
                value={form.targetBusinessUnitId}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    targetBusinessUnitId: event.target.value,
                    targetProjectId: '',
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
              <span>출발 프로젝트</span>
              <select
                className="text-input"
                value={form.sourceProjectId}
                onChange={(event) => setForm((prev) => ({ ...prev, sourceProjectId: event.target.value }))}
              >
                <option value="">선택 없음</option>
                {sourceProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.projectName}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>도착 프로젝트</span>
              <select
                className="text-input"
                value={form.targetProjectId}
                onChange={(event) => setForm((prev) => ({ ...prev, targetProjectId: event.target.value }))}
              >
                <option value="">선택 없음</option>
                {targetProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.projectName}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>금액</span>
              <input
                className="text-input"
                type="number"
                value={form.amount}
                onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
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
