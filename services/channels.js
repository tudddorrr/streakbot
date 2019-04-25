db = require('../db')

canManageChannels = member => {
  // the bitfield of the permissions are all the permissions the user has
  // and in this case i'm checking if the flag corresponding to having 
  // administrator permissions is set.
  // see https://discordapp.com/developers/docs/topics/permissions
  return member.permissions.bitfield & 0x00000008
}

const CHANNEL_MANAGEMENT_NOT_ENOUGH_PERMISSIONS = 'you must be an admin to use this command.' 
const CHANNEL_MANAGEMENT_FORMATTING = `please use the command like this: \`!setchannels channel1, channel2, channel3, etc\`.`
const CHANNEL_MANAGEMENT_SUCCESS = `your streak channels have been successfully updated!`
const CHANNEL_MANAGEMENT_ERROR = `one or more channels you specified do not exist. Your streak channels were not updated.`
const CHANNEL_MANAGEMENT_DM = `You can't do that here, you can only do this in a server.`

exports.handleChannels = msg => {
  if (!msg.member) {
    msg.reply(CHANNEL_MANAGEMENT_DM)
    return
  }

  if (!canManageChannels(msg.member)) {
    msg.reply(CHANNEL_MANAGEMENT_NOT_ENOUGH_PERMISSIONS)
    return
  } 

  const channels = msg.content.substring(12)
  if(channels.length === 0) {
    msg.reply(CHANNEL_MANAGEMENT_FORMATTING)
    return
  }

  let channelsArray = channels.split(',')
  channelsArray = channelsArray.map(channel => {
    return channel.trim()
  })

  for(let channel of channelsArray) {
    if(!msg.guild.channels.find(gc => gc.name === channel)) {
      msg.reply(CHANNEL_MANAGEMENT_ERROR)
      return
    }
  }

  db.addChannels(channelsArray, msg.guild.id)
  msg.reply(CHANNEL_MANAGEMENT_SUCCESS)
}
