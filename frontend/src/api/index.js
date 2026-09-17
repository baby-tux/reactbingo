import axios from 'axios'

export const API_URL = process.env.NODE_ENV === 'development'
    ? 'http://localhost:8999/'
    : '/api/'

const api = axios.create({
    baseURL: API_URL,
})

export const createGame = payload => api.post(`create`, payload)
export const getGameList = () => api.get(`/list`)
export const getPatterns = () => api.get(`/types`)
export const validateCard = payload => api.post(`/validate`, payload)


const apis = {
  createGame,
  getGameList,
  getPatterns,
  validateCard,
}

export default apis
