import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { COLORS } from '../constants';
import { FONT } from '../font';

const EmailRow: React.FC<{ subject: string; from: string; time: string; delay: number; urgent?: boolean }> = ({
  subject, from, time, delay, urgent
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  const x = interpolate(progress, [0, 1], [-300, 0]);
  const opacity = interpolate(frame - delay, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{
      transform: `translateX(${x}px)`, opacity,
      background: urgent ? 'rgba(239,68,68,0.07)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${urgent ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 12, padding: '16px 22px',
      display: 'flex', alignItems: 'center', gap: 14, overflow: 'hidden',
    }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: urgent ? COLORS.danger : COLORS.accent, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 24, color: COLORS.white, fontFamily: FONT, fontWeight: '600', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{subject}</div>
        <div style={{ fontSize: 19, color: COLORS.gray, fontFamily: FONT, marginTop: 2 }}>{from}</div>
      </div>
      <div style={{ fontSize: 19, color: COLORS.gray, fontFamily: FONT, flexShrink: 0 }}>{time}</div>
      {urgent && <div style={{ background: COLORS.danger, borderRadius: 6, padding: '2px 10px', fontSize: 16, color: '#fff', fontFamily: FONT, fontWeight: '700', flexShrink: 0 }}>URGENT</div>}
    </div>
  );
};

export const Scene2Chaos: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();

  const CUE_HEADER = 0;
  const CUE_EMAIL1 = dur * 0.04;
  const CUE_EMAIL2 = dur * 0.17;
  const CUE_EMAIL3 = dur * 0.29;
  const CUE_EMAIL4 = dur * 0.40;
  const INBOX_DIM  = dur * 0.50;
  const CUE_TEXT1  = dur * 0.52;
  const CUE_TEXT2  = dur * 0.61;
  const CUE_EVERY  = dur * 0.68;
  const CUE_SINGLE = dur * 0.76;
  const CUE_DAY    = dur * 0.83;

  const headerOp = interpolate(frame, [CUE_HEADER, CUE_HEADER + 18], [0, 1], { extrapolateRight: 'clamp' });
  const headerY  = interpolate(spring({ frame, fps, config: { damping: 200 } }), [0, 1], [30, 0]);
  const badgeCount = Math.min(Math.floor(frame / 5), 63);

  const inboxDimOp = interpolate(frame, [INBOX_DIM, INBOX_DIM + 20], [1, 0.25], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const textEntry = (cue: number) => ({
    op: interpolate(frame - cue, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    y: interpolate(spring({ frame: frame - cue, fps, config: { damping: 200 } }), [0, 1], [30, 0]),
  });

  const t1 = textEntry(CUE_TEXT1);
  const t2 = textEntry(CUE_TEXT2);
  const tE = textEntry(CUE_EVERY);
  const tS = textEntry(CUE_SINGLE);
  const tD = textEntry(CUE_DAY);

  const emails = [
    { subject: 'Invoice #4821 — Action Required', from: 'billing@vendor.io', time: '09:14', delay: CUE_EMAIL1 },
    { subject: 'Re: Follow-up on proposal (3rd attempt)', from: 'client@bigco.com', time: '09:32', delay: CUE_EMAIL2, urgent: true },
    { subject: 'CRM data entry — still pending', from: 'ops@company.com', time: '10:28', delay: CUE_EMAIL3, urgent: true },
    { subject: 'Spreadsheet needs updating', from: 'finance@company.com', time: '11:47', delay: CUE_EMAIL4 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 25% 50%, rgba(239,68,68,0.07) 0%, transparent 55%)' }} />

      <AbsoluteFill style={{ display: 'flex', padding: '60px 100px', gap: 70, alignItems: 'center', overflow: 'hidden' }}>
        {/* Left: inbox dims at 50% */}
        <div style={{ width: 820, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden', opacity: inboxDimOp }}>
          <div style={{ opacity: headerOp, transform: `translateY(${headerY}px)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 14, color: COLORS.gray, fontFamily: FONT, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '2px' }}>INBOX</div>
            <div style={{ background: COLORS.danger, borderRadius: 100, padding: '4px 14px', fontSize: 22, color: '#fff', fontFamily: FONT, fontWeight: '800', minWidth: 44, textAlign: 'center' }}>
              {badgeCount}
            </div>
          </div>
          {emails.map((e) => <EmailRow key={e.subject} {...e} />)}
        </div>

        {/* Right: punchy statements */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20, overflow: 'hidden' }}>
          <div style={{ opacity: t1.op, transform: `translateY(${t1.y}px)`, overflow: 'hidden' }}>
            <div style={{ fontSize: 60, fontWeight: '800', color: COLORS.white, fontFamily: FONT, lineHeight: 1.1, letterSpacing: '-1.5px' }}>Emails. Data entry.</div>
          </div>
          <div style={{ opacity: t2.op, transform: `translateY(${t2.y}px)`, overflow: 'hidden' }}>
            <div style={{ fontSize: 60, fontWeight: '800', color: COLORS.white, fontFamily: FONT, lineHeight: 1.1, letterSpacing: '-1.5px' }}>Follow-ups.</div>
          </div>
          <div style={{ height: 2, background: 'rgba(255,255,255,0.08)', margin: '4px 0', opacity: t2.op }} />
          <div style={{ opacity: tE.op, transform: `translateY(${tE.y}px)`, overflow: 'hidden' }}>
            <div style={{ fontSize: 78, fontWeight: '800', color: COLORS.danger, fontFamily: FONT, lineHeight: 1, letterSpacing: '-2px' }}>Every.</div>
          </div>
          <div style={{ opacity: tS.op, transform: `translateY(${tS.y}px)`, overflow: 'hidden' }}>
            <div style={{ fontSize: 78, fontWeight: '800', color: COLORS.danger, fontFamily: FONT, lineHeight: 1, letterSpacing: '-2px' }}>Single.</div>
          </div>
          <div style={{ opacity: tD.op, transform: `translateY(${tD.y}px)`, overflow: 'hidden' }}>
            <div style={{ fontSize: 78, fontWeight: '800', color: COLORS.white, fontFamily: FONT, lineHeight: 1, letterSpacing: '-2px' }}>Day.</div>
          </div>
        </div>
      </AbsoluteFill>

      <Audio src={staticFile('audio/voiceover/scene2.mp3')} />
    </AbsoluteFill>
  );
};
