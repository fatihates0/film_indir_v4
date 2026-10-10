<?php

namespace App\Services\Payment;

use App\Models\PaymentMethod;
use App\Models\PaymentNotification;
use InvalidArgumentException;

class PaymentManager
{
    /**
     * Registered payment services by driver and method id.
     *
     * @var array<string, PaymentServiceInterface>
     */
    protected array $services = [];

    public function __construct(
        BankTransferService $bankTransferService,
        CryptoPaymentService $cryptoPaymentService,
        PaddleService $paddleService
    ) {
        $this->registerService($bankTransferService);
        $this->registerService($cryptoPaymentService);
        $this->registerService($paddleService);
    }

    /**
     * Register a payment service into the manager.
     */
    public function registerService(PaymentServiceInterface $service): self
    {
        $this->services[$service->getDriver()] = $service;
        $this->services[$service->getMethodId()] = $service;

        return $this;
    }

    /**
     * Get a payment service by driver (e.g. 'bank', 'crypto', 'paddle').
     */
    public function driver(string $driver): PaymentServiceInterface
    {
        if (! isset($this->services[$driver])) {
            throw new InvalidArgumentException("Desteklenmeyen ödeme sürücüsü: [{$driver}].");
        }

        return $this->services[$driver];
    }

    /**
     * Get a payment service for a PaymentMethod model or method ID.
     */
    public function forMethod(PaymentMethod|string $method): PaymentServiceInterface
    {
        $methodId = $method instanceof PaymentMethod ? $method->id : $method;
        $driver = $method instanceof PaymentMethod ? $method->driver : null;

        if (isset($this->services[$methodId])) {
            return $this->services[$methodId];
        }

        if ($driver && isset($this->services[$driver])) {
            return $this->services[$driver];
        }

        throw new InvalidArgumentException("Geçersiz veya desteklenmeyen ödeme yöntemi: [{$methodId}].");
    }

    /**
     * Get a payment service for an existing PaymentNotification model.
     */
    public function forNotification(PaymentNotification $notification): PaymentServiceInterface
    {
        if ($notification->paymentMethod) {
            return $this->forMethod($notification->paymentMethod);
        }

        if (! empty($notification->payment_method_id) && isset($this->services[$notification->payment_method_id])) {
            return $this->services[$notification->payment_method_id];
        }

        // Default fallback to bank transfer
        return $this->driver(BankTransferService::DRIVER);
    }

    /**
     * Retrieve all unique registered payment services.
     *
     * @return array<string, PaymentServiceInterface>
     */
    public function all(): array
    {
        return [
            BankTransferService::DRIVER => $this->driver(BankTransferService::DRIVER),
            CryptoPaymentService::DRIVER => $this->driver(CryptoPaymentService::DRIVER),
            PaddleService::DRIVER => $this->driver(PaddleService::DRIVER),
        ];
    }
}
