<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class IpVpsDetectionService
{
    /**
     * Known datacenter/hosting keywords in org, isp, or AS fields.
     */
    protected array $hostingKeywords = [
        'hetzner', 'digitalocean', 'ovh', 'aws', 'amazon', 'linode', 'vultr',
        'contabo', 'scaleway', 'google cloud', 'azure', 'microsoft', 'oracle',
        'choopa', 'fastly', 'leaseweb', 'alibaba', 'm247', 'datacenter',
        'cloudflare', 'servers', 'hosting', 'hostinger', 'ionos', 'rackspace',
        'ovh SAS', 'vps', 'cloud', 'dedibox', 'server', 'netcup', 'kamatera',
        'cogent', 'tinet', 'telia', 'equinix', 'interserver', 'ovhcloud',
    ];

    /**
     * Determine if an IP address belongs to a VPS, server, or datacenter.
     */
    public function isVpsIp(string $ip): bool
    {
        $cleanIp = trim($ip);

        if (empty($cleanIp) || $this->isPrivateIp($cleanIp)) {
            return false;
        }

        $cacheKey = 'ip_vps_check_'.md5($cleanIp);

        return Cache::remember($cacheKey, now()->addDays(1), function () use ($cleanIp) {
            return $this->lookupIp($cleanIp);
        });
    }

    /**
     * Perform live API lookup for an IP address.
     */
    protected function lookupIp(string $ip): bool
    {
        try {
            // Primary lookup: ip-api.com
            $response = Http::timeout(2)
                ->connectTimeout(2)
                ->get("http://ip-api.com/json/{$ip}?fields=status,hosting,proxy,org,isp,as");

            if ($response->successful()) {
                $data = $response->json();
                if (is_array($data) && ($data['status'] ?? '') === 'success') {
                    if (! empty($data['hosting']) || ! empty($data['proxy'])) {
                        return true;
                    }

                    $orgStr = strtolower(($data['org'] ?? '').' '.($data['isp'] ?? '').' '.($data['as'] ?? ''));
                    foreach ($this->hostingKeywords as $keyword) {
                        if (str_contains($orgStr, $keyword)) {
                            return true;
                        }
                    }

                    return false;
                }
            }

            // Fallback lookup: ipinfo.io
            $fallback = Http::timeout(2)
                ->connectTimeout(2)
                ->get("https://ipinfo.io/{$ip}/json");

            if ($fallback->successful()) {
                $fData = $fallback->json();
                if (is_array($fData)) {
                    if (! empty($fData['bogon'])) {
                        return false;
                    }
                    $orgStr = strtolower(($fData['org'] ?? '').' '.($fData['company']['name'] ?? ''));
                    foreach ($this->hostingKeywords as $keyword) {
                        if (str_contains($orgStr, $keyword)) {
                            return true;
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
