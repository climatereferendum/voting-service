const Hapi = require('@hapi/hapi')
const Bell = require('@hapi/bell')
const Cookie = require('@hapi/cookie')
const levelup = require('levelup')
const leveldown = require('leveldown')
const encode = require('encoding-down')
const cuid = require('cuid')

const db = levelup(encode(leveldown('./db'), { valueEncoding: 'json' }))

const config = require('./config')

const internals = {}

internals.start = async function () {
  const server = Hapi.server({
    port: config.port,
    routes: { cors: { credentials: true } },
    state: { isSameSite: false } // required for CORS
  })

  await server.register([Cookie, Bell])

  server.auth.strategy('session', 'cookie', {
    cookie: {
      name: 'fookie',
      password: config.cookiePassword,
      ttl: 30 * 24 * 60 * 60 * 1000,
      path: '/',
      isSameSite: false // 30 days
    }
  })

  server.auth.strategy('google', 'bell', {
    provider: 'google',
    clientId: config.google.clientId,
    clientSecret: config.google.clientSecret,
    password: config.cookiePassword,
    location: config.serviceUrl
  })

  server.auth.strategy('facebook', 'bell', {
    provider: 'facebook',
    clientId: config.facebook.clientId,
    clientSecret: config.facebook.clientSecret,
    password: config.cookiePassword,
    location: config.serviceUrl
  })

  server.route({
    method: 'GET',
    path: '/',
    options: {
      auth: {
        strategy: 'session',
        mode: 'try'
      },
      handler: entrypoint
    }
  })

  server.route({
    method: 'GET',
    path: '/votes',
    options: {
      handler: listVotes
    }
  })

  server.route({
    method: 'GET',
    path: '/auth/google',
    options: {
      auth: 'google',
      handler: oauth
    }
  })

  server.route({
    method: 'GET',
    path: '/auth/facebook',
    options: {
      auth: 'facebook',
      handler: oauth
    }
  })

  server.route({
    method: 'PUT',
    path: '/{cuid}',
    options: {
      auth: 'session',
      handler: vote
    }
  })

  await server.start()
}

internals.start()

async function entrypoint (request, h) {
  const info = {
    authProviders: {
      facebook: '/auth/facebook',
      google: '/auth/google'
    }
  }
  if (request.auth.credentials) {
    const email = request.auth.credentials.email
    const vote = await db.get(email)
    info.vote = vote
  }
  return info
}

async function oauth (request, h) {
  const email = request.auth.credentials.profile.email
  let vote
  try {
    vote = await db.get(email)
  } catch (err) {
    vote = {
      id: `${config.serviceUrl}/${cuid()}`,
      email
    }
    await db.put(email, vote)
  }
  request.cookieAuth.set({ email })

  // redirect to app (/)
  return h.redirect(config.appUrl)
}

// PUT
async function vote (request, h) {
  const email = request.auth.credentials.email
  if (request.payload.email !== email) {
    return 403
  } else {
    // check if vote existis
    const vote = await db.get(email)
    if (request.payload.id !== vote.id || vote.created) {
      // respond with conflict
      return 409
    } else {
      await db.put(email, request.payload)
      // respond with 204
      return 204
    }
  }
}

async function listVotes (request, h) {
  const list = []
  for await (const vote of db.createValueStream()) {
    list.push({
      name: vote.name,
      nationality: vote.nationality,
      description: vote.description,
      opinion: vote.opinion
    })
  }
  return list
}

process.on('unhandledRejection', (err) => {
  console.log(err)
  process.exit(1)
})
