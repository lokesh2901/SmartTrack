import api from './api'


const getUsers = () => api.get('/users')
const getMe = () => api.get('/users/me')


export default { getUsers, getMe }