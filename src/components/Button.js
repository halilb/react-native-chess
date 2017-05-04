import React, { PropTypes } from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';

const Button = ({ text, onPress }) => {
  return (
    <TouchableOpacity onPress={onPress}>
      <View style={styles.button}>
        <Text style={styles.text}>{text}</Text>
      </View>
    </TouchableOpacity>
  );
};

Button.propTypes = {
  text: PropTypes.string.isRequired,
  onPress: PropTypes.func.isRequired,
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 3,
    backgroundColor: 'red',
    alignItems: 'center',
  },
  text: {
    color: 'white',
    fontSize: 14,
    marginVertical: 16,
  },
});

export default Button;
