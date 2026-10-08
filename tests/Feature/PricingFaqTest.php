<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PricingFaqTest extends TestCase
{
    use RefreshDatabase;

    public function test_pricing_page_renders_faqs(): void
    {
        Setting::set('pricing_faq_settings', [
            [
                'question' => 'Özel Soru 1?',
                'answer' => 'Özel Cevap 1',
            ],
        ]);

        $response = $this->get(route('pricing'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Pricing')
            ->has('faqs', 1)
            ->where('faqs.0.question', 'Özel Soru 1?')
        );
    }

    public function test_admin_can_update_faq_settings(): void
    {
        $admin = User::factory()->create(['role' => UserRole::ADMIN]);

        $newFaqs = [
            ['question' => 'Yeni Soru 1?', 'answer' => 'Yeni Cevap 1'],
            ['question' => 'Yeni Soru 2?', 'answer' => 'Yeni Cevap 2'],
            ['question' => 'Yeni Soru 3?', 'answer' => 'Yeni Cevap 3'],
        ];

        $response = $this->actingAs($admin)->post(route('admin.faq-settings.update'), [
            'faqs' => $newFaqs,
        ]);

        $response->assertRedirect();

        $storedFaqs = Setting::get('pricing_faq_settings');
        $this->assertCount(3, $storedFaqs);
        $this->assertEquals('Yeni Soru 1?', $storedFaqs[0]['question']);
        $this->assertEquals('Yeni Soru 3?', $storedFaqs[2]['question']);
    }
}
