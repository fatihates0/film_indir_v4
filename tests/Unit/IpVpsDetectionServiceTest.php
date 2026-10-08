<?php

namespace Tests\Unit;

use App\Services\IpVpsDetectionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IpVpsDetectionServiceTest extends TestCase
{
    use RefreshDatabase;

    protected IpVpsDetectionService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new IpVpsDetectionService;
    }

    public function test_match_cidr_supports_ipv4_and_ipv6(): void
    {
        // IPv4 CIDR tests
        $this->assertTrue($this->service->matchCidr('192.168.1.50', '192.168.1.0/24'));
        $this->assertFalse($this->service->matchCidr('192.168.2.50', '192.168.1.0/24'));

        // IPv6 CIDR tests
        $this->assertTrue($this->service->matchCidr('2a01:4f8:c17:7b05::1', '2a01:4f8::/32'));
        $this->assertFalse($this->service->matchCidr('2606:4700::1', '2a01:4f8::/32'));
    }

    public function test_is_vps_ip_handles_array_of_ipv4_and_ipv6_addresses(): void
    {
        // Whitelisted array test
        $this->assertFalse($this->service->isWhitelisted(['1.2.3.4', '2a01:4f8::1']));

        // Heterogeneous IP array check
        $this->assertFalse($this->service->isVpsIp(['127.0.0.1', '::1']));
    }
}
