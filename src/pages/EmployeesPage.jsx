import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiDelete, apiGet, apiPost, apiPut, getApiErrorMessage } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { formatCurrency, formatDate, formatEmployeeStatus, formatNumber } from '../lib/format'

const emptyForm = {
  employeeCode: '',
  employeeName: '',
  positionName: '',
  businessUnitId: '',
  assignedProjectId: '',
  status: 'ACTIVE',
  monthlyLaborCost: '',
  joinedDate: '',
}

export function EmployeesPage() {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState(null)
  const [filterUnitId, setFilterUnitId] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [message, setMessage] = useState({ text: '', tone: 'success' })

  const unitsQuery = useQuery({
    queryKey: ['business-units'],
    queryFn: () => apiGet('/api/business-units'),
  })

  const projectsQuery = useQuery({
    queryKey: ['projects', 'employees'],
    queryFn: () =>
      apiGet('/api/projects', {
        params: {
          page: 0,
          size: 1000,
        },
      }),
  })

  const employeesQuery = useQuery({
    queryKey: ['employees', filterUnitId],
    queryFn: () =>
      apiGet('/api/employees', {
        params: {
          businessUnitId: filterUnitId || undefined,
        },
      }),
  })

  const units = unitsQuery.data ?? []
  const projectsPage = projectsQuery.data ?? { content: [] }
  const projects = projectsPage.content ?? []
  const employees = employeesQuery.data ?? []

  const availableProjects = useMemo(() => {
    if (!form.businessUnitId) {
      return projects
    }
    return projects.filter((project) => project.businessUnitId === Number(form.businessUnitId))
  }, [form.businessUnitId, projects])

  const createMutation = useMutation({
    mutationFn: (body) => apiPost('/api/employees', body),
    onSuccess: async () => {
      setMessage({ text: '인력을 등록했어요.', tone: 'success' })
      setForm(emptyForm)
      setSelectedId(null)
      await queryClient.invalidateQueries({ queryKey: ['employees'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      await queryClient.invalidateQueries({ queryKey: ['analysis-summary'] })
    },
    onError: (error) => {
      setMessage({ text: getApiErrorMessage(error, '인력 등록에 실패했어요.'), tone: 'error' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => apiPut(`/api/employees/${id}`, body),
    onSuccess: async () => {
      setMessage({ text: '인력을 수정했어요.', tone: 'success' })
      setForm(emptyForm)
      setSelectedId(null)
      await queryClient.invalidateQueries({ queryKey: ['employees'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      await queryClient.invalidateQueries({ queryKey: ['analysis-summary'] })
    },
    onError: (error) => {
      setMessage({ text: getApiErrorMessage(error, '인력 수정에 실패했어요.'), tone: 'error' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => apiDelete(`/api/employees/${id}`),
    onSuccess: async () => {
      setMessage({ text: '인력을 삭제했어요.', tone: 'success' })
      setForm(emptyForm)
      setSelectedId(null)
      await queryClient.invalidateQueries({ queryKey: ['employees'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      await queryClient.invalidateQueries({ queryKey: ['analysis-summary'] })
    },
    onError: (error) => {
      setMessage({ text: getApiErrorMessage(error, '인력 삭제에 실패했어요.'), tone: 'error' })
    },
  })

  const onSubmit = (event) => {
    event.preventDefault()
    setMessage({ text: '', tone: 'success' })
    if (!form.businessUnitId) {
      setMessage({ text: '본부를 선택해 주세요.', tone: 'error' })
      return
    }

    const payload = {
      employeeCode: form.employeeCode,
      employeeName: form.employeeName,
      positionName: form.positionName,
      businessUnitId: Number(form.businessUnitId),
      assignedProjectId: form.assignedProjectId ? Number(form.assignedProjectId) : null,
      status: form.status,
      monthlyLaborCost: Number(form.monthlyLaborCost),
      joinedDate: form.joinedDate || null,
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
      employeeCode: row.employeeCode,
      employeeName: row.employeeName,
      positionName: row.positionName,
      businessUnitId: String(row.businessUnitId),
      assignedProjectId: row.assignedProjectId ? String(row.assignedProjectId) : '',
      status: row.status,
      monthlyLaborCost: String(row.monthlyLaborCost ?? 0),
      joinedDate: row.joinedDate ?? '',
    })
  }

  const resetForm = () => {
    setSelectedId(null)
    setForm(emptyForm)
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="인력"
        description="본부와 프로젝트에 배치된 인력을 등록하고, 월 인건비와 배치를 함께 관리하는 화면입니다."
      />

      <section className="panel">
        <div className="toolbar">
          <label className="field inline-field">
            <span>본부 필터</span>
            <select
              className="text-input"
              value={filterUnitId}
              onChange={(event) => {
                setFilterUnitId(event.target.value)
                setSelectedId(null)
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
          <button className="secondary-button" type="button" onClick={() => employeesQuery.refetch()}>
            조회
          </button>
          <button className="ghost-button" type="button" onClick={resetForm}>
            새 입력
          </button>
        </div>

        <div className="split-layout">
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>코드</th>
                  <th>이름</th>
                  <th>직급</th>
                  <th>본부</th>
                  <th>프로젝트</th>
                  <th>상태</th>
                  <th>월 인건비</th>
                  <th>입사일</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {employees.length > 0 ? (
                  employees.map((row) => (
                    <tr key={row.id} className={row.id === selectedId ? 'selected-row' : ''}>
                      <td>{row.employeeCode}</td>
                      <td>{row.employeeName}</td>
                      <td>{row.positionName}</td>
                      <td>{row.businessUnitName}</td>
                      <td>
                        <strong>{row.assignedProjectName ?? '-'}</strong>
                        <div className="table-subtext">{row.assignedProjectCode ?? ''}</div>
                      </td>
                      <td>
                        <span className={`status-badge ${row.status === 'ACTIVE' ? 'status-active' : row.status === 'ON_LEAVE' ? 'status-inactive' : 'status-closed'}`}>
                          {formatEmployeeStatus(row.status)}
                        </span>
                      </td>
                      <td>{formatCurrency(row.monthlyLaborCost)}</td>
                      <td>{formatDate(row.joinedDate)}</td>
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
                      등록된 인력이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <form className="panel form-panel" onSubmit={onSubmit}>
            <div className="panel-heading">
              <h3>{selectedId ? '인력 수정' : '인력 등록'}</h3>
            </div>

            {message.text ? <div className={`form-feedback ${message.tone}`}>{message.text}</div> : null}

            <div className="form-grid">
              <label className="field">
                <span>인력 코드</span>
                <input
                  className="text-input"
                  value={form.employeeCode}
                  disabled={Boolean(selectedId)}
                  onChange={(event) => setForm((prev) => ({ ...prev, employeeCode: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>인력명</span>
                <input
                  className="text-input"
                  value={form.employeeName}
                  onChange={(event) => setForm((prev) => ({ ...prev, employeeName: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>직급</span>
                <input
                  className="text-input"
                  value={form.positionName}
                  onChange={(event) => setForm((prev) => ({ ...prev, positionName: event.target.value }))}
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
                      assignedProjectId: '',
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
                  value={form.assignedProjectId}
                  onChange={(event) => setForm((prev) => ({ ...prev, assignedProjectId: event.target.value }))}
                >
                  <option value="">미배정</option>
                  {availableProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.projectName}
                    </option>
                  ))}
                </select>
                <small className="field-help">
                  {form.businessUnitId ? '선택한 본부의 프로젝트만 표시됩니다.' : '본부를 선택하면 프로젝트를 더 좁혀서 볼 수 있습니다.'}
                </small>
              </label>
              <label className="field">
                <span>상태</span>
                <select
                  className="text-input"
                  value={form.status}
                  onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                >
                  <option value="ACTIVE">재직</option>
                  <option value="ON_LEAVE">휴직</option>
                  <option value="LEFT">퇴사</option>
                </select>
              </label>
              <label className="field">
                <span>월 인건비</span>
                <input
                  className="text-input"
                  type="number"
                  value={form.monthlyLaborCost}
                  onChange={(event) => setForm((prev) => ({ ...prev, monthlyLaborCost: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>입사일</span>
                <input
                  className="text-input"
                  type="date"
                  value={form.joinedDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, joinedDate: event.target.value }))}
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
