import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import EvilIcons from 'react-native-vector-icons/EvilIcons'
import { chekEmailaddress } from '../../store/slice/authSlice'
import { useFocusEffect } from '@react-navigation/native'

const StepOne = (props: any) => {
  const [email, setEmail] = useState('')
  const inputRef = useRef(null)
  //const inputRef = useRef(null)
  const dispatch = useDispatch()
  const { loading, error } = useSelector((state: any) => state.auth)

  const isValid = email.trim().length > 0

 useFocusEffect(
  React.useCallback(() => {
    const timeout = setTimeout(() => {
      inputRef.current?.focus()
    }, 350) // IMPORTANT delay

    return () => clearTimeout(timeout)
  }, [])
)

  const validateEmail = (value: string) => {
    const regex = /^\S+@\S+\.\S+$/
    return regex.test(value)
  }

  const handleSubmit = () => {
    if (!validateEmail(email)) {
      return
    }

    dispatch(chekEmailaddress({ email }))
      .unwrap()
      .then((data: any) => {
        if (data?.message === 'Email already in use') {
          props.navigation.navigate('StepFive', { email })
        } else if (data?.message === 'Email Not Found') {
          //new Signup
          props.navigation.navigate('StepTwo')
        }
      })
      .catch((err: any) => {
        console.log('Email check error:', err?.message)
      })
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.innerContainer}>
        {/* Close button */}
        <TouchableOpacity
          style={styles.closeButton}
          /* Dismissing the email form goes back where it was opened from,
             which is the auth screen. It pointed at the hub — a signed-out
             person's "close" landed on a home screen. */
          onPress={() => props.navigation.goBack()}
        >
          <EvilIcons name="close" size={24} color="black" />
        </TouchableOpacity>

        <Text style={styles.caption}>Enter Email Address</Text>

        {/* Email Input */}
        <TextInput
          ref={inputRef}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
          returnKeyType="done"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.terms}>
          You will receive a verification code via email. Your email address may
          be used to connect you with others, improve ads, and more depending on
          your settings. By continuing, you agree to our{' '}
          <Text style={styles.link}>Terms & Conditions</Text>
        </Text>
      </View>

      {/* Continue Button */}
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: isValid ? '#000' : '#ccc' },
        ]}
        disabled={!isValid || loading}
        onPress={handleSubmit}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Continue</Text>
        )}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  )
}

export default StepOne
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
  },
  innerContainer: {
    marginTop: 0,
  },
  closeButton: {
    marginBottom: 30,
  },
  caption: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 12,
  },
  error: {
    color: 'red',
    marginBottom: 10,
  },
  terms: {
    fontSize: 10,
    color: '#555',
  },
  link: {
    color: '#007bff',
    textDecorationLine: 'underline',
  },
  button: {
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 30,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
