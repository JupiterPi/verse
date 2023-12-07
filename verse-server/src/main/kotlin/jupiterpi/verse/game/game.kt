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
    suspend fun sendGameState() = players.forEach { it.connection.sendSerialized(players.map { PlayerDTO(it) }) }
}

val games = mutableListOf<Game>()

fun Application.configureGame() {
    routing {
        webSocket("game") {
            @Serializable
            data class PlayerJoinDTO(val joinCode: String)
            val dto = receiveDeserialized<PlayerJoinDTO>()

            val joinCode = JoinCodes.redeem(dto.joinCode) ?: return@webSocket close(CloseReason(CloseReason.Codes.VIOLATED_POLICY, "Invalid join code"))
            if (!joinCode.channel.members.contains(joinCode.member)) return@webSocket close(CloseReason(CloseReason.Codes.VIOLATED_POLICY, "Cannot join without being in the voice channel"))
            var game = games.find { it.channel == joinCode.channel }
            if (game == null) game = Game(joinCode.channel).also { games += it }

            sendSerialized(mapOf("name" to joinCode.member.effectiveName))
            val color = listOf("red", "green", "blue", "yellow", "cyan", "magenta").first { color -> game.players.none { it.color == color } }
            val player = Player(joinCode.member, this, color).also { game.players += it }
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
    override fun onEvent(event: GenericEvent) {
        if (event is GuildVoiceUpdateEvent) {
            val channel = event.channelLeft?.asVoiceChannel() ?: return
            if (!Bot.channels.contains(channel)) return
            games.forEach { game ->
                val playerLeaving = game.players.find { it.member == event.member }
                if (playerLeaving != null) {
                    game.players -= playerLeaving
                    runBlocking {
                        playerLeaving.connection.close(CloseReason(CloseReason.Codes.VIOLATED_POLICY, "You left the voice channel"))
                    }
                }
            }
        }
    }
}