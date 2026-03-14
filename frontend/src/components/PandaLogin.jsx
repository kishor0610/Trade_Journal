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

      setPupilX(clamp(deltaX / 24, -7.5, 7.5));
      setPupilY(clamp(deltaY / 24, -6, 6));
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
      className={`eyes-login-mascot ${className} ${isCoveringEyes ? 'is-covering' : ''} eyes-react-${reaction}`.trim()}
      aria-hidden="true"
    >
      <div className="eyes-stage">
        <div className="eyes-brow eyes-brow-left" />
        <div className="eyes-brow eyes-brow-right" />

        <div className="eyes-orb eyes-orb-left">
          <div className="eyes-pupil" style={{ transform: `translate(${pupilX}px, ${pupilY}px)` }} />
          <div className="eyes-lid" />
        </div>
        <div className="eyes-orb eyes-orb-right">
          <div className="eyes-pupil" style={{ transform: `translate(${pupilX}px, ${pupilY}px)` }} />
          <div className="eyes-lid" />
        </div>
      </div>
    </div>
  );
});

export default PandaLogin;
