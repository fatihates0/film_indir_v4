<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PaymentMethod;
use Illuminate\Http\Request;

class PaymentMethodController extends Controller
{
    /**
     * Toggle active/passive status of a payment method.
     */
    public function toggle(PaymentMethod $paymentMethod)
    {
        $paymentMethod->update([
            'is_active' => ! $paymentMethod->is_active,
        ]);

        $statusText = $paymentMethod->is_active ? 'aktif' : 'pasif';

        return redirect()->back()->with('success', "'{$paymentMethod->name}' ödeme yöntemi {$statusText} hale getirildi.");
    }

    /**
     * Update details & settings of a payment method.
     */
    public function update(Request $request, PaymentMethod $paymentMethod)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'nullable|string|max:500',
            'instructions' => 'nullable|string|max:2000',
            'is_active' => 'required|boolean',
            'settings' => 'nullable|array',
        ]);

        $paymentMethod->update([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'instructions' => $validated['instructions'] ?? null,
            'is_active' => $validated['is_active'],
            'settings' => $validated['settings'] ?? [],
        ]);

        return redirect()->back()->with('success', "'{$paymentMethod->name}' ödeme yöntemi bilgileri güncellendi.");
    }
}
