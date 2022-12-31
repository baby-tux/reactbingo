import axios from 'axios'

const api = axios.create({
    baseURL: '/',
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
