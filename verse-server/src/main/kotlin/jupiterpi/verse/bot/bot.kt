package jupiterpi.verse.bot

import net.dv8tion.jda.api.events.GenericEvent
import net.dv8tion.jda.api.events.message.MessageReceivedEvent
import net.dv8tion.jda.api.hooks.EventListener

val botListener = object : EventListener {
    override fun onEvent(event: GenericEvent) {
        when (event) {

            is MessageReceivedEvent -> {
                if (event.message.member!!.user.isBot) return
                event.message.reply("Hello there!").queue()
            }

            else -> {}
        }
    }
}