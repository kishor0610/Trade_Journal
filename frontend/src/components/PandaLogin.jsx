import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { useRive } from '@rive-app/react-canvas';

const MACHINE_CANDIDATES = ['LoginMachine', 'State Machine 1', 'PandaLoginMachine'];
const MAX_CURSOR = 100;

const INPUT_ALIASES = {
  isLooking: ['isLooking', 'look', 'isFocus'],
  isTracking: ['isTracking', 'isTyping', 'track'],
  isPassword: ['isPassword', 'isHandsUp', 'hands_up', 'handsUp', 'password'],
  loginError: ['loginError', 'error', 'fail', 'triggerError'],
  loginSuccess: ['loginSuccess', 'success', 'triggerSuccess'],
  cursorX: ['cursorX', 'lookX', 'numLook'],
};

const ANIMATION_ALIASES = {
  idle: ['idle', 'Idle'],
  look: ['look', 'Look'],
  track: ['track', 'Track'],
  hideEyes: ['hideEyes', 'hide_eyes', 'HideEyes', 'coverEyes'],
  shock: ['shock', 'Shock', 'error', 'Error'],
  jump: ['jump', 'Jump', 'success', 'Success'],
};

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

const PandaLogin = forwardRef(function PandaLogin({ className = '' }, ref) {
  const [resolvedMachine, setResolvedMachine] = useState('');
  const [hasInteractiveInputs, setHasInteractiveInputs] = useState(false);
  const [availableAnimations, setAvailableAnimations] = useState([]);

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
      const animations = Array.isArray(rive.animationNames) ? rive.animationNames : [];
      setAvailableAnimations(animations);

      const names = Array.isArray(rive.stateMachineNames) ? rive.stateMachineNames : [];
      const preferred = MACHINE_CANDIDATES.find((name) => names.includes(name)) || names[0] || '';
      setResolvedMachine(preferred);

      if (!preferred) {
        setHasInteractiveInputs(false);
        return;
      }

      const inputNames = (rive.stateMachineInputs(preferred) || []).map((input) => input.name.toLowerCase());
      const hasAnyUsefulInput = Object.values(INPUT_ALIASES)
        .flat()
        .some((name) => inputNames.includes(name.toLowerCase()));
      setHasInteractiveInputs(hasAnyUsefulInput);
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
    const aliases = INPUT_ALIASES[name] || [name];
    return (
      inputs.find((input) => aliases.some((alias) => alias.toLowerCase() === input.name.toLowerCase())) || null
    );
  }, [rive, resolvedMachine]);

  const pickAnimation = useCallback((key) => {
    const aliases = ANIMATION_ALIASES[key] || [];
    return aliases.find((name) => availableAnimations.includes(name)) || null;
  }, [availableAnimations]);

  const playFallback = useCallback((key) => {
    if (!rive) return;
    const animation = pickAnimation(key);
    if (!animation) return;

    // Drive behavior from named timeline animations when state inputs are unavailable.
    rive.stop(rive.animationNames);
    rive.play(animation);
  }, [rive, pickAnimation]);

  const setCursorPercent = useCallback((rawValue) => {
    const safeValue = Number.isFinite(rawValue) ? rawValue : 0;
    setNumberInput(getInput('cursorX'), clamp(safeValue, 0, MAX_CURSOR));
  }, [getInput]);

  useEffect(() => {
    if (!hasInteractiveInputs) return;

    const handleMouseMove = (event) => {
      const width = window.innerWidth || 1;
      const percent = (event.clientX / width) * 100;
      setCursorPercent(percent);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [hasInteractiveInputs, setCursorPercent]);

  useEffect(() => {
    if (!rive || hasInteractiveInputs) return;
    playFallback('idle');
  }, [rive, hasInteractiveInputs, playFallback]);

  useEffect(() => {
    if (!hasInteractiveInputs) return;

    // Enforce open-eyes state by default so panda does not start in password mode.
    const passwordInput = getInput('isPassword');
    if (passwordInput) {
      setBoolInput(passwordInput, false);
    }
    setBoolInput(getInput('isLooking'), false);
    setBoolInput(getInput('isTracking'), false);
  }, [getInput, hasInteractiveInputs]);

  useImperativeHandle(ref, () => ({
    emailHover() {
      if (!hasInteractiveInputs) {
        playFallback('look');
        return;
      }
      setBoolInput(getInput('isLooking'), true);
      setBoolInput(getInput('isTracking'), false);
      setBoolInput(getInput('isPassword'), false);
    },
    emailFocus() {
      if (!hasInteractiveInputs) {
        playFallback('look');
        return;
      }
      setBoolInput(getInput('isLooking'), true);
      setBoolInput(getInput('isTracking'), false);
      setBoolInput(getInput('isPassword'), false);
    },
    emailType(value) {
      if (!hasInteractiveInputs) {
        playFallback('track');
        return;
      }
      setBoolInput(getInput('isLooking'), false);
      setBoolInput(getInput('isTracking'), true);
      setBoolInput(getInput('isPassword'), false);
      const lengthPercent = clamp((String(value || '').length / 30) * 100, 0, MAX_CURSOR);
      setCursorPercent(lengthPercent);
    },
    emailBlur() {
      if (!hasInteractiveInputs) {
        playFallback('idle');
        return;
      }
      setBoolInput(getInput('isLooking'), false);
      setBoolInput(getInput('isTracking'), false);
    },
    passwordFocus() {
      const passwordInput = getInput('isPassword');
      if (!passwordInput) {
        playFallback('idle');
        return;
      }
      setBoolInput(passwordInput, false);
      setBoolInput(getInput('isLooking'), false);
      setBoolInput(getInput('isTracking'), false);
    },
    passwordType(value) {
      const hasText = String(value || '').length > 0;
      const passwordInput = getInput('isPassword');
      if (!passwordInput) {
        playFallback(hasText ? 'hideEyes' : 'idle');
        return;
      }
      setBoolInput(passwordInput, hasText);
      setBoolInput(getInput('isLooking'), false);
      setBoolInput(getInput('isTracking'), false);
    },
    passwordBlur() {
      const passwordInput = getInput('isPassword');
      if (!passwordInput) {
        playFallback('idle');
        return;
      }
      setBoolInput(passwordInput, false);
    },
    loginError() {
      if (!hasInteractiveInputs) {
        playFallback('shock');
        return;
      }
      fireTrigger(getInput('loginError'));
    },
    loginSuccess() {
      if (!hasInteractiveInputs) {
        playFallback('jump');
        return;
      }
      fireTrigger(getInput('loginSuccess'));
    },
  }), [getInput, hasInteractiveInputs, playFallback, setCursorPercent]);

  return (
    <div className={`panda-rive-wrapper ${className}`.trim()}>
      <RiveComponent className="panda" aria-label="Animated panda login assistant" />
    </div>
  );
});

export default PandaLogin;
