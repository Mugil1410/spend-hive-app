import React from 'react';
import { LockMethod } from '../appLockStore';
import { PinEntry } from './PinEntry';
import { PasscodeEntry } from './PasscodeEntry';
import { PatternEntry } from './PatternEntry';

interface Props {
  method: LockMethod;
  onSubmit: (secret: string) => void;
  disabled?: boolean;
  error?: boolean;
  resetKey?: number;
  /** PIN only: submit as soon as this many digits are typed. */
  pinAutoSubmitLength?: number;
  submitLabel?: string;
}

/** The input for whichever lock method is in use. */
export function SecretEntry({ method, pinAutoSubmitLength, submitLabel, ...rest }: Props) {
  switch (method) {
    case 'pin':
      return <PinEntry autoSubmitLength={pinAutoSubmitLength} {...rest} />;
    case 'passcode':
      return <PasscodeEntry submitLabel={submitLabel} {...rest} />;
    case 'pattern':
      return <PatternEntry {...rest} />;
  }
}
