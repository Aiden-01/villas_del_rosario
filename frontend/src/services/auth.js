import { login } from './api'

export async function loginRequest(username, password) {
  return login(username, password)
}
