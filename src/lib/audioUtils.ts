
const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

/**
 * Toca um som de notificação de forma robusta.
 * @param volume Volume de 0 a 1 (default 0.6)
 */
export const playNotificationSound = (volume = 0.6) => {
  try {
    const audio = new Audio(NOTIFICATION_SOUND_URL);
    audio.volume = volume;
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        // Autoplay foi bloqueado pelo navegador
        console.log('[Audio] Reprodução automática bloqueada até interação do usuário:', error.message);
      });
    }
  } catch (err) {
    console.error('[Audio] Erro ao tentar reproduzir som:', err);
  }
};
