package jupiterpi.verse

import io.ktor.http.*
import io.ktor.serialization.kotlinx.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.plugins.cors.routing.*
import io.ktor.server.routing.*
import io.ktor.server.websocket.*
import jupiterpi.verse.bot.Bot
import jupiterpi.verse.game.GameBotListener
import jupiterpi.verse.game.gameSocket
import kotlinx.serialization.json.Json
import net.dv8tion.jda.api.JDA
import net.dv8tion.jda.api.JDABuilder
import java.time.Duration

object Config {
    val port get() = System.getenv("port")?.toInt() ?: 80
    val botToken get() = System.getenv("bot-token") ?: throw Exception("Need to specify the `bot-token` environment variable!")

    private val joinLinkRoot = System.getenv("join-link-root") ?: throw Exception("Need to specify the `join-link-root` environment variable!")
    fun joinLink(joinCode: String) = "$joinLinkRoot/join?t=$joinCode"
}

lateinit var jda: JDA
fun main() {
    embeddedServer(Netty, Config.port, module = Application::module).start(wait = false)

    jda = JDABuilder.createDefault(Config.botToken)
        .addEventListeners(Bot.Listener)
        .addEventListeners(GameBotListener)
        .build()
}

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

    routing {
        route("api/game") {
            gameSocket()
        }
    }
}