import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiDelete, apiGet, apiPost, apiPut, getApiErrorMessage } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { formatCurrency, formatDate, formatNumber, formatStatus } from '../lib/format'

const emptyForm = {
  projectCode: '',
  projectName: '',
  clientName: '',
  businessUnitId: '',
  status: 'ACTIVE',
  budgetAmount: '',
  startDate: '',
  endDate: '',
}

export function ProjectsPage() {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState(null)
  const [filterUnitId, setFilterUnitId] = useState('')
  const [page, setPage] = useState(0)
  const [form, setForm] = useState(emptyForm)
  const [message, setMessage] = useState({ text: '', tone: 'success' })

  const unitsQuery = useQuery({
    queryKey: ['business-units'],
    queryFn: () => apiGet('/api/business-units'),
  })

  const projectsQuery = useQuery({
    queryKey: ['projects', filterUnitId, page],
    queryFn: () =>
      apiGet('/api/projects', {
        params: {
          businessUnitId: filterUnitId || undefined,
          page,
          size: 8,
        },
      }),
  })

  const units = unitsQuery.data ?? []
  const projectsPage = projectsQuery.data ?? {
    content: [],
    page: 0,
    size: 8,
    totalElements: 0,
    totalPages: 0,
  }
  const projects = projectsPage.content ?? []
  const totalPages = projectsPage.totalPages || 1
  const totalElements = projectsPage.totalElements || 0

  const createMutation = useMutation({
    mutationFn: (body) => apiPost('/api/projects', body),
    onSuccess: async () => {
      setMessage({ text: '프로젝트를 등록했어요.', tone: 'success' })
      setForm(emptyForm)
      setSelectedId(null)
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
    },
    onError: (error) => {
      setMessage({ text: getApiErrorMessage(error, '프로젝트 등록에 실패했어요.'), tone: 'error' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => apiPut(`/api/projects/${id}`, body),
    onSuccess: async () => {
      setMessage({ text: '프로젝트를 수정했어요.', tone: 'success' })
      setForm(emptyForm)
      setSelectedId(null)
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
    },
    onError: (error) => {
      setMessage({ text: getApiErrorMessage(error, '프로젝트 수정에 실패했어요.'), tone: 'error' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => apiDelete(`/api/projects/${id}`),
    onSuccess: async () => {
      setMessage({ text: '프로젝트를 삭제했어요.', tone: 'success' })
      setForm(emptyForm)
      setSelectedId(null)
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
    },
    onError: (error) => {
      setMessage({ text: getApiErrorMessage(error, '프로젝트 삭제에 실패했어요.'), tone: 'error' })
    },
  })

  const onSubmit = (event) => {
    event.preventDefault()
    setMessage({ text: '', tone: 'success' })
    const payload = {
      ...form,
      businessUnitId: Number(form.businessUnitId),
      budgetAmount: Number(form.budgetAmount),
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
      projectCode: row.projectCode,
      projectName: row.projectName,
      clientName: row.clientName,
      businessUnitId: String(row.businessUnitId),
      status: row.status,
      budgetAmount: String(row.budgetAmount ?? 0),
      startDate: row.startDate ?? '',
      endDate: row.endDate ?? '',
    })
  }

  const resetForm = () => {
    setSelectedId(null)
    setForm(emptyForm)
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="프로젝트"
        description="본부별로 수행 중인 프로젝트를 등록하고, 조회하고, 수정하는 화면입니다."
      />

      <section className="panel">
        <div className="toolbar">
          <label className="field inline-field">
            <span>본부 필터</span>
            <select
              className="text-input"
              value={filterUnitId}
              onChange={(e) => {
                setFilterUnitId(e.target.value)
                setPage(0)
              }}
            >
              <option value="">전체 본부</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.unitName}
                </option>
              ))}
            </select>
          </label>
          <button className="secondary-button" type="button" onClick={() => projectsQuery.refetch()}>
            조회
          </button>
          <button className="ghost-button" type="button" onClick={resetForm}>
            새 프로젝트
          </button>
        </div>

        <div className="split-layout">
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>코드</th>
                  <th>프로젝트명</th>
                  <th>본부</th>
                  <th>상태</th>
                  <th>예산</th>
                  <th>집행</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {projects.length > 0 ? (
                  projects.map((row) => (
                    <tr key={row.id} className={row.id === selectedId ? 'selected-row' : ''}>
                      <td>{row.projectCode}</td>
                      <td>
                        <strong>{row.projectName}</strong>
                        <div className="table-subtext">{row.clientName}</div>
                      </td>
                      <td>{row.businessUnitName}</td>
                      <td>
                        <span className={`status-badge status-${row.status.toLowerCase()}`}>
                          {formatStatus(row.status)}
                        </span>
                      </td>
                      <td>{formatCurrency(row.budgetAmount)}</td>
                      <td>{formatCurrency(row.spentAmount)}</td>
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
                    <td colSpan="7" className="empty-state">
                      등록된 프로젝트가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="pagination-bar">
              <span>{formatNumber(totalElements)}건</span>
              <div className="pagination-actions">
                <button
                  className="ghost-button"
                  type="button"
                  disabled={page <= 0}
                  onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
                >
                  이전
                </button>
                <span>
                  {page + 1} / {Math.max(totalPages, 1)}
                </span>
                <button
                  className="ghost-button"
                  type="button"
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  다음
                </button>
              </div>
            </div>
          </div>

          <form className="panel form-panel" onSubmit={onSubmit}>
            <div className="panel-heading">
              <h3>{selectedId ? '프로젝트 수정' : '프로젝트 등록'}</h3>
            </div>

            {message.text ? <div className={`form-feedback ${message.tone}`}>{message.text}</div> : null}

            <div className="form-grid">
              <label className="field">
                <span>프로젝트 코드</span>
                <input
                  className="text-input"
                  value={form.projectCode}
                  disabled={Boolean(selectedId)}
                  onChange={(e) => setForm((prev) => ({ ...prev, projectCode: e.target.value }))}
                />
              </label>
              <label className="field">
                <span>프로젝트명</span>
                <input
                  className="text-input"
                  value={form.projectName}
                  onChange={(e) => setForm((prev) => ({ ...prev, projectName: e.target.value }))}
                />
              </label>
              <label className="field">
                <span>고객/부서명</span>
                <input
                  className="text-input"
                  value={form.clientName}
                  onChange={(e) => setForm((prev) => ({ ...prev, clientName: e.target.value }))}
                />
              </label>
              <label className="field">
                <span>본부</span>
                <select
                  className="text-input"
                  value={form.businessUnitId}
                  onChange={(e) => setForm((prev) => ({ ...prev, businessUnitId: e.target.value }))}
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
                <span>상태</span>
                <select
                  className="text-input"
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                >
                  <option value="ACTIVE">진행</option>
                  <option value="ON_HOLD">보류</option>
                  <option value="CLOSED">종료</option>
                </select>
              </label>
              <label className="field">
                <span>예산</span>
                <input
                  className="text-input"
                  type="number"
                  value={form.budgetAmount}
                  onChange={(e) => setForm((prev) => ({ ...prev, budgetAmount: e.target.value }))}
                />
              </label>
              <label className="field">
                <span>시작일</span>
                <input
                  className="text-input"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                />
              </label>
              <label className="field">
                <span>종료일</span>
                <input
                  className="text-input"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
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
        </div>
      </section>
    </div>
  )
}
