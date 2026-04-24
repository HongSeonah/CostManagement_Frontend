import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, getApiErrorMessage } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { formatCategory, formatCurrency, formatDate, formatNumber } from '../lib/format'

const emptyForm = {
  projectId: '',
  entryDate: '',
  category: 'PERSONNEL',
  itemName: '',
  amount: '',
  memo: '',
}

export function CostEntriesPage() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(emptyForm)
  const [message, setMessage] = useState({ text: '', tone: 'success' })

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: () =>
      apiGet('/api/projects', {
        params: {
          page: 0,
          size: 1000,
        },
      }),
  })

  const entriesQuery = useQuery({
    queryKey: ['cost-entries'],
    queryFn: () => apiGet('/api/cost-entries'),
  })

  const projectsPage = projectsQuery.data ?? {
    content: [],
  }
  const projects = projectsPage.content ?? []
  const entries = entriesQuery.data ?? []

  const projectMap = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects])

  const createMutation = useMutation({
    mutationFn: (body) => apiPost('/api/cost-entries', body),
    onSuccess: async () => {
      setMessage({ text: '원가 항목을 등록했어요.', tone: 'success' })
      setForm(emptyForm)
      await queryClient.invalidateQueries({ queryKey: ['cost-entries'] })
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      await queryClient.invalidateQueries({ queryKey: ['analysis-summary'] })
    },
    onError: (error) => {
      setMessage({ text: getApiErrorMessage(error, '원가 항목 등록에 실패했어요.'), tone: 'error' })
    },
  })

  const onSubmit = (event) => {
    event.preventDefault()
    setMessage({ text: '', tone: 'success' })
    createMutation.mutate({
      ...form,
      projectId: Number(form.projectId),
      amount: Number(form.amount),
    })
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="원가 항목"
        description="프로젝트별로 발생한 비용을 입력하고, 본부별 집행 현황에 바로 반영하는 화면입니다."
      />

      <section className="split-layout">
        <div className="panel">
          <div className="panel-heading">
            <h3>원가 항목 목록</h3>
            <span>총 {formatNumber(entries.length)}건</span>
          </div>
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>일자</th>
                  <th>프로젝트</th>
                  <th>항목</th>
                  <th>구분</th>
                  <th>금액</th>
                </tr>
              </thead>
              <tbody>
                {entries.length > 0 ? (
                  entries.map((entry) => {
                    const project = projectMap.get(entry.projectId)
                    return (
                      <tr key={entry.id}>
                        <td>{formatDate(entry.entryDate)}</td>
                        <td>
                          <strong>{entry.projectName}</strong>
                          <div className="table-subtext">{project?.businessUnitName ?? entry.projectCode}</div>
                        </td>
                        <td>{entry.itemName}</td>
                        <td>{formatCategory(entry.category)}</td>
                        <td>{formatCurrency(entry.amount)}</td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="empty-state">
                      등록된 원가 항목이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <form className="panel form-panel" onSubmit={onSubmit}>
          <div className="panel-heading">
            <h3>원가 입력</h3>
          </div>

          {message.text ? <div className={`form-feedback ${message.tone}`}>{message.text}</div> : null}

          <div className="form-grid">
            <label className="field">
              <span>프로젝트</span>
              <select
                className="text-input"
                value={form.projectId}
                onChange={(e) => setForm((prev) => ({ ...prev, projectId: e.target.value }))}
              >
                <option value="">선택</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    [{project.businessUnitName}] {project.projectName}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>발생일</span>
              <input
                className="text-input"
                type="date"
                value={form.entryDate}
                onChange={(e) => setForm((prev) => ({ ...prev, entryDate: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>구분</span>
              <select
                className="text-input"
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              >
                <option value="PERSONNEL">인건비</option>
                <option value="INFRASTRUCTURE">인프라</option>
                <option value="OUTSOURCING">외주</option>
                <option value="MARKETING">마케팅</option>
                <option value="OTHER">기타</option>
              </select>
            </label>
            <label className="field">
              <span>항목명</span>
              <input
                className="text-input"
                value={form.itemName}
                onChange={(e) => setForm((prev) => ({ ...prev, itemName: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>금액</span>
              <input
                className="text-input"
                type="number"
                value={form.amount}
                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              />
            </label>
            <label className="field field-full">
              <span>메모</span>
              <textarea
                className="text-input"
                rows="4"
                value={form.memo}
                onChange={(e) => setForm((prev) => ({ ...prev, memo: e.target.value }))}
              />
            </label>
          </div>

          <div className="button-row">
            <button className="primary-button" type="submit">
              저장
            </button>
            <button className="ghost-button" type="button" onClick={() => setForm(emptyForm)}>
              초기화
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
