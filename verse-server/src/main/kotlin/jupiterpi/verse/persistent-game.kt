package jupiterpi.verse

import jupiterpi.verse.game.Game
import jupiterpi.verse.game.Player
import jupiterpi.verse.game.RadianRotation
import jupiterpi.verse.game.Vector3
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import net.dv8tion.jda.api.entities.channel.concrete.VoiceChannel
import net.dv8tion.jda.api.utils.FileUpload
import java.util.*

@Serializable
data class PersistentGame(
    val channelId: String,
    val savedAt: Long,
    val players: List<PersistentPlayer>,
) {
    constructor(game: Game) : this(game.channel.id, Date().time, game.offlinePlayers)
}

@Serializable
data class PersistentPlayer(
    val userId: String,
    val color: String,
    val position: Vector3,
    val rotation: RadianRotation,
) {
    constructor(player: Player) : this(player.member.id, player.color, player.state.position, player.state.rotation)
}

object Persistence {
    fun optionallyLoadPersistentGame(channel: VoiceChannel): Game {
        val message = channel.getHistoryFromBeginning(100).complete().retrievedHistory.single { it.member!!.user == jda.selfUser }
        if (message.attachments.size == 0) return Game(channel)
        val persistentGame = message.attachments[0].proxy.download().get().reader().readText()
            .let { Json.decodeFromString<PersistentGame>(it) }
        return Game(jda.getVoiceChannelById(persistentGame.channelId)!!, persistentGame.players)
    }

    fun persistGame(game: Game) {
        val message = game.channel.getHistoryFromBeginning(100).complete().retrievedHistory.single { it.member!!.user == jda.selfUser }
        message.editMessageAttachments(
            FileUpload.fromData(Json.encodeToString(PersistentGame(game)).toByteArray(), "${game.channel.name}-${Date().time}.verse")
        ).queue()
    }
}