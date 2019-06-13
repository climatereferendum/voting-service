module.exports = {
  port: 8000,
  serviceUrl: 'http://localhost:8081',
  appUrl: 'http://localhost:8180',
  cookiePassword: 'CHANGE_ME',
  admin: 'admin@example.org',
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
  },
  google: {
    clientId: '',
    clientSecret: ''
  },
  facebook: {
    clientId: '',
    clientSecret: ''
  }
}
