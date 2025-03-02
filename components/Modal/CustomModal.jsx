import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const CustomModal = ({ 
  visible, 
  title, 
  message, 
  type, 
  onClose, 
  onConfirm,
  cancelButtonText,
  confirmButtonText,
  children // Add children prop to render additional content
}) => {
  const iconName = type === 'success' ? 'check-circle' : 'error';
  const iconColor = type === 'success' ? '#4CAF50' : '#FF5252';

  const getButtonLabels = () => {
    if (type === 'success') {
      return {
        confirm: confirmButtonText || 'OK'
      };
    } else {
      return {
        cancel: cancelButtonText || 'Close',
        confirm: confirmButtonText || 'Try Again'
      };
    }
  };

  const buttonLabels = getButtonLabels();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View style={styles.modalContainer}>
          <View style={styles.iconContainer}>
            <MaterialIcons name={iconName} size={50} color={iconColor} />
          </View>
          <Text style={styles.title}>{title}</Text>
          {message && <Text style={styles.message}>{message}</Text>}
          
          {/* Render children (additional content) if provided */}
          {children}
          
          <View style={styles.buttonContainer}>
            {type === 'error' && (
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={styles.buttonText}>{buttonLabels.cancel}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={onConfirm || onClose}
            >
              <Text style={[styles.buttonText, styles.confirmButtonText]}>
                {buttonLabels.confirm}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: Dimensions.get('window').width * 0.85,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    maxHeight: Dimensions.get('window').height * 0.9,
  },
  iconContainer: {
    marginBottom: 15,
  },
  title: {
    fontSize: 20,
    fontFamily: 'outfit-medium',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    fontFamily: 'outfit',
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    gap: 10,
    marginTop: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'outfit-medium',
    color: '#666',
  },
  confirmButtonText: {
    color: '#fff',
  },
});

export default CustomModal;