import React, { Component } from 'react';
import { Slider, Text, Linking, StyleSheet, View } from 'react-native';

import Modal from 'react-native-modalbox';
import SegmentedControlTab from 'react-native-segmented-control-tab';

import { Button } from '../components';

const COLORS = ['white', 'random', 'black'];

export default class HomeScreen extends Component {
  static navigationOptions = {
    title: 'Home',
  };

  constructor(props) {
    super(props);

    this.state = {
      modalDisplayed: false,
      selectedColorIndex: 1,
      selectedTimeIndex: 0,
      totalMinutes: 5,
      incrementSeconds: 8,
      aiLevel: 3,
      playVsAI: false,
    };
  }

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

  displayModal(playVsAI) {
    this.setState({
      modalDisplayed: true,
      playVsAI,
    });
  }

  create = () => {
    const { navigate } = this.props.navigation;
    const {
      selectedColorIndex,
      selectedTimeIndex,
      modalDisplayed,
      totalMinutes,
      incrementSeconds,
      aiLevel,
      playVsAI,
    } = this.state;
    const playConfig = JSON.stringify({
      variant: 1,
      timeMode: selectedTimeIndex,
      days: '2',
      time: `${totalMinutes}`,
      increment: `${incrementSeconds}`,
      level: `${aiLevel}`,
      color: COLORS[selectedColorIndex],
      mode: '0',
    });

    if (playVsAI) {
      navigate('PlayerVsAI', { playConfig });
    } else {
      navigate('PlayerVsFriend', { playConfig });
    }

    this.setState({ modalDisplayed: false });
  };

  renderModal() {
    const {
      selectedColorIndex,
      selectedTimeIndex,
      modalDisplayed,
      totalMinutes,
      incrementSeconds,
      aiLevel,
      playVsAI,
    } = this.state;

    let timePickers;
    if (selectedTimeIndex === 1) {
      timePickers = (
        <View>
          <Text style={styles.label}>Minutes per side: {totalMinutes}</Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={150}
            step={1}
            onValueChange={value => this.setState({ totalMinutes: value })}
            value={totalMinutes}
          />
          <Text style={styles.label}>
            Increment in seconds: {incrementSeconds}
          </Text>
          <Slider
            minimumValue={0}
            maximumValue={180}
            step={1}
            onValueChange={value => this.setState({ incrementSeconds: value })}
            value={incrementSeconds}
          />
        </View>
      );
    }

    let aiLevelPicker;
    if (playVsAI) {
      aiLevelPicker = (
        <View>
          <Text style={styles.label}>A.I. level {aiLevel}</Text>
          <Slider
            minimumValue={1}
            maximumValue={8}
            step={1}
            onValueChange={value => this.setState({ aiLevel: value })}
            value={aiLevel}
          />
        </View>
      );
    }

    return (
      <Modal isOpen={modalDisplayed} backdropOpacity={0.8} style={styles.modal}>
        <View style={styles.modalContent}>
          <Text style={styles.label}>Color</Text>
          <SegmentedControlTab
            values={COLORS}
            selectedIndex={selectedColorIndex}
            onTabPress={index => this.setState({ selectedColorIndex: index })}
          />
          <View style={styles.clockContainer}>
            <Text style={styles.label}>Clock</Text>
            <SegmentedControlTab
              values={['Unlimited', 'Real time']}
              selectedIndex={selectedTimeIndex}
              onTabPress={index => this.setState({ selectedTimeIndex: index })}
            />
            {timePickers}
          </View>
          {aiLevelPicker}
          <Button
            style={styles.modalButton}
            text={'Create'}
            onPress={this.create}
          />
        </View>
      </Modal>
    );
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
          onPress={() => this.displayModal(true)}
        />
        <Button
          style={styles.button}
          text={'Play with a friend'}
          onPress={() => this.displayModal(false)}
        />
        {this.renderModal()}
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
  modalButton: {
    marginTop: 16,
    backgroundColor: '#D85000',
  },
  modal: {
    padding: 16,
    backgroundColor: 'transparent',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 16,
    padding: 4,
  },
  clockContainer: {
    backgroundColor: '#81a59a',
    padding: 16,
    marginTop: 16,
  },
});
