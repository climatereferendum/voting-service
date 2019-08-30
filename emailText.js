const config = require('./config')

function voteUrl (vote) {
  return `${config.appUrl}/voters/${vote.id}`
}
const footer = `
---------

Twitter: https://twitter.com/aliceingov
Medium: https://medium.com/blockchainvsclimatechange
Estonian Address Kiriku 6, Tallinn, 10130, Estonia

`
module.exports = {
  doneEmailText: function (vote) {
    return `
Congratulations on being part of this citizen vote on Climate Change

You can always find your vote here: ${voteUrl(vote)}

If you wish to read more about Alice in Government and how to get involved please visit: https://aliceingovernment.com/info

${footer}
`
  },
  confirmEmailText: function (vote) {
    return `
Thank you for taking first step towards being part of this citizen vote on Climate Change

To confirm your vote please follow this link: ${voteUrl(vote)}

${footer}
`
  }
}
