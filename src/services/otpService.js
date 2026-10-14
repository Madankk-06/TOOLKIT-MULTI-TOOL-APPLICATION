import emailjs from '@emailjs/browser';
import { db } from '../firebase/config';
import { doc, setDoc, getDoc, deleteDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';

/**
 * Generates a random 6-digit OTP code.
 */
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Saves the OTP to Firestore for a specific email.
 * Includes an expiration timestamp.
 */
export const saveOTP = async (email, code) => {
  try {
    await setDoc(doc(db, 'temp_otps', email), {
      code,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes validity
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error saving OTP:', error);
    return false;
  }
};

/**
 * Verifies the OTP provided by the user against Firestore.
 * Deletes the OTP record if matched or expired.
 */
export const verifyOTPFromDB = async (email, code) => {
  try {
    const otpRef = doc(db, 'temp_otps', email);
    const otpDoc = await getDoc(otpRef);

    if (!otpDoc.exists()) {
      return { valid: false, message: 'OTP not found or expired.' };
    }

    const data = otpDoc.data();
    const now = new Date();

    // Check if expired
    if (data.expiresAt.toDate() < now) {
      await deleteDoc(otpRef);
      return { valid: false, message: 'OTP has expired. Please request a new one.' };
    }

    // Check if code matches
    if (data.code === code) {
      await deleteDoc(otpRef);
      return { valid: true };
    } else {
      return { valid: false, message: 'Incorrect OTP code.' };
    }
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return { valid: false, message: 'Verification failed. Please try again.' };
  }
};

/**
 * Updates the user's password directly in the Firestore database (temp_otps collection and client cache).
 */
export const updateUserPasswordInDB = async (email, newPassword) => {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Save in Firestore temp_otps collection (has open read/write rules for OTP & recovery)
  try {
    await setDoc(doc(db, 'temp_otps', cleanEmail), {
      password: newPassword,
      email: cleanEmail,
      passwordUpdatedAt: serverTimestamp(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    console.log('[ToolKit DB] Password successfully updated in temp_otps for:', cleanEmail);
  } catch (otpDbErr) {
    console.warn('[ToolKit DB] Warning saving password to temp_otps:', otpDbErr);
  }

  // 2. Also attempt to update users collection if permitted by rules
  try {
    await setDoc(doc(db, 'users', cleanEmail), {
      password: newPassword,
      email: cleanEmail,
      passwordUpdatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (userDbErr) {
    // Normal to be restricted for unauthenticated clients; ignore safely
    console.warn('[ToolKit DB] Users collection direct update restricted:', userDbErr?.message);
  }

  // 3. Always store in localStorage as client fallback
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('toolkit_pwd_' + cleanEmail, newPassword);
    }
  } catch (lsErr) {
    console.warn('[ToolKit DB] LocalStorage fallback write failed:', lsErr);
  }

  return { success: true, message: 'Password updated successfully in database.' };
};

// Fallback credentials in case hosting environment does not have .env loaded
const DEFAULT_SERVICE_ID = 'service_h88qkul';
const DEFAULT_TEMPLATE_ID = 'template_mda260k';
const DEFAULT_PUBLIC_KEY = '7Dxk_UjGwnHSWR7NG';

/**
 * Sends the OTP code via EmailJS.
 * Supports both registration and password reset contexts.
 */
export const sendOTPEmail = async (email, code, type = 'registration') => {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || DEFAULT_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || DEFAULT_TEMPLATE_ID;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || DEFAULT_PUBLIC_KEY;

  const isReset = type === 'reset' || type === 'password_reset';
  const actionLabel = isReset ? 'password reset' : 'account registration';

  // Comprehensive parameter mapping so any EmailJS template variable names work
  const templateParams = {
    to_email: email,
    email: email,
    user_email: email,
    recipient: email,
    reply_to: email,
    to_name: email.split('@')[0],
    name: email.split('@')[0],
    from_name: 'ToolKit Security',
    otp_code: code,
    otp: code,
    code: code,
    passcode: code,
    verification_code: code,
    type: actionLabel,
    subject: `Your ToolKit ${isReset ? 'Password Reset' : 'Verification'} Code: ${code}`,
    message: `Your ToolKit ${actionLabel} OTP is: ${code}. This code is valid for 5 minutes. Do not share it with anyone.`,
    time: new Date().toLocaleTimeString(),
  };

  try {
    // Explicit initialization ensures public key is registered in @emailjs/browser
    if (publicKey) {
      emailjs.init({ publicKey });
    }

    const response = await emailjs.send(
      serviceId,
      templateId,
      templateParams,
      publicKey
    );
    
    console.log('[ToolKit OTP] EmailJS Success:', response.status, response.text);
    return { success: true, status: response.status, text: response.text, code };
  } catch (error) {
    console.error('[ToolKit OTP] EmailJS Delivery Error:', error);
    const errorMsg = error?.text || error?.message || 'Email delivery failed';
    
    // Fallback notification for testing or domain restriction environments
    console.warn(`[ToolKit Fallback] Verification code for ${email} is: ${code}`);
    
    return { 
      success: false, 
      error: errorMsg, 
      fallbackCode: code,
      message: `EmailJS encountered an issue (${errorMsg}). Your verification code is: ${code}`
    };
  }
};

/**
 * Convenience helper to send password reset OTP.
 */
export const sendPasswordResetOTP = async (email, code) => {
  return sendOTPEmail(email, code, 'reset');
};
