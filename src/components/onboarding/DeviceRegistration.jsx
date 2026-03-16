/**
 * DeviceRegistration
 * Step 2 of onboarding — register device name, OS type, and push token.
 * Device ID is generated once and stored in localStorage (same key as DiagnosticsModal).
 */
import React, { useState } from 'react';
import { Smartphone, Tablet, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const DEVICE_ID_KEY = 'purpulse_device_id';

function getOrCreateDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = 'dev-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 6);
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function detectOS() {
  const ua = navigator.userAgent;
  if (/iphone|ipad/i.test(ua)) return 'iOS';
  if (/android/i.test(ua))     return 'Android';
  return 'Web';
}

export default function DeviceRegistration({ onNext }) {
  const deviceId = getOrCreateDeviceId();
  const [deviceName, setDeviceName] = useState('');
  const [os, setOs] = useState(detectOS());
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const errs = {};
    if (!deviceName.trim()) errs.deviceName = 'Device name is required';
    if (deviceName.trim().length > 40) errs.deviceName = 'Max 40 characters';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    // Persist registration
    localStorage.setItem('purpulse_device_reg', JSON.stringify({
      device_id: deviceId,
      device_name: deviceName.trim(),
      os,
      registered_at: new Date().toISOString(),
      push_token: 'pending', // real token acquired after permission grant
    }));
    setSaved(true);
    setTimeout(onNext, 900);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900">Register your device</h2>
        <p className="text-sm text-slate-500 mt-1">
          Give your device a name so dispatchers can identify it in the admin console.
        </p>
      </div>

      {/* Device ID */}
      <div className="bg-slate-50 rounded-2xl px-4 py-3 font-mono">
        <p className="text-[10px] text-slate-400 mb-0.5">Device ID (auto-generated)</p>
        <p className="text-xs text-slate-700 break-all">{deviceId}</p>
      </div>

      {/* OS type */}
      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Platform</label>
        <div className="flex gap-2">
          {['iOS', 'Android', 'Web'].map(o => (
            <button key={o} onClick={() => setOs(o)}
              className={cn('flex-1 h-14 rounded-2xl border-2 text-sm font-bold flex flex-col items-center justify-center gap-0.5 transition-all',
                os === o ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600'
              )}
            >
              {o === 'Web' ? <Tablet className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
              {o}
            </button>
          ))}
        </div>
      </div>

      {/* Device name */}
      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">
          Device name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={deviceName}
          onChange={e => setDeviceName(e.target.value)}
          placeholder={`e.g. ${os === 'iOS' ? "John's iPhone 15" : os === 'Android' ? "Field Phone #3" : "Site Tablet"}`}
          maxLength={40}
          className={cn('w-full h-14 rounded-2xl border-2 px-4 text-base focus:outline-none focus:ring-2 focus:ring-slate-400',
            errors.deviceName ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'
          )}
        />
        {errors.deviceName && (
          <p className="flex items-center gap-1 text-xs text-red-500 mt-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />{errors.deviceName}
          </p>
        )}
        <p className="text-[10px] text-slate-400 mt-1">{deviceName.length}/40</p>
      </div>

      {/* Push token note */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3">
        <p className="text-xs font-semibold text-blue-800 mb-0.5">Push notifications</p>
        <p className="text-xs text-blue-700">
          A push token will be requested after you grant notification permissions in the next step.
          This lets dispatchers send you urgent job updates.
        </p>
      </div>

      <button onClick={handleSave}
        disabled={saved}
        className={cn('w-full h-14 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2',
          saved ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white active:opacity-80'
        )}
      >
        {saved ? <><CheckCircle2 className="h-5 w-5" /> Registered!</> : 'Continue →'}
      </button>
    </div>
  );
}