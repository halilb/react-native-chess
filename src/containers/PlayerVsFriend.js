import React, { Component } from 'react';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';

import { Chess } from 'chess.js';
import Share from 'react-native-share';

import { Button, Board } from '../components';

const HTTP_BASE_URL = 'https://en.lichess.org';
const SOCKET_BASE_URL = 'wss://socket.lichess.org';
const URL_SCHEME = 'lichess599://';

export default class PlayerVsFriend extends Component {
  static navigationOptions = {
    title: 'Play with a friend',
  };

  constructor(props) {
    super(props);

    this.clientId = Math.random().toString(36).substring(2);
    this.state = {
      initialized: false,
      invitationId: '',
      game: new Chess(),
      gameStarted: false,
      userColor: '',
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
          clearInterval(this.intervalId);
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
    this.ws = new WebSocket(socketUrl);

    this.ws.onmessage = e => {
      // a message was received
      console.log(`received: ${e.data}`);
      const data = JSON.parse(e.data);

      if (data.t === 'reload' && data.v > 1 && !this.gameFetched) {
        this.gameFetched = true;

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
                const socketUrl = `${SOCKET_BASE_URL}${res.url.socket}?sri=${this.clientId}&mobile=1`;
                clearInterval(this.intervalId);
                this.createSocket(socketUrl);
                this.setState({ gameStarted: true });
              }
            });
        });
      }

      let uci;
      if (data.t === 'move' && data.v > game.history().length) {
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

    this.ws.onclose = e => {
      console.log(e.code, e.reason);
    };

    this.ws.onopen = () => {
      console.log('ws open');
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
    const str = JSON.stringify(obj);
    console.log(`sending: ${str}`);
    this.ws.send(str);
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
  };

  shouldSelectPiece = piece => {
    const { game, userColor } = this.state;
    const turn = game.turn();
    if (
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
    const { initialized, fen, userColor } = this.state;

    if (!initialized) {
      return <ActivityIndicator style={styles.container} animating />;
    }

    return (
      <View style={styles.container}>
        <Board
          ref={board => this.board = board}
          fen={fen}
          color={userColor}
          shouldSelectPiece={this.shouldSelectPiece}
          onMove={this.onMove}
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
    backgroundColor: '#EEEEEE',
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
