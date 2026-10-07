Özel kuyruk isimleri

Storage box disk taraması: disk_scan
TMDB içerik eşleme taraması: tmdb_scan


Kuyruk çalıştırma

php artisan queue:work --queue=disk_scan,tmdb_scan



php artisan tinker --execute "echo app(App\Services\StorageTokenService::class)->generateApiUrl('/scan', 0, App\Models\StorageBox::find(1));"


php artisan tinker --execute "print_r(app(App\Services\HetznerStorageBoxService::class)->testConnection(App\Models\StorageBox::find(STORAGE_BOX_ID)));"
