import { Component } from '@angular/core';
import {GamePlayer, SocketService} from "../../socket";
import {OfflinePlayer} from "../../socket";

@Component({
  selector: 'app-players-list',
  templateUrl: './players-list.component.html',
  styleUrls: ['./players-list.component.scss']
})
export class PlayersListComponent {
  selfPlayerId?: string;
  availablePlayers?: OfflinePlayer[];
  players?: GamePlayer[];

  constructor(socket: SocketService) {
    socket.getSelfPlayer().subscribe(selfPlayer => {
      this.selfPlayerId = selfPlayer.id;
    });
    socket.getGame().subscribe(game => {
      this.availablePlayers = game.availablePlayers;
      this.players = game.players;
    });
  }

  getPlayer(player: OfflinePlayer) {
    const results = this.players!.filter(p => p.id == player.id);
    return results.length > 0 ? results[0] : null;
  }
}
