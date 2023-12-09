package jupiterpi.verse.game

import kotlinx.serialization.Serializable

@Serializable
data class PlayerDTO(
    val name: String,
    val id: String,
    val color: String,
    val state: PlayerState,
) {
    constructor(player: Player) : this(player.name, player.member.id, player.color, player.state)
}