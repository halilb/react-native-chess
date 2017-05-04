import React, { Component } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '../components';

export default class HomeScreen extends Component {
  static navigationOptions = {
    title: 'Home',
  };

  componentDidMount() {
    // sets session cookie
    fetch('https://en.lichess.org/account/info');
  }

  render() {
    const { navigate } = this.props.navigation;

    return (
      <View style={styles.container}>
        <Button
          style={styles.button}
          text={'Training'}
          onPress={() => navigate('Training')}
        />
        <Button
          style={styles.button}
          text={'Play with the machine'}
          onPress={() => navigate('PlayerVsAI')}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 32,
  },
  button: {
    marginTop: 16,
  },
});
