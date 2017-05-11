import React, { Component } from 'react';
import {
  ActivityIndicator,
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';

import { Chess } from 'chess.js';
import Icon from 'react-native-vector-icons/FontAwesome';

import { Button, Board } from '../components';

const HTTP_BASE_URL = 'https://en.lichess.org';
const WIN_KEY = 'win';
const INITIAL_STATE = {
  game: null,
  puzzleId: null,
  fen: null,
  userColor: '',
  victory: false,
  waiting: true,
  success: false,
  failed: false,
  resigned: false,
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
    const { puzzleData } = this.props.navigation.state.params;
    this.drawPuzzle(puzzleData);
  }

  getCurrentMoveIndex() {
    const { game } = this.state;
    return game.history().length - 2;
  }

  onMove = ({ from, to }) => {
    const {
      game,
      userColor,
      puzzleMoves,
      resigned,
      victory,
    } = this.state;
    const currentMoveIndex = this.getCurrentMoveIndex();
    const moveStr = `${from}${to}`;
    const moveLine = puzzleMoves[currentMoveIndex + 1];
    const gameOver = victory || resigned;

    game.move({
      from,
      to,
      promotion: game.QUEEN,
    });

    let nextIndex = currentMoveIndex + 1;
    if (!gameOver) {
      nextIndex += 1;
    }
    const nextMove = puzzleMoves[nextIndex];

    if (moveLine === WIN_KEY) {
      this.setState({
        victory: true,
        success: false,
        failed: false,
      });
    } else if (gameOver || game.turn() !== userColor) {
      this.setState({
        waiting: true,
      });

      // right move
      if (moveLine === moveStr) {
        if (nextMove) {
          if (nextMove === WIN_KEY) {
            this.setState({
              victory: true,
              success: false,
              failed: false,
            });
          }

          if (!gameOver) {
            this.lateMove(nextMove);
          }
        }

        this.setState({
          success: true,
          failed: false,
        });
      } else if (!gameOver) {
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
      .then(res => this.drawPuzzle(res.puzzle));
  }

  drawPuzzle(data) {
    const { id, fen, color, initialMove, lines } = data;
    const puzzleMoves = [];

    let nextObject = lines;
    while (true) {
      var nextKey = Object.keys(nextObject)[0];
      nextObject = nextObject[nextKey];

      puzzleMoves.push(nextKey);
      console.log(nextKey);

      if (nextObject === WIN_KEY) {
        puzzleMoves.push(WIN_KEY);
        break;
      }
    }

    this.setState(
      {
        game: new Chess(fen),
        puzzleId: id,
        fen,
        userColor: color === 'white' ? 'w' : 'b',
        waiting: true,
        puzzleMoves,
      },
      () => this.lateMove(initialMove),
    );
  }

  nextPuzzle = () => {
    this.setState(INITIAL_STATE);
    this.getNextTraining();
  };

  move = moveData => {
    const { game } = this.state;
    const { from, to } = this.parseMove(moveData);
    game.move({ from, to });
    if (this.board) {
      this.board.movePiece(to, from);
      this.setState({ waiting: false });
    }
  };

  lateMove = moveData => {
    setTimeout(
      () => {
        this.move(moveData);
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
    const { victory, resigned, game, userColor } = this.state;
    const turn = game.turn();
    if (
      victory ||
      resigned ||
      game.in_checkmate() === true ||
      game.in_draw() === true ||
      turn !== userColor ||
      piece.color !== userColor
    ) {
      return false;
    }
    return true;
  };

  resign = () => {
    this.setState({ resigned: true });
  };

  forward = () => {
    const currentMoveIndex = this.getCurrentMoveIndex();
    const { puzzleMoves } = this.state;
    const nextMove = puzzleMoves[currentMoveIndex + 1];
    if (nextMove && nextMove !== WIN_KEY) {
      this.move(nextMove);
    }
  };

  backward = () => {
    const currentMoveIndex = this.getCurrentMoveIndex();
    const { game } = this.state;

    if (currentMoveIndex > -1) {
      game.undo();
      this.board.undo();
    }
  };

  renderActionButton() {
    const { resigned, victory } = this.state;
    if (resigned || victory) {
      return <Button text={'Next Puzzle'} onPress={this.nextPuzzle} />;
    }

    return (
      <Button
        style={styles.resignButton}
        text={'Resign'}
        onPress={this.resign}
      />
    );
  }

  renderChessButtons() {
    const { resigned, victory } = this.state;
    if (resigned || victory) {
      return (
        <View style={styles.chessButtons}>
          <Icon.Button
            name="backward"
            size={30}
            color="white"
            backgroundColor="transparent"
            onPress={this.backward}
          />
          <Icon.Button
            name="forward"
            size={30}
            color="white"
            backgroundColor="transparent"
            onPress={this.forward}
          />
        </View>
      );
    }
    return null;
  }

  renderStatusText() {
    const {
      success,
      failed,
      victory,
      resigned,
    } = this.state;

    if (resigned) {
      return (
        <Text style={[styles.text, styles.failText]}>
          Puzzle failed
        </Text>
      );
    }

    if (victory) {
      return (
        <Text style={[styles.text, styles.successText]}>
          Victory!
        </Text>
      );
    }

    if (success) {
      return (
        <Text style={[styles.text, styles.successText]}>
          Best Move!{'\n'}
          Keep Going...
        </Text>
      );
    }

    if (failed) {
      return (
        <Text style={[styles.text, styles.failText]}>
          Wrong Move!{'\n'}
          But you can keep trying.
        </Text>
      );
    }

    return <Text>{'\n'}</Text>;
  }

  render() {
    const {
      puzzleId,
      fen,
      userColor,
      waiting,
      resigned,
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
          {!resigned &&
            !victory &&
            <Text style={styles.text}>
              {waiting ? 'Waiting' : 'Your Turn'}
            </Text>}
          {this.renderStatusText()}
        </View>
        {this.renderChessButtons()}
        {this.renderActionButton()}
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
  resignButton: {
    backgroundColor: 'red',
  },
  chessButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
