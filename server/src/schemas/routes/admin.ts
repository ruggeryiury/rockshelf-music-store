import z from 'zod'

import { OBJECT_ID_REGEX } from '../globals'

// #region users/ban
export const userBanBodySchema = z.object({
	userId: z.string().regex(OBJECT_ID_REGEX),
})
export type UserBanBody = z.infer<typeof userBanBodySchema>
