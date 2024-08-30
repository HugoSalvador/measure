import { FastifyInstance, RouteShorthandOptions } from "fastify";
import MeasuresController  from '../controllers/MeasuresController'

const measuresController = new MeasuresController()

const opts: RouteShorthandOptions = {
    schema: {
        querystring: {
            type: 'object',
            properties: {
                type: { type: 'string' }
            },
            required: []
        }
    }
}

export async function measuresRoutes(app: FastifyInstance) {
    app.post('/upload', measuresController.create)
    app.patch('/confirm', measuresController.edit)
    app.get('/:customer_code/list', opts, measuresController.list)
}