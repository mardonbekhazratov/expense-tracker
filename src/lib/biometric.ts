import { BiometricAuth, BiometryError, BiometryErrorType } from '@aparajita/capacitor-biometric-auth';

export type UnlockResult = 'ok' | 'cancelled' | 'unavailable' | 'failed';

const UNAVAILABLE = new Set<string>([
  BiometryErrorType.biometryNotAvailable,
  BiometryErrorType.biometryNotEnrolled,
  BiometryErrorType.passcodeNotSet,
  BiometryErrorType.noDeviceCredential,
]);

const CANCELLED = new Set<string>([
  BiometryErrorType.userCancel,
  BiometryErrorType.systemCancel,
  BiometryErrorType.appCancel,
]);

/** True if the phone can verify the owner by fingerprint or by its screen-lock PIN/pattern. */
export async function lockAvailable(): Promise<boolean> {
  const info = await BiometricAuth.checkBiometry();
  return info.isAvailable || info.deviceIsSecure;
}

/** Shows the system fingerprint prompt, with the phone's PIN/pattern as fallback. */
export async function authenticate(reason: string): Promise<UnlockResult> {
  try {
    await BiometricAuth.authenticate({
      reason,
      cancelTitle: 'Cancel',
      allowDeviceCredential: true,
      androidTitle: 'Expense Tracker',
      androidSubtitle: reason,
      androidConfirmationRequired: false,
    });
    return 'ok';
  } catch (e) {
    if (e instanceof BiometryError) {
      if (UNAVAILABLE.has(e.code)) return 'unavailable';
      if (CANCELLED.has(e.code)) return 'cancelled';
    }
    return 'failed';
  }
}
