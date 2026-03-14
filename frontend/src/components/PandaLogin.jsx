import React, { forwardRef, useCallback, useEffect, useImperativeHandle } from 'react';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';

const MACHINE_NAME = 'LoginMachine';
const MAX_CURSOR = 100;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function setBoolInput(input, value) {
  if (!input || typeof input.value === 'undefined') return;
  input.value = value;
}

function setNumberInput(input, value) {
  if (!input || typeof input.value === 'undefined') return;
  input.value = value;
}

function fireTrigger(input) {
  if (!input || typeof input.fire !== 'function') return;
  input.fire();
}

const PandaLogin = forwardRef(function PandaLogin(_props, ref) {
  const { rive, RiveComponent } = useRive({
    src: '/panda_login.riv',
    stateMachines: MACHINE_NAME,
    autoplay: true,
  });

  const lookInput = useStateMachineInput(rive, MACHINE_NAME, 'isLooking');
  const trackInput = useStateMachineInput(rive, MACHINE_NAME, 'isTracking');
  const passwordInput = useStateMachineInput(rive, MACHINE_NAME, 'isPassword');
  const errorInput = useStateMachineInput(rive, MACHINE_NAME, 'loginError');
  const successInput = useStateMachineInput(rive, MACHINE_NAME, 'loginSuccess');
  const cursorXInput = useStateMachineInput(rive, MACHINE_NAME, 'cursorX');

  const setCursorPercent = useCallback((rawValue) => {
    const safeValue = Number.isFinite(rawValue) ? rawValue : 0;
    setNumberInput(cursorXInput, clamp(safeValue, 0, MAX_CURSOR));
  }, [cursorXInput]);

  useEffect(() => {
    const handleMouseMove = (event) => {
      const width = window.innerWidth || 1;
      const percent = (event.clientX / width) * 100;
      setCursorPercent(percent);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [setCursorPercent]);

  useImperativeHandle(ref, () => ({
    emailHover() {
      setBoolInput(lookInput, true);
      setBoolInput(trackInput, false);
      setBoolInput(passwordInput, false);
    },
    emailFocus() {
      setBoolInput(lookInput, true);
      setBoolInput(trackInput, false);
      setBoolInput(passwordInput, false);
    },
    emailType(value) {
      setBoolInput(lookInput, false);
      setBoolInput(trackInput, true);
      setBoolInput(passwordInput, false);
      const lengthPercent = clamp((String(value || '').length / 30) * 100, 0, MAX_CURSOR);
      setCursorPercent(lengthPercent);
    },
    emailBlur() {
      setBoolInput(lookInput, false);
      setBoolInput(trackInput, false);
    },
    passwordFocus() {
      setBoolInput(passwordInput, true);
      setBoolInput(lookInput, false);
      setBoolInput(trackInput, false);
    },
    passwordBlur() {
      setBoolInput(passwordInput, false);
    },
    loginError() {
      fireTrigger(errorInput);
    },
    loginSuccess() {
      fireTrigger(successInput);
    },
  }), [lookInput, trackInput, passwordInput, errorInput, successInput, setCursorPercent]);

  return (
    <div className="panda-rive-wrapper">
      <RiveComponent className="panda" aria-label="Animated panda login assistant" />
      {!rive ? (
        <p className="panda-rive-note">Place <code>panda_login.riv</code> in <code>frontend/public</code>.</p>
      ) : null}
    </div>
  );
});

export default PandaLogin;
