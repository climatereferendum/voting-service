const Queue = require('bee-queue')
const nodemailer = require('nodemailer')
const fetch = require('node-fetch')
const Sentry = require('@sentry/node')

const { doneEmailText, confirmEmailText } = require('./emailText')
const config = require('./config')

if (config.sentry.worker) {
  Sentry.init({ dsn: config.sentry.worker })
}

function handleError(err) {
  if (config.sentry.worker) {
    Sentry.captureException(err)
  } else {
    console.error(err)
  }
}

const votesQueue = new Queue('votes', {
  redis: { db: config.redis.db }
})
const mailTransporter = nodemailer.createTransport(config.smtp)

votesQueue.on('ready', () => {
  votesQueue.process(async (job) => {
    // send email
    try {
      await mailTransporter.sendMail(generateMail(job.data))
    } catch (err) {
      handleError(err)
    }
    // notify admin if vote pending
    if (job.data.pending && !job.data.confirmed) {
      try {
        await mailTransporter.sendMail(notifyPendingMail(job.data))
      } catch (err) {
        handleError(err)
      }
    }
    // backup vote
    if (config.backup.url && config.backup.token && job.data.confirmed) {
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
        handleError(err)
      }
    }
  })
})

function notifyPendingMail (vote) {
  return {
    from: `"Climate Referendum" <${config.fromEmail}>`,
    to: config.admin.email,
    subject: 'New pending vote',
    text: JSON.stringify(vote, null, 4)
  }
}

function generateMail (vote) {
  const email = {
    from: `"Climate Referendum" <${config.fromEmail}>`,
    to: vote.email
  }
  if (vote.confirmed) {
    email.subject = 'Your vote was registered successfully'
    email.text = doneEmailText(vote)
  } else {
    email.subject = 'Please confirm your vote'
    email.text = confirmEmailText(vote)
  }
  return email
}
