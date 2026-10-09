<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class IpVpsDetectionService
{
    /**
     * Known residential/mobile PTR indicators (Ev & Mobil Internet Kalıpları).
     */
    protected array $residentialPtrIndicators = [
        'dynamic', 'dsl', 'adsl', 'vdsl', 'fiber', 'broadband', 'pool', 'dhcp',
        'home-user', 'residential', 'dial-up', 'dialup', 'cable-modem',
        'mobile-gprs', '3g-mobile', '4g-mobile', '5g-mobile', 'lte-mobile',
        'ttnet.com.tr', 'superonline.net', 'vodafone.com.tr', 'telekom.de',
        'comcast.net', 'spectrum.com', 'verizon.net', 'att.net', 'cox.net',
    ];

    /**
     * Known global residential / mobile ISPs (Ev & Mobil ISS Listesi).
     */
    protected array $residentialIsps = [
        'turk telekom', 'ttnet', 'turkcell superonline', 'superonline',
        'vodafone net', 'turknet', 'kablonet', 'turksat', 'millenicom',
        'd-smart', 'gibirnet', 'netspeed', 'comcast', 'charter', 'spectrum',
        'verizon', 'at&t', 'att internet', 'cox communications', 'lumen',
        'centurylink', 'frontier communications', 'optimum', 'suddenlink',
        'windstream', 't-mobile', 'sprint', 'british telecommunications',
        'virgin media', 'sky broadband', 'talktalk', 'ee limited', 'vodafone uk',
        'deutsche telekom', 'vodafone gmbh', 'telefonica germany', '1&1 telecom',
        'orange s.a.', 'sfr', 'bouygues telecom', 'free sas', 'kpn', 'ziggo',
        'odido', 'telstra', 'optus', 'singtel', 'starhub', 'rogers', 'bell canada',
        'telus', 'shaw', 'swisscom', 'sunrise', 'telecom italia', 'wind tre',
        'movistar', 'telefonica espana', 'claro', 'tim brasil',
    ];

    /**
     * Known datacenter, hosting, VPS, or server keywords in PTR, org, isp, hostname, or AS fields.
     */
    protected array $hostingKeywords = [
        'hetzner', 'digitalocean', 'ovh', 'aws', 'amazon', 'linode', 'vultr',
        'contabo', 'scaleway', 'google cloud', 'azure', 'microsoft', 'oracle',
        'choopa', 'fastly', 'leaseweb', 'alibaba', 'm247', 'datacenter', 'data center',
        'cloudflare', 'servers', 'hosting', 'hostinger', 'ionos', 'rackspace',
        'ovh sas', 'vps', 'cloud', 'dedibox', 'server', 'netcup', 'kamatera',
        'cogent', 'tinet', 'telia', 'equinix', 'interserver', 'ovhcloud',
        'bulkvm', 'bulk', 'buyvm', 'kvm', 'colo', 'colocation', 'racknerd',
        'your-server.de', 'spryer', 'servarica', 'greencloud', 'lightnode',
        'turnkey', 'hostkey', 'hoststage', 'hostgator', 'bluehost', 'a2hosting',
        'namecheap', 'siteground', 'godaddy', 'inmotion', 'hostwinds',
        'dedicated', 'dedi', 'virtual', 'node', 'nodes', 'cluster', 'rdp',
        'transit', 'noc', 'bgp', 'datacentre', 'hosting provider', 'cloud services',
        'serverhost', 'vpshost', 'sys-group', 'frantech', 'evoluso', 'shockhosting',
    ];

    /**
     * Check if an IP address (or array of IPv4/IPv6 IPs) is explicitly Whitelisted by Admin.
     */
    public function isWhitelisted(string|array $ip): bool
    {
        $ips = is_array($ip) ? $ip : [$ip];
        foreach ($ips as $singleIp) {
            $cleanIp = trim(preg_replace('/^::ffff:/i', '', (string) $singleIp));
            if (empty($cleanIp)) {
                continue;
            }

            $settings = Cache::remember('ip_access_settings', 60, fn () => Setting::get('ip_access_settings', ['whitelist' => [], 'blacklist' => []]));
            $whitelist = is_array($settings) ? ($settings['whitelist'] ?? []) : [];

            if ($this->matchIpList($cleanIp, (array) $whitelist)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if an IP address (or array of IPv4/IPv6 IPs) is explicitly Blacklisted by Admin.
     */
    public function isBlacklisted(string|array $ip): bool
    {
        $ips = is_array($ip) ? $ip : [$ip];
        foreach ($ips as $singleIp) {
            $cleanIp = trim(preg_replace('/^::ffff:/i', '', (string) $singleIp));
            if (empty($cleanIp)) {
                continue;
            }

            $settings = Cache::remember('ip_access_settings', 60, fn () => Setting::get('ip_access_settings', ['whitelist' => [], 'blacklist' => []]));
            $blacklist = is_array($settings) ? ($settings['blacklist'] ?? []) : [];

            if ($this->matchIpList($cleanIp, (array) $blacklist)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if a clean IP matches an array of IP entries (exact or CIDR).
     */
    public function matchIpList(string $clientIp, array $ipList): bool
    {
        foreach ($ipList as $entry) {
            $entry = trim((string) $entry);
            if (empty($entry)) {
                continue;
            }

            if ($entry === $clientIp) {
                return true;
            }

            if (str_contains($entry, '/')) {
                if ($this->matchCidr($clientIp, $entry)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Match IPv4 or IPv6 against CIDR notation (e.g. 192.168.1.0/24 or 2a01:4f8::/32).
     */
    public function matchCidr(string $ip, string $cidr): bool
    {
        if (! str_contains($cidr, '/')) {
            return false;
        }

        [$subnet, $mask] = explode('/', $cidr, 2);
        $maskInt = (int) $mask;

        $ipBin = @inet_pton($ip);
        $subnetBin = @inet_pton($subnet);

        if ($ipBin === false || $subnetBin === false) {
            return false;
        }

        $ipLen = strlen($ipBin);
        if ($ipLen !== strlen($subnetBin)) {
            return false;
        }

        $maxMask = $ipLen * 8;
        if ($maskInt < 0 || $maskInt > $maxMask) {
            return false;
        }

        $bytes = (int) ($maskInt / 8);
        $bits = $maskInt % 8;

        if ($bytes > 0) {
            if (substr($ipBin, 0, $bytes) !== substr($subnetBin, 0, $bytes)) {
                return false;
            }
        }

        if ($bits > 0 && $bytes < $ipLen) {
            $ipByte = ord($ipBin[$bytes]);
            $subnetByte = ord($subnetBin[$bytes]);
            $bitMask = (0xFF << (8 - $bits)) & 0xFF;

            if (($ipByte & $bitMask) !== ($subnetByte & $bitMask)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Determine if an IP address (or array of IPv4/IPv6 addresses) belongs to a VPS, server, or datacenter.
     * Checks all provided candidate IPs (IPv4 and IPv6):
     * - Returns true if ANY IP is blacklisted or flagged as VPS/hosting.
     * - Returns false if ANY IP is whitelisted.
     */
    public function isVpsIp(string|array $ip): bool
    {
        $ips = is_array($ip) ? $ip : [$ip];
        $cleanIps = [];

        foreach ($ips as $singleIp) {
            $clean = trim(preg_replace('/^::ffff:/i', '', (string) $singleIp));
            if (! empty($clean) && ! $this->isPrivateIp($clean)) {
                $cleanIps[] = $clean;
            }
        }

        $cleanIps = array_unique($cleanIps);

        if (empty($cleanIps)) {
            return false;
        }

        // Priority 1: Check Blacklist (If ANY IP is blacklisted -> block)
        foreach ($cleanIps as $cleanIp) {
            if ($this->isBlacklisted($cleanIp)) {
                return true;
            }
        }

        // Priority 2: Check Whitelist (If ANY IP is whitelisted -> allow)
        foreach ($cleanIps as $cleanIp) {
            if ($this->isWhitelisted($cleanIp)) {
                return false;
            }
        }

        // Priority 3: Lookup each candidate IP (IPv4 and IPv6)
        foreach ($cleanIps as $cleanIp) {
            $cacheKey = 'ip_vps_check_v6_'.md5($cleanIp);

            $isVps = Cache::remember($cacheKey, now()->addDays(1), function () use ($cleanIp) {
                return $this->lookupIp($cleanIp);
            });

            if ($isVps) {
                return true;
            }
        }

        return false;
    }

    /**
     * Perform live DNS & multi-provider API lookup for an IP address.
     */
    protected function lookupIp(string $ip): bool
    {
        // 1. PTR Reverse DNS Heuristics
        try {
            $hostname = @gethostbyaddr($ip);
            if ($hostname && $hostname !== $ip) {
                $hostLower = strtolower($hostname);

                // Priority A: If PTR explicitly matches hosting/server indicators -> IS a VPS
                foreach ($this->hostingKeywords as $keyword) {
                    if (str_contains($hostLower, $keyword)) {
                        return true;
                    }
                }

                // Priority B: If PTR explicitly matches residential indicators -> NOT a VPS
                foreach ($this->residentialPtrIndicators as $resInd) {
                    if (str_contains($hostLower, $resInd)) {
                        return false;
                    }
                }
            }
        } catch (Throwable $e) {
            // Ignore DNS lookup errors
        }

        try {
            // 2. Primary API lookup: ip-api.com
            $response = Http::timeout(2)
                ->connectTimeout(2)
                ->get("http://ip-api.com/json/{$ip}?fields=status,hosting,proxy,mobile,org,isp,as");

            if ($response->successful()) {
                $data = $response->json();
                if (is_array($data) && ($data['status'] ?? '') === 'success') {
                    // Mobile connection (4G/5G) -> NOT a VPS
                    if (! empty($data['mobile'])) {
                        return false;
                    }

                    // Direct Hosting / Proxy Flag
                    if (! empty($data['hosting']) || ! empty($data['proxy'])) {
                        return true;
                    }

                    $ispOrgStr = strtolower(($data['org'] ?? '').' '.($data['isp'] ?? '').' '.($data['as'] ?? ''));

                    // Priority A: Check Hosting/Server blacklist keywords
                    foreach ($this->hostingKeywords as $keyword) {
                        if (str_contains($ispOrgStr, $keyword)) {
                            return true;
                        }
                    }

                    // Priority B: Check explicit Residential ISP whitelist
                    foreach ($this->residentialIsps as $resIsp) {
                        if (str_contains($ispOrgStr, $resIsp)) {
                            return false;
                        }
                    }
                }
            }

            // 3. Fallback API lookup: ipinfo.io
            $fallback = Http::timeout(2)
                ->connectTimeout(2)
                ->get("https://ipinfo.io/{$ip}/json");

            if ($fallback->successful()) {
                $fData = $fallback->json();
                if (is_array($fData)) {
                    if (! empty($fData['bogon'])) {
                        return false;
                    }

                    $fStr = strtolower(($fData['org'] ?? '').' '.($fData['hostname'] ?? '').' '.($fData['company']['name'] ?? ''));

                    // Priority A: Check Hosting blacklist keywords
                    foreach ($this->hostingKeywords as $keyword) {
                        if (str_contains($fStr, $keyword)) {
                            return true;
                        }
                    }

                    // Priority B: Check Residential ISP whitelist
                    foreach ($this->residentialIsps as $resIsp) {
                        if (str_contains($fStr, $resIsp)) {
                            return false;
                        }
                    }
                }
            }
        } catch (Throwable $e) {
            Log::warning("IpVpsDetectionService lookup error for IP {$ip}: ".$e->getMessage());
        }

        return false;
    }

    /**
     * Check if IP is private, local, or loopback.
     */
    protected function isPrivateIp(string $ip): bool
    {
        return filter_var(
            $ip,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_IPV4 | FILTER_FLAG_IPV6 | FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
        ) === false;
    }
}
