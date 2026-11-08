import React from 'react';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('../src/services/api', () => ({
  verificarConexion: vi.fn(() => Promise.resolve(true)),
  crearSesion: vi.fn(),
  finalizarSesion: vi.fn(() => Promise.resolve()),
  registrarVideoLocal: vi.fn(() => Promise.resolve()),
  analizarFrame: vi.fn(),
  capturarFrameDeVideo: vi.fn(() => Promise.resolve(new Blob(['x']))),
}));
vi.mock('../src/services/videoStorage', () => ({ guardarVideoLocal: vi.fn(() => Promise.resolve('idb://x')) }));

import * as api from '../src/services/api';
import CameraView from '../src/pages/CameraView';
import Settings from '../src/pages/Settings';

const respuesta = (riesgo='ninguno') => ({ estado:'ok', objetos_detectados:[], total_objetos:0, nivel_riesgo:riesgo });
const flush = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); };

beforeEach(() => {
  localStorage.clear();
  window.__osc = 0;
  vi.useFakeTimers();
  let n = 0;
  api.crearSesion.mockImplementation(() => Promise.resolve(++n));
  api.analizarFrame.mockReset();
  Object.defineProperty(HTMLMediaElement.prototype, 'readyState', { get(){ return 4; }, configurable:true });
  HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
  HTMLMediaElement.prototype.pause = vi.fn();
  const stop = vi.fn();
  navigator.mediaDevices = { getUserMedia: vi.fn(() => Promise.resolve({ getTracks: () => [{ stop }] })) };
  window.AudioContext = class { constructor(){ this.state='running'; this.currentTime=0; this.destination={}; }
    createOscillator(){ window.__osc += 1; return { connect(){}, type:'', frequency:{setValueAtTime(){}}, start(){}, stop(){} }; }
    createGain(){ return { connect(){}, gain:{setValueAtTime(){}, exponentialRampToValueAtTime(){}} }; }
    resume(){ return Promise.resolve(); } close(){ this.state='closed'; return Promise.resolve(); } };
  vi.spyOn(console,'error').mockImplementation(()=>{});
  vi.spyOn(console,'log').mockImplementation(()=>{});
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });

const montar = () => render(
  <React.StrictMode><CameraView mode="bicicleta" navigate={()=>{}} onSesionUpdate={()=>{}} user={{usuarioId:7}} /></React.StrictMode>
);

describe('CameraView (modo bicicleta)', () => {
  it('NO crea sesión al abrir la pantalla (ni con StrictMode)', async () => {
    montar(); await flush();
    expect(api.crearSesion).not.toHaveBeenCalled();
  });

  it('crea UNA sola sesión al iniciar cámara + análisis', async () => {
    montar(); await flush();
    await act(async () => { fireEvent.click(screen.getByText('camera.controls.startCamera')); });
    await flush();
    await act(async () => { fireEvent.click(screen.getByText('camera.controls.startAnalysis')); });
    await flush();
    expect(api.crearSesion).toHaveBeenCalledTimes(1);
    expect(api.crearSesion).toHaveBeenCalledWith(7);
  });

  it('envía un frame a la vez aunque el servidor tarde (sin acumular peticiones)', async () => {
    let resolver;
    api.analizarFrame.mockImplementation(() => new Promise((r) => { resolver = () => r(respuesta()); }));
    montar(); await flush();
    await act(async () => { fireEvent.click(screen.getByText('camera.controls.startCamera')); }); await flush();
    await act(async () => { fireEvent.click(screen.getByText('camera.controls.startAnalysis')); }); await flush();
    await act(async () => { await vi.advanceTimersByTimeAsync(750 * 5); });
    expect(api.analizarFrame).toHaveBeenCalledTimes(1);          // 5 turnos, 1 sola petición en vuelo
    await act(async () => { resolver(); await vi.advanceTimersByTimeAsync(750); });
    expect(api.analizarFrame).toHaveBeenCalledTimes(2);          // al responder, se envía el siguiente
  });

  it('pausar no congela la cámara y reanudar usa la misma sesión', async () => {
    api.analizarFrame.mockImplementation(() => Promise.resolve(respuesta()));
    montar(); await flush();
    await act(async () => { fireEvent.click(screen.getByText('camera.controls.startCamera')); }); await flush();
    await act(async () => { fireEvent.click(screen.getByText('camera.controls.startAnalysis')); }); await flush();
    HTMLMediaElement.prototype.pause.mockClear();
    await act(async () => { fireEvent.click(screen.getByText('camera.controls.pauseAnalysis')); }); await flush();
    expect(HTMLMediaElement.prototype.pause).not.toHaveBeenCalled();   // la cámara sigue en vivo
    await act(async () => { fireEvent.click(screen.getByText('camera.controls.startAnalysis')); }); await flush();
    expect(api.crearSesion).toHaveBeenCalledTimes(1);                  // misma sesión
  });

  it('detener cámara finaliza la sesión; al volver a empezar se crea una NUEVA', async () => {
    api.analizarFrame.mockImplementation(() => Promise.resolve(respuesta()));
    montar(); await flush();
    const iniciar = async () => {
      await act(async () => { fireEvent.click(screen.getByText('camera.controls.startCamera')); }); await flush();
      await act(async () => { fireEvent.click(screen.getByText('camera.controls.startAnalysis')); }); await flush();
    };
    await iniciar();
    await act(async () => { fireEvent.click(screen.getByText('camera.controls.stopCamera')); }); await flush();
    expect(api.finalizarSesion).toHaveBeenCalledWith(1);
    await iniciar();
    expect(api.crearSesion).toHaveBeenCalledTimes(2);
  });

  it('tras 3 fallos seguidos avisa que el servidor no responde', async () => {
    api.analizarFrame.mockImplementation(() => Promise.reject(new Error('x')));
    montar(); await flush();
    await act(async () => { fireEvent.click(screen.getByText('camera.controls.startCamera')); }); await flush();
    await act(async () => { fireEvent.click(screen.getByText('camera.controls.startAnalysis')); }); await flush();
    await act(async () => { await vi.advanceTimersByTimeAsync(750 * 4); });
    expect(screen.getAllByText('camera.backendUnavailable').length).toBeGreaterThan(0);
  });

  const iniciarTodo = async () => {
    await act(async () => { fireEvent.click(screen.getByText('camera.controls.startCamera')); }); await flush();
    await act(async () => { fireEvent.click(screen.getByText('camera.controls.startAnalysis')); }); await flush();
  };
  const pitidos = (vib) => vib.mock.calls.filter((c) => Array.isArray(c[0])).length;

  it('suena SOLO cuando el backend manda alerta_sonora=true (un pitido por respuesta)', async () => {
    const vib = vi.fn(); navigator.vibrate = vib;
    const cola = [true, false, false, true];
    api.analizarFrame.mockImplementation(() => Promise.resolve({ ...respuesta('alto'), alerta_sonora: cola.shift() ?? false }));
    montar(); await flush(); await iniciarTodo();
    await act(async () => { await vi.advanceTimersByTimeAsync(750 * 4); }); await flush();
    expect(pitidos(vib)).toBe(2);              // 4 frames "alto", pero solo 2 con alerta_sonora
  });

  it('riesgo alto con alerta_sonora=false no suena', async () => {
    const vib = vi.fn(); navigator.vibrate = vib;
    api.analizarFrame.mockImplementation(() => Promise.resolve({ ...respuesta('alto'), alerta_sonora: false }));
    montar(); await flush(); await iniciarTodo();
    await act(async () => { await vi.advanceTimersByTimeAsync(750 * 3); }); await flush();
    expect(pitidos(vib)).toBe(0);
  });

  it('si el servidor no envía alerta_sonora, usa riesgo alto como respaldo', async () => {
    const vib = vi.fn(); navigator.vibrate = vib;
    api.analizarFrame.mockImplementation(() => Promise.resolve(respuesta('alto')));
    montar(); await flush(); await iniciarTodo();
    await act(async () => { await vi.advanceTimersByTimeAsync(750 * 2); }); await flush();
    expect(pitidos(vib)).toBeGreaterThan(0);
  });

  it('cuenta episodios de alerta, no frames', async () => {
    const niveles = ['ninguno', 'alto', 'alto', 'alto', 'ninguno', 'alto'];
    const llamadas = [];
    api.analizarFrame.mockImplementation(() => Promise.resolve(respuesta(niveles.shift() ?? 'ninguno')));
    const onSesionUpdate = (d) => llamadas.push(d.alertas);
    render(<React.StrictMode><CameraView mode="bicicleta" navigate={()=>{}} onSesionUpdate={onSesionUpdate} user={{usuarioId:7}} /></React.StrictMode>);
    await flush(); await iniciarTodo();
    await act(async () => { await vi.advanceTimersByTimeAsync(750 * 6); }); await flush();
    expect(Math.max(...llamadas)).toBe(2);     // dos episodios (3 frames seguidos + 1)
  });

  it('mantiene la pantalla encendida mientras la cámara está activa y la libera al detener', async () => {
    const release = vi.fn(() => Promise.resolve());
    navigator.wakeLock = { request: vi.fn(() => Promise.resolve({ release, addEventListener() {} })) };
    api.analizarFrame.mockImplementation(() => Promise.resolve(respuesta()));
    montar(); await flush(); await iniciarTodo();
    expect(navigator.wakeLock.request).toHaveBeenCalledTimes(1);   // cámara + análisis comparten el mismo bloqueo
    await act(async () => { fireEvent.click(screen.getByText('camera.controls.stopCamera')); }); await flush();
    expect(release).toHaveBeenCalled();
  });

  it('si el servidor cierra la sesión (409), abre una nueva y sigue analizando', async () => {
    let llamada = 0;
    api.analizarFrame.mockImplementation(() => {
      llamada += 1;
      return llamada === 2 ? Promise.reject(new Error('La sesión ya fue finalizada')) : Promise.resolve(respuesta());
    });
    montar(); await flush(); await iniciarTodo();
    await act(async () => { await vi.advanceTimersByTimeAsync(750 * 5); }); await flush();
    expect(api.crearSesion).toHaveBeenCalledTimes(2);                       // la original + la de recuperación
    const ultimaSesion = api.analizarFrame.mock.calls.at(-1)[1];
    expect(ultimaSesion).toBe(2);                                           // los frames siguientes van a la sesión nueva
    expect(screen.queryAllByText('camera.backendUnavailable').length).toBe(0); // y no se muestra como caída del servidor
  });

  it('un error que llega tras detener el análisis no cuenta como fallo de conexión', async () => {
    let rechazar;
    api.analizarFrame.mockImplementation(() => new Promise((_, rej) => { rechazar = () => rej(new Error('x')); }));
    montar(); await flush(); await iniciarTodo();
    await act(async () => { await vi.advanceTimersByTimeAsync(750); });
    await act(async () => { fireEvent.click(screen.getByText('camera.controls.pauseAnalysis')); }); await flush();
    await act(async () => { rechazar(); }); await flush();
    expect(screen.queryAllByText('camera.backendUnavailable').length).toBe(0);
  });

  // ───────── Ajustes conectados a la cámara ─────────
  const guardar = (parciales) => localStorage.setItem('idas_settings_general', JSON.stringify(parciales));

  it('usa cámara trasera y 640×480 por defecto', async () => {
    montar(); await flush();
    await act(async () => { fireEvent.click(screen.getByText('camera.controls.startCamera')); }); await flush();
    const arg = navigator.mediaDevices.getUserMedia.mock.calls[0][0];
    expect(arg.video.facingMode.ideal).toBe('environment');
    expect([arg.video.width, arg.video.height]).toEqual([640, 480]);
  });

  it('respeta cámara frontal y resolución elegidas en Settings', async () => {
    guardar({ camaraTrasera: false, resolucion: '1280 × 720' });
    montar(); await flush();
    await act(async () => { fireEvent.click(screen.getByText('camera.controls.startCamera')); }); await flush();
    const arg = navigator.mediaDevices.getUserMedia.mock.calls[0][0];
    expect(arg.video.facingMode.ideal).toBe('user');
    expect([arg.video.width, arg.video.height]).toEqual([1280, 720]);
  });

  it('con el sonido apagado no suena pero sí vibra', async () => {
    guardar({ sonido: false, vibracion: true });
    const vib = vi.fn(); navigator.vibrate = vib;
    api.analizarFrame.mockImplementation(() => Promise.resolve({ ...respuesta('alto'), alerta_sonora: true }));
    montar(); await flush(); await iniciarTodo();
    await act(async () => { await vi.advanceTimersByTimeAsync(750 * 2); }); await flush();
    expect(window.__osc).toBe(0);
    expect(pitidos(vib)).toBeGreaterThan(0);
  });

  it('con la vibración apagada suena pero no vibra', async () => {
    guardar({ sonido: true, vibracion: false });
    const vib = vi.fn(); navigator.vibrate = vib;
    api.analizarFrame.mockImplementation(() => Promise.resolve({ ...respuesta('alto'), alerta_sonora: true }));
    montar(); await flush(); await iniciarTodo();
    await act(async () => { await vi.advanceTimersByTimeAsync(750 * 2); }); await flush();
    expect(window.__osc).toBeGreaterThan(0);
    expect(pitidos(vib)).toBe(0);
  });

  it('con el volumen en 0 no suena', async () => {
    guardar({ sonido: true, volumen: 0, vibracion: false });
    api.analizarFrame.mockImplementation(() => Promise.resolve({ ...respuesta('alto'), alerta_sonora: true }));
    montar(); await flush(); await iniciarTodo();
    await act(async () => { await vi.advanceTimersByTimeAsync(750 * 2); }); await flush();
    expect(window.__osc).toBe(0);
  });
});

describe('Settings', () => {
  const montarSettings = (user = { name: 'Will', initials: 'WA', tipoVehiculo: 'bicicleta', usuarioId: 3 }) =>
    render(<Settings navigate={() => {}} user={user} t={(k) => k} />);
  const guardados = () => JSON.parse(localStorage.getItem('idas_settings_general') || '{}');

  it('ya no muestra los controles que no hacían nada', () => {
    montarSettings();
    expect(screen.queryByText('settings.camera.sensitivity')).toBeNull();
    expect(screen.queryByText('settings.visual.cajas.label')).toBeNull();
    expect(screen.queryByText('settings.visual.nocturno.label')).toBeNull();
  });

  it('guardar persiste sonido, volumen, vibración, cámara y resolución', () => {
    montarSettings();
    fireEvent.click(screen.getByLabelText('settings.notifications.sound'));      // apaga el sonido
    fireEvent.click(screen.getByLabelText('settings.camera.rearDefault'));       // cámara frontal
    fireEvent.change(screen.getByLabelText('settings.general.resolution'), { target: { value: '1280 × 720' } });
    fireEvent.click(screen.getByText('settings.save'));
    expect(guardados()).toMatchObject({ sonido: false, camaraTrasera: false, resolucion: '1280 × 720', vibracion: true });
  });

  it('el volumen elegido se guarda', () => {
    montarSettings();
    fireEvent.change(screen.getByLabelText('settings.notifications.volume'), { target: { value: '40' } });
    fireEvent.click(screen.getByText('settings.save'));
    expect(guardados().volumen).toBe(40);
  });

  it('"Probar alerta" vibra y suena con los valores en pantalla', () => {
    const vib = vi.fn(); navigator.vibrate = vib;
    montarSettings();
    fireEvent.click(screen.getByText('Probar'));
    expect(vib).toHaveBeenCalledWith([200, 100, 200]);
    expect(window.__osc).toBe(1);
  });

  it('en bicicleta avisa si se apagan sonido y vibración', () => {
    montarSettings();
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.click(screen.getByLabelText('settings.notifications.sound'));
    fireEvent.click(screen.getByLabelText('settings.notifications.vibration'));
    expect(screen.getByRole('alert').textContent).toMatch(/ningún aviso/);
  });

  it('el perfil del vehículo se conserva al volver a abrir la pantalla', () => {
    const user = { name: 'Will', initials: 'WA', tieneAuto: true, tipoVehiculo: 'carro', usuarioId: 5 };
    const { unmount } = montarSettings(user);
    fireEvent.click(screen.getByText('settings.vehicle.edit'));
    fireEvent.change(screen.getByLabelText('settings.vehicle.marca'), { target: { value: 'Mazda' } });
    fireEvent.click(screen.getByText('settings.vehicle.save'));
    unmount();
    montarSettings(user);
    expect(screen.getByLabelText('settings.vehicle.marca').value).toBe('Mazda');
  });

  it('los ajustes guardados se cargan al abrir la pantalla', () => {
    localStorage.setItem('idas_settings_general', JSON.stringify({ sonido: false, volumen: 20 }));
    montarSettings();
    expect(screen.getByLabelText('settings.notifications.sound').checked).toBe(false);
  });
});