import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { GoogleGenerativeAI }  from '@google/generative-ai'
import { z } from 'zod'
import { knex } from '../database'
import { env } from '../env'
import { randomUUID } from 'crypto'
import { DateTime } from 'luxon'

import { fileToGenerativePart } from '../utils/GenerativeImage'

type Measure = {
  id: string;
  type: string;
  image_url: string;
  value: number;
  date_measured: Date;
  customer_code: string;
  confirm_measure: boolean;
  created_at: Date;
  updated_at: Date;
}

type MeasureResponseCreate = {
  measure_uuid: string;
  image_url: string;
  measure_value: number;
}

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY)

class MeasuresController {
    async create (request: FastifyRequest, reply: FastifyReply) {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash'})

        const getMimeType = z.object({
          'x-mime-type': z.enum(['image/png','image/jpeg','image/webp','image/heic','image/heif'], { message: 'Forneça um MIME Type válido' })
        })

        const createMeasureBodySchema = z.object({
            image: z.string().min(1, { message: 'O campo image é obrigatório' }).regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/, { message: 'O campo deve ser uma string base64 válida' }),
            customer_code: z.string().min(1, { message: 'O campo customer_code é obrigatório '}),
            measure_datetime: z.coerce.date(),
            measure_type: z.enum(['WATER','GAS'], { message: 'Apenas os tipos WATER ou GAS são aceitos' })
        })

        const { 'x-mime-type': mimeType } = getMimeType.parse(request.headers);

        const { measure_type, image, measure_datetime, customer_code } = createMeasureBodySchema.parse(request.body)
        
        const alreadyMeasured = await knex('measures')
        .whereRaw('EXTRACT(YEAR FROM date_measured) = ?', [measure_datetime.getFullYear()])
        .andWhereRaw('EXTRACT(MONTH FROM date_measured) = ?', [measure_datetime.getMonth() + 1])
        .andWhere('type', measure_type)
        .andWhere('customer_code', customer_code)
        .first()

        if(alreadyMeasured) {
          return reply.status(409).send({
            error_code: 'DOUBLE_REPORT',
            error_descritpion: 'Leitura do mês já realizada'
          })
        }
        
        const image_code = await fileToGenerativePart(image, mimeType)

        const prompt = 'Look up the value of the meter in m³, and just give me the value without any description'

        const generatedContent = await model.generateContent([prompt, image_code])

        const measuredValue = generatedContent?.response?.candidates?.[0]?.content?.parts?.[0]?.text

        const image_url = `data:${mimeType};base64,${image}`
        
        await knex('measures').insert({
          id: randomUUID(),
          type: measure_type,
          image_url,
          value: Number(measuredValue),
          date_measured: DateTime.fromJSDate(measure_datetime).toUTC(),
          customer_code,
          confirm_measure: false,
          created_at: new Date(),
          updated_at: new Date(),
        })

        const lastInsertMeasure = await knex('measures').where('customer_code', customer_code).orderBy('created_at', 'desc').first()

        const measureResponse: MeasureResponseCreate = {
          measure_uuid: lastInsertMeasure.id,
          measure_value: lastInsertMeasure.value,
          image_url: lastInsertMeasure.image_url,
        }

        return reply.status(200).send(measureResponse)
    }

    async edit (request: FastifyRequest, reply: FastifyReply) {
      const editMeasureBodySchema = z.object({
        measure_uuid: z.string().uuid({ message: 'O campo measure_uuid é inválido' }),
        confirmed_value: z.number({ message: 'O campo confirmed_value é inválido' })
      })

      const { measure_uuid, confirmed_value } = editMeasureBodySchema.parse(request.body)

      const existsMeasure = await knex('measures').where('id', measure_uuid).first()

      if (!existsMeasure) {
        return reply.status(404).send({
          error_code: 'INVALID_DATA',
          error_description: 'Leitura não encontrada'
        })
      }

      if (existsMeasure.confirm_measure) {
        return reply.status(409).send({
          error_code: 'INVALID_DATA',
          error_description: 'Leitura do mês já confirmada'
        })
      }

      await knex('measures')
      .where('id', measure_uuid)
      .update({ 
        value: confirmed_value,
        confirm_measure: true,
        updated_at: new Date()
      })

      return reply.status(200).send({ sucess: true })
    }

    async list (request: FastifyRequest, reply: FastifyReply) {
      const getMeasureSchema = z.object({
        customer_code: z.string(),
      })

      const getMeasureQuerySchema = z.object({
        type: z.enum(['WATER', 'GAS']).optional()
      })

      
      const { customer_code } = getMeasureSchema.parse(request.params)
      const { type } = getMeasureQuerySchema.parse(request.query)


      const measuresQuery = knex('measures')
      .select('id', 'date_measured', 'type', 'confirm_measure', 'image_url')
      .where('customer_code', customer_code);

      if (type) {
        measuresQuery.andWhere('type', type.toUpperCase());
      }

      const measures = await measuresQuery

      if (measures.length === 0) {
        return reply.status(404).send({
          error_code: 'MEASURES_NOT_FOUND',
          error_description: "Nenhuma leitura foi encontrada"
        })

      }
      
      const listMeasures = measures.map((measure) => {
        return {
          measure_uuid: measure.id,
          measure_datetime: measure.date_measured,
          measure_type: measure.type,
          has_confirmed: measure.confirm_measure,
          image_url: measure.image_url
        }
      })


      return reply.status(200).send({
        customer_code: customer_code,
        measures: [{
          listMeasures
        }]
      })
    }
}

export default MeasuresController;