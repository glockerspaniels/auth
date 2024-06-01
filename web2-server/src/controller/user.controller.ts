import { omit } from 'lodash'
import { Request, Response } from 'express'
import { createUser } from '../service/user.service'
import logger from '../utils/logger'
import { CreateUserInput } from '../schema/user.schema'

export async function createUserHandler(req: Request<{}, {}, CreateUserInput["body"]>, res: Response) {
  try {
    const user = await createUser(req.body)

    return res.send(omit(user, 'password'))

  } catch (e) {
    logger.error(e)
    if (e instanceof Error) {
      return res.status(409).send(e.message)
    }
    logger.error('Unexpected Error', e)
  }
}