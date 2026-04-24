import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiDelete, apiGet, apiPost, apiPut, getApiErrorMessage } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { formatDate, formatNumber } from '../lib/format'

const emptyForm = {
  unitCode: '',
  unitName: '',
  managerName: '',
  activeProjectLimit: '',
}

export function BusinessUnitsPage() {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [message, setMessage] = useState({ text: '', tone: 'success' })

  const query = useQuery({
    queryKey: ['business-units'],
    queryFn: () => apiGet('/api/business-units'),
  })

  const units = query.data ?? []
  const selected = useMemo(
    () => units.find((item) => item.id === selectedId) ?? null,
    [units, selectedId],
  )

  const createMutation = useMutation({
    mutationFn: (body) => apiPost('/api/business-units', body),
    onSuccess: async () => {
      setMessage({ text: '본부를 등록했어요.', tone: 'success' })
      setForm(emptyForm)
      setSelectedId(null)
      await queryClient.invalidateQueries({ queryKey: ['business-units'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      await queryClient.invalidateQueries({ queryKey: ['analysis-summary'] })
    },
    onError: (error) => {
      setMessage({ text: getApiErrorMessage(error, '본부 등록에 실패했어요.'), tone: 'error' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => apiPut(`/api/business-units/${id}`, body),
    onSuccess: async () => {
      setMessage({ text: '본부를 수정했어요.', tone: 'success' })
      setForm(emptyForm)
      setSelectedId(null)
      await queryClient.invalidateQueries({ queryKey: ['business-units'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      await queryClient.invalidateQueries({ queryKey: ['analysis-summary'] })
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (error) => {
      setMessage({ text: getApiErrorMessage(error, '본부 수정에 실패했어요.'), tone: 'error' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => apiDelete(`/api/business-units/${id}`),
    onSuccess: async () => {
      setMessage({ text: '본부를 삭제했어요.', tone: 'success' })
      setForm(emptyForm)
      setSelectedId(null)
      await queryClient.invalidateQueries({ queryKey: ['business-units'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      await queryClient.invalidateQueries({ queryKey: ['analysis-summary'] })
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (error) => {
      setMessage({ text: getApiErrorMessage(error, '본부 삭제에 실패했어요.'), tone: 'error' })
    },
  })

  const onSubmit = (event) => {
    event.preventDefault()
    setMessage({ text: '', tone: 'success' })
    const payload = {
      ...form,
      activeProjectLimit: Number(form.activeProjectLimit),
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
      unitCode: row.unitCode,
      unitName: row.unitName,
      managerName: row.managerName,
      activeProjectLimit: String(row.activeProjectLimit ?? 0),
    })
  }

  const resetForm = () => {
    setSelectedId(null)
    setForm(emptyForm)
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="본부 현황"
        description="본부를 등록하고, 각 본부가 동시에 운영할 수 있는 프로젝트 한도를 관리하는 화면입니다."
      />

      <section className="split-layout">
        <div className="panel">
          <div className="panel-heading">
            <h3>본부 목록</h3>
            <span>총 {formatNumber(units.length)}개</span>
          </div>
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>코드</th>
                  <th>본부명</th>
                  <th>책임자</th>
                  <th>가동 한도</th>
                  <th>생성일</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {units.length > 0 ? (
                  units.map((unit) => (
                    <tr key={unit.id} className={unit.id === selectedId ? 'selected-row' : ''}>
                      <td>{unit.unitCode}</td>
                      <td>{unit.unitName}</td>
                      <td>{unit.managerName}</td>
                      <td>{formatNumber(unit.activeProjectLimit)}개</td>
                      <td>{formatDate(unit.createdAt)}</td>
                      <td className="row-actions">
                        <button className="inline-button" type="button" onClick={() => startEdit(unit)}>
                          수정
                        </button>
                        <button className="danger-button" type="button" onClick={() => deleteMutation.mutate(unit.id)}>
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="empty-state">
                      등록된 본부가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <form className="panel form-panel" onSubmit={onSubmit}>
          <div className="panel-heading">
            <h3>{selectedId ? '본부 수정' : '본부 등록'}</h3>
          </div>

          {message.text ? <div className={`form-feedback ${message.tone}`}>{message.text}</div> : null}

          <div className="form-grid">
            <label className="field">
              <span>본부 코드</span>
              <input
                className="text-input"
                value={form.unitCode}
                disabled={Boolean(selectedId)}
                onChange={(e) => setForm((prev) => ({ ...prev, unitCode: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>본부명</span>
              <input
                className="text-input"
                value={form.unitName}
                onChange={(e) => setForm((prev) => ({ ...prev, unitName: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>책임자</span>
              <input
                className="text-input"
                value={form.managerName}
                onChange={(e) => setForm((prev) => ({ ...prev, managerName: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>가동 한도</span>
              <input
                className="text-input"
                type="number"
                value={form.activeProjectLimit}
                onChange={(e) => setForm((prev) => ({ ...prev, activeProjectLimit: e.target.value }))}
              />
              <small className="field-help">운영 가능한 프로젝트 개수</small>
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
