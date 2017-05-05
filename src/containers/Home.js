import React, { Component } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { Button } from '../components';

export default class HomeScreen extends Component {
  static navigationOptions = {
    title: 'Home',
  };

  componentDidMount() {
    Linking.getInitialURL().then(url => {
      if (url) {
        this.handleOpenURL(url);
      }
    });

    Linking.addEventListener('url', event => this.handleOpenURL(event.url));
    // sets session cookie
    fetch('https://en.lichess.org/account/info');
  }

  handleOpenURL(url) {
    const { navigate } = this.props.navigation;
    const id = url.replace('lichess599://', '');

    navigate('PlayerVsFriend', { gameId: id });
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
        <Button
          style={styles.button}
          text={'Play with a friend'}
          onPress={() => navigate('PlayerVsFriend')}
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
