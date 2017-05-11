import React, { Component } from 'react';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';

import { Chess } from 'chess.js';
import Sound from 'react-native-sound';

import { Board, Clock } from '../components';

const dongSound = new Sound('dong.mp3', Sound.MAIN_BUNDLE);

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
      victor: '',
    };
  }

  componentDidMount() {
    this.createGame();
  }

  componentWillUnmount() {
    clearInterval(this.interval);
    this.ws = null;
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
      } else if (data.t === 'end') {
        dongSound.play();
        this.setState({
          victor: data.d,
        });
        this.ws = null;
      }

      if (moveData) {
        const { uci, clock } = moveData;
        const castle = moveData.castle;
        let from = uci.substring(0, 2);
        let to = uci.substring(2, 4);

        if (castle && castle.king) {
          from = castle.king[0];
          to = castle.king[1];
        }

        this.board.movePiece(to, from);
        if (clock) {
          this.latestClock = clock;
        }
      }
    };

    this.ws.onerror = e => {
      // an error occurred
      console.log(e.message);
    };

    this.ws.onopen = () => {
      this.wsReady = true;
      dongSound.play();
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
    if (this.wsReady && this.ws) {
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
    const { game, userColor, victor } = this.state;
    const turn = game.turn();
    if (
      !this.wsReady ||
      victor ||
      game.in_checkmate() === true ||
      game.in_draw() === true ||
      turn !== userColor ||
      piece.color !== userColor
    ) {
      return false;
    }
    return true;
  };

  renderVictorText() {
    const { victor } = this.state;

    if (victor) {
      return (
        <Text style={styles.statusText}>
          Game over, {victor} is victorious!
        </Text>
      );
    }
    return null;
  }

  render() {
    const {
      game,
      initialized,
      fen,
      userColor,
      whiteClock,
      blackClock,
      victor,
    } = this.state;
    const isReverseBoard = userColor === 'b';
    const turn = game.turn();
    const historyLength = game.history().length;
    const whiteTurn = historyLength > 0 && turn === 'w' && !victor;
    const blackTurn = historyLength > 1 && turn === 'b' && !victor;

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
        {this.renderVictorText()}
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
  statusText: {
    color: 'red',
    fontSize: 16,
    margin: 4,
  },
});
