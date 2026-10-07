import { useState, useRef, useEffect, useCallback } from 'react';
import { CINEMA_IDLE_TIMEOUT } from '../Config/cinemaConfig';

/**
 * Hero içeriklerinin sinema modunda (ses açıkken) boşta kalındığında
 * otomatik olarak transparanlaşmasını sağlayan hook.
 * 
 * Kurallar (Versiyon 2):
 * 1. Sesi açtığınız an hero transparanlaşır.
 * 2. Fareyi hareket ettirdiğinizde tekrar görünür olur.
 * 3. Ses açıkken fare hareketsiz kalırsa (CINEMA_IDLE_TIMEOUT süresi sonunda) geri transparan olur.
 * 4. Ses kapalıyken veya v1 modundayken içerik normal şekilde görünür kalır.
 */
export function useHeroIdleFade({ isMuted, cinemaVersion, idleTimeoutMs = CINEMA_IDLE_TIMEOUT }) {
    const isV2 = cinemaVersion === 'v2';
    const [isHeroControlsVisible, setIsHeroControlsVisible] = useState(true);
    const [isHeroHovered, setIsHeroHovered] = useState(false);
    const timerRef = useRef(null);

    // Sesi açtığımız an transparanlaşma ve ses kapanınca geri görünür olma
    useEffect(() => {
        if (isV2 && !isMuted) {
            // Sesi açtığımız an hemen transparanlaşsın
            setIsHeroControlsVisible(false);
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        } else {
            // Ses kapalıysa her zaman görünür olsun
            setIsHeroControlsVisible(true);
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        }

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [isMuted, isV2]);

    // Fare hareket ettiğinde kontrolleri görünür yap ve 2 saniyelik zamanlayıcı kur
    const handleMouseMove = useCallback(() => {
        if (!isV2 || isMuted) {
            setIsHeroControlsVisible(true);
            return;
        }

        setIsHeroControlsVisible(true);

        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(() => {
            setIsHeroControlsVisible(false);
        }, idleTimeoutMs);
    }, [isV2, isMuted, idleTimeoutMs]);

    // Ses açıkken pencere genelindeki fare hareketlerini de dinle
    useEffect(() => {
        if (!isV2 || isMuted) return;

        const onWindowMouseMove = () => {
            handleMouseMove();
        };

        window.addEventListener('mousemove', onWindowMouseMove, { passive: true });
        return () => {
            window.removeEventListener('mousemove', onWindowMouseMove);
        };
    }, [isV2, isMuted, handleMouseMove]);

    const handleMouseEnter = useCallback(() => {
        setIsHeroHovered(true);
        handleMouseMove();
    }, [handleMouseMove]);

    const handleMouseLeave = useCallback(() => {
        setIsHeroHovered(false);
        if (isV2 && !isMuted) {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            setIsHeroControlsVisible(false);
        }
    }, [isV2, isMuted]);

    // v2'de ses açıkken transparanlık durumu
    const isOverlayVisible = isV2
        ? (isMuted || isHeroControlsVisible)
        : (isMuted || isHeroHovered);

    return {
        isHeroControlsVisible,
        isHeroHovered,
        isOverlayVisible,
        handleMouseMove,
        handleMouseEnter,
        handleMouseLeave,
    };
}
