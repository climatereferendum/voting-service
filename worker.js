const Queue = require('bee-queue')
const nodemailer = require('nodemailer')
const fetch = require('node-fetch')

const emailText = require('./emailText')
const config = require('./config')

const votesQueue = new Queue('votes', {
  redis: { db: config.redis.db }
})
const mailTransporter = nodemailer.createTransport(config.smtp)

votesQueue.on('ready', () => {
  votesQueue.process(async (job) => {
    // send email
    try {
      await mailTransporter.sendMail(generateMail(job.data.email))
    } catch (err) {
      console.log(err)
    }
    // backup vote
    if (config.backup.url && config.backup.token) {
      try {
        await fetch(config.backup.url, {
          method: 'POST',
          body: JSON.stringify(job.data),
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.backup.token}`
          }
        })
      } catch (err) {
        console.log(err)
      }
    }
  })
})

function generateMail (email) {
  return {
    from: `"Alice in Government" <${config.smtp.auth.user}>`,
    to: email,
    subject: 'Your vote was registered successfully',
    text: emailText
  }
}
