import React, { Component } from 'react';
import {
  ActivityIndicator,
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';

import { Chess } from 'chess.js';

import { Board } from '../components';

const HTTP_BASE_URL = 'https://en.lichess.org';
const INITIAL_STATE = {
  game: null,
  puzzleId: null,
  fen: null,
  userColor: '',
  lines: {},
  victory: false,
  waiting: true,
  success: false,
  failed: false,
};

export default class Training extends Component {
  static navigationOptions = {
    title: 'Training',
  };

  constructor(props) {
    super(props);

    this.state = {
      ...INITIAL_STATE,
    };
  }

  componentDidMount() {
    this.getNextTraining();
  }

  onMove = ({ from, to }) => {
    const { game, userColor, lines } = this.state;
    const moveStr = `${from}${to}`;
    const moveLine = lines[moveStr];

    game.move({
      from,
      to,
    });

    if (moveLine === 'win') {
      this.setState({
        victory: true,
        success: false,
        failed: false,
      });
    } else if (game.turn() !== userColor) {
      this.setState({
        waiting: true,
      });

      // right move
      if (moveLine) {
        const nextMove = Object.keys(moveLine)[0];
        this.lateMove(nextMove);
        this.setState({
          lines: moveLine[nextMove],
          success: true,
          failed: false,
        });
      } else {
        // undo
        this.setState({
          success: false,
          failed: true,
        });

        setTimeout(
          () => {
            game.undo();
            this.board.undo();
            this.setState({ waiting: false });
          },
          1000,
        );
      }
    }
  };

  getNextTraining() {
    fetch(`${HTTP_BASE_URL}/training/new?_${Date.now()}`, {
      headers: {
        Accept: 'application/vnd.lichess.v2+json',
        'X-Requested-With': 'XMLHttpRequest',
      },
    })
      .then(res => res.json())
      .then(res => {
        const { id, fen, color, initialMove, lines } = res.puzzle;

        this.setState(
          {
            game: new Chess(fen),
            puzzleId: id,
            fen,
            userColor: color === 'white' ? 'w' : 'b',
            waiting: true,
            lines,
          },
          () => this.lateMove(initialMove),
        );
      });
  }

  nextPuzzle = () => {
    this.setState(INITIAL_STATE);
    this.getNextTraining();
  };

  lateMove = move => {
    const { game } = this.state;

    setTimeout(
      () => {
        const { from, to } = this.parseMove(move);
        game.move({ from, to });
        this.board.movePiece(to, from);
        this.setState({ waiting: false });
      },
      1000,
    );
  };

  parseMove(str) {
    const from = str.substring(0, 2);
    const to = str.substring(2, 4);
    return {
      from,
      to,
    };
  }

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

  render() {
    const {
      puzzleId,
      fen,
      userColor,
      waiting,
      success,
      failed,
      victory,
    } = this.state;

    if (!puzzleId) {
      return <ActivityIndicator style={styles.container} animating />;
    }

    return (
      <View style={styles.container}>
        <Text style={styles.text}>
          {`Find the best move for ${userColor === 'w' ? 'white' : 'black'}.`}
        </Text>
        <Board
          ref={board => this.board = board}
          key={`puzzle_${puzzleId}`}
          style={styles.board}
          fen={fen}
          color={userColor}
          shouldSelectPiece={this.shouldSelectPiece}
          onMove={this.onMove}
        />
        <View style={styles.bottom}>
          <Text style={styles.text}>
            {waiting ? 'Waiting' : 'Your Turn'}
          </Text>
          {success &&
            <Text style={[styles.text, styles.successText]}>
              Best Move!{'\n'}
              Keep Going...
            </Text>}
          {victory &&
            <Text style={[styles.text, styles.successText]}>
              Victory!
            </Text>}
          {failed &&
            <Text style={[styles.text, styles.failText]}>
              Wrong Move!{'\n'}
              But you can keep trying.
            </Text>}
        </View>
        <TouchableOpacity onPress={this.nextPuzzle}>
          <View style={styles.button}>
            <Text style={styles.text}>Next Puzzle</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: 'black',
  },
  text: {
    color: 'white',
    fontSize: 14,
    marginVertical: 16,
  },
  board: {
    flex: 0,
    alignSelf: 'center',
  },
  bottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  successText: {
    color: '#759900',
  },
  failText: {
    color: '#DC322F',
  },
  button: {
    borderRadius: 3,
    backgroundColor: 'red',
    alignItems: 'center',
  },
});
