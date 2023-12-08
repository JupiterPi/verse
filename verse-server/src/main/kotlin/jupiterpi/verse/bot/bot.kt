package jupiterpi.verse.bot

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import jupiterpi.verse.JoinCodes
import jupiterpi.verse.hostUrl
import jupiterpi.verse.jda
import net.dv8tion.jda.api.entities.channel.ChannelType
import net.dv8tion.jda.api.entities.channel.concrete.VoiceChannel
import net.dv8tion.jda.api.events.GenericEvent
import net.dv8tion.jda.api.events.channel.ChannelCreateEvent
import net.dv8tion.jda.api.events.channel.ChannelDeleteEvent
import net.dv8tion.jda.api.events.interaction.component.ButtonInteractionEvent
import net.dv8tion.jda.api.events.session.ReadyEvent
import net.dv8tion.jda.api.hooks.EventListener
import net.dv8tion.jda.api.interactions.components.buttons.Button

private const val BUTTON_JOIN_ID = "verse-join"

object Bot {
    val channels = mutableListOf<VoiceChannel>()

    object Listener : EventListener {
        override fun onEvent(event: GenericEvent) {
            when (event) {

                is ReadyEvent -> checkInitialChannels()
                is ChannelCreateEvent -> checkCreatedChannel(event)
                is ChannelDeleteEvent -> checkDeletedChannel(event)

                is ButtonInteractionEvent -> handleButtonClick(event)

                else -> {}
            }
        }

        private fun checkInitialChannels() {
            jda.guilds.flatMap { it.voiceChannels }.forEach { checkDiscoveredChannel(it) }
        }
        private fun checkCreatedChannel(event: ChannelCreateEvent) {
            if (event.channelType != ChannelType.VOICE) return
            checkDiscoveredChannel(event.channel.asVoiceChannel())
        }
        private fun checkDeletedChannel(event: ChannelDeleteEvent)
        = channels.remove(event.channel.asVoiceChannel())

        private fun checkDiscoveredChannel(channel: VoiceChannel) {
            if (channel.parentCategory?.name != "verse") return
            channels += channel

            channel.getHistoryFromBeginning(100).queue { history ->
                if (history.retrievedHistory.none { it.member!!.user == jda.selfUser }) {
                    channel.sendMessage("Welcome to verse! Click below to join:")
                        .addActionRow(Button.success(BUTTON_JOIN_ID, "Join verse"))
                        .queue()
                }
            }
        }

        private fun handleButtonClick(event: ButtonInteractionEvent) {
            if (event.button.id != BUTTON_JOIN_ID) return
            val code = JoinCodes.create(event.member!!, event.channel.asVoiceChannel())
            event.reply("$hostUrl/join/$code\n(don't share this link with others!)")
                .setEphemeral(true)
                .queue()
        }

        // to save state: .addFiles(FileUpload.fromData(stateStr.toByteArray(), "${channel.name}-${Date().time}.verse"))
        // to download state: .attachments[0].proxy.download().get().reader().readText()
    }
}

fun Application.configureBotLinkRedirect() {
    routing {
        get("/join/{code}") {
            val code = call.parameters["code"] ?: return@get call.respondText("Invalid code", status = HttpStatusCode.Unauthorized)
            call.respondRedirect("http://localhost:4200/join?t=$code")
        }
    }
}