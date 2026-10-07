<?php

namespace App\Http\Requests\Admin;

use App\Enums\StorageBoxProtocol;
use App\Enums\StorageBoxStatus;
use App\Enums\UserRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStorageBoxRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->role === UserRole::ADMIN;
    }

    /**
     * Prepare the data for validation.
     * Smartly parses scheme (http vs https), host, and port from user input.
     */
    protected function prepareForValidation(): void
    {
        $rawHost = trim((string) $this->input('host', ''));
        $isExplicitHttp = str_starts_with(strtolower($rawHost), 'http://');

        $cleanHost = preg_replace('#^https?://#i', '', $rawHost);
        $cleanHost = rtrim($cleanHost, '/');

        if (preg_match('#:(\d+)$#', $cleanHost, $matches)) {
            $this->merge(['port' => (int) $matches[1]]);
            $cleanHost = preg_replace('#:\d+$#', '', $cleanHost);
        }

        if ($isExplicitHttp && ! $this->has('use_ssl')) {
            $this->merge(['use_ssl' => false]);
        }

        if ($this->filled('api_secret')) {
            $this->merge(['password' => $this->input('api_secret')]);
        }

        $this->merge([
            'host' => $cleanHost,
            'protocol' => StorageBoxProtocol::CustomGateway->value,
            'username' => 'gateway',
        ]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'host' => ['required', 'string', 'max:255'],
            'protocol' => ['required', Rule::enum(StorageBoxProtocol::class)],
            'port' => ['required', 'integer', 'min:1', 'max:65535'],
            'username' => ['nullable', 'string', 'max:100'],
            'password' => ['nullable', 'string', 'min:1'],
            'use_ssl' => ['nullable', 'boolean'],
            'total_capacity_gb' => ['nullable', 'integer', 'min:1'],
            'status' => ['required', Rule::enum(StorageBoxStatus::class)],
            'notes' => ['nullable', 'string', 'max:1000'],
            'is_default' => ['nullable', 'boolean'],
            'test_immediately' => ['nullable', 'boolean'],
        ];
    }

    /**
     * Custom attribute names for validation messages in Turkish.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name' => 'Depolama Sunucusu Adı',
            'host' => 'Domain / IP Adresi',
            'protocol' => 'Protokol',
            'port' => 'Port Numarası',
            'password' => 'HMAC Secret Key (Gizli Anahtar)',
            'use_ssl' => 'Güvenli Bağlantı (HTTPS)',
            'total_capacity_gb' => 'Toplam Kapasite (GB)',
            'status' => 'Çalışma Durumu',
            'notes' => 'Notlar',
        ];
    }
}
