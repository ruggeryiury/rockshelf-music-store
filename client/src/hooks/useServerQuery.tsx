import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usersAPI } from 'rockshelf-core/api'
import type { GenericServerResponse, GetUserDetailsSuccessSerialized, UserLoginBody, UserLoginSuccess, UserRegisterBody, UserUpdateBody } from 'rockshelf-core/schemas'
import { AxiosError } from 'axios'
import { useEffect, useState } from 'react'

export function useServerQuery() {
	const queryClient = useQueryClient()

	const [token, setToken] = useState(localStorage.getItem('token') ?? '')

	const removeToken = () => {
		setToken('')
		localStorage.removeItem('token')
	}
	const setNewToken = (token: string) => {
		setToken(token)
		localStorage.setItem('token', token)
	}
	const verifyToken = useQuery({
		queryKey: ['me', 'verification', token],
		staleTime: 1000 * 60 * 15,
		enabled: !!token,
		queryFn: async () => {
			if (!token) return null
			const res = await usersAPI.verifyToken(token)
			return res.data
		},
	})

	const login = useMutation<UserLoginSuccess, AxiosError, UserLoginBody>({
		mutationFn: async (body) => {
			const res = await usersAPI.login(body)
			if (res.data.data?.token) {
				setNewToken(res.data.data.token)
			}
			return res.data
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ['me'] })
		},
	})

	const register = useMutation<GenericServerResponse, AxiosError, UserRegisterBody>({
		mutationFn: async (body) => {
			const res = await usersAPI.register(body)
			return res.data
		},
	})

	const getMyUserDetails = useQuery<GetUserDetailsSuccessSerialized | null, AxiosError>({
		queryKey: ['me', 'details', token],
		enabled: token !== null && verifyToken.data?.statusCode === 200,
		staleTime: 1000 * 60 * 15,
		queryFn: async () => {
			if (!token) return null
			const res = await usersAPI.getMyUserDetails(token)
			return res.data
		},
	})

	const avatarVer = getMyUserDetails.data?.data?.user.avatarVer

	const getMyAvatar = useQuery<Blob | null, AxiosError>({
		queryKey: ['me', 'avatar', token],
		enabled: token !== null && verifyToken.data?.statusCode === 200 && typeof avatarVer === 'number',
		staleTime: 1000 * 60 * 15,
		queryFn: async () => {
			if (!token || typeof avatarVer !== 'number') return null

			const res = await usersAPI.getMyAvatar(token, { v: avatarVer, size: 128, format: 'webp', quality: 85 })

			return res.data
		},
	})

	const [avatarUrl, setAvatarUrl] = useState<string>()

	const verifyAcc = useMutation<GenericServerResponse, AxiosError, string>({
		mutationFn: async (token) => {
			const res = await usersAPI.verifyAcc({ token })
			return res.data
		},
	})

	const putMyAvatar = useMutation<GenericServerResponse | null, AxiosError, FormData>({
		mutationFn: async (body) => {
			if (!token || getMyAvatar.isPending) return null
			const res = await usersAPI.putMyAvatar(body, token)
			return res.data
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ['me'] })
		},
	})

	const deleteMyAvatar = useMutation<GenericServerResponse | null, AxiosError>({
		mutationFn: async () => {
			if (!token || getMyAvatar.isPending) return null
			const res = await usersAPI.deleteMyAvatar(token)
			return res.data
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ['me'] })
		},
	})

	useEffect(() => {
		if (!getMyAvatar.data) {
			setAvatarUrl(undefined)
			return
		}

		const url = URL.createObjectURL(getMyAvatar.data)
		setAvatarUrl(url)

		return () => {
			if (avatarUrl) {
				URL.revokeObjectURL(avatarUrl)
			}
		}
	}, [getMyAvatar.data])

	const updateMyUser = useMutation<GenericServerResponse | null, AxiosError, UserUpdateBody>({
		mutationFn: async (body) => {
			if (!token) return null
			const res = await usersAPI.updateMyUser(body, token)
			return res.data
		},
	})

	return { queryClient, login, register, getMyUserDetails, avatarUrl, verifyAcc, putMyAvatar, verifyToken, deleteMyAvatar, updateMyUser, token, setNewToken, removeToken }
}
