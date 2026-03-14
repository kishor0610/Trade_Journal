import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { useRive } from '@rive-app/react-canvas';

const MACHINE_CANDIDATES = ['LoginMachine', 'State Machine 1', 'PandaLoginMachine'];
const MAX_CURSOR = 100;

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

  const pickAnimation = useCallback((key) => {
    const aliases = ANIMATION_ALIASES[key] || [];
    return aliases.find((name) => availableAnimations.includes(name)) || null;
  }, [availableAnimations]);

  const playFallback = useCallback((key, fallbackIndex = 0) => {
    if (!rive) return;
    const animation = pickAnimation(key) || availableAnimations[fallbackIndex] || availableAnimations[0] || null;
    if (!animation) return;

    // Drive behavior from named timeline animations when state inputs are unavailable.
    rive.stop(rive.animationNames);
    rive.play(animation);
  }, [rive, pickAnimation, availableAnimations]);

  const canUseFallbackAnimations = useMemo(() => {
    return ['idle', 'look', 'track', 'hideEyes', 'shock', 'jump'].some((key) => pickAnimation(key));
  }, [pickAnimation]);

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
    playFallback('idle', 0);
  }, [rive, hasInteractiveInputs, playFallback]);

  useImperativeHandle(ref, () => ({
    emailHover() {
      if (!hasInteractiveInputs) {
        playFallback('look', 1);
        return;
      }
      setBoolInput(getInput('isLooking'), true);
      setBoolInput(getInput('isTracking'), false);
      setBoolInput(getInput('isPassword'), false);
    },
    emailFocus() {
      if (!hasInteractiveInputs) {
        playFallback('look', 1);
        return;
      }
      setBoolInput(getInput('isLooking'), true);
      setBoolInput(getInput('isTracking'), false);
      setBoolInput(getInput('isPassword'), false);
    },
    emailType(value) {
      if (!hasInteractiveInputs) {
        playFallback('track', 2);
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
        playFallback('idle', 0);
        return;
      }
      setBoolInput(getInput('isLooking'), false);
      setBoolInput(getInput('isTracking'), false);
    },
    passwordFocus() {
      if (!hasInteractiveInputs) {
        playFallback('hideEyes', 3);
        return;
      }
      setBoolInput(getInput('isPassword'), true);
      setBoolInput(getInput('isLooking'), false);
      setBoolInput(getInput('isTracking'), false);
    },
    passwordBlur() {
      if (!hasInteractiveInputs) {
        playFallback('idle', 0);
        return;
      }
      setBoolInput(getInput('isPassword'), false);
    },
    loginError() {
      if (!hasInteractiveInputs) {
        playFallback('shock', 4);
        return;
      }
      fireTrigger(getInput('loginError'));
    },
    loginSuccess() {
      if (!hasInteractiveInputs) {
        playFallback('jump', 5);
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
