import axios from 'axios'

import type { GenericServerResponse, GetMyStatusSuccess, GetUserDetailsSuccessSerialized, ImageProcessingParams, UserLoginBody, UserLoginSuccess, UserRegisterBody, UserResendVerificationEmailBody, UserResetPasswordBody, UserUpdateBody, UserVerifyAccBody } from './schemas'

const dev = axios.create({ baseURL: 'http://192.168.15.5:3000/api/v1', validateStatus: (status) => status < 500 })

export const serverStatusAPI = {
	status: () => dev.get<GenericServerResponse>('status'),
}

export const usersAPI = {
	deleteMyAvatar: (token: string) => dev.delete<GenericServerResponse>('users/me/avatar', { headers: { Authorization: `Bearer ${token}` } }),
	getMyAvatar: (token: string, queryParams: Partial<ImageProcessingParams>) => dev.get<Blob>('users/me/avatar', { responseType: 'blob', headers: { Authorization: `Bearer ${token}` }, params: queryParams }),
	getMyStatus: (token: string) => dev.get<GetMyStatusSuccess>('users/me/status', { headers: { Authorization: `Bearer ${token}` } }),
	getMyUserDetails: (token: string) => dev.get<GetUserDetailsSuccessSerialized>('users/me', { headers: { Authorization: `Bearer ${token}` } }),
	getUserAvatar: (userId: string, queryParams: Partial<ImageProcessingParams>) => dev.get<GetUserDetailsSuccessSerialized>(`users/${userId}/avatar`, { params: queryParams }),
	getUserDetails: (userId: string) => dev.get<GetUserDetailsSuccessSerialized>(`users/${userId}`),
	putMyAvatar: (body: FormData, token: string) => dev.put<GenericServerResponse>('users/me/avatar', body, { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` } }),
	resendResetPasswordEmail: (body: UserResendVerificationEmailBody) => dev.post<GenericServerResponse>('users/resend-reset-password', body),
	resendVerificationEmail: (body: UserResendVerificationEmailBody) => dev.post<GenericServerResponse>('users/resend-verification-email', body),
	resetPassword: (body: UserResetPasswordBody) => dev.post<GenericServerResponse>('users/reset-password', body),
	updateMyUser: (body: UserUpdateBody, token: string) => dev.patch<GenericServerResponse>('users/me/update', body, { headers: { Authorization: `Bearer ${token}` } }),
	login: (body: UserLoginBody) => dev.post<UserLoginSuccess>('users/login', body),
	register: (body: UserRegisterBody) => dev.post<GenericServerResponse>('users/register', body),
	verifyAcc: (body: UserVerifyAccBody) => dev.post<GenericServerResponse>('users/verify-acc', body),
	verifyToken: (token: string) => dev.get<GenericServerResponse>('users/verify-token', { headers: { Authorization: `Bearer ${token}` } }),
}

export const adminAPI = {
	ban: (userId: string, token: string) => dev.post<GenericServerResponse>('admin/ban', { userId }, { headers: { Authorization: `Bearer ${token}` } }),
}
