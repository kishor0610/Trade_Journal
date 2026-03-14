import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { useRive } from '@rive-app/react-canvas';

const MACHINE_CANDIDATES = ['LoginMachine', 'State Machine 1', 'PandaLoginMachine'];
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
  const [resolvedMachine, setResolvedMachine] = useState('');
  const [hasInteractiveInputs, setHasInteractiveInputs] = useState(false);

  const { rive, RiveComponent } = useRive({
    src: '/panda_login.riv',
    // Try common machine names so externally authored .riv files can still work.
    stateMachines: MACHINE_CANDIDATES,
    animations: 'idle',
    autoplay: true,
  });

  useEffect(() => {
    if (!rive) return;

    const resolveMachine = () => {
      const names = Array.isArray(rive.stateMachineNames) ? rive.stateMachineNames : [];
      const preferred = MACHINE_CANDIDATES.find((name) => names.includes(name)) || names[0] || '';
      setResolvedMachine(preferred);

      if (!preferred) {
        setHasInteractiveInputs(false);
        return;
      }

      const inputNames = (rive.stateMachineInputs(preferred) || []).map((input) => input.name);
      const required = ['isLooking', 'isTracking', 'isPassword', 'loginError', 'loginSuccess', 'cursorX'];
      setHasInteractiveInputs(required.every((name) => inputNames.includes(name)));
    };

    resolveMachine();
    rive.on('load', resolveMachine);

    return () => {
      rive.off('load', resolveMachine);
    };
  }, [rive]);

  const getInput = useCallback((name) => {
    if (!rive || !resolvedMachine) return null;
    const inputs = rive.stateMachineInputs(resolvedMachine) || [];
    return inputs.find((input) => input.name === name) || null;
  }, [rive, resolvedMachine]);

  const setCursorPercent = useCallback((rawValue) => {
    const safeValue = Number.isFinite(rawValue) ? rawValue : 0;
    setNumberInput(getInput('cursorX'), clamp(safeValue, 0, MAX_CURSOR));
  }, [getInput]);

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
      setBoolInput(getInput('isLooking'), true);
      setBoolInput(getInput('isTracking'), false);
      setBoolInput(getInput('isPassword'), false);
    },
    emailFocus() {
      setBoolInput(getInput('isLooking'), true);
      setBoolInput(getInput('isTracking'), false);
      setBoolInput(getInput('isPassword'), false);
    },
    emailType(value) {
      setBoolInput(getInput('isLooking'), false);
      setBoolInput(getInput('isTracking'), true);
      setBoolInput(getInput('isPassword'), false);
      const lengthPercent = clamp((String(value || '').length / 30) * 100, 0, MAX_CURSOR);
      setCursorPercent(lengthPercent);
    },
    emailBlur() {
      setBoolInput(getInput('isLooking'), false);
      setBoolInput(getInput('isTracking'), false);
    },
    passwordFocus() {
      setBoolInput(getInput('isPassword'), true);
      setBoolInput(getInput('isLooking'), false);
      setBoolInput(getInput('isTracking'), false);
    },
    passwordBlur() {
      setBoolInput(getInput('isPassword'), false);
    },
    loginError() {
      fireTrigger(getInput('loginError'));
    },
    loginSuccess() {
      fireTrigger(getInput('loginSuccess'));
    },
  }), [getInput, setCursorPercent]);

  return (
    <div className="panda-rive-wrapper">
      <RiveComponent className="panda" aria-label="Animated panda login assistant" />
      {!rive ? (
        <p className="panda-rive-note">Place <code>panda_login.riv</code> in <code>frontend/public</code>.</p>
      ) : null}
      {rive && !resolvedMachine ? (
        <p className="panda-rive-note">No state machine found in this file.</p>
      ) : null}
      {rive && resolvedMachine && !hasInteractiveInputs ? (
        <p className="panda-rive-note">State machine <code>{resolvedMachine}</code> is loaded, but required inputs are missing.</p>
      ) : null}
    </div>
  );
});

export default PandaLogin;
