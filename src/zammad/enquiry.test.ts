import supertest from 'supertest';
import { DevServer } from '../dev';

const devServer = new DevServer()

describe('Zammad ticket creator webhook', () => {
  it('Returns a 204 response if the request is valid', async () => {
    await supertest(devServer.config.app)
      .post('/webhooks/enquiry')
      .expect(204)
  })
})