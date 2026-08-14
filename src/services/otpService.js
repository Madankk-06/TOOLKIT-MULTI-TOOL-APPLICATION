import emailjs from '@emailjs/browser';
import { db } from '../firebase/config';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

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
 * Sends the OTP code via EmailJS.
 */
export const sendOTPEmail = async (email, code) => {
  try {
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

    if (!serviceId || !templateId || !publicKey) {
      console.warn('[ToolKit OTP] EmailJS environment variables missing on host environment.');
      console.log(`[ToolKit Demo OTP] Verification code for ${email} is: ${code}`);
      if (typeof window !== 'undefined') {
        alert(`[Host OTP Notification] Your registration verification code is: ${code}\n\n(Tip: Add VITE_EMAILJS_* environment variables on Vercel to send emails directly to inbox.)`);
      }
      return true;
    }

    const templateParams = {
      to_email: email,
      otp_code: code,
      time: new Date().toLocaleTimeString(),
      email: email,
      otp: code,
    };

    const response = await emailjs.send(
      serviceId,
      templateId,
      templateParams,
      publicKey
    );
    
    console.log('EmailJS Success:', response.status, response.text);
    return true;
  } catch (error) {
    console.error('EmailJS Error:', error);
    console.log(`[ToolKit Fallback OTP] Verification code for ${email} is: ${code}`);
    if (typeof window !== 'undefined') {
      alert(`[OTP Delivery Notice] EmailJS failed to send email on this domain.\n\nYour verification code is: ${code}`);
    }
    return true;
  }
};
