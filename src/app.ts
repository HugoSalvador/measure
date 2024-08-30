import fastify from 'fastify'

import { measuresRoutes } from './routes/measures.routes'

export const app = fastify()

app.register(measuresRoutes)