<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_first_registered_user_becomes_admin_and_subsequent_user_becomes_standard_user(): void
    {
        // First registration (empty DB)
        $this->post('/register', [
            'name' => 'First Admin',
            'email' => 'admin@example.com',
            'password' => 'password123',
        ]);

        $this->assertAuthenticated();
        $firstUser = User::where('email', 'admin@example.com')->first();
        $this->assertTrue($firstUser->isAdmin());

        // Logout & reset test auth state
        Auth::logout();
        $this->app['auth']->forgetGuards();

        // Second registration
        $response = $this->post('/register', [
            'name' => 'Second User',
            'email' => 'user@example.com',
            'password' => 'password123',
        ]);
        $response->assertSessionHasNoErrors();

        $secondUser = User::where('email', 'user@example.com')->first();
        $this->assertTrue($secondUser->isUser());
        $this->assertFalse($secondUser->isAdmin());
    }

    public function test_user_can_login(): void
    {
        $user = User::factory()->create([
            'email' => 'john@example.com',
            'password' => bcrypt('secret123'),
        ]);

        $response = $this->post('/login', [
            'email' => 'john@example.com',
            'password' => 'secret123',
        ]);

        $this->assertAuthenticatedAs($user);
    }

    public function test_user_cannot_login_with_invalid_password(): void
    {
        $user = User::factory()->create([
            'email' => 'john@example.com',
            'password' => bcrypt('secret123'),
        ]);

        $response = $this->post('/login', [
            'email' => 'john@example.com',
            'password' => 'wrongpassword',
        ]);

        $this->assertGuest();
        $response->assertSessionHasErrors(['email']);
    }

    public function test_user_can_logout(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user);

        $response = $this->post('/logout');

        $this->assertGuest();
        $response->assertRedirect('/');
    }

    public function test_registration_validation_rules(): void
    {
        // Required fields
        $response = $this->post('/register', []);
        $response->assertSessionHasErrors(['name', 'email', 'password']);

        // Invalid email & short password
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'invalid-email',
            'password' => '123',
        ]);
        $response->assertSessionHasErrors(['email', 'password']);

        // Duplicate email
        User::factory()->create(['email' => 'existing@example.com']);
        $response = $this->post('/register', [
            'name' => 'Another User',
            'email' => 'existing@example.com',
            'password' => 'password123',
        ]);
        $response->assertSessionHasErrors(['email']);
    }

    public function test_login_validation_rules(): void
    {
        $response = $this->post('/login', []);
        $response->assertSessionHasErrors(['email', 'password']);

        $response = $this->post('/login', [
            'email' => 'invalid-email',
            'password' => 'secret',
        ]);
        $response->assertSessionHasErrors(['email']);
    }
}
