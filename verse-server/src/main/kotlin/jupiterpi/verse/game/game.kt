package jupiterpi.verse.game

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.sessions.*
import io.ktor.server.websocket.*
import kotlinx.coroutines.channels.ClosedReceiveChannelException
import kotlinx.serialization.Serializable

val players = mutableListOf<Player>()
val connections = mutableListOf<DefaultWebSocketServerSession>()
suspend fun sendGameState() = connections.forEach { it.sendSerialized(players) }

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

fun Application.configureGame() {
    @Serializable
    data class PlayerSession(
        val name: String,
        val color: String,
    )

    install(Sessions) {
        cookie<PlayerSession>("player")
    }

    routing {
        post("login") {
            @Serializable
            data class DTO(val name: String, val color: String)
            val dto = call.receive<DTO>()

            call.sessions.set(PlayerSession(dto.name, dto.color))
            call.respondText("Logged in", status = HttpStatusCode.OK)
        }
        get("session") {
            val session = call.sessions.get<PlayerSession>() ?: return@get call.respondText("Not logged in", status = HttpStatusCode.NotFound)
            call.respond(session)
        }
        webSocket("game") {
            @Serializable
            data class PlayerJoinDTO(val name: String, val color: String)
            val dto = receiveDeserialized<PlayerJoinDTO>()

            val player = Player(dto.name, dto.color).also { players += it }
            connections += this
            sendGameState()

            try {
                while (true) {
                    player.state = receiveDeserialized<PlayerState>()
                    sendGameState()
                }
            } catch (e: ClosedReceiveChannelException) {
                players.removeAll { it.name == player.name }
                connections -= this
                sendGameState()
            }
        }
    }
}