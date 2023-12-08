package jupiterpi.verse

import net.dv8tion.jda.api.entities.Member
import net.dv8tion.jda.api.entities.channel.concrete.VoiceChannel

data class JoinCode(
    val code: String,
    val member: Member,
    val channel: VoiceChannel,
)

object JoinCodes {
    private val joinCodes = mutableListOf<JoinCode>()

    fun create(discordUser: Member, channel: VoiceChannel)
    = JoinCode(randomAlphanumeric(8), discordUser, channel).also { joinCodes += it }.code

    fun redeem(code: String)
    = joinCodes.find { it.code == code }
}