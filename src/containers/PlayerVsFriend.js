import React, { Component } from 'react';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';

import { Chess } from 'chess.js';
import Share from 'react-native-share';

import { Button, Board, Clock } from '../components';

const HTTP_BASE_URL = 'https://en.lichess.org';
const SOCKET_BASE_URL = 'wss://socket.lichess.org';
const URL_SCHEME = 'lichess599://';

export default class PlayerVsFriend extends Component {
  static navigationOptions = {
    title: 'Play with a friend',
  };

  constructor(props) {
    super(props);

    const { time } = this.props.navigation.state.params;
    this.latestClock = {
      white: time,
      black: time,
    };

    this.clientId = Math.random().toString(36).substring(2);
    this.state = {
      initialized: false,
      invitationId: '',
      game: new Chess(),
      gameStarted: false,
      userColor: '',
      whiteClock: time,
      blackClock: time,
    };
  }

  componentDidMount() {
    const params = this.props.navigation.state.params || {};
    const { gameId, playConfig } = params;

    if (gameId) {
      this.joinGame(gameId);
    } else {
      this.createGame(playConfig);
    }
  }

  createGame(playConfig) {
    fetch(`${HTTP_BASE_URL}/setup/friend`, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.lichess.v2+json',
        'Content-Type': 'application/json',
      },
      body: playConfig,
    })
      .then(res => res.json())
      .then(res => {
        const gameId = res.challenge.id;
        const socketUrl = `${SOCKET_BASE_URL}/challenge/${gameId}/socket/v2?sri=${this.clientId}&mobile=1`;
        this.createSocket(socketUrl, gameId);
        this.setState({
          initialized: true,
          invitationId: gameId,
          userColor: res.challenge.color === 'white' ? 'w' : 'b',
        });
      });
  }

  joinGame(gameId) {
    fetch(`${HTTP_BASE_URL}/challenge/${gameId}/accept`, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.lichess.v2+json',
        'Content-Type': 'application/json',
      },
    })
      .then(res => res.json())
      .then(res => {
        if (res.error) {
          alert(res.error);
        } else {
          const socketUrl = `${SOCKET_BASE_URL}${res.url.socket}?sri=${this.clientId}&mobile=1`;
          this.createSocket(socketUrl);
          this.setState({
            initialized: true,
            gameStarted: true,
            userColor: res.player.color === 'white' ? 'w' : 'b',
          });
        }
      });
  }

  createSocket = (socketUrl, socketId) => {
    console.log('socket: ' + socketUrl);
    const { game } = this.state;
    this.wsReady = false;
    this.ws = new WebSocket(socketUrl);
    clearInterval(this.intervalId);

    this.ws.onmessage = e => {
      // a message was received
      console.log(`received: ${e.data}`);
      const data = JSON.parse(e.data);

      if (data.t === 'reload' && data.v > 1 && !this.gameFetched) {
        // this sets cookie
        fetch(`${HTTP_BASE_URL}/challenge/${socketId}`).then(() => {
          fetch(`${HTTP_BASE_URL}/${socketId}`, {
            headers: {
              Accept: 'application/vnd.lichess.v2+json',
              'Content-Type': 'application/json',
            },
          })
            .then(res => res.json())
            .then(res => {
              if (res.url && res.url.socket) {
                this.gameFetched = true;

                const socketUrl = `${SOCKET_BASE_URL}${res.url.socket}?sri=${this.clientId}&mobile=1`;
                this.createSocket(socketUrl);

                this.setState({
                  gameStarted: true,
                  userColor: res.player.color === 'white' ? 'w' : 'b',
                });
              }
            });
        });
      }

      let moveData;
      if (data.t === 'move' && data.v > game.history().length) {
        moveData = data.d;
      } else if (data.t === 'b') {
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

    this.ws.onerror = e => {
      // an error occurred
      console.log(e.message);
    };

    this.ws.onclose = e => {
      console.log(e.code, e.reason);
    };

    this.ws.onopen = () => {
      console.log('ws open');
      this.wsReady = true;
      // ping every second
      this.intervalId = setInterval(
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

  share = () => {
    const { invitationId } = this.state;
    Share.open({
      title: "Let's play chess",
      url: `${URL_SCHEME}${invitationId}`,
    });
  };

  renderInvitationMessage() {
    const { invitationId, gameStarted } = this.state;
    if (invitationId && !gameStarted) {
      return (
        <View style={styles.fullScreen}>
          <View style={styles.invitationBox}>
            <Text style={[styles.text, styles.headline]}>
              Waiting for a friend!
            </Text>
            <Text style={styles.text}>
              To invite someone to play, give this URL
            </Text>
            <Text style={[styles.text, styles.urlText]}>
              {`${URL_SCHEME}${invitationId}`}
            </Text>
            <Text style={styles.text}>
              The first person to come to this URL will play with you.
            </Text>
            <Button text={'Share game URL'} onPress={this.share} />
          </View>
        </View>
      );
    }
  }

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
        {this.renderInvitationMessage()}
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
    backgroundColor: 'black',
  },
  fullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  invitationBox: {
    backgroundColor: 'white',
    padding: 16,
  },
  text: {
    fontSize: 12,
    marginVertical: 8,
    textAlign: 'center',
  },
  urlText: {
    backgroundColor: 'grey',
    paddingVertical: 16,
    color: 'white',
  },
  headline: {
    fontSize: 16,
    fontWeight: 'bold',
    margin: 0,
  },
});
