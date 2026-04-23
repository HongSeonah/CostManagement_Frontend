import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, getApiErrorMessage } from '../lib/api'
import { PageHeader } from '../components/PageHeader'

const defaultForm = {
  systemCode: '',
  systemName: '',
  systemType: 'INTERNAL',
  description: '',
  status: 'ACTIVE',
}

function formatSystemType(value) {
  return value === 'EXTERNAL' ? '외부' : '내부'
}

function formatStatus(value) {
  return value === 'ACTIVE' ? '사용 중' : '중지'
}

export function SystemsPage() {
  const queryClient = useQueryClient()
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(0)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [message, setMessage] = useState({ text: '', tone: 'success' })

  const systemsQuery = useQuery({
    queryKey: ['systems', keyword, page],
    queryFn: () => apiGet('/api/systems', { params: { keyword: keyword || undefined, page, size: 10 } }),
  })

  const systems = systemsQuery.data ?? { content: [], page: 0, totalPages: 0, totalElements: 0 }
  const selected = useMemo(
    () => systems.content.find((item) => item.id === editingId) ?? null,
    [systems.content, editingId],
  )

  const createMutation = useMutation({
    mutationFn: (body) => apiPost('/api/systems', body),
    onSuccess: async () => {
      setMessage({ text: '시스템을 등록했어요.', tone: 'success' })
      setForm(defaultForm)
      setEditingId(null)
      await queryClient.invalidateQueries({ queryKey: ['systems'] })
    },
    onError: (error) => {
      setMessage({ text: getApiErrorMessage(error, '시스템 등록에 실패했어요.'), tone: 'error' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => apiPut(`/api/systems/${id}`, body),
    onSuccess: async () => {
      setMessage({ text: '시스템을 수정했어요.', tone: 'success' })
      setForm(defaultForm)
      setEditingId(null)
      await queryClient.invalidateQueries({ queryKey: ['systems'] })
    },
    onError: (error) => {
      setMessage({ text: getApiErrorMessage(error, '시스템 수정에 실패했어요.'), tone: 'error' })
    },
  })

  const handleSubmit = async (event) => {
    event.preventDefault()
    setMessage({ text: '', tone: 'success' })
    if (editingId) {
      updateMutation.mutate({ id: editingId, body: form })
      return
    }
    createMutation.mutate(form)
  }

  const startEdit = (row) => {
    setEditingId(row.id)
    setForm({
      systemCode: row.systemCode,
      systemName: row.systemName,
      systemType: row.systemType,
      description: row.description ?? '',
      status: row.status,
    })
  }

  const resetForm = () => {
    setEditingId(null)
    setForm(defaultForm)
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="시스템 정보"
        description="업무에 필요한 내부 시스템과 외부 기관을 등록하고 수정하는 화면입니다."
      />

      <section className="panel">
        <div className="toolbar">
          <input
            className="text-input"
            placeholder="검색어 입력"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <button className="secondary-button" type="button" onClick={() => setPage(0)}>
            조회
          </button>
          <button className="ghost-button" type="button" onClick={resetForm}>
            새로 만들기
          </button>
        </div>

        <div className="split-layout">
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>번호</th>
                  <th>이름</th>
                  <th>구분</th>
                  <th>상태</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {systems.content.length > 0 ? (
                  systems.content.map((row) => (
                    <tr
                      key={row.id}
                      className={row.id === editingId ? 'selected-row' : ''}
                      onClick={() => startEdit(row)}
                    >
                      <td>{row.systemCode}</td>
                      <td>{row.systemName}</td>
                      <td>{formatSystemType(row.systemType)}</td>
                      <td>
                        <span className={`status-badge ${row.status === 'ACTIVE' ? 'active' : 'inactive'}`}>
                          {formatStatus(row.status)}
                        </span>
                      </td>
                      <td>
                        <button className="inline-button" type="button" onClick={(event) => { event.stopPropagation(); startEdit(row); }}>
                          수정
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="empty-state">
                      아직 등록된 시스템이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="pagination-bar">
              <span>
                {systems.totalElements ?? 0}건
              </span>
              <div className="pagination-actions">
                <button className="ghost-button" type="button" disabled={page <= 0} onClick={() => setPage((prev) => Math.max(prev - 1, 0))}>
                  이전
                </button>
                <span>
                  {page + 1} / {Math.max(systems.totalPages || 1, 1)}
                </span>
                <button
                  className="ghost-button"
                  type="button"
                  disabled={page + 1 >= (systems.totalPages || 1)}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  다음
                </button>
              </div>
            </div>
          </div>

          <form className="panel form-panel" onSubmit={handleSubmit}>
            <div className="panel-heading">
              <h3>{editingId ? '시스템 수정' : '시스템 등록'}</h3>
            </div>

            {message.text ? <div className={`form-feedback ${message.tone}`}>{message.text}</div> : null}

            <div className="form-grid">
              <label className="field">
                <span>시스템 번호</span>
                <input
                  className="text-input"
                  value={form.systemCode}
                  onChange={(event) => setForm((prev) => ({ ...prev, systemCode: event.target.value }))}
                  disabled={Boolean(editingId)}
                />
              </label>
              <label className="field">
                <span>시스템 이름</span>
                <input
                  className="text-input"
                  value={form.systemName}
                  onChange={(event) => setForm((prev) => ({ ...prev, systemName: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>구분</span>
                <select
                  className="text-input"
                  value={form.systemType}
                  onChange={(event) => setForm((prev) => ({ ...prev, systemType: event.target.value }))}
                >
                  <option value="INTERNAL">내부</option>
                  <option value="EXTERNAL">외부</option>
                </select>
              </label>
              <label className="field">
                <span>상태</span>
                <select
                  className="text-input"
                  value={form.status}
                  onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                >
                  <option value="ACTIVE">사용 중</option>
                  <option value="INACTIVE">중지</option>
                </select>
              </label>
              <label className="field field-full">
                <span>설명</span>
                <textarea
                  className="text-area"
                  rows="4"
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                />
              </label>
            </div>

            <div className="form-actions">
              {editingId ? (
                <button className="secondary-button" type="button" onClick={resetForm}>
                  취소
                </button>
              ) : null}
              <button className="primary-button" type="submit">
                {editingId ? '수정' : '등록'}
              </button>
            </div>

            {selected ? (
              <div className="detail-box">
                <p>선택한 시스템</p>
                <strong>{selected.systemName}</strong>
                <small>
                  {selected.systemCode} · {formatSystemType(selected.systemType)} · {formatStatus(selected.status)}
                </small>
              </div>
            ) : null}
          </form>
        </div>
      </section>
    </div>
  )
}
