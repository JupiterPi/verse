package jupiterpi.verse

import net.dv8tion.jda.api.entities.Member
import net.dv8tion.jda.api.entities.channel.concrete.VoiceChannel
import java.util.*

data class JoinCode(
    val code: String,
    val expires: Date,
    val member: Member,
    val channel: VoiceChannel,
)

object JoinCodes {
    private val joinCodes = mutableListOf<JoinCode>()

    fun create(discordUser: Member, channel: VoiceChannel, expiresInSeconds: Int = 30)
    = JoinCode(randomAlphanumeric(8), Date(Date().time + expiresInSeconds * 1000), discordUser, channel).also { joinCodes += it }.code

    fun redeem(code: String)
    = joinCodes.find { it.code == code }?.also { joinCodes -= it }?.takeIf { Date() < it.expires }
}