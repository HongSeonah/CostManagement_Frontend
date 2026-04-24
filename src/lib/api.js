import axios from 'axios'

const defaultBaseURL = import.meta.env.PROD ? '' : 'http://localhost:8081'
const baseURL = import.meta.env.VITE_API_BASE_URL || defaultBaseURL

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function apiGet(path, config) {
  const response = await api.get(path, config)
  return response.data?.data
}

export async function apiPost(path, body, config) {
  const response = await api.post(path, body, config)
  return response.data?.data
}

export async function apiPut(path, body, config) {
  const response = await api.put(path, body, config)
  return response.data?.data
}

export async function apiDelete(path, config) {
  const response = await api.delete(path, config)
  return response.data?.data
}

export function getApiErrorMessage(error, fallback = '요청에 실패했어요.') {
  return error?.response?.data?.message ?? fallback
}
