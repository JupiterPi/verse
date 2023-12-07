package jupiterpi.verse.game

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.websocket.*
import jupiterpi.verse.JoinCodes
import kotlinx.coroutines.channels.ClosedReceiveChannelException
import kotlinx.serialization.Serializable
import net.dv8tion.jda.api.entities.channel.concrete.VoiceChannel

@Serializable
data class Player(
    val name: String,
    val color: String,
    var state: PlayerState,
) {
    constructor(name: String, color: String) : this(name, color, PlayerState())
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
    val connections = mutableListOf<DefaultWebSocketServerSession>()
    suspend fun sendGameState() = connections.forEach { it.sendSerialized(players) }
}

val games = mutableListOf<Game>()

fun Application.configureGame() {
    routing {
        webSocket("game") {
            @Serializable
            data class PlayerJoinDTO(val joinCode: String)
            val dto = receiveDeserialized<PlayerJoinDTO>()

            val joinCode = JoinCodes.redeem(dto.joinCode) ?: return@webSocket call.respondText("Invalid code", status = HttpStatusCode.Unauthorized)
            var game = games.find { it.channel == joinCode.channel }
            if (game == null) game = Game(joinCode.channel).also { games += it }

            sendSerialized(mapOf("name" to joinCode.discordUser.effectiveName))
            val color = listOf("red", "green", "blue", "yellow", "cyan", "magenta").first { color -> game.players.none { it.color == color } }
            val player = Player(joinCode.discordUser.effectiveName, color).also { game.players += it }
            game.connections += this
            game.sendGameState()

            try {
                while (true) {
                    player.state = receiveDeserialized<PlayerState>()
                    game.sendGameState()
                }
            } catch (e: ClosedReceiveChannelException) {
                game.players.removeAll { it.name == player.name }
                game.connections -= this
                game.sendGameState()
            }
        }
    }
}