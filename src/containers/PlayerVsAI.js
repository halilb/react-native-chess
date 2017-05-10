import React, { Component } from 'react';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';

import { Chess } from 'chess.js';

import { Board, Clock } from '../components';

export default class PlayerVsLichessAI extends Component {
  static navigationOptions = {
    title: 'Play with the machine',
  };

  constructor(props) {
    super(props);

    const { time } = this.props.navigation.state.params;
    this.latestClock = {
      white: time,
      black: time,
    };

    this.state = {
      initialized: false,
      userColor: '',
      game: new Chess(),
      whiteClock: time,
      blackClock: time,
    };
  }

  componentDidMount() {
    this.createGame();
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  createGame() {
    const params = this.props.navigation.state.params || {};
    const { playConfig } = params;

    fetch('https://en.lichess.org/setup/ai', {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.lichess.v2+json',
        'Content-Type': 'application/json',
      },
      body: playConfig,
    })
      .then(res => res.json())
      .then(this.onGameCreated);
  }

  onGameCreated = res => {
    const { game } = this.state;
    const socketUrl = res.url.socket;
    const clientId = Math.random().toString(36).substring(2);
    clearInterval(this.interval);
    this.wsReady = false;
    this.ws = new WebSocket(
      `wss://socket.lichess.org${socketUrl}?sri=${clientId}&mobile=1`,
    );

    this.ws.onmessage = e => {
      // a message was received
      console.log(`received: ${e.data}`);
      const data = JSON.parse(e.data);

      let moveData;
      if (data.t === 'move' && data.v > game.history().length) {
        moveData = data.d;
      } else if (data.t === 'b') {
        // b for batch
        const first = data.d[0];
        if (first && first.d.status && first.d.status.name === 'mate') {
          moveData = first.d;
        }
      }

      if (moveData) {
        const { uci, clock } = moveData;
        const from = uci.substring(0, 2);
        const to = uci.substring(2, 4);
        this.board.movePiece(to, from);
        if (clock) {
          this.latestClock = clock;
        }
      }
    };

    this.ws.onclose = e => {
      console.log(e.code, e.reason);
      this.createSocket(socketUrl, socketId);
    };

    this.ws.onerror = e => {
      // an error occurred
      console.log(e.message);
    };

    this.ws.onopen = () => {
      this.wsReady = true;
      this.setState({
        initialized: true,
        userColor: res.player.color === 'white' ? 'w' : 'b',
      });
      console.log('ws open');
      // ping every second
      this.interval = setInterval(
        () => {
          this.sendMessage({
            t: 'p',
            v: game.history().length,
          });
        },
        1000,
      );
    };
  };

  sendMessage(obj) {
    if (this.wsReady) {
      const str = JSON.stringify(obj);
      console.log(`sending: ${str}`);
      this.ws.send(str);
    }
  }

  onMove = ({ from, to }) => {
    const { game, userColor } = this.state;
    game.move({
      from,
      to,
      promotion: game.QUEEN,
    });

    if (game.turn() !== userColor) {
      this.sendMessage({
        t: 'move',
        d: {
          from,
          to,
        },
      });
    }

    this.setState({
      whiteClock: this.latestClock.white,
      blackClock: this.latestClock.black,
    });
  };

  shouldSelectPiece = piece => {
    const { game, userColor } = this.state;
    const turn = game.turn();
    if (
      !this.wsReady ||
      game.in_checkmate() === true ||
      game.in_draw() === true ||
      turn !== userColor ||
      piece.color !== userColor
    ) {
      return false;
    }
    return true;
  };

  render() {
    const {
      game,
      initialized,
      fen,
      userColor,
      whiteClock,
      blackClock,
    } = this.state;
    const isReverseBoard = userColor === 'b';
    const turn = game.turn();
    const historyLength = game.history().length;
    const whiteTurn = historyLength > 0 && turn === 'w';
    const blackTurn = historyLength > 1 && turn === 'b';

    if (!initialized) {
      return <ActivityIndicator style={styles.container} animating />;
    }

    return (
      <View style={styles.container}>
        <Clock
          time={isReverseBoard ? whiteClock : blackClock}
          enabled={isReverseBoard ? whiteTurn : blackTurn}
        />
        <Board
          ref={board => this.board = board}
          fen={fen}
          color={userColor}
          shouldSelectPiece={this.shouldSelectPiece}
          onMove={this.onMove}
        />
        <Clock
          time={isReverseBoard ? blackClock : whiteClock}
          enabled={isReverseBoard ? blackTurn : whiteTurn}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'black',
  },
});
