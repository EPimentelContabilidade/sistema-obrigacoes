import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
})

// Clientes
export const getClientes = () => api.get('/clientes/')
export const getCliente = (id) => api.get(`/clientes/${id}`)
export const createCliente = (data) => api.post('/clientes/', data)
export const updateCliente = (id, data) => api.put(`/clientes/${id}`, data)
export const deleteCliente = (id) => api.delete(`/clientes/${id}`)

// Obrigações
export const getTipos = () => api.get('/obrigacoes/tipos')
export const getObrigacoes = (params) => api.get('/obrigacoes/', { params })
export const createObrigacao = (data) => api.post('/obrigacoes/', data)
export const updateStatus = (id, status) => api.put(`/obrigacoes/${id}/status?status=${status}`)

// Entregas
export const getEntregas = (params) => api.get('/entregas/', { params })
export const createEntrega = (data) => api.post('/entregas/', data)
export const reenviar = (id) => api.post(`/entregas/${id}/reenviar`)

// Dashboard
export const getStats = () => api.get('/dashboard/stats')
export const getEntregasRecentes = () => api.get('/dashboard/entregas-recentes')

export default api
