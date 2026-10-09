import { guessit } from 'guessit-js';
import path from 'path';

/**
 * Normalizes guessit-js output into the format expected by film_indir_v4
 * { clean_title: string, year: number|null, quality: string|null, category: string, properties: string[] }
 */
export function parseMediaMetadata(filename, filePath = '') {
    const rawFilename = path.basename(filename);
    const fullPath = filePath ? (filePath.includes(rawFilename) ? filePath : path.join(filePath, rawFilename)) : filename;
    
    // Perform GuessIt parsing on the full path / filename
    const res = guessit(fullPath) || {};
    
    // 1. Clean Title
    let cleanTitle = res.title || '';
    if (!cleanTitle) {
        cleanTitle = rawFilename.replace(/\.[^/.]+$/, "");
    }

    // 2. Year
    const year = typeof res.year === 'number' ? res.year : null;

    // 3. Category (movie vs series)
    let category = 'movie';
    if (res.type === 'episode' || res.season !== undefined || res.episode !== undefined) {
        category = 'series';
    } else {
        const normPath = (filePath || '').toLowerCase().replace(/\\/g, '/');
        if (
            /(?:^|[\/_-])(dizi|diziler|series|tv[._\s-]?shows|tv[._\s-]?series)(?:$|[\/_-])/i.test(normPath) ||
            /(?:^|[\/_-])(sezon|season)[._\s-]?\d{1,2}(?:$|[\/_-])/i.test(normPath) ||
            /(?:^|[\/_-])s\d{1,2}(?:$|[\/_-])/i.test(normPath)
        ) {
            category = 'series';
        }
    }

    // 4. Quality (Resolution)
    let quality = null;
    const lowerRaw = rawFilename.toLowerCase();
    if (/\bm1080p\b/i.test(lowerRaw)) {
        quality = 'm1080p';
    } else if (/\bm720p\b/i.test(lowerRaw)) {
        quality = 'm720p';
    } else if (res.screen_size) {
        const sz = String(res.screen_size).toLowerCase();
        if (sz === '2160p' || sz === '4k' || sz === 'uhd') {
            quality = '2160p';
        } else if (sz === '1080p') {
            quality = '1080p';
        } else if (sz === '720p') {
            quality = '720p';
        } else if (sz === '480p' || sz === 'sd') {
            quality = '480p';
        } else {
            quality = res.screen_size;
        }
    } else if (/\b(2160p|4k|uhd)\b/i.test(lowerRaw)) {
        quality = '2160p';
    } else if (/\b(1080p|fullhd)\b/i.test(lowerRaw)) {
        quality = '1080p';
    } else if (/\b(720p|hd)\b/i.test(lowerRaw)) {
        quality = '720p';
    } else if (/\b(480p|sd)\b/i.test(lowerRaw)) {
        quality = '480p';
    }

    // 5. Properties (Audio, Video, Format, HDR, DUAL etc.)
    const propertiesSet = new Set();
    if (quality) {
        propertiesSet.add(quality);
    }

    // Source / Format mapping from guessit & raw
    if (res.source) {
        const src = String(res.source).toLowerCase();
        if (src.includes('blu-ray') || src.includes('bluray') || src.includes('bd')) {
            propertiesSet.add('BluRay');
        } else if (src.includes('web')) {
            propertiesSet.add('WEB-DL');
        } else if (src.includes('hdtv')) {
            propertiesSet.add('HDTV');
        } else {
            propertiesSet.add(res.source);
        }
    }
    if (/\bremux\b/i.test(lowerRaw)) propertiesSet.add('Remux');
    if (/\b(webrip|web-rip)\b/i.test(lowerRaw)) propertiesSet.add('WEBRip');
    if (/\b(web-dl|webdl)\b/i.test(lowerRaw)) propertiesSet.add('WEB-DL');
    if (/\b(bluray|blu-ray|bdrip)\b/i.test(lowerRaw)) propertiesSet.add('BluRay');

    // Dynamic range, edition, audio, codec from guessit
    const toList = (val) => Array.isArray(val) ? val : (val ? [val] : []);
    
    // Other features
    for (const item of toList(res.other)) {
        const str = String(item).toLowerCase();
        if (str.includes('dual')) propertiesSet.add('DUAL');
        if (str.includes('dolby vision') || str.includes('dv')) propertiesSet.add('DV');
        if (str.includes('hdr10+')) propertiesSet.add('HDR10+');
        else if (str.includes('hdr')) propertiesSet.add('HDR');
        if (str.includes('imax')) propertiesSet.add('IMAX');
        if (str.includes('atmos')) propertiesSet.add('Atmos');
        if (str.includes('10-bit') || str.includes('10bit')) propertiesSet.add('10bit');
    }

    // Edition
    for (const ed of toList(res.edition)) {
        propertiesSet.add(String(ed));
    }

    // Audio Codec & Channels
    for (const ac of toList(res.audio_codec)) {
        const str = String(ac).toLowerCase();
        if (str.includes('atmos')) propertiesSet.add('Atmos');
        if (str.includes('truehd')) propertiesSet.add('TrueHD');
        if (str.includes('dts-hd ma')) propertiesSet.add('DTS-HD MA');
        else if (str.includes('dts-hd')) propertiesSet.add('DTS-HD');
        else if (str.includes('dts')) propertiesSet.add('DTS');
        if (str.includes('e-ac-3') || str.includes('dolby digital plus')) propertiesSet.add('DDP');
        else if (str.includes('ac-3') || str.includes('dolby digital')) propertiesSet.add('AC3');
    }
    if (res.audio_channels) {
        propertiesSet.add(String(res.audio_channels));
    }

    // Video Codec
    if (res.video_codec) {
        const vc = String(res.video_codec).toLowerCase();
        if (vc.includes('h.265') || vc.includes('hevc')) propertiesSet.add('x265');
        else if (vc.includes('h.264') || vc.includes('avc')) propertiesSet.add('x264');
    }

    // Raw property fallbacks for scene / Turkish release tags
    if (/\b(dv|dovi|dolbyvision)\b/i.test(lowerRaw)) propertiesSet.add('DV');
    if (/\bhdr10\+\b/i.test(lowerRaw)) propertiesSet.add('HDR10+');
    else if (/\bhdr10\b/i.test(lowerRaw)) propertiesSet.add('HDR10');
    else if (/\bhdr\b/i.test(lowerRaw)) propertiesSet.add('HDR');
    if (/\bimax\b/i.test(lowerRaw)) propertiesSet.add('IMAX');
    if (/\b(10bit|10-bit|hi10p)\b/i.test(lowerRaw)) propertiesSet.add('10bit');
    if (/\b(atmos|atmox|dolby[._\s-]atmos)\b/i.test(lowerRaw)) propertiesSet.add('Atmos');
    if (/\b(truehd|true-hd)\b/i.test(lowerRaw)) propertiesSet.add('TrueHD');
    if (/\b(dts-hd[._\s-]ma|dtshdma)\b/i.test(lowerRaw)) propertiesSet.add('DTS-HD MA');
    else if (/\b(dts-hd|dtshd)\b/i.test(lowerRaw)) propertiesSet.add('DTS-HD');
    else if (/\bdts\b/i.test(lowerRaw)) propertiesSet.add('DTS');
    if (/\b(ddp\d?\.?\d?|dd\+|e-?ac-?3)\b/i.test(lowerRaw)) propertiesSet.add('DDP');
    else if (/\b(ac3|ac-3|dd5\.1)\b/i.test(lowerRaw)) propertiesSet.add('AC3');
    if (/\b(7[._]1)\b/.test(lowerRaw)) propertiesSet.add('7.1');
    else if (/\b(5[._]1)\b/.test(lowerRaw)) propertiesSet.add('5.1');

    if (/\b(dual|dua|ikili)\b/i.test(lowerRaw)) propertiesSet.add('DUAL');
    if (/\b(multi|multisubs)\b/i.test(lowerRaw)) propertiesSet.add('MULTI');
    if (/\b(trdub|turkce[._\s-]dublaj)\b/i.test(lowerRaw)) propertiesSet.add('TR Dublaj');
    if (/\b(trsub|turkce[._\s-]altyazi)\b/i.test(lowerRaw)) propertiesSet.add('TR Altyazı');

    return {
        clean_title: cleanTitle,
        year: year,
        quality: quality,
        category: category,
        properties: Array.from(propertiesSet),
        guessit_raw: res
    };
}

// CLI runner if invoked directly
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('scripts/guessit_parser.js')) {
    const input = process.argv[2];
    const pathArg = process.argv[3] || '';

    if (!input) {
        let buffer = '';
        process.stdin.on('data', chunk => buffer += chunk);
        process.stdin.on('end', () => {
            try {
                const parsed = JSON.parse(buffer);
                if (Array.isArray(parsed)) {
                    const out = parsed.map(item => parseMediaMetadata(item.filename || item, item.path || ''));
                    console.log(JSON.stringify(out));
                } else {
                    const out = parseMediaMetadata(parsed.filename || parsed, parsed.path || '');
                    console.log(JSON.stringify(out));
                }
            } catch (e) {
                console.error('JSON parse error:', e);
                process.exit(1);
            }
        });
    } else {
        const result = parseMediaMetadata(input, pathArg);
        console.log(JSON.stringify(result));
    }
}
