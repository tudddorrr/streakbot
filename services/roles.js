/**
 * Managing discord roles with the bot, 
 * such as changing the active and top streaker role.
 */

db = require('../db')

 /**
  * Checks if the member has the required permissions to 
  * manage the bot's roles. Currently this means having 
  * admin permissions.
  */
canManageRoles = member => {
  // the bitfield of the permissions are all the permissions the user has
  // and in this case i'm checking if the flag corresponding to having 
  // administrator permissions is set.
  // see https://discordapp.com/developers/docs/topics/permissions
  return member.permissions.bitfield & 0x00000008
}

/**
 * Getting a role from a guild whose name/id matches rolestr, prioritizing ids.
 */
getRole = (guild, rolestr) => {
  if (!guild.available) {
    return undefined
  }

  return guild.roles
    .array()
    .find(role => {
      return role.id === rolestr ||
        role.name.normalize() === rolestr
    })
}

const VALID_ROLE_SETTINGS = ['active', 'top']
const ROLE_MANAGEMENT_NOT_ENOUGH_PERMISSIONS = 'you must be an admin to use this command.' 
const ROLE_MANAGEMENT_FORMATTING = `please use the command like this: \`!setrole [${VALID_ROLE_SETTINGS.join('/')}] [role name/id]\`.`
const ROLE_MANAGEMENT_DM = `You can't do that here, you can only run that command in a server.`

/** 
 * A command that allows those with sufficient permissions to change what the active
 * and top streaker role is.
 */ 
exports.handleRoles = msg => {
  if (!msg.member) {
    msg.reply(ROLE_MANAGEMENT_DM)
    return
  }

  if (!canManageRoles(msg.member)) {
    msg.reply(ROLE_MANAGEMENT_NOT_ENOUGH_PERMISSIONS)
    return
  } 

  const args = msg.content.split(' ')
  if (args.length < 3) {
    msg.reply(ROLE_MANAGEMENT_FORMATTING)
    return
  }
  if (VALID_ROLE_SETTINGS.indexOf(args[1]) === -1) {
    msg.reply(ROLE_MANAGEMENT_FORMATTING)
    return
  } 
  
  const rolestr = args.slice(2).join(' ')
  const role = getRole(msg.member.guild, rolestr)

  if (!role) {
    msg.reply('Couldn\'t find a role with that name/id')
    return
  }

  
  db.addRole(role.id, msg.guild.id, args[1])
  console.log(`${msg.author.username} set ${args[1]} role in ${msg.guild.name} to role ${role.name}`)
  msg.reply(`${args[1]} has been set to ${role.name}!`)
}