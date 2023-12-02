package jupiterpi

import io.ktor.http.*
import io.ktor.serialization.kotlinx.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.plugins.cors.routing.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.sessions.*
import io.ktor.server.websocket.*
import kotlinx.coroutines.channels.ClosedReceiveChannelException
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.time.Duration

fun main() {
    embeddedServer(Netty, port = 8080, host = "0.0.0.0", module = Application::module)
        .start(wait = true)
}

val players = mutableListOf<Player>()
val connections = mutableListOf<DefaultWebSocketServerSession>()
suspend fun sendGameState() = connections.forEach { it.sendSerialized(players) }

@Serializable
data class Player(
    val name: String,
    val color: String,
    var position: Vector3,
    var rotation: RadianRotation,
) {
    constructor(name: String, color: String) : this(name, color, Vector3(0.0, 0.0, 0.0), RadianRotation(0.0))
}

@Serializable
data class Vector3(val x: Double, val y: Double, val z: Double) {
    operator fun plus(vector: Vector3) = Vector3(x + vector.x, y + vector.y, z + vector.z)
}

@Serializable
data class RadianRotation(val radians: Double)

fun Application.module() {
    install(ContentNegotiation) {
        json()
    }

    install(CORS) {
        allowMethod(HttpMethod.Options)
        allowMethod(HttpMethod.Get)
        allowMethod(HttpMethod.Post)
        allowMethod(HttpMethod.Put)
        allowMethod(HttpMethod.Delete)
        allowMethod(HttpMethod.Patch)

        allowHeader(HttpHeaders.ContentType)
        allowHeader(HttpHeaders.Authorization)

        anyHost()
    }

    install(WebSockets) {
        pingPeriod = Duration.ofSeconds(15)
        timeout = Duration.ofSeconds(15)
        maxFrameSize = Long.MAX_VALUE
        masking = false
        contentConverter = KotlinxWebsocketSerializationConverter(Json)
    }

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
            @Serializable data class DTO(val name: String, val color: String)
            val dto = call.receive<DTO>()

            call.sessions.set(PlayerSession(dto.name, dto.color))
            call.respondText("Logged in", status = HttpStatusCode.OK)
        }
        get("session") {
            val session = call.sessions.get<PlayerSession>() ?: return@get call.respondText("Not logged in", status = HttpStatusCode.NotFound)
            call.respond(session)
        }
        webSocket("game") {
            @Serializable data class PlayerJoinDTO(val name: String, val color: String)
            val dto = receiveDeserialized<PlayerJoinDTO>()

            val player = Player(dto.name, dto.color).also { players += it }
            connections += this
            sendGameState()

            @Serializable
            data class PlayerMovementDTO(val position: Vector3, val rotation: RadianRotation)
            try {
                while (true) {
                    val movement = receiveDeserialized<PlayerMovementDTO>()
                    player.position = movement.position
                    player.rotation = movement.rotation
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
