module.exports = {
  port: 8000,
  serviceUrl: 'http://localhost:8081',
  appUrl: 'http://localhost:8180',
  flushSecret: '030f4d9e-d591-11e9-8357-10ddb1a009c3',
  mongo: {
    url: 'mongodb://localhost:27017',
    database: 'aliceingov',
    collection: 'votes'
  },
  redis: {
    host: '127.0.0.1',
    port: 6379,
    db: 0
  },
  backup: {
    url: 'http://localhost:8082',
    token: ''
  },
  smtp: {
    host: '',
    port: 587,
    secure: false,
    auth: {
      user: '',
      pass: ''
    }
  }
}
