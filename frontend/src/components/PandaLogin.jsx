import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

const PandaLogin = forwardRef(function PandaLogin({ className = '' }, ref) {
  const mascotRef = useRef(null);
  const [pupilX, setPupilX] = useState(0);
  const [pupilY, setPupilY] = useState(0);
  const [isCoveringEyes, setIsCoveringEyes] = useState(false);
  const [reaction, setReaction] = useState('idle');

  useEffect(() => {
    const handleMouseMove = (event) => {
      const container = mascotRef.current;
      if (!container) return;

      const bounds = container.getBoundingClientRect();
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height / 2;

      const deltaX = event.clientX - centerX;
      const deltaY = event.clientY - centerY;

      setPupilX(clamp(deltaX / 22, -6.5, 6.5));
      setPupilY(clamp(deltaY / 22, -5.5, 5.5));
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    if (reaction === 'idle') return undefined;
    const timer = window.setTimeout(() => setReaction('idle'), 560);
    return () => window.clearTimeout(timer);
  }, [reaction]);

  useImperativeHandle(ref, () => ({
    emailHover() {
      setIsCoveringEyes(false);
    },
    emailFocus() {
      setIsCoveringEyes(false);
    },
    emailType() {
      setIsCoveringEyes(false);
    },
    emailBlur() {
      setIsCoveringEyes(false);
    },
    passwordFocus() {
      setIsCoveringEyes(false);
    },
    passwordType(value) {
      const hasText = String(value || '').length > 0;
      setIsCoveringEyes(hasText);
    },
    passwordBlur() {
      setIsCoveringEyes(false);
    },
    loginError() {
      setReaction('error');
    },
    loginSuccess() {
      setReaction('success');
    },
  }), []);

  return (
    <div
      ref={mascotRef}
      className={`panda-css-wrapper ${className} ${isCoveringEyes ? 'is-covering' : ''} panda-react-${reaction}`.trim()}
      aria-hidden="true"
    >
      <div className="panda-face-shell">
        <div className="panda-ear panda-ear-left" />
        <div className="panda-ear panda-ear-right" />

        <div className="panda-brow panda-brow-left" />
        <div className="panda-brow panda-brow-right" />

        <div className="panda-eye panda-eye-left">
          <div className="panda-pupil" style={{ transform: `translate(${pupilX}px, ${pupilY}px)` }} />
        </div>
        <div className="panda-eye panda-eye-right">
          <div className="panda-pupil" style={{ transform: `translate(${pupilX}px, ${pupilY}px)` }} />
        </div>

        <div className="panda-nose" />
      </div>

      <div className="panda-hand panda-hand-left" />
      <div className="panda-hand panda-hand-right" />
    </div>
  );
});

export default PandaLogin;
