import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, getApiErrorMessage } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import {
  DAY_OF_MONTH_OPTIONS,
  HOUR_OPTIONS,
  INTERVAL_UNIT_OPTIONS,
  MINUTE_OPTIONS,
  SCHEDULE_RULES,
  WEEKDAY_OPTIONS,
  buildScheduleCronExpression,
  formatCronExpression,
  parseScheduleExpression,
} from '../lib/cron'

const defaultForm = {
  interfaceId: '',
  scheduleName: '',
  status: 'ACTIVE',
}

const defaultScheduleConfig = {
  rule: 'DAILY',
  hour: '02',
  minute: '00',
  dayStep: '2',
  weekday: 'MON',
  monthDay: '1',
  intervalUnit: 'MINUTES',
  intervalCount: '30',
}

function formatStatus(value) {
  return value === 'ACTIVE' ? '사용 중' : '중지'
}

export function SchedulesPage() {
  const queryClient = useQueryClient()
  const [interfaceId, setInterfaceId] = useState('')
  const [page, setPage] = useState(0)
  const [editingId, setEditingId] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [form, setForm] = useState(defaultForm)
  const [scheduleConfig, setScheduleConfig] = useState(defaultScheduleConfig)
  const [message, setMessage] = useState({ text: '', tone: 'success' })

  const interfacesQuery = useQuery({
    queryKey: ['interfaces', 'all-for-schedules'],
    queryFn: () => apiGet('/api/interfaces', { params: { page: 0, size: 200 } }),
  })

  const schedulesQuery = useQuery({
    queryKey: ['schedules', interfaceId, page],
    queryFn: () =>
      apiGet('/api/schedules', {
        params: { interfaceId: interfaceId || undefined, page, size: 10 },
      }),
  })

  const interfaces = interfacesQuery.data?.content ?? []
  const schedules = schedulesQuery.data ?? { content: [], totalElements: 0, totalPages: 0 }
  const selectedSchedule = useMemo(
    () => schedules.content.find((item) => item.id === editingId) ?? null,
    [schedules.content, editingId],
  )
  const selectedRows = useMemo(
    () => schedules.content.filter((item) => selectedIds.includes(item.id)),
    [schedules.content, selectedIds],
  )
  const allSelected = schedules.content.length > 0 && selectedIds.length === schedules.content.length
  const cronExpression = useMemo(() => buildScheduleCronExpression(scheduleConfig), [scheduleConfig])
  const selectedRule = useMemo(
    () => SCHEDULE_RULES.find((item) => item.value === scheduleConfig.rule) ?? SCHEDULE_RULES[0],
    [scheduleConfig.rule],
  )
  const minuteOptions = MINUTE_OPTIONS
  const hourOptions = HOUR_OPTIONS
  const dayOptions = DAY_OF_MONTH_OPTIONS

  const createMutation = useMutation({
    mutationFn: ({ interfaceId: id, body }) => apiPost(`/api/interfaces/${id}/schedules`, body),
    onSuccess: async () => {
      setMessage({ text: '스케줄을 등록했어요.', tone: 'success' })
      setForm(defaultForm)
      setEditingId(null)
      setScheduleConfig(defaultScheduleConfig)
      await queryClient.invalidateQueries({ queryKey: ['schedules'] })
    },
    onError: (error) => {
      setMessage({ text: getApiErrorMessage(error, '스케줄 등록에 실패했어요.'), tone: 'error' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => apiPut(`/api/schedules/${id}`, body),
    onSuccess: async () => {
      setMessage({ text: '스케줄을 수정했어요.', tone: 'success' })
      setForm(defaultForm)
      setEditingId(null)
      setScheduleConfig(defaultScheduleConfig)
      await queryClient.invalidateQueries({ queryKey: ['schedules'] })
    },
    onError: (error) => {
      setMessage({ text: getApiErrorMessage(error, '스케줄 수정에 실패했어요.'), tone: 'error' })
    },
  })

  const bulkActionMutation = useMutation({
    mutationFn: async ({ action, ids }) => {
      if (action === 'RUN') {
        await Promise.all(ids.map((id) => apiPost(`/api/schedules/${id}/run`)))
        return
      }

      const status = action === 'START' ? 'ACTIVE' : 'INACTIVE'
      await Promise.all(ids.map((id) => apiPut(`/api/schedules/${id}/status`, { status })))
    },
    onSuccess: async (_, variables) => {
      const labels = {
        RUN: '즉시 실행',
        START: '사용 시작',
        STOP: '사용 중지',
      }
      setMessage({ text: `${labels[variables.action]}을 요청했어요.`, tone: 'success' })
      setSelectedIds([])
      await queryClient.invalidateQueries({ queryKey: ['schedules'] })
      await queryClient.invalidateQueries({ queryKey: ['executions'] })
    },
    onError: (error) => {
      setMessage({ text: getApiErrorMessage(error, '스케줄 작업에 실패했어요.'), tone: 'error' })
    },
  })

  const handleSubmit = (event) => {
    event.preventDefault()
    setMessage({ text: '', tone: 'success' })
    if (!editingId && !form.interfaceId) {
      setMessage({ text: '스케줄할 연동을 선택해 주세요.', tone: 'error' })
      return
    }
    const body = {
      scheduleName: form.scheduleName,
      cronExpression,
      timezone: 'Asia/Seoul',
      status: form.status,
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, body })
      return
    }
    createMutation.mutate({ interfaceId: Number(form.interfaceId), body })
  }

  const startEdit = (row) => {
    const selection = parseScheduleExpression(row.cronExpression)
    setEditingId(row.id)
    setScheduleConfig(selection)
    setForm({
      interfaceId: String(row.interfaceId),
      scheduleName: row.scheduleName,
      status: row.status,
    })
  }

  const resetForm = () => {
    setEditingId(null)
    setForm(defaultForm)
    setScheduleConfig(defaultScheduleConfig)
  }

  const updateScheduleConfig = (patch) => {
    setScheduleConfig((prev) => ({
      ...defaultScheduleConfig,
      ...prev,
      ...patch,
    }))
  }

  const handleRuleChange = (value) => {
    switch (value) {
      case 'DAILY':
        updateScheduleConfig({ rule: value, hour: '02', minute: '00' })
        break
      case 'EVERY_N_DAYS':
        updateScheduleConfig({ rule: value, hour: '02', minute: '00', dayStep: '2' })
        break
      case 'WEEKLY':
        updateScheduleConfig({ rule: value, weekday: 'MON', hour: '02', minute: '00' })
        break
      case 'MONTHLY':
        updateScheduleConfig({ rule: value, monthDay: '1', hour: '02', minute: '00' })
        break
      case 'INTERVAL':
        updateScheduleConfig({ rule: value, intervalUnit: 'MINUTES', intervalCount: '30' })
        break
      default:
        updateScheduleConfig({ rule: 'DAILY' })
    }
  }

  const toggleSchedule = (scheduleId) => {
    setSelectedIds((prev) =>
      prev.includes(scheduleId) ? prev.filter((item) => item !== scheduleId) : [...prev, scheduleId],
    )
  }

  const toggleAllSchedules = () => {
    setSelectedIds((prev) => (prev.length === schedules.content.length ? [] : schedules.content.map((item) => item.id)))
  }

  const runSelectedSchedules = () => {
    if (!selectedIds.length) return
    bulkActionMutation.mutate({ action: 'RUN', ids: selectedIds })
  }

  const startSelectedSchedules = () => {
    if (!selectedIds.length) return
    bulkActionMutation.mutate({ action: 'START', ids: selectedIds })
  }

  const stopSelectedSchedules = () => {
    if (!selectedIds.length) return
    bulkActionMutation.mutate({ action: 'STOP', ids: selectedIds })
  }

  useEffect(() => {
    setSelectedIds([])
  }, [interfaceId, page])

  return (
    <div className="page-stack">
      <PageHeader
        title="스케줄"
        description="원하는 시간에 자동으로 실행되게 스케줄을 만드는 화면입니다."
        descriptionClassName="page-description-wide"
      />

      <section className="panel">
        <div className="toolbar">
          <select className="text-input control-select" value={interfaceId} onChange={(event) => setInterfaceId(event.target.value)}>
            <option value="">전체 연동</option>
            {interfaces.map((item) => (
              <option key={item.id} value={item.id}>
                {item.interfaceName}
              </option>
            ))}
          </select>
          <button className="secondary-button" type="button" onClick={() => setPage(0)}>
            조회
          </button>
          <button className="ghost-button" type="button" onClick={resetForm}>
            새로 만들기
          </button>
        </div>

        <div className="split-layout">
          <div className="table-card">
            <div className="schedule-bulk-bar">
              <div className="schedule-bulk-copy">
                <strong>선택한 스케줄</strong>
                <span>{selectedRows.length}건</span>
                <small>체크한 스케줄을 한 번에 처리합니다.</small>
              </div>
              <div className="schedule-bulk-actions">
                <button className="ghost-button" type="button" onClick={runSelectedSchedules} disabled={!selectedIds.length}>
                  즉시 실행
                </button>
                <button className="ghost-button" type="button" onClick={startSelectedSchedules} disabled={!selectedIds.length}>
                  사용 시작
                </button>
                <button className="ghost-button" type="button" onClick={stopSelectedSchedules} disabled={!selectedIds.length}>
                  사용 중지
                </button>
              </div>
            </div>
            <table>
              <thead>
              <tr>
                  <th className="select-col">
                    <input type="checkbox" checked={allSelected} onChange={toggleAllSchedules} aria-label="모두 선택" />
                  </th>
                  <th>이름</th>
                  <th>연동 이름</th>
                  <th>반복 주기</th>
                  <th>상태</th>
                  <th>다음 실행</th>
                </tr>
              </thead>
              <tbody>
                {schedules.content.length > 0 ? (
                  schedules.content.map((row) => (
                    <tr
                      key={row.id}
                      className={row.id === editingId ? 'selected-row' : ''}
                      onClick={() => startEdit(row)}
                    >
                      <td className="select-col" onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(row.id)}
                          onChange={() => toggleSchedule(row.id)}
                          aria-label={`${row.scheduleName} 선택`}
                        />
                      </td>
                      <td>{row.scheduleName}</td>
                      <td>{row.interfaceName}</td>
                      <td>
                        <div className="schedule-cell">
                          <strong>{formatCronExpression(row.cronExpression)}</strong>
                          <span>{row.cronExpression}</span>
                        </div>
                      </td>
                      <td>{formatStatus(row.status)}</td>
                      <td>{row.nextRunAt ?? '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="empty-state">
                      아직 등록된 스케줄이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="pagination-bar">
              <span>{schedules.totalElements ?? 0}건</span>
              <div className="pagination-actions">
                <button className="ghost-button" type="button" disabled={page <= 0} onClick={() => setPage((prev) => Math.max(prev - 1, 0))}>
                  이전
                </button>
                <span>
                  {page + 1} / {Math.max(schedules.totalPages || 1, 1)}
                </span>
                <button
                  className="ghost-button"
                  type="button"
                  disabled={page + 1 >= (schedules.totalPages || 1)}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  다음
                </button>
              </div>
            </div>
          </div>

          <form className="panel form-panel" onSubmit={handleSubmit}>
            <div className="panel-heading">
              <h3>{editingId ? '스케줄 수정' : '스케줄 만들기'}</h3>
            </div>

            {message.text ? <div className={`form-feedback ${message.tone}`}>{message.text}</div> : null}

            <div className="form-grid">
              <label className="field field-equal">
                <span>연동 선택</span>
                <select
                  className="text-input control-select"
                  value={form.interfaceId}
                  onChange={(event) => setForm((prev) => ({ ...prev, interfaceId: event.target.value }))}
                  disabled={Boolean(editingId)}
                >
                  <option value="">선택</option>
                  {interfaces.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.interfaceName}
                    </option>
                  ))}
                </select>
                <small className="field-help">어떤 연동을 스케줄해 둘지 고릅니다.</small>
              </label>
              <label className="field field-equal">
                <span>스케줄 상태</span>
                <select
                  className="text-input control-select"
                  value={form.status}
                  onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                >
                  <option value="ACTIVE">사용 중</option>
                  <option value="INACTIVE">중지</option>
                </select>
                <small className="field-help">사용 중이면 자동 실행이 유지되고, 중지면 멈춥니다.</small>
              </label>
              <label className="field field-full">
                <span>스케줄 이름</span>
                <input
                  className="text-input"
                  value={form.scheduleName}
                  onChange={(event) => setForm((prev) => ({ ...prev, scheduleName: event.target.value }))}
                />
              </label>
              <label className="field field-equal">
                <span>반복 방식</span>
                <select className="text-input control-select" value={scheduleConfig.rule} onChange={(event) => handleRuleChange(event.target.value)}>
                  {SCHEDULE_RULES.map((rule) => (
                    <option key={rule.value} value={rule.value}>
                      {rule.label}
                    </option>
                  ))}
                </select>
                <small className="field-help">{selectedRule.description}</small>
              </label>
              <label className="field field-full">
                <span>세부 시간</span>
                <div className="schedule-advanced-grid">
                  {scheduleConfig.rule === 'DAILY' ? (
                    <>
                      <select
                        className="text-input control-select"
                        value={scheduleConfig.hour}
                        onChange={(event) => updateScheduleConfig({ hour: event.target.value })}
                      >
                        {hourOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <select
                        className="text-input control-select"
                        value={scheduleConfig.minute}
                        onChange={(event) => updateScheduleConfig({ minute: event.target.value })}
                      >
                        {minuteOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : null}

                  {scheduleConfig.rule === 'EVERY_N_DAYS' ? (
                    <>
                      <select
                        className="text-input control-select"
                        value={scheduleConfig.dayStep}
                        onChange={(event) => updateScheduleConfig({ dayStep: event.target.value })}
                      >
                        {Array.from({ length: 30 }, (_, index) => (
                          <option key={index + 1} value={String(index + 1)}>
                            {index + 1}일마다
                          </option>
                        ))}
                      </select>
                      <select
                        className="text-input control-select"
                        value={scheduleConfig.hour}
                        onChange={(event) => updateScheduleConfig({ hour: event.target.value })}
                      >
                        {hourOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <select
                        className="text-input control-select"
                        value={scheduleConfig.minute}
                        onChange={(event) => updateScheduleConfig({ minute: event.target.value })}
                      >
                        {minuteOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : null}

                  {scheduleConfig.rule === 'WEEKLY' ? (
                    <>
                      <select
                        className="text-input control-select"
                        value={scheduleConfig.weekday}
                        onChange={(event) => updateScheduleConfig({ weekday: event.target.value })}
                      >
                        {WEEKDAY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <select
                        className="text-input control-select"
                        value={scheduleConfig.hour}
                        onChange={(event) => updateScheduleConfig({ hour: event.target.value })}
                      >
                        {hourOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <select
                        className="text-input control-select"
                        value={scheduleConfig.minute}
                        onChange={(event) => updateScheduleConfig({ minute: event.target.value })}
                      >
                        {minuteOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : null}

                  {scheduleConfig.rule === 'MONTHLY' ? (
                    <>
                      <select
                        className="text-input control-select"
                        value={scheduleConfig.monthDay}
                        onChange={(event) => updateScheduleConfig({ monthDay: event.target.value })}
                      >
                        {dayOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <select
                        className="text-input control-select"
                        value={scheduleConfig.hour}
                        onChange={(event) => updateScheduleConfig({ hour: event.target.value })}
                      >
                        {hourOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <select
                        className="text-input control-select"
                        value={scheduleConfig.minute}
                        onChange={(event) => updateScheduleConfig({ minute: event.target.value })}
                      >
                        {minuteOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : null}

                  {scheduleConfig.rule === 'INTERVAL' ? (
                    <>
                      <select
                        className="text-input control-select"
                        value={scheduleConfig.intervalUnit}
                        onChange={(event) => updateScheduleConfig({ intervalUnit: event.target.value })}
                      >
                        {INTERVAL_UNIT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <select
                        className="text-input control-select"
                        value={scheduleConfig.intervalCount}
                        onChange={(event) => updateScheduleConfig({ intervalCount: event.target.value })}
                      >
                        {(scheduleConfig.intervalUnit === 'HOURS' ? Array.from({ length: 23 }, (_, index) => index + 1) : Array.from({ length: 60 }, (_, index) => index + 1)).map((value) => (
                          <option key={value} value={String(value)}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : null}
                </div>
                <small className="field-help">
                  {formatCronExpression(cronExpression)}
                </small>
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

            {selectedSchedule ? (
              <div className="detail-box">
                <p>선택한 스케줄</p>
                <strong>{selectedSchedule.scheduleName}</strong>
                <small>
                  {formatCronExpression(selectedSchedule.cronExpression)} · {formatStatus(selectedSchedule.status)}
                </small>
              </div>
            ) : null}
          </form>
        </div>
      </section>
    </div>
  )
}
