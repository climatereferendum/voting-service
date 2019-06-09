const Hapi = require('@hapi/hapi')
const Boom = require('@hapi/boom')
const Bell = require('@hapi/bell')
const Cookie = require('@hapi/cookie')
const levelup = require('levelup')
const leveldown = require('leveldown')
const encode = require('encoding-down')
const cuid = require('cuid')
const nodemailer = require('nodemailer')

const config = require('./config')
const { populateCache, extractPublicPart } = require('./common')

const db = levelup(encode(leveldown('./db'), { valueEncoding: 'json' }))
const mailTransporter = nodemailer.createTransport(config.smtp)
let cache, stats

function generateMail (email) {
  return {
    from: config.smtp.auth.user,
    to: email,
    subject: 'Congratulations on being part of this citizen vote on Climate Change',
    text: `
If you wish to read more about Alice in Government and how to get involved please visit: https://aliceingovernment.com/info

Twitter: https://twitter.com/vsclimatechange
Medium: https://medium.com/blockchainvsclimatechange
Estonian Address Kiriku 6, Tallinn, 10130, Estonia
    `
  }
}

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
    path: '/votes/{countryCode}',
    options: {
      handler: listVotes
    }
  })

  server.route({
    method: 'GET',
    path: '/stats',
    options: {
      handler: listStats
    }
  })

  server.route({
    method: 'GET',
    path: '/data',
    options: {
      auth: 'session',
      handler: listData
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

  cache = await populateCache(db.createValueStream())
  stats = createStats(cache)

  await server.start()
}

internals.start()

function createStats (data) {
  return {
    ...data,
    country: data.country.map(country => {
      return {
        ...country,
        vote: country.vote.slice(0, 5)
      }
    })
  }
}

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
    // TODO handle if somehow vote doesn't exist
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

function getIndex (vote) {
  const country = cache.country.find(c => c.code === vote.nationality)
  return country.vote.length + 1
}

// PUT
async function vote (request, h) {
  const email = request.auth.credentials.email
  if (request.payload.email !== email) {
    return Boom.forbidden()
  } else {
    // check if vote existis
    let vote = await db.get(email)
    if (request.payload.id !== vote.id || vote.created) {
      // respond with conflict
      return Boom.conflict()
    } else {
      vote = {
        ...request.payload,
        created: new Date().toISOString(),
        index: getIndex(request.payload)
      }
      try {
        await db.put(email, vote)
        const country = cache.country.find(c => c.code === vote.nationality)
        country.vote = [extractPublicPart(vote), ...country.vote]
        stats = createStats(cache)
      } catch (err) {
        console.log(err)
      }

      // send email
      try {
        await mailTransporter.sendMail(generateMail(email))
      } catch (err) {
        console.log(err)
      }

      // respond with 204
      return null
    }
  }
}

async function listData (request, h) {
  const email = request.auth.credentials.email
  if (email !== config.admin) {
    return Boom.forbidden()
  } else {
    const list = []
    for await (const vote of db.createValueStream()) {
      list.push(vote)
    }
    return list
  }
}

async function listVotes (request, h) {
  return cache.country.find(c => c.code === request.params.countryCode)
}

async function listStats (request, h) {
  return stats
}

process.on('unhandledRejection', (err) => {
  console.log(err)
  process.exit(1)
})
