package jupiterpi.verse.game

import io.ktor.server.application.*
import io.ktor.server.routing.*
import io.ktor.server.websocket.*
import io.ktor.websocket.*
import jupiterpi.verse.JoinCodes
import jupiterpi.verse.bot.Bot
import kotlinx.coroutines.channels.ClosedReceiveChannelException
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.Serializable
import net.dv8tion.jda.api.entities.Member
import net.dv8tion.jda.api.entities.channel.concrete.VoiceChannel
import net.dv8tion.jda.api.events.GenericEvent
import net.dv8tion.jda.api.events.guild.voice.GuildVoiceUpdateEvent
import net.dv8tion.jda.api.hooks.EventListener

class Player(
    val member: Member,
    val connection: DefaultWebSocketServerSession,
    val name: String,
    val color: String,
    var state: PlayerState,
) {
    constructor(member: Member, connection: DefaultWebSocketServerSession, color: String) : this(member, connection, member.effectiveName, color, PlayerState())
}

@Serializable
data class PlayerState(
    val position: Vector3,
    val rotation: RadianRotation,
    val cursor: Vector3?,
) {
    constructor() : this(Vector3(0.0, 0.0, 0.0), RadianRotation(0.0), null)
}

@Serializable
data class Vector3(val x: Double, val y: Double, val z: Double) {
    operator fun plus(vector: Vector3) = Vector3(x + vector.x, y + vector.y, z + vector.z)
}

@Serializable
data class RadianRotation(val radians: Double)

class Game(val channel: VoiceChannel) {
    val players = mutableListOf<Player>()

    suspend fun sendGameState() {
        @Serializable data class OfflinePlayerDTO(val name: String, val id: String, val avatarUrl: String)
        val availablePlayers = channel.members.map { OfflinePlayerDTO(it.effectiveName, it.id, it.effectiveAvatarUrl) }

        @Serializable data class GameStateDTO(val players: List<PlayerDTO>, val availablePlayers: List<OfflinePlayerDTO>)
        val dto = GameStateDTO(players.map { PlayerDTO(it) }, availablePlayers)

        players.forEach { it.connection.sendSerialized(dto) }
    }
}

val games = mutableListOf<Game>()

fun Application.configureGame() {
    routing {
        webSocket("game") {
            @Serializable data class PlayerJoinDTO(val joinCode: String)
            val dto = receiveDeserialized<PlayerJoinDTO>()

            val joinCode = JoinCodes.redeem(dto.joinCode) ?: return@webSocket close(CloseReason(CloseReason.Codes.VIOLATED_POLICY, "Invalid join code"))
            if (!joinCode.channel.members.contains(joinCode.member)) return@webSocket close(CloseReason(CloseReason.Codes.VIOLATED_POLICY, "Cannot join without being in the voice channel"))
            var game = games.find { it.channel == joinCode.channel }
            if (game == null) game = Game(joinCode.channel).also { games += it }
            if (game.players.any { it.member == joinCode.member }) return@webSocket close(CloseReason(CloseReason.Codes.VIOLATED_POLICY, "Already joined in another tab"))

            val color = listOf("green", "blue", "red", "yellow", "cyan", "magenta").first { color -> game.players.none { it.color == color } }
            val player = Player(joinCode.member, this, color).also { game.players += it }

            @Serializable data class SelfPlayerInfoDTO(val name: String, val id: String, val color: String)
            sendSerialized(SelfPlayerInfoDTO(joinCode.member.effectiveName, joinCode.member.id, color))

            game.sendGameState()

            try {
                while (true) {
                    player.state = receiveDeserialized<PlayerState>()
                    game.sendGameState()
                }
            } catch (e: ClosedReceiveChannelException) {
                game.players.removeAll { it.name == player.name }
                game.sendGameState()
            }
        }
    }
}

object GameBotListener : EventListener {
    override fun onEvent(event: GenericEvent) = runBlocking {
        if (event is GuildVoiceUpdateEvent) {
            val channelLeft = event.channelLeft?.asVoiceChannel().takeIf { Bot.channels.contains(it) }
            val channelJoined = event.channelJoined?.asVoiceChannel().takeIf { Bot.channels.contains(it) }
            if (channelLeft == null && channelJoined == null) return@runBlocking
            if (channelLeft != null) {
                games.forEach { game ->
                    val player = game.players.find { it.member == event.member } ?: return@forEach
                    game.players -= player
                    player.connection.close(CloseReason(CloseReason.Codes.VIOLATED_POLICY, "You left the voice channel"))
                    game.sendGameState()
                }
            }
            games.filter { it.channel == channelLeft || it.channel == channelJoined }.forEach { it.sendGameState() }
        }
    }
}