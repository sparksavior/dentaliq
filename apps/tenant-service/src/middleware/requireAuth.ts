import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import type { UserRole } from '@dentaliq/types'

export function requireAuth(app: FastifyInstance) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify()
    } catch {
      return reply.code(401).send({ success: false, error: 'Unauthorized' })
    }
  }
}

export function requireRole(...roles: UserRole[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const user = req.user as any
    if (!user || !roles.includes(user.role)) {
      return reply.code(403).send({
        success: false,
        error: `Access denied. Required roles: ${roles.join(', ')}`,
      })
    }
  }
}
