import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiDelete, apiGet, apiPost, apiPut, getApiErrorMessage } from '../lib/api'
import { PageHeader } from '../components/PageHeader'

const interfaceDefaults = {
  interfaceCode: '',
  interfaceName: '',
  description: '',
  protocolType: 'REST',
  sourceSystemId: '',
  targetSystemId: '',
  ownerName: '',
  status: 'ACTIVE',
  httpMethod: 'POST',
  endpointUrl: '',
  authType: 'NONE',
  authValue: '',
  connectTimeoutMillis: 3000,
  readTimeoutMillis: 5000,
  retryCount: 3,
}

const protocolOptions = [
  { value: 'REST', label: 'REST' },
  { value: 'SOAP', label: 'SOAP' },
  { value: 'MQ', label: 'MQ' },
  { value: 'BATCH', label: 'BATCH' },
  { value: 'SFTP', label: 'SFTP' },
  { value: 'FTP', label: 'FTP' },
]

function formatStatus(value) {
  return value === 'ACTIVE' ? '사용 중' : '중지'
}

function formatProtocol(value) {
  return protocolOptions.find((option) => option.value === value)?.label ?? value ?? '-'
}

function formatAuthType(value) {
  const labels = {
    NONE: '없음',
    BASIC: '기본 인증',
    BEARER: '토큰 인증',
    API_KEY: 'API 키',
  }
  return labels[value] ?? value ?? '-'
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
}

function isValidEndpointUrl(value) {
  if (!value?.trim()) {
    return true
  }

  try {
    const parsed = new URL(value.trim())
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function InterfacesPage() {
  const queryClient = useQueryClient()
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(0)
  const [editingId, setEditingId] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(interfaceDefaults)
  const [feedback, setFeedback] = useState({ text: '', tone: 'success' })
  const [connectionTest, setConnectionTest] = useState({ text: '', tone: 'info', responseBody: '' })
  const [connectionVerified, setConnectionVerified] = useState(false)

  const systemsQuery = useQuery({
    queryKey: ['systems', 'all'],
    queryFn: () => apiGet('/api/systems', { params: { page: 0, size: 200 } }),
  })

  const interfacesQuery = useQuery({
    queryKey: ['interfaces', keyword, page],
    queryFn: () => apiGet('/api/interfaces', { params: { keyword: keyword || undefined, page, size: 10 } }),
  })

  const selectedInterfaceQuery = useQuery({
    queryKey: ['interface-protocol-config', selectedId],
    enabled: Boolean(selectedId),
    queryFn: async () => {
      try {
        return await apiGet(`/api/interfaces/${selectedId}/protocol-config`)
      } catch (error) {
        if (error?.response?.status === 404) {
          return null
        }
        throw error
      }
    },
  })

  const systems = systemsQuery.data?.content ?? []
  const interfaces = interfacesQuery.data ?? { content: [], totalElements: 0, totalPages: 0 }
  const selectedInterface = useMemo(
    () => interfaces.content.find((item) => item.id === selectedId) ?? null,
    [interfaces.content, selectedId],
  )

  const resetConnectionTest = () => {
    setConnectionVerified(false)
    setConnectionTest({ text: '', tone: 'info', responseBody: '' })
  }

  const updateConnectionField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    resetConnectionTest()
  }

  useEffect(() => {
    if (selectedInterfaceQuery.data) {
      setForm((prev) => ({
        ...prev,
        httpMethod: selectedInterfaceQuery.data.httpMethod ?? 'POST',
        endpointUrl: selectedInterfaceQuery.data.endpointUrl ?? '',
        authType: selectedInterfaceQuery.data.authType ?? 'NONE',
        authValue: selectedInterfaceQuery.data.authValue ?? '',
        connectTimeoutMillis: selectedInterfaceQuery.data.connectTimeoutMillis ?? 3000,
        readTimeoutMillis: selectedInterfaceQuery.data.readTimeoutMillis ?? 5000,
        retryCount: selectedInterfaceQuery.data.retryCount ?? 3,
      }))
      setConnectionVerified(false)
    } else if (selectedId) {
      setForm((prev) => ({
        ...prev,
        endpointUrl: '',
        authType: 'NONE',
        authValue: '',
        connectTimeoutMillis: 3000,
        readTimeoutMillis: 5000,
        retryCount: 3,
      }))
      setConnectionVerified(false)
    }
  }, [selectedInterfaceQuery.data, selectedId])

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => apiPut(`/api/interfaces/${id}/status`, { status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['interfaces'] })
      await queryClient.invalidateQueries({ queryKey: ['interface-protocol-config', selectedId] })
      setFeedback({ text: '인터페이스 상태를 변경했어요.', tone: 'success' })
    },
    onError: (error) => {
      setFeedback({ text: getApiErrorMessage(error, '인터페이스 상태 변경에 실패했어요.'), tone: 'error' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => apiDelete(`/api/interfaces/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['interfaces'] })
      await queryClient.invalidateQueries({ queryKey: ['interface-protocol-config'] })
      setFeedback({ text: '연동을 삭제했어요.', tone: 'success' })
      setEditingId(null)
      setSelectedId(null)
      setForm(interfaceDefaults)
      resetConnectionTest()
    },
    onError: (error) => {
      setFeedback({ text: getApiErrorMessage(error, '연동 삭제에 실패했어요.'), tone: 'error' })
    },
  })

  const testConnectionMutation = useMutation({
    mutationFn: ({ interfaceId, body }) => apiPost(`/api/interfaces/${interfaceId}/protocol-config/test`, body),
    onSuccess: (result) => {
      setConnectionVerified(true)
      setConnectionTest({
        text: `연결이 확인되었습니다. (${result.statusCode}번 응답)`,
        tone: 'success',
        responseBody: result.responseBody ?? '',
      })
      setFeedback({ text: '연결 확인이 끝났어요. 이제 저장할 수 있어요.', tone: 'success' })
    },
    onError: (error) => {
      setConnectionVerified(false)
      setConnectionTest({
        text: getApiErrorMessage(error, '연결 확인에 실패했어요.'),
        tone: 'error',
        responseBody: '',
      })
    },
  })

  const buildProtocolBody = () => ({
    httpMethod: form.httpMethod,
    endpointUrl: form.endpointUrl,
    authType: form.authType,
    authValue: form.authValue,
    connectTimeoutMillis: form.connectTimeoutMillis === '' ? null : Number(form.connectTimeoutMillis),
    readTimeoutMillis: form.readTimeoutMillis === '' ? null : Number(form.readTimeoutMillis),
    retryCount: form.retryCount === '' ? null : Number(form.retryCount),
  })

  const handleTestConnection = async () => {
    setFeedback({ text: '', tone: 'success' })
    if (!selectedId) {
      setConnectionVerified(false)
      setConnectionTest({
        text: '먼저 연동을 선택해 주세요.',
        tone: 'error',
        responseBody: '',
      })
      return
    }
    if (!form.endpointUrl.trim()) {
      setConnectionVerified(false)
      setConnectionTest({
        text: '연결 주소를 먼저 입력해 주세요.',
        tone: 'error',
        responseBody: '',
      })
      return
    }
    if (!isValidEndpointUrl(form.endpointUrl)) {
      setConnectionVerified(false)
      setConnectionTest({
        text: '연결 주소 형식이 올바르지 않아요.',
        tone: 'error',
        responseBody: '',
      })
      return
    }
    testConnectionMutation.mutate({ interfaceId: selectedId, body: buildProtocolBody() })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFeedback({ text: '', tone: 'success' })
    if (!form.sourceSystemId || !form.targetSystemId) {
      setFeedback({ text: '송신 시스템과 수신 시스템을 모두 선택해 주세요.', tone: 'error' })
      return
    }
    if (!form.endpointUrl.trim()) {
      setFeedback({ text: '연결 주소를 입력해 주세요.', tone: 'error' })
      return
    }
    if (!isValidEndpointUrl(form.endpointUrl)) {
      setFeedback({
        text: '연결 주소가 올바르지 않아요. http:// 또는 https://로 시작하는 주소를 입력해 주세요.',
        tone: 'error',
      })
      return
    }
    if (!connectionVerified) {
      setFeedback({
        text: '먼저 연결 확인을 눌러서 목 서버 응답을 확인해 주세요.',
        tone: 'error',
      })
      return
    }
    const interfaceBody = {
      interfaceCode: form.interfaceCode,
      interfaceName: form.interfaceName,
      description: form.description,
      protocolType: form.protocolType,
      sourceSystemId: Number(form.sourceSystemId),
      targetSystemId: Number(form.targetSystemId),
      ownerName: form.ownerName,
      status: form.status,
    }
    const protocolBody = buildProtocolBody()
    try {
      const savedInterface = editingId
        ? await apiPut(`/api/interfaces/${editingId}`, interfaceBody)
        : await apiPost('/api/interfaces', interfaceBody)

      if (protocolBody.endpointUrl?.trim()) {
        const exists = Boolean(selectedInterfaceQuery.data) || Boolean(editingId)
        if (exists) {
          await apiPut(`/api/interfaces/${savedInterface.id}/protocol-config`, protocolBody)
        } else {
          await apiPost(`/api/interfaces/${savedInterface.id}/protocol-config`, protocolBody)
        }
      }

      setFeedback({
        text: editingId ? '연동과 실행 설정을 수정했어요.' : '연동과 실행 설정을 저장했어요.',
        tone: 'success',
      })
      setEditingId(null)
      setSelectedId(savedInterface.id)
      setForm(interfaceDefaults)
      resetConnectionTest()
      await queryClient.invalidateQueries({ queryKey: ['interfaces'] })
      await queryClient.invalidateQueries({ queryKey: ['interface-protocol-config', savedInterface.id] })
    } catch (error) {
      setFeedback({
        text: getApiErrorMessage(error, '저장에 실패했어요.'),
        tone: 'error',
      })
    }
  }

  const startEdit = (row) => {
    setEditingId(row.id)
    setSelectedId(row.id)
    setForm({
      interfaceCode: row.interfaceCode,
      interfaceName: row.interfaceName,
      description: row.description ?? '',
      protocolType: row.protocolType,
      sourceSystemId: String(row.sourceSystemId),
      targetSystemId: String(row.targetSystemId),
      ownerName: row.ownerName ?? '',
      status: row.status,
      httpMethod: 'POST',
      endpointUrl: '',
      authType: 'NONE',
      authValue: '',
      connectTimeoutMillis: 3000,
      readTimeoutMillis: 5000,
      retryCount: 3,
    })
    resetConnectionTest()
  }

  const resetForm = () => {
    setEditingId(null)
    setSelectedId(null)
    setForm(interfaceDefaults)
    resetConnectionTest()
  }

  const handleSelect = (row) => {
    setSelectedId(row.id)
    setEditingId(row.id)
    setForm({
      interfaceCode: row.interfaceCode,
      interfaceName: row.interfaceName,
      description: row.description ?? '',
      protocolType: row.protocolType,
      sourceSystemId: String(row.sourceSystemId),
      targetSystemId: String(row.targetSystemId),
      ownerName: row.ownerName ?? '',
      status: row.status,
      httpMethod: 'POST',
      endpointUrl: '',
      authType: 'NONE',
      authValue: '',
      connectTimeoutMillis: 3000,
      readTimeoutMillis: 5000,
      retryCount: 3,
    })
    resetConnectionTest()
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="API 연동 정보"
        description="여러 시스템 사이의 연결 방식과 실행 설정을 등록하고 수정하는 화면입니다."
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
                  <th>연동 방식</th>
                  <th>상태</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {interfaces.content.length > 0 ? (
                  interfaces.content.map((row) => (
                    <tr
                      key={row.id}
                      className={row.id === selectedId ? 'selected-row' : ''}
                      onClick={() => handleSelect(row)}
                    >
                      <td>{row.interfaceCode}</td>
                      <td>{row.interfaceName}</td>
                      <td>{formatProtocol(row.protocolType)}</td>
                      <td>
                        <span className={`status-badge ${row.status === 'ACTIVE' ? 'active' : 'inactive'}`}>
                          {formatStatus(row.status)}
                        </span>
                      </td>
                      <td>
                        <button className="inline-button" type="button" onClick={() => handleSelect(row)}>
                          수정
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="empty-state">
                      아직 등록된 연동이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="pagination-bar">
              <span>{interfaces.totalElements ?? 0}건</span>
              <div className="pagination-actions">
                <button className="ghost-button" type="button" disabled={page <= 0} onClick={() => setPage((prev) => Math.max(prev - 1, 0))}>
                  이전
                </button>
                <span>
                  {page + 1} / {Math.max(interfaces.totalPages || 1, 1)}
                </span>
                <button
                  className="ghost-button"
                  type="button"
                  disabled={page + 1 >= (interfaces.totalPages || 1)}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  다음
                </button>
              </div>
            </div>
          </div>

          <div className="stacked-panels">
            <form className="panel form-panel" onSubmit={handleSubmit}>
              <div className="panel-heading">
                <h3>{editingId ? '연동 수정' : '연동 등록'}</h3>
              </div>

              {feedback.text ? <div className={`form-feedback ${feedback.tone}`}>{feedback.text}</div> : null}

              <div className="form-grid">
                <label className="field">
                  <span>연동 번호</span>
                  <input
                    className="text-input"
                    value={form.interfaceCode}
                    onChange={(event) => setForm((prev) => ({ ...prev, interfaceCode: event.target.value }))}
                    disabled={Boolean(editingId)}
                  />
                </label>
                <label className="field">
                  <span>연동 이름</span>
                  <input
                    className="text-input"
                    value={form.interfaceName}
                    onChange={(event) => setForm((prev) => ({ ...prev, interfaceName: event.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>연동 방식</span>
                  <select
                    className="text-input control-select"
                    value={form.protocolType}
                    onChange={(event) => setForm((prev) => ({ ...prev, protocolType: event.target.value }))}
                  >
                    {protocolOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>상태</span>
                  <select
                    className="text-input control-select"
                    value={form.status}
                    onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                  >
                    <option value="ACTIVE">사용 중</option>
                    <option value="INACTIVE">중지</option>
                  </select>
                </label>
                <label className="field">
                  <span>송신 시스템</span>
                  <select
                    className="text-input control-select"
                    value={form.sourceSystemId}
                    onChange={(event) => setForm((prev) => ({ ...prev, sourceSystemId: event.target.value }))}
                  >
                    <option value="">선택</option>
                    {systems.map((system) => (
                      <option key={system.id} value={system.id}>
                        {system.systemName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>수신 시스템</span>
                  <select
                    className="text-input control-select"
                    value={form.targetSystemId}
                    onChange={(event) => setForm((prev) => ({ ...prev, targetSystemId: event.target.value }))}
                  >
                    <option value="">선택</option>
                    {systems.map((system) => (
                      <option key={system.id} value={system.id}>
                        {system.systemName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>담당자</span>
                  <input
                    className="text-input"
                    value={form.ownerName}
                    onChange={(event) => setForm((prev) => ({ ...prev, ownerName: event.target.value }))}
                  />
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

              <div className="panel-heading" style={{ marginTop: '1rem' }}>
                <h3>실행 설정</h3>
              </div>

              <div className="form-grid">
                <label className="field">
                  <span>호출 방식</span>
                  <input
                    className="text-input"
                    value={form.httpMethod}
                    onChange={(event) => updateConnectionField('httpMethod', event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>인증 방식</span>
                  <select
                    className="text-input control-select"
                    value={form.authType}
                    onChange={(event) => updateConnectionField('authType', event.target.value)}
                  >
                    <option value="NONE">없음</option>
                    <option value="BASIC">기본 인증</option>
                    <option value="BEARER">토큰 인증</option>
                    <option value="API_KEY">API 키</option>
                  </select>
                </label>
                <label className="field field-full">
                  <span>연결 주소</span>
                  <input
                    className="text-input"
                    value={form.endpointUrl}
                    onChange={(event) => updateConnectionField('endpointUrl', event.target.value)}
                    placeholder="http://mock-partner-api:8080/mock/..."
                  />
                </label>
                <label className="field">
                  <span>인증 값</span>
                  <input
                    className="text-input"
                    value={form.authValue}
                    onChange={(event) => updateConnectionField('authValue', event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>연결 대기 시간</span>
                  <input
                    className="text-input"
                    type="number"
                    value={form.connectTimeoutMillis}
                    onChange={(event) => updateConnectionField('connectTimeoutMillis', event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>응답 대기 시간</span>
                  <input
                    className="text-input"
                    type="number"
                    value={form.readTimeoutMillis}
                    onChange={(event) => updateConnectionField('readTimeoutMillis', event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>다시 시도 횟수</span>
                  <input
                    className="text-input"
                    type="number"
                    value={form.retryCount}
                    onChange={(event) => updateConnectionField('retryCount', event.target.value)}
                  />
                </label>
              </div>

              {connectionTest.text ? (
                <div className={`form-feedback ${connectionTest.tone}`} style={{ marginTop: '1rem' }}>
                  <strong>{connectionTest.text}</strong>
                  {connectionTest.responseBody ? <span>{connectionTest.responseBody}</span> : null}
                </div>
              ) : null}

              <div className="form-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testConnectionMutation.isPending}
                >
                  {testConnectionMutation.isPending ? '확인 중...' : '연결 확인'}
                </button>
                {editingId ? (
                  <button className="secondary-button" type="button" onClick={resetForm}>
                    취소
                  </button>
                ) : null}
                <button className="primary-button" type="submit" disabled={!connectionVerified}>
                  {editingId ? '수정' : '등록'}
                </button>
              </div>
              <div className="detail-box">
                {selectedInterfaceQuery.data ? (
                  <>
                    <p>현재 설정</p>
                    <strong>{selectedInterfaceQuery.data.endpointUrl}</strong>
                    <small>
                      {selectedInterfaceQuery.data.httpMethod} · {formatAuthType(selectedInterfaceQuery.data.authType)} · 마지막 수정{' '}
                      {formatDateTime(selectedInterfaceQuery.data.updatedAt)}
                    </small>
                  </>
                ) : (
                  <>
                    <p>현재 설정</p>
                    <strong>아직 설정이 없습니다</strong>
                    <small>연결 확인을 통과해야 저장할 수 있어요.</small>
                  </>
                )}
              </div>

              {selectedInterface ? (
                <div className="inline-actions">
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => statusMutation.mutate({ id: selectedInterface.id, status: 'ACTIVE' })}
                  >
                    사용 시작
                  </button>
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => statusMutation.mutate({ id: selectedInterface.id, status: 'INACTIVE' })}
                  >
                    사용 중지
                  </button>
                  <button
                    className="danger-button"
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm('이 연동을 삭제할까요? 실행 이력은 그대로 남고 목록에서만 사라집니다.')
                      ) {
                        deleteMutation.mutate(selectedInterface.id)
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    삭제
                  </button>
                </div>
              ) : null}
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}
