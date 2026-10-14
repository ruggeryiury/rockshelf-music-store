import axios from 'axios'

import type { GenericServerResponse, GetMyStatusSuccess, GetSongDataQuerystring, GetSongDataSuccess, GetSongDetailsSuccess, GetSongFileQuerystring, GetUserDetailsSuccessSerialized, ImageProcessingParams, UserLoginBody, UserLoginSuccess, UserRegisterBody, UserResendVerificationEmailBody, UserResetPasswordBody, UserUpdateBody, UserVerifyAccBody } from './schemas'

const dev = axios.create({ baseURL: 'http://192.168.15.5:3000/api/v1', validateStatus: (status) => status < 500 })

export const serverAPI = {
	admin: {
		ban: (userId: string, token: string) => dev.post<GenericServerResponse>('admin/ban', { userId }, { headers: { Authorization: `Bearer ${token}` } }),
	},
	status: {
		status: () => dev.get<GenericServerResponse>('status'),
	},
	users: {
		deleteMyAvatar: (token: string) => dev.delete<GenericServerResponse>('users/me/avatar', { headers: { Authorization: `Bearer ${token}` } }),
		getMyAvatar: (token: string, queryParams?: Partial<ImageProcessingParams>) => dev.get<Blob>('users/me/avatar', { responseType: 'blob', headers: { Authorization: `Bearer ${token}` }, params: queryParams }),
		getMyStatus: (token: string) => dev.get<GetMyStatusSuccess>('users/me/status', { headers: { Authorization: `Bearer ${token}` } }),
		getMyUserDetails: (token: string) => dev.get<GetUserDetailsSuccessSerialized>('users/me', { headers: { Authorization: `Bearer ${token}` } }),
		getUserAvatar: (userId: string, queryParams?: Partial<ImageProcessingParams>) => dev.get<Blob>(`users/${userId}/avatar`, { params: queryParams }),
		getUserDetails: (userId: string) => dev.get<GetUserDetailsSuccessSerialized>(`users/${userId}`),
		login: (body: UserLoginBody) => dev.post<UserLoginSuccess>('users/login', body),
		putMyAvatar: (body: FormData, token: string) => dev.put<GenericServerResponse>('users/me/avatar', body, { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` } }),
		register: (body: UserRegisterBody) => dev.post<GenericServerResponse>('users/register', body),
		resendResetPasswordEmail: (body: UserResendVerificationEmailBody) => dev.post<GenericServerResponse>('users/resend-reset-password', body),
		resendVerificationEmail: (body: UserResendVerificationEmailBody) => dev.post<GenericServerResponse>('users/resend-verification-email', body),
		resetPassword: (body: UserResetPasswordBody) => dev.post<GenericServerResponse>('users/reset-password', body),
		updateMyUser: (body: UserUpdateBody, token: string) => dev.patch<GenericServerResponse>('users/me/update', body, { headers: { Authorization: `Bearer ${token}` } }),
		verifyAcc: (body: UserVerifyAccBody) => dev.post<GenericServerResponse>('users/verify-acc', body),
		verifyToken: (token: string) => dev.get<GenericServerResponse>('users/verify-token', { headers: { Authorization: `Bearer ${token}` } }),
	},
	songs: {
		download: (songId: string) => dev.get<Blob>(`songs/${songId}/download`),
		getSongData: (songId: string, queryParams?: Partial<GetSongDataQuerystring>) => dev.get<GetSongDataSuccess>(`songs/${songId}/data`, { params: queryParams }),
		getSongDetails: (songId: string) => dev.get<GetSongDetailsSuccess>(`songs/${songId}/details`),
		getSongFile: (songId: string, queryParams?: Partial<GetSongFileQuerystring>) => dev.get<Blob>(`songs/${songId}/file`, { params: queryParams }),
		getSongThumbnail: (songId: string, queryParams?: Partial<ImageProcessingParams>) => dev.get<Blob>(`songs/${songId}/thumbnail`, { params: queryParams }),
		register: (body: FormData, token: string) => dev.post<GenericServerResponse>('songs/register', body, { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` } }),
	},
	albums: {
		getAlbumThumbnail: (albumId: string, queryParams?: Partial<ImageProcessingParams>) => dev.get<Blob>(`albums/${albumId}/thumbnail`, { params: queryParams }),
	},
} as const
