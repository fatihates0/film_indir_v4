/**
 * Fragman Oynatma Sistemi Konfigürasyonu
 * 
 * Versiyon Seçenekleri:
 * - 'v1': Klasik Sinematik Arka Plan Modu
 *         Hero yüksekliği sabittir (640px - 780px), video ambient arka plan olarak kırpılmış oynatılır.
 * 
 * - 'v2': Genişleyen 16:9 Sinema Modu (Yeni)
 *         Ses açıldığında (Sinema Modu) videonun yüksekliği yavaşça artar ve 16:9 video formatına yaklaşır.
 *         Ses kapatıldığında ise yükseklik yumuşakça başlangıç seviyesine geri döner.
 * 
 * Manuel kontrol için aşağıdaki değişkenleri kullanabilirsiniz:
 */
export const CINEMA_VERSION = 'v2'; // 'v1' | 'v2'

// Ses açıkken fare hareketsiz kaldığında kontrollerin transparanlaşma süresi (milisaniye cinsinden):
// 1000 = 1 saniye, 2000 = 2 saniye
export const CINEMA_IDLE_TIMEOUT = 1000;

// v2 modunda ses açıldığında hero'nun ulaşacağı yükseklik (Monitörün alt sınırına kadar):
export const CINEMA_EXPANDED_HEIGHT = 'h-[85vh] sm:h-[92vh] lg:h-screen';

export const cinemaConfig = {
    // Aktif versiyon ('v1' | 'v2')
    version: CINEMA_VERSION,
    idleTimeoutMs: CINEMA_IDLE_TIMEOUT,

    // v1: Klasik sabit yükseklik modu
    v1: {
        name: 'Klasik Arkaplan (v1)',
        heroHeight: 'h-[640px] sm:h-[720px] lg:h-[780px]',
        videoScale: 'scale-[1.28]',
        transition: 'duration-1000',
    },

    // v2: Genişleyen 16:9 format modu
    v2: {
        name: 'Genişleyen 16:9 Sinema (v2)',
        initialHeroHeight: 'h-[640px] sm:h-[720px] lg:h-[780px]',
        // Oynatma ve ses açıldığında monitörün alt sınırına (100vh / h-screen) kadar genişler:
        expandedHeroHeight: CINEMA_EXPANDED_HEIGHT,
        // 16:9 tam kadraja yaklaşan ölçek:
        expandedVideoScale: 'scale-[1.04]',
        defaultVideoScale: 'scale-[1.28]',
        // Yavaş ve yumuşak geçiş:
        transition: 'transition-all duration-1000 ease-out',
        idleTimeoutMs: CINEMA_IDLE_TIMEOUT,
    },
};

/**
 * Aktif versiyonu döndürür.
 * İsteğe bağlı olarak URL parametresi (?trailer_version=v1 veya ?trailer_version=v2)
 * ile tarayıcıda hızlı karşılaştırma yapmaya da olanak tanır.
 */
export function getCinemaVersion() {
    if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const override = params.get('trailer_version');
        if (override === 'v1' || override === 'v2') {
            return override;
        }
    }
    return CINEMA_VERSION;
}
