const request = require('request');

exports.getMedia = query => {
  if(!process.env.GIPHY_KEY) {
    console.log('Skipping media, no giphy key')
    return null
  }

  const parameters = {
    url: 'https://api.giphy.com/v1/gifs/search',
    qs: {
      api_key: process.env.GIPHY_KEY,
      q: query,
      limit: 50
    },
    encoding: 'binary'
  }

  console.log('Getting media...')

  return new Promise((resolve, reject) => {
    request.get(parameters, (err, res, body) => {
      if(err) {
        reject(err)
        return
      }

      body = JSON.parse(body)
      let rand = getRandomInt(body.data.length)
      let media = body.data[rand].images.fixed_height.url
      resolve(media)
    })
  })
}

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max))
}