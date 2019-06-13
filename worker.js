const Queue = require('bee-queue')
const nodemailer = require('nodemailer')

const emailText = require('./emailText')
const config = require('./config')

const votesQueue = new Queue('votes')
const mailTransporter = nodemailer.createTransport(config.smtp)

votesQueue.on('ready', () => {
  votesQueue.process(async (job) => {
    // send email
    try {
      await mailTransporter.sendMail(generateMail(job.data.email))
    } catch (err) {
      console.log(err)
    }
    // TODO: backup vote
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
