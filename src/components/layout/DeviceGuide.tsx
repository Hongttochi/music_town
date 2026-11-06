import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Smartphone } from 'lucide-react';
import './device-guide.css';

function deviceState() {
  const mobile =
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  // Keyboard resizing changes viewport orientation, but not physical device orientation.
  const portrait = screen.orientation?.type
    ? screen.orientation.type.startsWith('portrait')
    : typeof window.orientation === 'number'
      ? window.orientation % 180 === 0
      : matchMedia('(orientation: portrait)').matches;
  return !mobile ? 'desktop' : portrait ? 'portrait' : null;
}

export function DeviceGuide({ children }: { children: ReactNode }) {
  const [reason, setReason] = useState(deviceState);
  const content = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const orientation = matchMedia('(orientation: portrait)');
    const viewport = window.visualViewport;
    const update = () => {
      setReason(deviceState());
      const style = document.documentElement.style;
      style.setProperty('--visible-height', `${viewport?.height ?? innerHeight}px`);
      style.setProperty('--visible-top', `${viewport?.offsetTop ?? 0}px`);
    };
    update();
    orientation.addEventListener('change', update);
    screen.orientation?.addEventListener('change', update);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    return () => {
      orientation.removeEventListener('change', update);
      screen.orientation?.removeEventListener('change', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
    };
  }, []);
  useEffect(() => {
    if (content.current) content.current.inert = Boolean(reason);
    document.documentElement.dataset.deviceBlocked = reason ? 'true' : 'false';
    if (reason) heading.current?.focus();
    return () => {
      delete document.documentElement.dataset.deviceBlocked;
    };
  }, [reason]);
  return (
    <>
      <div
        ref={content}
        className={reason ? 'device-content device-content-blocked' : 'device-content'}
        aria-hidden={reason ? true : undefined}
      >
        {children}
      </div>
      {reason && (
        <div
          className="device-guide"
          role="dialog"
          aria-modal="true"
          aria-labelledby="device-guide-title"
          aria-describedby="device-guide-description"
        >
          <div className="device-guide-message">
            <div
              className={`device-guide-icon ${reason === 'portrait' ? 'device-guide-rotate' : ''}`}
              aria-hidden="true"
            >
              {reason === 'portrait' ? (
                <svg className="rotation-demo" viewBox="0 0 240 200" fill="none">
                  <g
                    className="rotation-demo-arrows"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M42 119a80 80 0 0 1 28-80m-18 0 18 0-2 18" />
                    <path d="M198 81a80 80 0 0 1-28 80m18 0-18 0 2-18" />
                  </g>
                  <g className="rotation-demo-hands">
                    <path d="M75 166v-28l-9-20c-3-8 0-15 6-15h16v43l12 20" fill="#d8b596" />
                    <path d="M165 166v-28l9-20c3-8 0-15-6-15h-16v43l-12 20" fill="#d8b596" />
                    <rect
                      x="86"
                      y="39"
                      width="68"
                      height="116"
                      rx="12"
                      fill="#303d34"
                      stroke="#e3ebcb"
                      strokeWidth="3"
                    />
                    <rect x="92" y="47" width="56" height="97" rx="7" fill="#b8c99a" />
                    <path d="M111 48h18" stroke="#303d34" strokeWidth="4" strokeLinecap="round" />
                    <path d="M115 149h10" stroke="#e3ebcb" strokeWidth="2" strokeLinecap="round" />
                    <path
                      d="M78 144v-20l8-17c3-6 10-3 9 3l-5 21v14M162 144v-20l-8-17c-3-6-10-3-9 3l5 21v14"
                      fill="#efd0b1"
                      stroke="#b58d70"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path d="M71 162h29v16H71zM140 162h29v16h-29z" fill="#f2eedc" />
                  </g>
                </svg>
              ) : (
                <Smartphone size={48} strokeWidth={1.5} />
              )}
            </div>
            <h1 id="device-guide-title" tabIndex={-1} ref={heading}>
              {reason === 'desktop' ? '모바일 환경에서만 지원합니다' : '가로 모드로 전환해 주세요'}
            </h1>
            <p id="device-guide-description">
              {reason === 'desktop'
                ? '휴대폰이나 태블릿에서 접속해 주세요.'
                : '기기를 옆으로 돌리면 계속할 수 있어요.'}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
