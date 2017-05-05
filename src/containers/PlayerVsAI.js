import React, { Component } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

import { Chess } from 'chess.js';

import { Board } from '../components';

export default class PlayerVsLichessAI extends Component {
  static navigationOptions = {
    title: 'Play with the machine',
  };

  constructor(props) {
    super(props);

    this.state = {
      initialized: false,
      game: new Chess(),
    };
  }

  componentDidMount() {
    this.createGame();
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  createGame() {
    fetch('https://en.lichess.org/setup/ai', {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.lichess.v2+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        variant: '1',
        timeMode: '1',
        days: '2',
        time: '60',
        increment: '0',
        level: '3',
        color: 'white',
      }),
    })
      .then(res => res.json())
      .then(this.onGameCreated);
  }

  onGameCreated = res => {
    const { game } = this.state;
    const socketUrl = res.url.socket;
    const clientId = Math.random().toString(36).substring(2);
    this.ws = new WebSocket(
      `wss://socket.lichess.org${socketUrl}?sri=${clientId}&mobile=1`,
    );

    this.ws.onmessage = e => {
      // a message was received
      console.log(`received: ${e.data}`);
      const data = JSON.parse(e.data);

      let uci;
      if (data.t === 'move' && data.d.ply % 2 === 0) {
        uci = data.d.uci;
      } else if (data.t === 'b') {
        const first = data.d[0];
        if (first && first.d.status && first.d.status.name === 'mate') {
          uci = first.d.uci;
        }
      }

      if (uci) {
        const from = uci.substring(0, 2);
        const to = uci.substring(2, 4);
        this.board.movePiece(to, from);
      }
    };

    this.ws.onerror = e => {
      // an error occurred
      console.log(e.message);
    };

    this.ws.onopen = () => {
      this.setState({
        initialized: true,
      });
      console.log('ws open');
      // ping every second
      this.interval = setInterval(
        () => {
          this.sendMessage({ t: 'p', v: 2 });
        },
        1000,
      );
    };
  };

  sendMessage(obj) {
    const str = JSON.stringify(obj);
    console.log(`sending: ${str}`);
    this.ws.send(str);
  }

  onMove = ({ from, to }) => {
    const { game } = this.state;
    game.move({
      from,
      to,
      promotion: game.QUEEN,
    });

    if (game.turn() === 'b') {
      this.sendMessage({
        t: 'move',
        d: {
          from,
          to,
        },
      });
    }
  };

  shouldSelectPiece = piece => {
    const { game } = this.state;
    const turn = game.turn();
    if (
      game.in_checkmate() === true ||
      game.in_draw() === true ||
      turn !== 'w' ||
      piece.color !== 'w'
    ) {
      return false;
    }
    return true;
  };

  render() {
    const { initialized, fen } = this.state;

    if (!initialized) {
      return <ActivityIndicator style={styles.container} animating />;
    }

    return (
      <View style={styles.container}>
        <Board
          ref={board => this.board = board}
          fen={fen}
          shouldSelectPiece={this.shouldSelectPiece}
          onMove={this.onMove}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#EEEEEE',
  },
});
